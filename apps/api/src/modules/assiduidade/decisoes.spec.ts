import { resolve } from 'node:path';
import { Global, INestApplication, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { eq, sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import request from 'supertest';
import {
  atribuicoesSupervisor,
  auditoria,
  cancelamentosSessao,
  casos,
  decisoesReprovacao,
  createDb,
  inscricoes,
  sinalizacoesReprovacao,
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

// RF64 e RNF35: decisão institucional da coordenação sobre a sinalização de
// reprovação do estagiário (RF63). A sinalização nasce pelas ausências registradas
// na rota do RF16. As ausências passam pela rota do RF16, com o relógio parado no
// momento do registro. O usuário da sessão é simulado pelo cabeçalho
// x-usuario-teste. Com TEST_DATABASE_URL, a suíte roda num PostgreSQL real, com as
// migrations oficiais, como a da inscrição (RF1): só assim a trava do estagiário é
// testada com transações de verdade, ao mesmo tempo.
const MINUTO = 60_000;
const MOTIVO = 'Prova da disciplina no mesmo horário.';
const ANTES_DE_TUDO = new Date('2026-01-01T00:00:00-03:00');
const em = (quando: string) => new Date(`${quando}-03:00`);

describe('Decisão sobre a reprovação do estagiário (RF64, RNF35)', () => {
  let app: INestApplication;
  let db: Db;
  let limpar: () => Promise<unknown>;
  let fechar: () => Promise<void>;
  const pessoas: Record<string, UsuarioAutenticado> = {};
  let numero = 0;
  let casoLucas: string;

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
    casoLucas = await criarCaso(pessoas.lucas, pessoas.carla);
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

  const JUSTIFICATIVA =
    'Faltas sem justificativa acadêmica, conforme o regulamento do estágio.';

  const sinalizacoes = (quem: string) =>
    servidor()
      .get('/sinalizacoes-reprovacao')
      .query({ situacao: 'todas' })
      .set('x-usuario-teste', como(quem));

  const decidir = (
    quem: string,
    sinalizacaoId: string,
    corpo: Record<string, unknown> = {
      decisao: 'confirmada',
      justificativa: JUSTIFICATIVA,
    },
  ) =>
    servidor()
      .post(`/sinalizacoes-reprovacao/${sinalizacaoId}/decisoes`)
      .send(corpo)
      .set('x-usuario-teste', como(quem));

  const reclassificar = (cancelamentoId: string) =>
    servidor()
      .post(`/faltas-estagiarios/${cancelamentoId}/reclassificacao`)
      .send({ motivo: 'O estagiário estava em atividade da clínica.' })
      .set('x-usuario-teste', como('coordenacao'))
      .expect(200);

  async function cancelamentoDa(sessaoId: string) {
    const [c] = await db
      .select({ id: cancelamentosSessao.id })
      .from(cancelamentosSessao)
      .where(eq(cancelamentosSessao.sessaoId, sessaoId));
    return c.id;
  }

  // Três ausências do Lucas em 2026/2, que geram a sinalização (RF63).
  async function sinalizacaoDoLucas() {
    const sessoes = [
      await cancelarEm(
        casoLucas,
        'lucas',
        '2026-08-21T16:00:00',
        '2026-08-21T08:05:00',
      ),
      await cancelarEm(
        casoLucas,
        'lucas',
        '2026-09-17T10:00:00',
        '2026-09-16T10:00:00',
      ),
      await cancelarEm(
        casoLucas,
        'lucas',
        '2026-11-12T16:00:00',
        '2026-11-12T08:00:00',
      ),
    ];
    const [sinalizacao] = await db.select().from(sinalizacoesReprovacao);
    return { id: sinalizacao.id, sessoes };
  }

  it('a coordenação registra a decisão com justificativa: guarda o autor e a data/hora e encerra a sinalização, sem mudar a contagem', async () => {
    const { id } = await sinalizacaoDoLucas();

    const { body } = await decidir('coordenacao', id).expect(201);

    expect(body).toEqual({
      id: expect.any(String),
      decisao: 'confirmada',
      justificativa: JUSTIFICATIVA,
      por: 'Helena Duarte',
      em: expect.any(String),
    });
    const [sinalizacao] = await db.select().from(sinalizacoesReprovacao);
    expect(sinalizacao).toMatchObject({
      motivoEncerramento: 'decisao',
      encerradaEm: expect.any(Date),
    });
    const lista = (await sinalizacoes('coordenacao').expect(200)).body
      .sinalizacoes;
    expect(lista[0]).toMatchObject({
      faltas: 3,
      motivoEncerramento: 'decisao',
      decisoes: [
        {
          decisao: 'confirmada',
          justificativa: JUSTIFICATIVA,
          por: 'Helena Duarte',
        },
      ],
    });
  });

  it('a justificativa fica cifrada no banco, e a auditoria registra a decisão sem o texto', async () => {
    const { id } = await sinalizacaoDoLucas();
    await decidir('coordenacao', id).expect(201);

    const [gravada] = await db.select().from(decisoesReprovacao);
    expect(gravada.justificativaCifrada).not.toContain('regulamento');
    expect(gravada.decididaPor).toBe(pessoas.coordenacao.id);
    const [evento] = await db
      .select()
      .from(auditoria)
      .where(eq(auditoria.operacao, 'registrar_decisao_reprovacao'));
    expect(evento).toMatchObject({
      usuarioId: pessoas.coordenacao.id,
      entidade: 'sinalizacoes_reprovacao',
      entidadeId: id,
      dadosAnteriores: { situacao: 'aberta' },
      dadosNovos: {
        situacao: 'decidida',
        decisao: 'confirmada',
        justificativaInformada: true,
      },
    });
    expect(JSON.stringify(evento)).not.toContain('regulamento');
  });

  it('a decisão sem justificativa, sem a escolha ou com mais de 1.000 caracteres não é registrada', async () => {
    const { id } = await sinalizacaoDoLucas();

    const vazia = await decidir('coordenacao', id, {
      decisao: 'confirmada',
      justificativa: '   ',
    }).expect(400);
    await decidir('coordenacao', id, { justificativa: JUSTIFICATIVA }).expect(
      400,
    );
    await decidir('coordenacao', id, {
      decisao: 'talvez',
      justificativa: JUSTIFICATIVA,
    }).expect(400);
    await decidir('coordenacao', id, {
      decisao: 'confirmada',
      justificativa: 'x'.repeat(1001),
    }).expect(400);

    expect(JSON.stringify(vazia.body)).toContain(
      'Informe a justificativa da decisão.',
    );
    expect(await db.select().from(decisoesReprovacao)).toHaveLength(0);
    const [sinalizacao] = await db.select().from(sinalizacoesReprovacao);
    expect(sinalizacao.encerradaEm).toBeNull();
  });

  it('só a coordenação registra: o supervisor, o estagiário e a secretaria recebem 403', async () => {
    const { id } = await sinalizacaoDoLucas();

    for (const quem of ['carla', 'lucas', 'secretaria']) {
      await decidir(quem, id).expect(403);
    }
    expect(await db.select().from(decisoesReprovacao)).toHaveLength(0);
  });

  it('a sinalização inexistente dá 404, e a encerrada porque a contagem caiu abaixo do limite dá 409 (apontamento 1)', async () => {
    const { id, sessoes } = await sinalizacaoDoLucas();
    await reclassificar(await cancelamentoDa(sessoes[1]));

    await decidir('coordenacao', '00000000-0000-4000-8000-000000000000').expect(
      404,
    );
    const recusa = await decidir('coordenacao', id).expect(409);

    expect(recusa.body.message).toContain('encerrada sem decisão');
    expect(await db.select().from(decisoesReprovacao)).toHaveLength(0);
  });

  it('depois de uma reclassificação, a coordenação registra uma nova decisão, e a anterior continua no histórico', async () => {
    const { id, sessoes } = await sinalizacaoDoLucas();
    await decidir('coordenacao', id).expect(201);
    await reclassificar(await cancelamentoDa(sessoes[1]));

    await decidir('coordenacao', id, {
      decisao: 'nao_aplicada',
      justificativa:
        'A falta de 17/09 foi reclassificada, e a contagem caiu para 2.',
    }).expect(201);

    const [sinalizacao] = (await sinalizacoes('coordenacao').expect(200)).body
      .sinalizacoes;
    expect(sinalizacao.faltas).toBe(2);
    expect(
      sinalizacao.decisoes.map((d: { decisao: string }) => d.decisao),
    ).toEqual(['confirmada', 'nao_aplicada']);
    expect(await db.select().from(sinalizacoesReprovacao)).toHaveLength(1);
    const eventos = await db
      .select()
      .from(auditoria)
      .where(eq(auditoria.operacao, 'registrar_decisao_reprovacao'));
    expect(eventos.map((e) => e.dadosAnteriores)).toEqual(
      expect.arrayContaining([
        { situacao: 'aberta' },
        { situacao: 'decidida' },
      ]),
    );
  });

  it('o supervisor vê a decisão, o autor e a data no histórico, sem a justificativa (apontamento 2)', async () => {
    const { id } = await sinalizacaoDoLucas();
    await decidir('coordenacao', id).expect(201);

    const [sinalizacao] = (await sinalizacoes('carla').expect(200)).body
      .sinalizacoes;

    expect(sinalizacao.decisoes).toEqual([
      {
        id: expect.any(String),
        decisao: 'confirmada',
        justificativa: null,
        por: 'Helena Duarte',
        em: expect.any(String),
      },
    ]);
    expect(JSON.stringify(sinalizacao)).not.toContain('regulamento');
  });

  it('a decisão não pode ser alterada nem apagada', async () => {
    const { id } = await sinalizacaoDoLucas();
    await decidir('coordenacao', id).expect(201);

    await expect(
      db.update(decisoesReprovacao).set({ decisao: 'nao_aplicada' }),
    ).rejects.toThrow();
    await expect(db.delete(decisoesReprovacao)).rejects.toThrow();
  });

  it('duas decisões ao mesmo tempo na sinalização aberta: as duas ficam no histórico, e a sinalização é encerrada uma vez', async () => {
    const { id } = await sinalizacaoDoLucas();

    const respostas = await Promise.all([
      decidir('coordenacao', id),
      decidir('coordenacao', id, {
        decisao: 'nao_aplicada',
        justificativa: 'Decisão registrada ao mesmo tempo.',
      }),
    ]);

    expect(respostas.map((r) => r.status)).toEqual([201, 201]);
    expect(await db.select().from(decisoesReprovacao)).toHaveLength(2);
    const eventos = await db
      .select()
      .from(auditoria)
      .where(eq(auditoria.operacao, 'registrar_decisao_reprovacao'));
    expect(
      eventos
        .map((e) => (e.dadosAnteriores as { situacao: string }).situacao)
        .sort(),
    ).toEqual(['aberta', 'decidida']);
  });

  it('a decisão e uma reclassificação ao mesmo tempo nunca deixam a sinalização encerrada pelos dois motivos', async () => {
    const { id, sessoes } = await sinalizacaoDoLucas();
    const cancelamento = await cancelamentoDa(sessoes[1]);

    const [decisao] = await Promise.all([
      decidir('coordenacao', id),
      reclassificar(cancelamento),
    ]);

    const [sinalizacao] = await db.select().from(sinalizacoesReprovacao);
    if (decisao.status === 201) {
      expect(sinalizacao).toMatchObject({
        motivoEncerramento: 'decisao',
        reclassificacaoId: null,
      });
    } else {
      expect(decisao.status).toBe(409);
      expect(sinalizacao.motivoEncerramento).toBe('contagem_abaixo_do_limite');
      expect(await db.select().from(decisoesReprovacao)).toHaveLength(0);
    }
  });
});
