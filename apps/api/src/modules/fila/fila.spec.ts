import { Global, INestApplication, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import {
  atribuicoesSupervisor,
  decisoesPrioridade,
  casos,
  inscricoes,
  usuarios,
  type Db,
} from '@clinica/database';
import { AuditoriaModule } from '../../auditoria/auditoria.module';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { cifrar } from '../../common/criptografia';
import { DB } from '../../database/database.module';
import {
  CHAVE_TESTE,
  criarBancoDeTeste,
} from '../../test-utils/banco-de-teste';
import { TriagemModule } from '../triagem/triagem.module';
import { FilaService } from './fila.service';
import { FilaModule } from './fila.module';
import { CasosModule } from '../casos/casos.module';
import { ParametrosModule } from '../../parametros/parametros.module';

// Fila de espera (RF7), integrada à prioridade clínica (RF6). A sessão é simulada
// pelo cabeçalho x-usuario-teste, como nos testes do agendamento.
describe('Fila de espera (RF7)', () => {
  let app: INestApplication;
  let db: Db;
  let limpar: () => Promise<unknown>;
  let fechar: () => Promise<void>;
  const pessoas: Record<string, UsuarioAutenticado> = {};
  let numero = 0;

  beforeAll(async () => {
    ({ db, limpar, fechar } = await criarBancoDeTeste());

    @Global()
    @Module({ providers: [{ provide: DB, useValue: db }], exports: [DB] })
    class InfraDeTeste {}

    const modulo = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ CHAVE_DADOS: CHAVE_TESTE })],
        }),
        InfraDeTeste,
        AuditoriaModule,
        TriagemModule,
        FilaModule,
        CasosModule,
        ParametrosModule,
      ],
    }).compile();
    app = modulo.createNestApplication();
    app.use(
      (
        req: { headers: Record<string, string>; usuario?: unknown },
        _res: unknown,
        next: () => void,
      ) => {
        const cabecalho = req.headers['x-usuario-teste'];
        if (cabecalho) req.usuario = JSON.parse(cabecalho);
        next();
      },
    );
    await app.init();
  }, 60_000);

  afterAll(async () => {
    await app.close();
    await fechar();
  });

  beforeEach(async () => {
    await limpar();
    for (const [chave, perfil] of [
      ['coordenacao', 'coordenacao'],
      ['supervisor', 'supervisor'],
      ['secretaria', 'secretaria'],
      ['estagiario', 'estagiario'],
    ] as const) {
      const [u] = await db
        .insert(usuarios)
        .values({
          nome: chave,
          email: `${chave}@fbr.edu.br`,
          perfil,
          situacao: 'ativo',
        })
        .returning();
      pessoas[chave] = { id: u.id, nome: chave, perfil };
    }
  });

  const como = (quem: string) => ({
    'x-usuario-teste': JSON.stringify(pessoas[quem]),
  });
  const http = () => request(app.getHttpServer());

  // Inscrição com as respostas cifradas, ou sem elas (inscrição legada).
  async function inscrever(inscritaEm: Date, legada = false) {
    numero += 1;
    const resposta = (texto: string) =>
      legada ? null : cifrar(texto, CHAVE_TESTE);
    const [inscricao] = await db
      .insert(inscricoes)
      .values({
        numero: `2026-${String(numero).padStart(5, '0')}`,
        nomeCompleto: `Pessoa ${numero}`,
        dataNascimento: '1990-01-01',
        cpf: String(numero).padStart(11, '0'),
        rg: '1234567',
        endereco: 'Rua Fictícia, 1',
        estadoCivil: 'solteiro',
        canalPreferencial: 'email',
        email: `pessoa${numero}@exemplo.com`,
        queixaCifrada: resposta('Queixa fictícia'),
        percepcaoUrgenciaCifrada: resposta('Urgência fictícia'),
        historicoRelevanteCifrado: resposta('Histórico fictício'),
        criadaEm: inscritaEm,
      })
      .returning();
    return inscricao.id;
  }
  const diasAtras = (dias: number) => new Date(Date.now() - dias * 86_400_000);

  const classificar = (id: string, cor: string) =>
    http()
      .post(`/triagem/inscricoes/${id}/prioridade`)
      .set(como('supervisor'))
      .send({ cor })
      .expect(201);
  const fila = async () =>
    (await http().get('/fila').set(como('coordenacao')).expect(200)).body;

  it('prioriza vermelha, amarela e verde, com desempate pela inscrição e sem declaração automática', async () => {
    const verde = await inscrever(diasAtras(30));
    const amarela = await inscrever(diasAtras(20));
    const recente = await inscrever(diasAtras(2));
    const antiga = await inscrever(diasAtras(10));
    await inscrever(diasAtras(40));
    await classificar(verde, 'verde');
    await classificar(amarela, 'amarela');
    await classificar(recente, 'vermelha');
    await classificar(antiga, 'vermelha');
    const resultado = await fila();
    expect(
      resultado.inscritos.map((i: { inscricaoId: string }) => i.inscricaoId),
    ).toEqual([antiga, recente, amarela, verde]);
    expect(
      resultado.inscritos.map((i: { posicao: number }) => i.posicao),
    ).toEqual([1, 2, 3, 4]);
    expect(resultado.pendentes).toHaveLength(1);
    expect(JSON.stringify(resultado)).not.toMatch(
      /queixa|cpf|email|corCifrada|Urgência fictícia/,
    );
  });

  it('reclassificação recalcula a posição e mantém as decisões anteriores', async () => {
    const a = await inscrever(diasAtras(10));
    const b = await inscrever(diasAtras(5));
    await classificar(a, 'amarela');
    await classificar(b, 'verde');
    await classificar(b, 'vermelha');
    expect(
      (await fila()).inscritos.map(
        (i: { inscricaoId: string }) => i.inscricaoId,
      ),
    ).toEqual([b, a]);
    const historico = await db.select().from(decisoesPrioridade);
    expect(historico).toHaveLength(3);
    expect(historico.filter((d) => d.decisaoAnteriorId)).toHaveLength(1);
    await http().get('/fila/historico').set(como('coordenacao')).expect(404);
  });

  it.each(['em_atendimento', 'encerrado', 'desligado_por_faltas'] as const)(
    'retira caso %s e recalcula os demais',
    async (situacao) => {
      const a = await inscrever(diasAtras(10));
      const b = await inscrever(diasAtras(5));
      await classificar(a, 'vermelha');
      await classificar(b, 'verde');
      await db.update(casos).set({ situacao }).where(eq(casos.inscricaoId, a));
      expect((await fila()).inscritos).toEqual([
        expect.objectContaining({ inscricaoId: b, posicao: 1 }),
      ]);
    },
  );

  it('usa data da volta para desempatar retorno à fila (DF33), sem alterar inscrição original', async () => {
    const a = await inscrever(diasAtras(10));
    const b = await inscrever(diasAtras(5));
    await classificar(a, 'verde');
    await classificar(b, 'verde');
    await db
      .update(casos)
      .set({ entradaNaFilaEm: diasAtras(1) })
      .where(eq(casos.inscricaoId, a));
    const r = await fila();
    expect(
      r.inscritos.map((i: { inscricaoId: string }) => i.inscricaoId),
    ).toEqual([b, a]);
    expect(r.inscritos[1]).not.toHaveProperty('retornou');
  });

  it.each(['aguardando_vinculo', 'aguardando_vaga'] as const)(
    'mantém %s na posição global e filtra o próximo elegível por supervisor',
    async (situacao) => {
      const id = await inscrever(diasAtras(10));
      await classificar(id, 'amarela');
      const [caso] = await db
        .update(casos)
        .set({ situacao })
        .where(eq(casos.inscricaoId, id))
        .returning();
      await db.insert(atribuicoesSupervisor).values({
        casoId: caso.id,
        supervisorId: pessoas.supervisor.id,
        atribuidoPor: pessoas.coordenacao.id,
      });
      expect((await fila()).inscritos).toEqual([
        expect.objectContaining({ inscricaoId: id, posicao: 1 }),
      ]);
      const service = app.get(FilaService);
      expect(await service.posicaoDaInscricao(id)).toBe(1);
      expect(await service.proximoElegivel(pessoas.coordenacao.id)).toBeNull();
      expect(await service.proximoElegivel(pessoas.supervisor.id)).toEqual(
        situacao === 'aguardando_vinculo'
          ? expect.objectContaining({ prioridade: 'amarela' })
          : null,
      );
    },
  );
  it('retorna as duas listas vazias', async () => {
    expect(await fila()).toEqual({ inscritos: [], pendentes: [] });
  });
  it.each(['secretaria', 'estagiario', 'supervisor'])(
    'nega lista e histórico ao perfil %s',
    async (quem) => {
      for (const rota of ['/fila'])
        await http().get(rota).set(como(quem)).expect(403);
    },
  );
  it('desempata pelo número quando prioridade e entrada são iguais, independentemente da ordem da triagem', async () => {
    const entrada = new Date('2026-01-02T03:04:05Z');
    const a = await inscrever(entrada);
    const b = await inscrever(entrada);
    await classificar(b, 'amarela');
    await classificar(a, 'amarela');
    expect(
      (await fila()).inscritos.map(
        (i: { inscricaoId: string }) => i.inscricaoId,
      ),
    ).toEqual([a, b]);
    const [caso] = await db
      .select()
      .from(casos)
      .where(eq(casos.inscricaoId, a));
    expect(caso.entradaNaFilaEm).toEqual(entrada);
  });

  it('RF18 segue a ordem da fila após retorno; RF20 mantém a posição e RF21 retira o caso', async () => {
    const a = await inscrever(diasAtras(20));
    const b = await inscrever(diasAtras(10));
    await classificar(a, 'amarela');
    await classificar(b, 'amarela');
    await db
      .update(casos)
      .set({ entradaNaFilaEm: diasAtras(1) })
      .where(eq(casos.inscricaoId, a));
    const ordenados = (await fila()).inscritos as {
      casoId: string;
      inscricaoId: string;
      posicao: number;
    }[];
    expect(ordenados.map((i) => i.inscricaoId)).toEqual([b, a]);
    const distribuicao = await http()
      .get('/casos/aguardando-distribuicao')
      .set(como('coordenacao'))
      .expect(200);
    expect(distribuicao.body.map((i: { casoId: string }) => i.casoId)).toEqual(
      ordenados.map((i) => i.casoId),
    );
    await http()
      .post(`/casos/${ordenados[0].casoId}/supervisor`)
      .set(como('coordenacao'))
      .send({ supervisorId: pessoas.supervisor.id })
      .expect(201);
    expect((await fila()).inscritos).toEqual(ordenados);
    await http()
      .post(`/casos/${ordenados[0].casoId}/estagiario`)
      .set(como('supervisor'))
      .send({ estagiarioId: pessoas.estagiario.id })
      .expect(201);
    expect((await fila()).inscritos).toEqual([
      expect.objectContaining({ inscricaoId: a, posicao: 1 }),
    ]);
    expect(await app.get(FilaService).posicaoDaInscricao(b)).toBeNull();
    expect(await db.select().from(decisoesPrioridade)).toHaveLength(2);
  });

  it('nega acesso anônimo', async () => {
    await http().get('/fila').expect(401);
  });
});
