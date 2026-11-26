import { resolve } from 'node:path';
import { Global, INestApplication, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { and, eq, sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import request from 'supertest';
import {
  atribuicoesSupervisor,
  auditoria,
  cancelamentosSessao,
  casos,
  createDb,
  inscricoes,
  reclassificacoesFalta,
  sessoesAtendimento,
  usuarios,
  vinculosEstagiario,
  type Db,
} from '@clinica/database';
import { AuditoriaModule } from '../../auditoria/auditoria.module';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { DB } from '../../database/database.module';
import { EmailService } from '../../notificacoes/email.service';
import { ParametrosModule } from '../../parametros/parametros.module';
import {
  CHAVE_TESTE,
  criarBancoDeTeste,
} from '../../test-utils/banco-de-teste';
import { AgendamentoModule } from '../agendamento/agendamento.module';

// RF40 e RNF35: contagem das faltas do estagiário no semestre, para o supervisor e
// a coordenação, e a reclassificação de uma ausência registrada por engano, pela
// coordenação. As ausências passam pela rota do RF16, com o relógio parado no
// momento do registro. O usuário da sessão é simulado pelo cabeçalho
// x-usuario-teste. Com TEST_DATABASE_URL, a suíte roda num PostgreSQL real, com as
// migrations oficiais, como a da inscrição (RF1): só assim a trava do estagiário é
// testada com transações de verdade, ao mesmo tempo.
const MINUTO = 60_000;
const MOTIVO = 'Prova da disciplina no mesmo horário.';
const ANTES_DE_TUDO = new Date('2026-01-01T00:00:00-03:00');
const em = (quando: string) => new Date(`${quando}-03:00`);

describe('Faltas do estagiário no semestre (RF40, RNF35)', () => {
  let app: INestApplication;
  let db: Db;
  let limpar: () => Promise<unknown>;
  let fechar: () => Promise<void>;
  const pessoas: Record<string, UsuarioAutenticado> = {};
  let numero = 0;
  let casoAna: string;
  let casoLucas: string;
  // A Ana também atende um caso da Patrícia (apontamento 1 da inspeção).
  let casoAnaPatricia: string;

  beforeAll(async () => {
    const url = process.env.TEST_DATABASE_URL;
    if (url) {
      if (!/^\/clinica_rf1_test_[a-z0-9_]+$/.test(new URL(url).pathname))
        throw new Error(
          'Use um banco descartável clinica_rf1_test_*; esta suíte esvazia suas tabelas.',
        );
      db = createDb(url);
      await migrate(db, {
        migrationsFolder: resolve(
          __dirname,
          '../../../../../packages/database/drizzle',
        ),
      });
      fechar = () => db.$client.end();
      limpar = () =>
        db.execute(
          sql`TRUNCATE acessos_prontuario, links_confirmacao, sessoes_atendimento, prontuarios, vinculos_estagiario, atribuicoes_supervisor, casos, decisoes_prioridade, inscricoes, sessoes_login, convites_ativacao, auditoria, usuarios, limites_codigo_verificacao CASCADE`,
        );
    } else {
      ({ db, limpar, fechar } = await criarBancoDeTeste());
    }

    @Global()
    @Module({
      providers: [
        { provide: DB, useValue: db },
        { provide: EmailService, useValue: { enviar: jest.fn() } },
      ],
      exports: [DB, EmailService],
    })
    class InfraDeTeste {}

    const modulo = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              WEB_URL: 'http://localhost:3000',
              CHAVE_DADOS: CHAVE_TESTE,
            }),
          ],
        }),
        InfraDeTeste,
        AuditoriaModule,
        ParametrosModule,
        AgendamentoModule,
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
    jest.useRealTimers();
    await limpar();
    for (const [chave, nome, perfil] of [
      ['secretaria', 'Juliana Rocha', 'secretaria'],
      ['ana', 'Ana Beatriz Costa', 'estagiario'],
      ['lucas', 'Lucas Ferreira', 'estagiario'],
      ['joao', 'João Victor Almeida', 'estagiario'],
      ['carla', 'Carla Mendes', 'supervisor'],
      ['patricia', 'Patrícia Nogueira', 'supervisor'],
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
    casoAna = await criarCaso(pessoas.ana, pessoas.carla);
    casoLucas = await criarCaso(pessoas.lucas, pessoas.carla);
    // O João, da Patrícia, aparece para a coordenação com 0 faltas.
    await criarCaso(pessoas.joao, pessoas.patricia);
    casoAnaPatricia = await criarCaso(pessoas.ana, pessoas.patricia);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // Caso em atendimento, com o vínculo e a atribuição desde o começo do ano.
  async function criarCaso(
    estagiario: UsuarioAutenticado,
    supervisor: UsuarioAutenticado,
  ) {
    numero += 1;
    const [inscricao] = await db
      .insert(inscricoes)
      .values({
        numero: `2026-${String(numero).padStart(4, '0')}`,
        nomeCompleto: 'Mariana Alves Toledo',
        dataNascimento: '1990-01-01',
        cpf: String(numero).padStart(11, '0'),
        rg: '1234567',
        endereco: 'Rua Fictícia, 1',
        estadoCivil: 'solteiro',
        canalPreferencial: 'email',
        celular: '61998765432',
        email: 'mariana@exemplo.com',
        queixaCifrada: 'x',
        percepcaoUrgenciaCifrada: 'x',
        historicoRelevanteCifrado: 'x',
      })
      .returning();
    const [novo] = await db
      .insert(casos)
      .values({
        inscricaoId: inscricao.id,
        entradaNaFilaEm: ANTES_DE_TUDO,
        situacao: 'em_atendimento',
      })
      .returning();
    await db.insert(atribuicoesSupervisor).values({
      casoId: novo.id,
      supervisorId: supervisor.id,
      atribuidoPor: pessoas.coordenacao.id,
      atribuidoEm: ANTES_DE_TUDO,
    });
    await db.insert(vinculosEstagiario).values({
      casoId: novo.id,
      estagiarioId: estagiario.id,
      vinculadoPor: supervisor.id,
      vinculadoEm: ANTES_DE_TUDO,
    });
    return novo.id;
  }

  // Só o relógio do JavaScript para: o banco e o servidor seguem normais.
  const pararRelogioEm = (instante: Date) =>
    jest.useFakeTimers({
      now: instante,
      doNotFake: [
        'nextTick',
        'setImmediate',
        'clearImmediate',
        'setInterval',
        'clearInterval',
        'setTimeout',
        'clearTimeout',
        'queueMicrotask',
        'hrtime',
        'performance',
      ],
    });

  const servidor = () => request(app.getHttpServer());
  const como = (quem: string) => JSON.stringify(pessoas[quem]);

  async function criarSessao(
    casoId: string,
    estagiarioId: string,
    inicio: Date,
  ) {
    const termino = new Date(inicio.getTime() + 50 * MINUTO);
    const [sessao] = await db
      .insert(sessoesAtendimento)
      .values({
        casoId,
        estagiarioId,
        inicio,
        termino,
        fimIntervaloAnotacoes: new Date(termino.getTime() + 10 * MINUTO),
        status: 'agendada',
        agendadaPor: pessoas.secretaria.id,
      })
      .returning();
    return sessao.id;
  }

  // Cancela a sessão no instante `registro`, pela rota do RF16 (ausência) ou do
  // RF15 (pedido do paciente ou para remarcar), pela secretaria.
  async function cancelarEm(
    casoId: string,
    estagiario: string,
    sessao: string,
    registro: string,
    tipo: 'ausencia' | 'pedido_paciente' | 'administrativo' = 'ausencia',
  ) {
    const id = await criarSessao(casoId, pessoas[estagiario].id, em(sessao));
    pararRelogioEm(em(registro));
    const pedido =
      tipo === 'ausencia'
        ? servidor()
            .post(`/sessoes/${id}/ausencia-estagiario`)
            .send({ justificativa: MOTIVO })
        : servidor()
            .post(`/sessoes/${id}/cancelamento`)
            .send({ tipo, justificativa: MOTIVO });
    await pedido.set('x-usuario-teste', como('secretaria')).expect(200);
    jest.useRealTimers();
    return id;
  }

  const consultar = (
    quem: string,
    filtro: { semestre?: string; estagiarioId?: string } = {},
  ) =>
    servidor()
      .get('/faltas-estagiarios/semestre')
      .query({ semestre: '2026/2', ...filtro })
      .set('x-usuario-teste', como(quem));

  const MOTIVO_RECLASSIFICACAO = 'O estagiário estava em atividade da clínica.';

  const reclassificar = (
    quem: string,
    cancelamentoId: string,
    corpo: Record<string, unknown> = { motivo: MOTIVO_RECLASSIFICACAO },
  ) =>
    servidor()
      .post(`/faltas-estagiarios/${cancelamentoId}/reclassificacao`)
      .send(corpo)
      .set('x-usuario-teste', como(quem));

  async function cancelamentoDa(sessaoId: string) {
    const [c] = await db
      .select({ id: cancelamentosSessao.id })
      .from(cancelamentosSessao)
      .where(eq(cancelamentosSessao.sessaoId, sessaoId));
    return c.id;
  }

  type Linha = { inicio: string; reclassificada: unknown };
  type Resumo = {
    estagiario: { id: string; nome: string };
    faltas: number;
    faltasDeOutrosSupervisores: number;
    linhas: Linha[];
  };
  const doEstagiario = (body: { estagiarios: Resumo[] }, quem: string) =>
    body.estagiarios.find((e) => e.estagiario.id === pessoas[quem].id)!;

  it('cada ausência real do estagiário soma uma falta no semestre, e o cancelamento para remarcar não conta', async () => {
    await cancelarEm(
      casoAna,
      'ana',
      '2026-10-29T14:00:00',
      '2026-10-28T09:12:00',
    );
    await cancelarEm(
      casoAna,
      'ana',
      '2026-09-10T10:00:00',
      '2026-09-09T18:40:00',
    );
    await cancelarEm(
      casoAna,
      'ana',
      '2026-09-15T10:00:00',
      '2026-09-14T10:00:00',
      'administrativo',
    );
    await cancelarEm(
      casoAna,
      'ana',
      '2026-09-17T10:00:00',
      '2026-09-16T10:00:00',
      'pedido_paciente',
    );

    const { body } = await consultar('coordenacao').expect(200);

    const ana = doEstagiario(body, 'ana');
    expect(ana.faltas).toBe(2);
    expect(ana.linhas.map((l) => l.inicio)).toEqual([
      em('2026-10-29T14:00:00').toISOString(),
      em('2026-09-10T10:00:00').toISOString(),
    ]);
  });

  it('o resumo traz todos os estagiários visíveis, com quem tem mais faltas primeiro, e quem não faltou com 0', async () => {
    await cancelarEm(
      casoLucas,
      'lucas',
      '2026-08-21T16:00:00',
      '2026-08-21T08:05:00',
    );
    await cancelarEm(
      casoLucas,
      'lucas',
      '2026-09-21T16:00:00',
      '2026-09-21T08:05:00',
    );
    await cancelarEm(
      casoAna,
      'ana',
      '2026-09-10T10:00:00',
      '2026-09-09T18:40:00',
    );

    const { body } = await consultar('carla').expect(200);

    expect(
      body.estagiarios.map((e: Resumo) => [e.estagiario.nome, e.faltas]),
    ).toEqual([
      ['Lucas Ferreira', 2],
      ['Ana Beatriz Costa', 1],
    ]);
    const coordenacao = await consultar('coordenacao').expect(200);
    expect(doEstagiario(coordenacao.body, 'joao')).toMatchObject({
      faltas: 0,
      linhas: [],
    });
  });

  it('o semestre é o da data da sessão em Brasília, e o semestre anterior continua consultável', async () => {
    // 30/06 às 22h em Brasília já é 01/07 em UTC, e continua no 1º semestre.
    await cancelarEm(
      casoAna,
      'ana',
      '2026-06-30T22:00:00',
      '2026-06-29T10:00:00',
    );
    await cancelarEm(
      casoAna,
      'ana',
      '2026-07-01T08:00:00',
      '2026-06-29T11:00:00',
    );

    const segundo = await consultar('carla').expect(200);
    const primeiro = await consultar('carla', { semestre: '2026/1' }).expect(
      200,
    );

    expect(doEstagiario(segundo.body, 'ana').faltas).toBe(1);
    expect(doEstagiario(primeiro.body, 'ana').faltas).toBe(1);
    expect(doEstagiario(primeiro.body, 'ana').linhas[0].inicio).toBe(
      em('2026-06-30T22:00:00').toISOString(),
    );
    expect(primeiro.body.semestres).toEqual(
      expect.arrayContaining(['2026/2', '2026/1']),
    );
  });

  it('a ausência registrada em dezembro para uma sessão de janeiro conta no 1º semestre do ano seguinte', async () => {
    await cancelarEm(
      casoAna,
      'ana',
      '2027-01-12T10:00:00',
      '2026-12-18T10:00:00',
    );

    const dezembro = await consultar('coordenacao').expect(200);
    const janeiro = await consultar('coordenacao', {
      semestre: '2027/1',
    }).expect(200);

    expect(doEstagiario(dezembro.body, 'ana').faltas).toBe(0);
    expect(doEstagiario(janeiro.body, 'ana').faltas).toBe(1);
    expect(dezembro.body.semestres).toContain('2027/1');
  });

  it('o supervisor vê a contagem total do estagiário, mas as datas só das faltas nos casos dele (apontamento 1)', async () => {
    await cancelarEm(
      casoAna,
      'ana',
      '2026-10-29T14:00:00',
      '2026-10-28T09:12:00',
    );
    await cancelarEm(
      casoAna,
      'ana',
      '2026-09-10T10:00:00',
      '2026-09-09T18:40:00',
    );
    await cancelarEm(
      casoAnaPatricia,
      'ana',
      '2026-11-05T15:00:00',
      '2026-11-04T09:00:00',
    );

    const carla = doEstagiario(
      (await consultar('carla').expect(200)).body,
      'ana',
    );
    const patricia = doEstagiario(
      (await consultar('patricia').expect(200)).body,
      'ana',
    );
    const coordenacao = doEstagiario(
      (await consultar('coordenacao').expect(200)).body,
      'ana',
    );

    expect(carla).toMatchObject({ faltas: 3, faltasDeOutrosSupervisores: 1 });
    expect(carla.linhas).toHaveLength(2);
    expect(patricia).toMatchObject({
      faltas: 3,
      faltasDeOutrosSupervisores: 2,
    });
    expect(patricia.linhas.map((l) => l.inicio)).toEqual([
      em('2026-11-05T15:00:00').toISOString(),
    ]);
    expect(coordenacao).toMatchObject({
      faltas: 3,
      faltasDeOutrosSupervisores: 0,
    });
    expect(coordenacao.linhas).toHaveLength(3);
  });

  it('a resposta não tem o nome do paciente nem o motivo da ausência (RNF35)', async () => {
    await cancelarEm(
      casoAna,
      'ana',
      '2026-10-29T14:00:00',
      '2026-10-28T09:12:00',
    );

    const { body } = await consultar('coordenacao').expect(200);

    const texto = JSON.stringify(body);
    expect(texto).not.toContain('Mariana');
    expect(texto).not.toContain('Prova');
    expect(texto).not.toMatch(/justificativa|paciente|caso/i);
  });

  it('a coordenação reclassifica a ausência com motivo: a contagem cai, e a falta continua na lista, marcada, com o autor, a data e o motivo', async () => {
    const sessao = await cancelarEm(
      casoAna,
      'ana',
      '2026-10-29T14:00:00',
      '2026-10-28T09:12:00',
    );
    await cancelarEm(
      casoAna,
      'ana',
      '2026-09-10T10:00:00',
      '2026-09-09T18:40:00',
    );
    const cancelamento = await cancelamentoDa(sessao);

    const { body: resultado } = await reclassificar(
      'coordenacao',
      cancelamento,
    ).expect(200);

    expect(resultado).toEqual({
      estagiarioId: pessoas.ana.id,
      semestre: '2026/2',
      faltas: 1,
    });
    const ana = doEstagiario(
      (await consultar('coordenacao').expect(200)).body,
      'ana',
    );
    expect(ana.faltas).toBe(1);
    expect(ana.linhas[0]).toEqual({
      id: cancelamento,
      inicio: em('2026-10-29T14:00:00').toISOString(),
      registradaEm: em('2026-10-28T09:12:00').toISOString(),
      reclassificada: {
        por: 'Helena Duarte',
        em: expect.any(String),
        motivo: MOTIVO_RECLASSIFICACAO,
      },
    });
  });

  it('o supervisor vê a falta reclassificada, com o autor e a data, mas sem o motivo', async () => {
    const sessao = await cancelarEm(
      casoAna,
      'ana',
      '2026-10-29T14:00:00',
      '2026-10-28T09:12:00',
    );
    await reclassificar('coordenacao', await cancelamentoDa(sessao)).expect(
      200,
    );

    const ana = doEstagiario(
      (await consultar('carla').expect(200)).body,
      'ana',
    );

    expect(ana.faltas).toBe(0);
    expect(ana.linhas[0].reclassificada).toEqual({
      por: 'Helena Duarte',
      em: expect.any(String),
      motivo: null,
    });
    expect(JSON.stringify(ana)).not.toContain('atividade da clínica');
  });

  it('a relação do período (RF39) marca a falta reclassificada, sem o motivo', async () => {
    const sessao = await cancelarEm(
      casoAna,
      'ana',
      '2026-10-29T14:00:00',
      '2026-10-28T09:12:00',
    );
    await reclassificar('coordenacao', await cancelamentoDa(sessao)).expect(
      200,
    );

    const { body } = await servidor()
      .get('/faltas-estagiarios')
      .query({ inicio: '2026-08-01', fim: '2026-10-31' })
      .set('x-usuario-teste', como('coordenacao'))
      .expect(200);

    expect(body.faltas[0].reclassificada).toEqual({
      por: 'Helena Duarte',
      em: expect.any(String),
      motivo: null,
    });
  });

  it('o motivo fica cifrado no banco, e a auditoria registra a reclassificação sem o texto do motivo', async () => {
    const sessao = await cancelarEm(
      casoAna,
      'ana',
      '2026-10-29T14:00:00',
      '2026-10-28T09:12:00',
    );
    const cancelamento = await cancelamentoDa(sessao);
    await reclassificar('coordenacao', cancelamento).expect(200);

    const [gravada] = await db.select().from(reclassificacoesFalta);
    expect(gravada.motivoCifrado).not.toContain('atividade');
    expect(gravada.reclassificadaPor).toBe(pessoas.coordenacao.id);
    const [evento] = await db
      .select()
      .from(auditoria)
      .where(eq(auditoria.operacao, 'reclassificar_falta_estagiario'));
    expect(evento).toMatchObject({
      usuarioId: pessoas.coordenacao.id,
      entidade: 'cancelamentos_sessao',
      entidadeId: cancelamento,
      dadosAnteriores: { classificacao: 'ausencia_estagiario' },
      dadosNovos: {
        classificacao: 'administrativo',
        motivoInformado: true,
      },
    });
    expect(JSON.stringify(evento)).not.toContain('atividade');
  });

  it('a reclassificação sem motivo, ou com mais de 1.000 caracteres, é recusada com o campo', async () => {
    const sessao = await cancelarEm(
      casoAna,
      'ana',
      '2026-10-29T14:00:00',
      '2026-10-28T09:12:00',
    );
    const cancelamento = await cancelamentoDa(sessao);

    const vazio = await reclassificar('coordenacao', cancelamento, {
      motivo: '   ',
    }).expect(400);
    await reclassificar('coordenacao', cancelamento, {}).expect(400);
    await reclassificar('coordenacao', cancelamento, {
      motivo: 'x'.repeat(1001),
    }).expect(400);

    expect(JSON.stringify(vazio.body)).toContain(
      'Informe o motivo da reclassificação.',
    );
    expect(await db.select().from(reclassificacoesFalta)).toHaveLength(0);
  });

  it('a falta já reclassificada e o cancelamento que não é ausência do estagiário dão 409; a falta inexistente dá 404', async () => {
    const ausencia = await cancelarEm(
      casoAna,
      'ana',
      '2026-10-29T14:00:00',
      '2026-10-28T09:12:00',
    );
    const remarcar = await cancelarEm(
      casoAna,
      'ana',
      '2026-09-15T10:00:00',
      '2026-09-14T10:00:00',
      'administrativo',
    );
    const cancelamento = await cancelamentoDa(ausencia);
    await reclassificar('coordenacao', cancelamento).expect(200);

    await reclassificar('coordenacao', cancelamento).expect(409);
    await reclassificar('coordenacao', await cancelamentoDa(remarcar)).expect(
      409,
    );
    await reclassificar(
      'coordenacao',
      '00000000-0000-4000-8000-000000000000',
    ).expect(404);
    expect(await db.select().from(reclassificacoesFalta)).toHaveLength(1);
  });

  it('só a coordenação reclassifica: o supervisor, o estagiário e a secretaria recebem 403', async () => {
    const sessao = await cancelarEm(
      casoAna,
      'ana',
      '2026-10-29T14:00:00',
      '2026-10-28T09:12:00',
    );
    const cancelamento = await cancelamentoDa(sessao);

    for (const quem of ['carla', 'ana', 'secretaria']) {
      await reclassificar(quem, cancelamento).expect(403);
    }
    expect(await db.select().from(reclassificacoesFalta)).toHaveLength(0);
  });

  it('o estagiário e a secretaria não consultam a contagem (RNF35)', async () => {
    await consultar('ana').expect(403);
    await consultar('secretaria').expect(403);
  });

  it('o supervisor sem vínculo com o estagiário recebe 403, e a tentativa fica na auditoria (RNF35)', async () => {
    await cancelarEm(
      casoLucas,
      'lucas',
      '2026-08-21T16:00:00',
      '2026-08-21T08:05:00',
    );

    await consultar('patricia', { estagiarioId: pessoas.lucas.id }).expect(403);

    const [tentativa] = await db
      .select()
      .from(auditoria)
      .where(
        and(
          eq(auditoria.operacao, 'consultar_faltas_estagiario_negada'),
          eq(auditoria.usuarioId, pessoas.patricia.id),
        ),
      );
    expect(tentativa.entidadeId).toBe(pessoas.lucas.id);
    const { body } = await consultar('patricia').expect(200);
    expect(
      body.estagiarios.some(
        (e: Resumo) => e.estagiario.id === pessoas.lucas.id,
      ),
    ).toBe(false);
  });

  it('duas reclassificações da mesma falta ao mesmo tempo: uma entra e a outra recebe 409, sem erro 500', async () => {
    const sessao = await cancelarEm(
      casoAna,
      'ana',
      '2026-10-29T14:00:00',
      '2026-10-28T09:12:00',
    );
    const cancelamento = await cancelamentoDa(sessao);

    const respostas = await Promise.all([
      reclassificar('coordenacao', cancelamento),
      reclassificar('coordenacao', cancelamento),
    ]);

    expect(respostas.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await db.select().from(reclassificacoesFalta)).toHaveLength(1);
  });

  it('duas ausências do mesmo estagiário registradas ao mesmo tempo entram as duas, uma depois da outra, e as duas contam', async () => {
    const sessoes = await Promise.all([
      criarSessao(casoAna, pessoas.ana.id, em('2026-12-14T10:00:00')),
      criarSessao(casoAnaPatricia, pessoas.ana.id, em('2026-12-15T10:00:00')),
    ]);

    const respostas = await Promise.all(
      sessoes.map((id) =>
        servidor()
          .post(`/sessoes/${id}/ausencia-estagiario`)
          .send({ justificativa: MOTIVO })
          .set('x-usuario-teste', como('secretaria')),
      ),
    );

    expect(respostas.map((r) => r.status)).toEqual([200, 200]);
    const ana = doEstagiario(
      (await consultar('coordenacao').expect(200)).body,
      'ana',
    );
    expect(ana.faltas).toBe(2);
  });

  it('o semestre em formato inválido é recusado', async () => {
    await consultar('coordenacao', { semestre: '2026-2' }).expect(400);
    await consultar('coordenacao', { semestre: '2026/3' }).expect(400);
  });
});
