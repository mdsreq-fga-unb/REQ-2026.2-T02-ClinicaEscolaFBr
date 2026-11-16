import { Global, INestApplication, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { and, eq } from 'drizzle-orm';
import request from 'supertest';
import {
  atribuicoesSupervisor,
  auditoria,
  casos,
  inscricoes,
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

// RF39 e RNF35: relação de faltas do estagiário para o supervisor e a coordenação.
// As ausências passam pela rota do RF16, com o relógio parado no momento do
// registro. O usuário da sessão é simulado pelo cabeçalho x-usuario-teste.
const MINUTO = 60_000;
const MOTIVO = 'Prova da disciplina no mesmo horário.';
const ANTES_DE_TUDO = new Date('2026-01-01T00:00:00-03:00');
const em = (quando: string) => new Date(`${quando}-03:00`);

describe('Relação de faltas do estagiário (RF39, RNF35)', () => {
  let app: INestApplication;
  let db: Db;
  let limpar: () => Promise<unknown>;
  let fechar: () => Promise<void>;
  const pessoas: Record<string, UsuarioAutenticado> = {};
  let numero = 0;
  let casoAna: string;
  let casoLucas: string;
  let casoJoao: string;

  beforeAll(async () => {
    ({ db, limpar, fechar } = await criarBancoDeTeste());

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
    casoJoao = await criarCaso(pessoas.joao, pessoas.patricia);
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
    filtro: { estagiarioId?: string; inicio?: string; fim?: string } = {},
  ) =>
    servidor()
      .get('/faltas-estagiarios')
      .query({ inicio: '2026-08-01', fim: '2026-10-31', ...filtro })
      .set('x-usuario-teste', como(quem));
  const estagiariosDe = (quem: string) =>
    servidor()
      .get('/faltas-estagiarios/estagiarios')
      .set('x-usuario-teste', como(quem));

  // A massa da prancha 7-1: três ausências dos estagiários da Carla, mais um
  // cancelamento para remarcar, um pedido do paciente e a ausência de um
  // estagiário de outra supervisora.
  async function massaDaPrancha() {
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
      casoLucas,
      'lucas',
      '2026-08-21T16:00:00',
      '2026-08-21T08:05:00',
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
    await cancelarEm(
      casoJoao,
      'joao',
      '2026-09-22T09:00:00',
      '2026-09-21T15:00:00',
    );
  }

  it('o supervisor vê as ausências reais dos estagiários dele no período, da mais recente para a mais antiga, sem os cancelamentos para remarcar nem os pedidos do paciente', async () => {
    await massaDaPrancha();

    const { body } = await consultar('carla').expect(200);

    expect(body).toEqual({
      inicio: '2026-08-01',
      fim: '2026-10-31',
      faltas: [
        {
          id: expect.any(String),
          estagiario: { id: pessoas.ana.id, nome: 'Ana Beatriz Costa' },
          inicio: em('2026-10-29T14:00:00').toISOString(),
          registradaEm: em('2026-10-28T09:12:00').toISOString(),
        },
        {
          id: expect.any(String),
          estagiario: { id: pessoas.ana.id, nome: 'Ana Beatriz Costa' },
          inicio: em('2026-09-10T10:00:00').toISOString(),
          registradaEm: em('2026-09-09T18:40:00').toISOString(),
        },
        {
          id: expect.any(String),
          estagiario: { id: pessoas.lucas.id, nome: 'Lucas Ferreira' },
          inicio: em('2026-08-21T16:00:00').toISOString(),
          registradaEm: em('2026-08-21T08:05:00').toISOString(),
        },
      ],
    });
  });

  it('a resposta não tem o nome do paciente nem o motivo da ausência (RNF35, CFP art. 9º)', async () => {
    await massaDaPrancha();

    const { body } = await consultar('coordenacao').expect(200);

    const texto = JSON.stringify(body);
    expect(texto).not.toContain('Mariana');
    expect(texto).not.toContain('Prova');
    expect(texto).not.toMatch(/justificativa|paciente|caso/i);
    expect(Object.keys(body.faltas[0]).sort()).toEqual([
      'estagiario',
      'id',
      'inicio',
      'registradaEm',
    ]);
  });

  it('o filtro do estagiário traz só as faltas dele', async () => {
    await massaDaPrancha();

    const { body } = await consultar('carla', {
      estagiarioId: pessoas.lucas.id,
    }).expect(200);

    expect(body.faltas).toHaveLength(1);
    expect(body.faltas[0].estagiario.nome).toBe('Lucas Ferreira');
  });

  it('o período vale em dias inteiros de Brasília, pelo início da sessão', async () => {
    await cancelarEm(
      casoAna,
      'ana',
      '2026-07-31T23:30:00',
      '2026-07-30T10:00:00',
    );
    await cancelarEm(
      casoAna,
      'ana',
      '2026-08-01T00:00:00',
      '2026-07-30T11:00:00',
    );
    await cancelarEm(
      casoAna,
      'ana',
      '2026-10-31T23:00:00',
      '2026-10-30T10:00:00',
    );
    await cancelarEm(
      casoAna,
      'ana',
      '2026-11-01T00:00:00',
      '2026-10-30T11:00:00',
    );

    const { body } = await consultar('carla').expect(200);

    expect(body.faltas.map((f: { inicio: string }) => f.inicio)).toEqual([
      em('2026-10-31T23:00:00').toISOString(),
      em('2026-08-01T00:00:00').toISOString(),
    ]);
  });

  it('período sem faltas: a lista vem vazia', async () => {
    await massaDaPrancha();

    const { body } = await consultar('carla', {
      inicio: '2026-11-01',
      fim: '2026-11-15',
    }).expect(200);

    expect(body.faltas).toEqual([]);
  });

  it('a coordenação vê as faltas de todos os estagiários e todos no filtro (RNF35)', async () => {
    await massaDaPrancha();

    const { body } = await consultar('coordenacao').expect(200);
    const lista = await estagiariosDe('coordenacao').expect(200);

    expect(body.faltas).toHaveLength(4);
    expect(
      body.faltas.some(
        (f: { estagiario: { nome: string } }) =>
          f.estagiario.nome === 'João Victor Almeida',
      ),
    ).toBe(true);
    expect(lista.body.map((e: { nome: string }) => e.nome)).toEqual([
      'Ana Beatriz Costa',
      'João Victor Almeida',
      'Lucas Ferreira',
    ]);
  });

  it('o supervisor não vê as faltas do estagiário de outro supervisor: o filtro não o lista, e a consulta dá 403, registrada na auditoria (RNF35)', async () => {
    await massaDaPrancha();

    const lista = await estagiariosDe('carla').expect(200);
    const { body } = await consultar('carla', {
      estagiarioId: pessoas.joao.id,
    }).expect(403);

    expect(lista.body).toEqual([
      { id: pessoas.ana.id, nome: 'Ana Beatriz Costa' },
      { id: pessoas.lucas.id, nome: 'Lucas Ferreira' },
    ]);
    expect(body.message).toMatch(/não tem acesso à relação de faltas/);
    const negadas = await db
      .select()
      .from(auditoria)
      .where(eq(auditoria.operacao, 'consultar_faltas_estagiario_negada'));
    expect(negadas).toEqual([
      expect.objectContaining({
        usuarioId: pessoas.carla.id,
        entidadeId: pessoas.joao.id,
      }),
    ]);
  });

  it.each([
    ['o estagiário', 'ana'],
    ['a secretaria', 'secretaria'],
  ])('%s não acessa a relação nem o filtro (403)', async (_quem, chave) => {
    await consultar(chave).expect(403);
    await estagiariosDe(chave).expect(403);
  });

  it.each([
    [
      'data inicial depois da final',
      { inicio: '2026-10-31', fim: '2026-08-01' },
      /data inicial não pode ser posterior/,
    ],
    ['data que não existe', { inicio: '2026-02-30' }, /data inicial/],
    ['sem a data final', { fim: '' }, /data final/],
    ['estagiário que não é um id', { estagiarioId: 'ana' }, /estagiário/],
  ])('%s: 400 com o campo', async (_caso, filtro, mensagem) => {
    const { body } = await consultar('coordenacao', filtro).expect(400);

    expect(JSON.stringify(body)).toMatch(mensagem);
  });

  describe('depois de uma transferência (RF25)', () => {
    // A ausência é registrada em 01/10 para a sessão de 20/10, e o caso passa da
    // Carla para a Patrícia, com o João no lugar da Ana, em 10/10: entre o
    // registro e a sessão.
    async function transferirCasoDaAnaEm(instante: Date) {
      await db
        .update(atribuicoesSupervisor)
        .set({ vigente: false, encerradaEm: instante })
        .where(
          and(
            eq(atribuicoesSupervisor.casoId, casoAna),
            eq(atribuicoesSupervisor.vigente, true),
          ),
        );
      await db
        .update(vinculosEstagiario)
        .set({ vigente: false, encerradoEm: instante })
        .where(
          and(
            eq(vinculosEstagiario.casoId, casoAna),
            eq(vinculosEstagiario.vigente, true),
          ),
        );
      await db.insert(atribuicoesSupervisor).values({
        casoId: casoAna,
        supervisorId: pessoas.patricia.id,
        atribuidoPor: pessoas.coordenacao.id,
        atribuidoEm: instante,
      });
      await db.insert(vinculosEstagiario).values({
        casoId: casoAna,
        estagiarioId: pessoas.joao.id,
        vinculadoPor: pessoas.patricia.id,
        vinculadoEm: instante,
      });
    }

    beforeEach(async () => {
      await cancelarEm(
        casoAna,
        'ana',
        '2026-10-20T14:00:00',
        '2026-10-01T09:00:00',
      );
      await transferirCasoDaAnaEm(em('2026-10-10T12:00:00'));
    });

    it('a falta fica com o supervisor do momento do registro, e não com o novo supervisor do caso', async () => {
      const daCarla = await consultar('carla').expect(200);
      const daPatricia = await consultar('patricia').expect(200);

      expect(daCarla.body.faltas).toEqual([
        expect.objectContaining({
          estagiario: { id: pessoas.ana.id, nome: 'Ana Beatriz Costa' },
          inicio: em('2026-10-20T14:00:00').toISOString(),
        }),
      ]);
      expect(daPatricia.body.faltas).toEqual([]);
    });

    it('o filtro e a consulta continuam a mostrar a estagiária que saiu do caso ao supervisor anterior, e não ao novo', async () => {
      const filtroDaCarla = await estagiariosDe('carla').expect(200);
      const filtroDaPatricia = await estagiariosDe('patricia').expect(200);

      expect(filtroDaCarla.body.map((e: { nome: string }) => e.nome)).toEqual([
        'Ana Beatriz Costa',
        'Lucas Ferreira',
      ]);
      expect(
        filtroDaPatricia.body.map((e: { nome: string }) => e.nome),
      ).toEqual(['João Victor Almeida']);
      const { body } = await consultar('carla', {
        estagiarioId: pessoas.ana.id,
      }).expect(200);
      expect(body.faltas).toHaveLength(1);
      await consultar('patricia', { estagiarioId: pessoas.ana.id }).expect(403);
    });

    it('a ausência registrada depois da transferência, com o novo estagiário, é do novo supervisor', async () => {
      await cancelarEm(
        casoAna,
        'joao',
        '2026-10-27T14:00:00',
        '2026-10-26T09:00:00',
      );

      const daCarla = await consultar('carla').expect(200);
      const daPatricia = await consultar('patricia').expect(200);

      expect(daCarla.body.faltas).toHaveLength(1);
      expect(daPatricia.body.faltas).toEqual([
        expect.objectContaining({
          estagiario: { id: pessoas.joao.id, nome: 'João Victor Almeida' },
        }),
      ]);
    });
  });
});
