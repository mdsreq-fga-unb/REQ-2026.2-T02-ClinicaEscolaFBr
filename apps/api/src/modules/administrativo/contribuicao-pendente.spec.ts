import { Global, INestApplication, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { and, eq } from 'drizzle-orm';
import request from 'supertest';
import {
  atribuicoesSupervisor,
  auditoria,
  cancelamentosSessao,
  casos,
  decisoesPrioridade,
  inscricoes,
  pagamentosContribuicao,
  perdasVaga,
  sessoesAtendimento,
  usuarios,
  vagasLiberadas,
  vinculosEstagiario,
  type Db,
} from '@clinica/database';
import { hojeEmBrasilia, prazoDaContribuicao } from '@clinica/shared';
import { AuditoriaModule } from '../../auditoria/auditoria.module';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { cifrar } from '../../common/criptografia';
import { DB } from '../../database/database.module';
import { ParametrosModule } from '../../parametros/parametros.module';
import {
  CHAVE_TESTE,
  criarBancoDeTeste,
} from '../../test-utils/banco-de-teste';
import { CasosModule } from '../casos/casos.module';
import { FilaService } from '../fila/fila.service';
import { AdministrativoModule } from './administrativo.module';

// RF43: aviso do prazo da contribuição vencido e confirmação da perda da vaga,
// que devolve o caso à fila (DF33). O bloqueio do agendamento está nos testes do
// RF10 (sessoes.spec.ts). O usuário da sessão (RF50) é simulado pelo cabeçalho
// x-usuario-teste.
const DIA = 24 * 60 * 60 * 1000;
const HORA = 60 * 60 * 1000;
const diasAtras = (dias: number) => new Date(Date.now() - dias * DIA);

describe('Contribuição pendente: prazo vencido e perda da vaga (RF43, DF33)', () => {
  let app: INestApplication;
  let db: Db;
  let fila: FilaService;
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
        ParametrosModule,
        AdministrativoModule,
        CasosModule,
      ],
    }).compile();
    fila = modulo.get(FilaService);
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
    for (const [chave, nome, perfil] of [
      ['secretaria', 'Juliana Rocha', 'secretaria'],
      ['ana', 'Ana Beatriz Costa', 'estagiario'],
      ['pedro', 'Pedro Henrique Lima', 'estagiario'],
      ['carla', 'Carla Mendes', 'supervisor'],
      ['coordenacao', 'Helena Duarte', 'coordenacao'],
    ] as const) {
      const [u] = await db
        .insert(usuarios)
        .values({
          nome,
          email: `${chave}@fbr.edu.br`,
          perfil,
          situacao: 'ativo',
        })
        .returning();
      pessoas[chave] = { id: u.id, nome, perfil };
    }
  });

  // Caso amarelo, em atendimento com a Ana e supervisionado pela Carla, que
  // entrou na fila `naFilaHa` dias atrás e foi vinculado `vinculadoHa` dias atrás.
  async function criarCaso(
    nome: string,
    vinculadoHa: number,
    naFilaHa = 30,
  ): Promise<string> {
    numero += 1;
    const [inscricao] = await db
      .insert(inscricoes)
      .values({
        numero: `2026-${String(numero).padStart(5, '0')}`,
        nomeCompleto: nome,
        dataNascimento: '1990-01-01',
        cpf: String(numero).padStart(11, '0'),
        rg: '1234567',
        endereco: 'Rua Fictícia, 1',
        estadoCivil: 'solteira',
        canalPreferencial: 'email',
        email: 'paciente@exemplo.com',
        queixaCifrada: 'x',
        percepcaoUrgenciaCifrada: 'x',
        historicoRelevanteCifrado: 'x',
        criadaEm: diasAtras(60),
      })
      .returning();
    await db.insert(decisoesPrioridade).values({
      inscricaoId: inscricao.id,
      corCifrada: cifrar('amarela', CHAVE_TESTE),
      decididaPor: pessoas.carla.id,
    });
    const [caso] = await db
      .insert(casos)
      .values({
        inscricaoId: inscricao.id,
        entradaNaFilaEm: diasAtras(naFilaHa),
        situacao: 'em_atendimento',
      })
      .returning();
    await db.insert(atribuicoesSupervisor).values({
      casoId: caso.id,
      supervisorId: pessoas.carla.id,
      atribuidoPor: pessoas.coordenacao.id,
      atribuidoEm: diasAtras(naFilaHa - 1),
    });
    await db.insert(vinculosEstagiario).values({
      casoId: caso.id,
      estagiarioId: pessoas.ana.id,
      vinculadoPor: pessoas.carla.id,
      vinculadoEm: diasAtras(vinculadoHa),
    });
    return caso.id;
  }

  // Caso só na fila, sem responsáveis, que entrou nela `naFilaHa` dias atrás.
  async function criarNaFila(nome: string, naFilaHa: number) {
    const casoId = await criarCaso(nome, 1, naFilaHa);
    await db
      .delete(vinculosEstagiario)
      .where(eq(vinculosEstagiario.casoId, casoId));
    await db
      .delete(atribuicoesSupervisor)
      .where(eq(atribuicoesSupervisor.casoId, casoId));
    await db
      .update(casos)
      .set({ situacao: 'aguardando_distribuicao' })
      .where(eq(casos.id, casoId));
    return casoId;
  }

  async function sessao(casoId: string, inicio: Date, status = 'agendada') {
    const [s] = await db
      .insert(sessoesAtendimento)
      .values({
        casoId,
        cicloAtendimento: 1,
        estagiarioId: pessoas.ana.id,
        inicio,
        termino: new Date(inicio.getTime() + 50 * 60_000),
        fimIntervaloAnotacoes: new Date(inicio.getTime() + 60 * 60_000),
        status: status as 'agendada',
        agendadaPor: pessoas.secretaria.id,
      })
      .returning();
    return s.id;
  }

  const pagar = (casoId: string) =>
    db.insert(pagamentosContribuicao).values({
      casoId,
      cicloAtendimento: 1,
      versao: 1,
      valorCentavos: 3500,
      pagoEm: hojeEmBrasilia(),
      forma: 'pix',
      registradoPor: pessoas.secretaria.id,
    });

  const como = (quem: string) => ({
    'x-usuario-teste': JSON.stringify(pessoas[quem]),
  });
  const http = () => request(app.getHttpServer());
  const vencidos = (quem: string) =>
    http().get('/contribuicoes/prazos-vencidos').set(como(quem));
  const confirmar = (quem: string, casoId: string) =>
    http().post(`/casos/${casoId}/perda-vaga`).set(como(quem));
  const perdaDoCaso = (quem: string, casoId: string) =>
    http().get(`/casos/${casoId}/perda-vaga`).set(como(quem));

  it('sem sessão, as rotas respondem 401', async () => {
    const caso = await criarCaso('Camila Souza Reis', 11);
    await http().get('/contribuicoes/prazos-vencidos').expect(401);
    await http().get(`/casos/${caso}/perda-vaga`).expect(401);
    await http().post(`/casos/${caso}/perda-vaga`).expect(401);
  });

  it('o aviso lista quem foi vinculado há 11 dias sem pagamento, e não quem foi há 9 nem quem pagou', async () => {
    const camila = await criarCaso('Camila Souza Reis', 11);
    await criarCaso('Bruno Dias', 9);
    const pago = await criarCaso('Paula Nunes', 12);
    await pagar(pago);

    const { body } = await vencidos('secretaria').expect(200);
    expect(body).toEqual([
      {
        casoId: camila,
        numero: expect.any(String),
        nome: 'Camila Souza Reis',
        estagiario: 'Ana Beatriz Costa',
        vinculadoEm: expect.any(String),
        ate: prazoDaContribuicao(diasAtras(11)),
      },
    ]);
    await vencidos('coordenacao').expect(200);
  });

  it('só a secretaria e a coordenação veem o aviso e confirmam (403)', async () => {
    const caso = await criarCaso('Camila Souza Reis', 11);
    for (const quem of ['ana', 'carla']) {
      await vencidos(quem).expect(403);
      await perdaDoCaso(quem, caso).expect(403);
      await confirmar(quem, caso).expect(403);
    }
    expect(await db.select().from(perdasVaga)).toEqual([]);
  });

  it('dentro do prazo, ou com o pagamento registrado, a confirmação é recusada (409)', async () => {
    const noPrazo = await criarCaso('Bruno Dias', 9);
    const res = await confirmar('secretaria', noPrazo).expect(409);
    expect(res.body.codigo).toBe('prazo_em_aberto');
    expect(res.body.message).toContain(
      'A perda da vaga só pode ser confirmada depois dele',
    );

    const pago = await criarCaso('Paula Nunes', 12);
    await pagar(pago);
    expect((await confirmar('secretaria', pago).expect(409)).body.codigo).toBe(
      'ja_pago',
    );
    expect(await db.select().from(perdasVaga)).toEqual([]);
  });

  it('a confirmação encerra o vínculo e a atribuição, libera a vaga, cancela as sessões futuras e devolve o caso à fila', async () => {
    const caso = await criarCaso('Camila Souza Reis', 11);
    const passada = await sessao(caso, diasAtras(8), 'realizada');
    const futura = await sessao(caso, new Date(Date.now() + 3 * DIA));

    const { body } = await confirmar('secretaria', caso).expect(200);
    expect(body).toEqual({
      estagiario: 'Ana Beatriz Costa',
      sessoesCanceladas: 1,
      naFilaDesde: expect.any(String),
    });
    expect(Date.now() - new Date(body.naFilaDesde).getTime()).toBeLessThan(
      HORA,
    );

    const [atual] = await db.select().from(casos).where(eq(casos.id, caso));
    expect(atual.situacao).toBe('aguardando_distribuicao');
    expect(atual.entradaNaFilaEm.toISOString()).toBe(body.naFilaDesde);
    const vinculos = await db
      .select()
      .from(vinculosEstagiario)
      .where(eq(vinculosEstagiario.casoId, caso));
    expect(vinculos.every((v) => !v.vigente && v.encerradoEm)).toBe(true);
    const atribuicoes = await db
      .select()
      .from(atribuicoesSupervisor)
      .where(eq(atribuicoesSupervisor.casoId, caso));
    expect(atribuicoes.every((a) => !a.vigente && a.encerradaEm)).toBe(true);

    const sessoes = await db
      .select({ id: sessoesAtendimento.id, status: sessoesAtendimento.status })
      .from(sessoesAtendimento)
      .where(eq(sessoesAtendimento.casoId, caso));
    expect(sessoes.find((s) => s.id === futura)?.status).toBe('cancelada');
    expect(sessoes.find((s) => s.id === passada)?.status).toBe('realizada');
    const [cancelamento] = await db
      .select()
      .from(cancelamentosSessao)
      .where(eq(cancelamentosSessao.sessaoId, futura));
    expect(cancelamento).toMatchObject({
      origem: 'secretaria',
      classificacao: 'administrativo',
      justificativaCifrada: null,
      desligamentoId: null,
    });

    const [perda] = await db.select().from(perdasVaga);
    expect(perda).toMatchObject({
      casoId: caso,
      estagiarioId: pessoas.ana.id,
      supervisorId: pessoas.carla.id,
      prazoAte: prazoDaContribuicao(diasAtras(11)),
      sessoesCanceladas: 1,
      confirmadaPor: pessoas.secretaria.id,
    });
    const [vaga] = await db.select().from(vagasLiberadas);
    expect(vaga).toMatchObject({
      perdaVagaId: perda.id,
      desligamentoId: null,
      estagiarioId: pessoas.ana.id,
      supervisorId: pessoas.carla.id,
      ocupadaEm: null,
    });
    const eventos = await db
      .select()
      .from(auditoria)
      .where(eq(auditoria.operacao, 'confirmar_perda_vaga'));
    expect(eventos).toHaveLength(1);
    expect(eventos[0]).toMatchObject({
      usuarioId: pessoas.secretaria.id,
      entidade: 'perdas_vaga',
      entidadeId: perda.id,
    });

    // Fora do atendimento, uma nova confirmação é recusada, e o aviso some.
    await confirmar('coordenacao', caso).expect(409);
    expect((await vencidos('secretaria').expect(200)).body).toEqual([]);
    expect(await db.select().from(perdasVaga)).toHaveLength(1);
  });

  it('o caso volta com a mesma prioridade, atrás de quem entrou na fila antes dele (RF7)', async () => {
    const caso = await criarCaso('Camila Souza Reis', 11, 30);
    const outro = await criarNaFila('Davi Moura', 2);
    await confirmar('coordenacao', caso).expect(200);

    const ordem = (await fila.ordenada()).map((l) => [l.casoId, l.prioridade]);
    expect(ordem).toEqual([
      [outro, 'amarela'],
      [caso, 'amarela'],
    ]);
  });

  it('a transferência no meio do prazo não o reinicia', async () => {
    const caso = await criarCaso('Camila Souza Reis', 11);
    // A Carla trocou a Ana pelo Pedro há 3 dias (RF25).
    await db
      .update(vinculosEstagiario)
      .set({ vigente: false, encerradoEm: diasAtras(3) })
      .where(eq(vinculosEstagiario.casoId, caso));
    await db.insert(vinculosEstagiario).values({
      casoId: caso,
      estagiarioId: pessoas.pedro.id,
      vinculadoPor: pessoas.carla.id,
      vinculadoEm: diasAtras(3),
    });

    const { body } = await vencidos('secretaria').expect(200);
    expect(body).toEqual([
      expect.objectContaining({
        casoId: caso,
        estagiario: 'Pedro Henrique Lima',
        ate: prazoDaContribuicao(diasAtras(11)),
      }),
    ]);
    await confirmar('secretaria', caso).expect(200);
    const [perda] = await db.select().from(perdasVaga);
    expect(perda.estagiarioId).toBe(pessoas.pedro.id);
  });

  it('depois da volta à fila, o prazo recomeça no vínculo seguinte', async () => {
    const caso = await criarCaso('Camila Souza Reis', 11);
    await confirmar('secretaria', caso).expect(200);
    // Distribuído e vinculado de novo hoje: o prazo conta a partir de agora.
    await db
      .update(casos)
      .set({ situacao: 'em_atendimento' })
      .where(eq(casos.id, caso));
    await db.insert(atribuicoesSupervisor).values({
      casoId: caso,
      supervisorId: pessoas.carla.id,
      atribuidoPor: pessoas.coordenacao.id,
    });
    await db.insert(vinculosEstagiario).values({
      casoId: caso,
      estagiarioId: pessoas.ana.id,
      vinculadoPor: pessoas.carla.id,
    });
    expect((await vencidos('secretaria').expect(200)).body).toEqual([]);
    expect((await confirmar('secretaria', caso).expect(409)).body.codigo).toBe(
      'prazo_em_aberto',
    );
  });

  it('a ficha mostra a prévia antes da confirmação e a perda depois dela', async () => {
    const caso = await criarCaso('Camila Souza Reis', 11);
    const inicio = new Date(Date.now() + 3 * DIA);
    await sessao(caso, inicio);

    const antes = (await perdaDoCaso('secretaria', caso).expect(200)).body;
    expect(antes).toMatchObject({
      previa: {
        estagiario: 'Ana Beatriz Costa',
        ate: prazoDaContribuicao(diasAtras(11)),
        sessoesFuturas: [inicio.toISOString()],
      },
      confirmada: null,
    });

    await confirmar('secretaria', caso).expect(200);
    const depois = (await perdaDoCaso('coordenacao', caso).expect(200)).body;
    expect(depois).toMatchObject({
      previa: null,
      confirmada: {
        confirmadaPor: 'Juliana Rocha',
        sessoesCanceladas: 1,
        estagiario: 'Ana Beatriz Costa',
      },
    });
    expect(depois.naFilaDesde).toBe(depois.confirmada.confirmadaEm);
  });

  it('o estagiário e o supervisor veem o prazo vencido nos responsáveis do caso, sem a confirmação', async () => {
    const caso = await criarCaso('Camila Souza Reis', 11);
    const noPrazo = await criarCaso('Bruno Dias', 9);
    for (const quem of ['ana', 'carla', 'secretaria']) {
      const { body } = await http()
        .get(`/casos/${caso}/responsaveis`)
        .set(como(quem))
        .expect(200);
      expect(body.prazoContribuicaoVencido).toEqual({
        vinculadoEm: expect.any(String),
        ate: prazoDaContribuicao(diasAtras(11)),
      });
    }
    const { body } = await http()
      .get(`/casos/${noPrazo}/responsaveis`)
      .set(como('ana'))
      .expect(200);
    expect(body.prazoContribuicaoVencido).toBeNull();
  });

  it('a perda da vaga é só inserção (gatilho no banco)', async () => {
    const caso = await criarCaso('Camila Souza Reis', 11);
    await confirmar('secretaria', caso).expect(200);
    await expect(
      db.update(perdasVaga).set({ sessoesCanceladas: 5 }),
    ).rejects.toThrow();
    await expect(
      db
        .update(vagasLiberadas)
        .set({ perdaVagaId: null })
        .where(and(eq(vagasLiberadas.estagiarioId, pessoas.ana.id))),
    ).rejects.toThrow();
  });
});
