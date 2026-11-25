import { resolve } from 'node:path';
import { Global, INestApplication, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { eq, sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import request from 'supertest';
import {
  atribuicoesSupervisor,
  cancelamentosSessao,
  casos,
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

// RF63 e RNF35: sinalização de reprovação do estagiário por faltas, gerada na
// terceira falta do semestre e encerrada pela reclassificação que deixa a contagem
// abaixo do limite, para o supervisor do estagiário e a coordenação. As ausências passam pela rota do RF16, com o relógio parado no
// momento do registro. O usuário da sessão é simulado pelo cabeçalho
// x-usuario-teste. Com TEST_DATABASE_URL, a suíte roda num PostgreSQL real, com as
// migrations oficiais, como a da inscrição (RF1): só assim a trava do estagiário é
// testada com transações de verdade, ao mesmo tempo.
const MINUTO = 60_000;
const MOTIVO = 'Prova da disciplina no mesmo horário.';
const ANTES_DE_TUDO = new Date('2026-01-01T00:00:00-03:00');
const em = (quando: string) => new Date(`${quando}-03:00`);

describe('Sinalização de reprovação do estagiário (RF63, RNF35)', () => {
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

  const sinalizacoes = (
    quem: string,
    filtro: { situacao?: 'abertas' | 'todas'; estagiarioId?: string } = {},
  ) =>
    servidor()
      .get('/sinalizacoes-reprovacao')
      .query(filtro)
      .set('x-usuario-teste', como(quem));

  const reclassificar = (quem: string, cancelamentoId: string) =>
    servidor()
      .post(`/faltas-estagiarios/${cancelamentoId}/reclassificacao`)
      .send({ motivo: 'Registrada por engano.' })
      .set('x-usuario-teste', como(quem));

  async function cancelamentoDa(sessaoId: string) {
    const [c] = await db
      .select({ id: cancelamentosSessao.id })
      .from(cancelamentosSessao)
      .where(eq(cancelamentosSessao.sessaoId, sessaoId));
    return c.id;
  }

  const todasDoBanco = () => db.select().from(sinalizacoesReprovacao);

  // Três ausências do Lucas em 2026/2, as sessões da prancha 7-2.
  async function tresFaltasDoLucas() {
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
    return sessoes;
  }

  type Sinalizacao = {
    id: string;
    estagiario: { id: string; nome: string };
    semestre: string;
    encerradaEm: string | null;
    motivoEncerramento: string | null;
    faltaReclassificada: { inicio: string; em: string } | null;
    faltas: number;
    faltasDeOutrosSupervisores: number;
    sessoes: string[];
    supervisores: string[];
  };

  it('a terceira falta do semestre gera a sinalização, que o supervisor e a coordenação veem com as sessões', async () => {
    await cancelarEm(
      casoLucas,
      'lucas',
      '2026-08-21T16:00:00',
      '2026-08-21T08:05:00',
    );
    await cancelarEm(
      casoLucas,
      'lucas',
      '2026-09-17T10:00:00',
      '2026-09-16T10:00:00',
    );
    expect(await todasDoBanco()).toHaveLength(0);

    await cancelarEm(
      casoLucas,
      'lucas',
      '2026-11-12T16:00:00',
      '2026-11-12T08:00:00',
    );

    const [gerada] = await todasDoBanco();
    expect(gerada).toMatchObject({
      estagiarioId: pessoas.lucas.id,
      semestre: '2026/2',
      encerradaEm: null,
    });
    for (const quem of ['carla', 'coordenacao']) {
      const { body } = await sinalizacoes(quem).expect(200);
      expect(body.sinalizacoes).toEqual([
        {
          id: gerada.id,
          estagiario: { id: pessoas.lucas.id, nome: 'Lucas Ferreira' },
          semestre: '2026/2',
          geradaEm: expect.any(String),
          encerradaEm: null,
          motivoEncerramento: null,
          faltaReclassificada: null,
          faltas: 3,
          faltasDeOutrosSupervisores: 0,
          sessoes: [
            em('2026-08-21T16:00:00').toISOString(),
            em('2026-09-17T10:00:00').toISOString(),
            em('2026-11-12T16:00:00').toISOString(),
          ],
          supervisores: ['Carla Mendes'],
        },
      ]);
    }
  });

  it('a sinalização não tem o nome do paciente nem o motivo da ausência (RNF35)', async () => {
    await tresFaltasDoLucas();

    const { body } = await sinalizacoes('coordenacao').expect(200);

    const texto = JSON.stringify(body);
    expect(texto).not.toContain('Mariana');
    expect(texto).not.toContain('Prova');
    expect(texto).not.toMatch(/justificativa|paciente|caso/i);
  });

  it('a quarta falta não gera nova sinalização e só atualiza a contagem', async () => {
    await tresFaltasDoLucas();
    await cancelarEm(
      casoLucas,
      'lucas',
      '2026-11-19T16:00:00',
      '2026-11-19T08:00:00',
    );

    expect(await todasDoBanco()).toHaveLength(1);
    const { body } = await sinalizacoes('carla').expect(200);
    expect(body.sinalizacoes[0].faltas).toBe(4);
    expect(body.sinalizacoes[0].sessoes).toHaveLength(4);
  });

  it('as faltas de outro semestre não somam: 2 em 2026/1 e 2 em 2026/2 não geram sinalização', async () => {
    await cancelarEm(
      casoLucas,
      'lucas',
      '2026-05-05T16:00:00',
      '2026-05-04T08:00:00',
    );
    await cancelarEm(
      casoLucas,
      'lucas',
      '2026-06-30T22:00:00',
      '2026-06-29T08:00:00',
    );
    await cancelarEm(
      casoLucas,
      'lucas',
      '2026-08-21T16:00:00',
      '2026-08-21T08:05:00',
    );
    await cancelarEm(
      casoLucas,
      'lucas',
      '2026-09-17T10:00:00',
      '2026-09-16T10:00:00',
    );

    expect(await todasDoBanco()).toHaveLength(0);
  });

  it('a reclassificação que deixa a contagem em 2 antes da decisão encerra a sinalização sem decisão, e uma nova falta gera outra', async () => {
    const [, setembro] = await tresFaltasDoLucas();
    const cancelamento = await cancelamentoDa(setembro);

    await reclassificar('coordenacao', cancelamento).expect(200);

    const encerrada = await sinalizacoes('coordenacao', {
      situacao: 'todas',
    }).expect(200);
    expect(encerrada.body.sinalizacoes).toEqual([
      expect.objectContaining({
        motivoEncerramento: 'contagem_abaixo_do_limite',
        encerradaEm: expect.any(String),
        faltaReclassificada: {
          inicio: em('2026-09-17T10:00:00').toISOString(),
          em: expect.any(String),
        },
        faltas: 2,
      }),
    ]);
    const abertas = await sinalizacoes('carla').expect(200);
    expect(abertas.body.sinalizacoes).toEqual([]);

    await cancelarEm(
      casoLucas,
      'lucas',
      '2026-11-19T16:00:00',
      '2026-11-19T08:00:00',
    );

    const depois = await sinalizacoes('coordenacao', {
      situacao: 'todas',
    }).expect(200);
    expect(
      depois.body.sinalizacoes.map((s: Sinalizacao) => [
        s.motivoEncerramento,
        s.faltas,
      ]),
    ).toEqual([
      [null, 3],
      ['contagem_abaixo_do_limite', 3],
    ]);
  });

  it('depois da decisão (RF64), a reclassificação não mexe na sinalização, e voltar a 3 faltas não gera outra (apontamento 1)', async () => {
    const [, setembro] = await tresFaltasDoLucas();
    // A decisão é do RF64: aqui, a sinalização é encerrada como ele fará.
    await db
      .update(sinalizacoesReprovacao)
      .set({ encerradaEm: new Date(), motivoEncerramento: 'decisao' });

    await reclassificar('coordenacao', await cancelamentoDa(setembro)).expect(
      200,
    );
    await cancelarEm(
      casoLucas,
      'lucas',
      '2026-11-19T16:00:00',
      '2026-11-19T08:00:00',
    );

    const banco = await todasDoBanco();
    expect(banco).toHaveLength(1);
    expect(banco[0]).toMatchObject({
      motivoEncerramento: 'decisao',
      reclassificacaoId: null,
    });
    const { body } = await sinalizacoes('coordenacao', {
      situacao: 'todas',
    }).expect(200);
    expect(body.sinalizacoes[0]).toMatchObject({
      motivoEncerramento: 'decisao',
      faltas: 3,
    });
  });

  it('a reclassificação que deixa a contagem ainda no limite (de 4 para 3) não encerra a sinalização', async () => {
    const [, setembro] = await tresFaltasDoLucas();
    await cancelarEm(
      casoLucas,
      'lucas',
      '2026-11-19T16:00:00',
      '2026-11-19T08:00:00',
    );

    await reclassificar('coordenacao', await cancelamentoDa(setembro)).expect(
      200,
    );

    const [aberta] = await todasDoBanco();
    expect(aberta.encerradaEm).toBeNull();
  });

  it('estagiário com casos de dois supervisores: os dois veem a sinalização, cada um com as datas só dos casos dele (apontamento 2)', async () => {
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

    const carla = (await sinalizacoes('carla').expect(200)).body
      .sinalizacoes[0] as Sinalizacao;
    const patricia = (await sinalizacoes('patricia').expect(200)).body
      .sinalizacoes[0] as Sinalizacao;
    const coordenacao = (await sinalizacoes('coordenacao').expect(200)).body
      .sinalizacoes[0] as Sinalizacao;

    expect(carla).toMatchObject({ faltas: 3, faltasDeOutrosSupervisores: 1 });
    expect(carla.sessoes).toHaveLength(2);
    expect(patricia).toMatchObject({
      faltas: 3,
      faltasDeOutrosSupervisores: 2,
    });
    expect(patricia.sessoes).toEqual([em('2026-11-05T15:00:00').toISOString()]);
    expect(coordenacao.sessoes).toHaveLength(3);
    expect(coordenacao.supervisores).toEqual([
      'Carla Mendes',
      'Patrícia Nogueira',
    ]);
  });

  it('o supervisor de outro estagiário não vê a sinalização, e o filtro por esse estagiário dá 403 (RNF35)', async () => {
    await tresFaltasDoLucas();

    const { body } = await sinalizacoes('patricia').expect(200);
    expect(body.sinalizacoes).toEqual([]);
    await sinalizacoes('patricia', { estagiarioId: pessoas.lucas.id }).expect(
      403,
    );
  });

  it('o estagiário e a secretaria não veem a sinalização (RNF35)', async () => {
    await tresFaltasDoLucas();

    await sinalizacoes('lucas').expect(403);
    await sinalizacoes('secretaria').expect(403);
  });

  it('a sinalização não pode ser apagada, e a geração não muda', async () => {
    await tresFaltasDoLucas();

    await expect(db.delete(sinalizacoesReprovacao)).rejects.toThrow();
    await expect(
      db.update(sinalizacoesReprovacao).set({ semestre: '2026/1' }),
    ).rejects.toThrow();
  });

  it('a terceira e a quarta falta registradas ao mesmo tempo entram as duas e geram uma sinalização só', async () => {
    await cancelarEm(
      casoLucas,
      'lucas',
      '2026-08-21T16:00:00',
      '2026-08-21T08:05:00',
    );
    await cancelarEm(
      casoLucas,
      'lucas',
      '2026-09-17T10:00:00',
      '2026-09-16T10:00:00',
    );
    const sessoes = await Promise.all([
      criarSessao(casoLucas, pessoas.lucas.id, em('2026-12-14T10:00:00')),
      criarSessao(casoLucas, pessoas.lucas.id, em('2026-12-15T10:00:00')),
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
    expect(await todasDoBanco()).toHaveLength(1);
  });

  it('a situação inválida é recusada', async () => {
    await sinalizacoes('coordenacao', {
      situacao: 'encerradas' as 'todas',
    }).expect(400);
  });
});
