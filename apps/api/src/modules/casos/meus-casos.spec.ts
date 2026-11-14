import { Global, INestApplication, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import {
  atribuicoesSupervisor,
  casos,
  decisoesPrioridade,
  desligamentosPorFaltas,
  inscricoes,
  prontuarios,
  usuarios,
  vinculosEstagiario,
  type Db,
} from '@clinica/database';
import type { Cor, SituacaoCaso } from '@clinica/shared';
import { AuditoriaModule } from '../../auditoria/auditoria.module';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { cifrar } from '../../common/criptografia';
import { DB } from '../../database/database.module';
import { ParametrosModule } from '../../parametros/parametros.module';
import {
  CHAVE_TESTE,
  criarBancoDeTeste,
} from '../../test-utils/banco-de-teste';
import { AcompanhamentoClinicoModule } from '../acompanhamento-clinico/acompanhamento-clinico.module';
import { CasosModule } from './casos.module';

// Casos sob a responsabilidade do estagiário ou do supervisor (RF23): "Meus
// pacientes" e "Meus casos". O usuário da sessão (RF50) é simulado pelo cabeçalho
// x-usuario-teste, como nos outros testes do módulo.
describe('Casos sob responsabilidade do estagiário ou supervisor (RF23)', () => {
  let app: INestApplication;
  let db: Db;
  let limpar: () => Promise<unknown>;
  let fechar: () => Promise<void>;
  const pessoas: Record<string, UsuarioAutenticado> = {};
  let numero = 0;

  beforeAll(async () => {
    ({ db, limpar, fechar } = await criarBancoDeTeste());

    @Global()
    @Module({
      providers: [{ provide: DB, useValue: db }],
      exports: [DB],
    })
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
        CasosModule,
        AcompanhamentoClinicoModule,
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
    for (const [chave, nome, perfil] of [
      ['coordenacao', 'Helena Duarte', 'coordenacao'],
      ['secretaria', 'Juliana Rocha', 'secretaria'],
      ['ricardo', 'Ricardo Menezes', 'supervisor'],
      ['patricia', 'Patrícia Nogueira', 'supervisor'],
      ['ana', 'Ana Beatriz Costa', 'estagiario'],
      ['camila', 'Camila Souza', 'estagiario'],
      ['joao', 'João Victor Almeida', 'estagiario'],
    ] as const) {
      const [u] = await db
        .insert(usuarios)
        .values({ nome, email: `${chave}@fbr.edu.br`, perfil })
        .returning();
      pessoas[chave] = { id: u.id, nome, perfil };
    }
  });

  const como = (quem: string) => ({
    'x-usuario-teste': JSON.stringify(pessoas[quem]),
  });
  const http = () => request(app.getHttpServer());
  const meus = (quem: string) => http().get('/casos/meus').set(como(quem));
  const nomes = (corpo: { nome: string }[]) => corpo.map((c) => c.nome);

  // Caso com a queixa guardada, para provar que não vaza (RNF17), a prioridade, o
  // supervisor, o estagiário e o prontuário, quando há vínculo.
  async function criarCaso(
    nome: string,
    {
      cor = 'verde',
      supervisor,
      estagiario,
      situacao = estagiario ? 'em_atendimento' : 'aguardando_vinculo',
    }: {
      cor?: Cor;
      supervisor: string;
      estagiario?: string;
      situacao?: SituacaoCaso;
    },
  ) {
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
        estadoCivil: 'solteiro',
        canalPreferencial: 'email',
        email: `paciente${numero}@exemplo.com`,
        queixaCifrada: cifrar('queixa sigilosa', CHAVE_TESTE),
        percepcaoUrgenciaCifrada: cifrar('urgência sigilosa', CHAVE_TESTE),
        historicoRelevanteCifrado: cifrar('histórico sigiloso', CHAVE_TESTE),
        criadaEm: new Date(Date.UTC(2026, 9, numero)),
      })
      .returning();
    await db.insert(decisoesPrioridade).values({
      inscricaoId: inscricao.id,
      corCifrada: cifrar(cor, CHAVE_TESTE),
      decididaPor: pessoas.coordenacao.id,
    });
    const [caso] = await db
      .insert(casos)
      .values({
        inscricaoId: inscricao.id,
        entradaNaFilaEm: inscricao.criadaEm,
        situacao,
      })
      .returning();
    await db.insert(atribuicoesSupervisor).values({
      casoId: caso.id,
      supervisorId: pessoas[supervisor].id,
      atribuidoPor: pessoas.coordenacao.id,
    });
    let prontuarioId: string | undefined;
    if (estagiario) {
      const [vinculo] = await db
        .insert(vinculosEstagiario)
        .values({
          casoId: caso.id,
          estagiarioId: pessoas[estagiario].id,
          vinculadoPor: pessoas[supervisor].id,
        })
        .returning();
      [{ id: prontuarioId }] = await db
        .insert(prontuarios)
        .values({
          casoId: caso.id,
          cicloAtendimento: 1,
          vinculoOrigemId: vinculo.id,
        })
        .returning();
    }
    return { casoId: caso.id, prontuarioId };
  }

  // Dois estagiários do Ricardo, com dois casos cada, um caso dele aguardando
  // vínculo e um caso da Patrícia (dados de teste do projeto da feature).
  async function cenario() {
    const mariana = await criarCaso('Mariana Alves Toledo', {
      cor: 'amarela',
      supervisor: 'ricardo',
      estagiario: 'ana',
    });
    await criarCaso('Tatiane Moreira Lopes', {
      supervisor: 'ricardo',
      estagiario: 'ana',
    });
    await criarCaso('Gustavo Henrique Dias', {
      supervisor: 'ricardo',
      estagiario: 'camila',
    });
    await criarCaso('Beatriz Oliveira Santos', {
      cor: 'vermelha',
      supervisor: 'ricardo',
      estagiario: 'camila',
    });
    await criarCaso('Rafael Gomes Ribeiro', { supervisor: 'ricardo' });
    const daPatricia = await criarCaso('Paulo Nunes', {
      supervisor: 'patricia',
      estagiario: 'joao',
    });
    return { mariana, daPatricia };
  }

  it('o estagiário vê só os casos vinculados a ele, com a prioridade, a situação e o supervisor, sem dado clínico (RF23, RNF17)', async () => {
    const { mariana } = await cenario();
    const r = await meus('ana');
    expect(r.status).toBe(200);
    expect(nomes(r.body)).toEqual([
      'Mariana Alves Toledo',
      'Tatiane Moreira Lopes',
    ]);
    expect(r.body[0]).toMatchObject({
      casoId: mariana.casoId,
      prioridade: 'amarela',
      situacao: 'em_atendimento',
      estagiario: 'Ana Beatriz Costa',
      supervisor: 'Ricardo Menezes',
      prontuarioId: mariana.prontuarioId,
    });
    expect(JSON.stringify(r.body)).not.toMatch(/sigilos|queixa/i);
  });

  it('o supervisor vê os casos sob a sua responsabilidade e os dos seus estagiários, e nenhum de outro supervisor (RF23, RNF16, RNF17)', async () => {
    await cenario();
    const r = await meus('ricardo');
    expect(r.status).toBe(200);
    expect(nomes(r.body)).toEqual([
      'Mariana Alves Toledo',
      'Tatiane Moreira Lopes',
      'Gustavo Henrique Dias',
      'Beatriz Oliveira Santos',
      'Rafael Gomes Ribeiro',
    ]);
    expect(r.body.at(-1)).toMatchObject({
      estagiario: null,
      situacao: 'aguardando_vinculo',
    });
    expect(JSON.stringify(r.body)).not.toMatch(/Paulo Nunes|sigilos/);
  });

  it('cada caso traz o id do estagiário, para o filtro da tela; dois estagiários com o mesmo nome têm ids diferentes (RF23)', async () => {
    await cenario();
    const [homonimo] = await db
      .insert(usuarios)
      .values({
        nome: 'Camila Souza',
        email: 'camila2@fbr.edu.br',
        perfil: 'estagiario',
      })
      .returning();
    const lucas = await criarCaso('Lucas Ferreira Prado', {
      supervisor: 'ricardo',
      estagiario: 'camila',
    });
    // O caso do Lucas passa ao estagiário homônimo.
    await db
      .update(vinculosEstagiario)
      .set({ estagiarioId: homonimo.id })
      .where(eq(vinculosEstagiario.casoId, lucas.casoId));
    const r = (await meus('ricardo')).body as {
      estagiario: string | null;
      estagiarioId: string | null;
    }[];
    const camilas = r.filter((c) => c.estagiario === 'Camila Souza');
    expect(new Set(camilas.map((c) => c.estagiarioId))).toEqual(
      new Set([pessoas.camila.id, homonimo.id]),
    );
    // A Ana não recebe o id da Camila, que não tem caso em comum com ela.
    expect(JSON.stringify((await meus('ana')).body)).not.toContain(
      pessoas.camila.id,
    );
  });

  it('estagiário sem casos recebe a lista vazia (RF23)', async () => {
    await cenario();
    const r = await meus('joao');
    expect(nomes(r.body)).toEqual(['Paulo Nunes']);
    // O caso do João passa a outro estagiário: ele fica sem casos.
    await db
      .update(vinculosEstagiario)
      .set({ vigente: false, encerradoEm: new Date() });
    expect((await meus('joao')).body).toEqual([]);
  });

  it('quem perde o vínculo ou a atribuição deixa de ver o caso na lista e tem o prontuário negado (RF23, RNF16)', async () => {
    const { mariana } = await cenario();
    await db
      .update(vinculosEstagiario)
      .set({ vigente: false, encerradoEm: new Date() })
      .where(eq(vinculosEstagiario.casoId, mariana.casoId));
    expect(nomes((await meus('ana')).body)).toEqual(['Tatiane Moreira Lopes']);
    expect(
      (
        await http()
          .get(`/prontuarios/${mariana.prontuarioId}`)
          .set(como('ana'))
      ).status,
    ).toBe(403);

    await db
      .update(atribuicoesSupervisor)
      .set({ vigente: false, encerradaEm: new Date() })
      .where(eq(atribuicoesSupervisor.casoId, mariana.casoId));
    expect(nomes((await meus('ricardo')).body)).not.toContain(
      'Mariana Alves Toledo',
    );
  });

  it('o acesso direto ao prontuário de um caso de outro é negado ao estagiário e ao supervisor (RF23, RNF16)', async () => {
    const { daPatricia } = await cenario();
    for (const quem of ['ana', 'ricardo']) {
      const r = await http()
        .get(`/prontuarios/${daPatricia.prontuarioId}`)
        .set(como(quem));
      expect([quem, r.status]).toEqual([quem, 403]);
      expect(JSON.stringify(r.body)).not.toMatch(/Paulo|João/);
    }
  });

  it('o caso desligado por faltas aparece ao supervisor com o último estagiário e a data do desligamento (RF23, RF37)', async () => {
    const { mariana } = await cenario();
    await db
      .update(vinculosEstagiario)
      .set({ vigente: false, encerradoEm: new Date() })
      .where(eq(vinculosEstagiario.casoId, mariana.casoId));
    await db
      .update(casos)
      .set({ situacao: 'desligado_por_faltas' })
      .where(eq(casos.id, mariana.casoId));
    await db.insert(desligamentosPorFaltas).values({
      casoId: mariana.casoId,
      cicloAtendimento: 1,
      dataDecisao: '2026-10-28',
      decididoPor: pessoas.coordenacao.id,
    });
    const [caso] = (await meus('ricardo')).body;
    expect(caso).toMatchObject({
      nome: 'Mariana Alves Toledo',
      situacao: 'desligado_por_faltas',
      estagiario: null,
      estagiarioId: null,
      estagiarioAnterior: 'Ana Beatriz Costa',
      estagiarioAnteriorId: pessoas.ana.id,
    });
    expect(caso.vinculoEncerradoEm).toBeTruthy();
  });

  it('só o estagiário e o supervisor consultam; sem sessão é 401 e a resposta não fica em cache (RF23, RNF16, RNF17)', async () => {
    await cenario();
    for (const quem of ['secretaria', 'coordenacao']) {
      expect([quem, (await meus(quem)).status]).toEqual([quem, 403]);
    }
    expect((await http().get('/casos/meus')).status).toBe(401);
    expect((await meus('ana')).headers['cache-control']).toBe('no-store');
  });
});
