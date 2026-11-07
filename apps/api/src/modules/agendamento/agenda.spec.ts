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
  inscricoes,
  prontuarios,
  sessoesAtendimento,
  usuarios,
  vinculosEstagiario,
  type Db,
} from '@clinica/database';
import type { StatusSessao } from '@clinica/shared';
import { AuditoriaModule } from '../../auditoria/auditoria.module';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { DB } from '../../database/database.module';
import { EmailService } from '../../notificacoes/email.service';
import { ParametrosModule } from '../../parametros/parametros.module';
import {
  CHAVE_TESTE,
  criarBancoDeTeste,
} from '../../test-utils/banco-de-teste';
import { AgendamentoModule } from './agendamento.module';

// RF11, RNF13 e RNF16: agenda do estagiário e dos estagiários do supervisor. O
// usuário da sessão é simulado pelo cabeçalho x-usuario-teste.
describe('Agenda de sessões do estagiário (RF11)', () => {
  let app: INestApplication;
  let db: Db;
  let limpar: () => Promise<unknown>;
  let fechar: () => Promise<void>;
  const pessoas: Record<string, UsuarioAutenticado> = {};
  let numero = 0;
  // Ana tem um caso da Carla e um da Patrícia; João, um da Patrícia.
  let casoDaCarla: string;
  let casoDaPatricia: string;
  let casoDoJoao: string;
  let prontuarioDaCarla: string;
  const sessoes: Record<string, string> = {};

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
    await limpar();
    for (const [chave, nome, perfil] of [
      ['secretaria', 'Juliana Rocha', 'secretaria'],
      ['ana', 'Ana Beatriz Costa', 'estagiario'],
      ['joao', 'João Victor Almeida', 'estagiario'],
      ['camila', 'Camila Souza', 'estagiario'],
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
    let vinculo: string;
    ({ caso: casoDaCarla, vinculo } = await criarCaso(
      'Mariana Alves Toledo',
      pessoas.ana,
      pessoas.carla,
    ));
    const [prontuario] = await db
      .insert(prontuarios)
      .values({
        casoId: casoDaCarla,
        cicloAtendimento: 1,
        vinculoOrigemId: vinculo,
      })
      .returning();
    prontuarioDaCarla = prontuario.id;
    ({ caso: casoDaPatricia } = await criarCaso(
      'Beatriz Oliveira Santos',
      pessoas.ana,
      pessoas.patricia,
    ));
    ({ caso: casoDoJoao } = await criarCaso(
      'Gustavo Henrique Dias',
      pessoas.joao,
      pessoas.patricia,
    ));

    // Semana de 02/12/2030 (segunda) a 08/12/2030, em Brasília.
    for (const [chave, caso, estagiario, quando, status] of [
      ['realizada', casoDaCarla, 'ana', '2030-12-03T10:00', 'realizada'],
      ['confirmada', casoDaCarla, 'ana', '2030-12-04T09:00', 'confirmada'],
      ['agendada', casoDaCarla, 'ana', '2030-12-05T14:00', 'agendada'],
      ['cancelada', casoDaCarla, 'ana', '2030-12-05T16:00', 'cancelada'],
      ['falta', casoDaCarla, 'ana', '2030-12-06T09:00', 'falta_paciente'],
      ['domingoTarde', casoDaCarla, 'ana', '2030-12-08T23:00', 'agendada'],
      ['foraDaSemana', casoDaCarla, 'ana', '2030-12-09T09:00', 'agendada'],
      ['daPatricia', casoDaPatricia, 'ana', '2030-12-04T15:00', 'agendada'],
      ['doJoao', casoDoJoao, 'joao', '2030-12-04T10:00', 'agendada'],
    ] as const) {
      sessoes[chave] = await criarSessao(
        caso,
        pessoas[estagiario].id,
        new Date(`${quando}:00-03:00`),
        status,
      );
    }
    await db.insert(cancelamentosSessao).values({
      sessaoId: sessoes.cancelada,
      origem: 'estagiario',
      classificacao: 'administrativo',
      justificativaCifrada: 'v1.x',
      registradoPor: pessoas.ana.id,
      antecedenciaMinutos: 600,
    });
  });

  async function criarCaso(
    nome: string,
    estagiario: UsuarioAutenticado,
    supervisor: UsuarioAutenticado,
  ) {
    numero += 1;
    const [inscricao] = await db
      .insert(inscricoes)
      .values({
        numero: `2030-${String(numero).padStart(4, '0')}`,
        nomeCompleto: nome,
        dataNascimento: '1990-01-01',
        cpf: String(numero).padStart(11, '0'),
        rg: '1234567',
        endereco: 'Rua Fictícia, 1',
        estadoCivil: 'solteiro',
        canalPreferencial: 'email',
        celular: '61998765432',
        email: 'paciente@exemplo.com',
        queixaCifrada: 'x',
        percepcaoUrgenciaCifrada: 'x',
        historicoRelevanteCifrado: 'x',
      })
      .returning();
    const [caso] = await db
      .insert(casos)
      .values({ inscricaoId: inscricao.id, situacao: 'em_atendimento' })
      .returning();
    await db.insert(atribuicoesSupervisor).values({
      casoId: caso.id,
      supervisorId: supervisor.id,
      atribuidoPor: pessoas.coordenacao.id,
    });
    const [vinculo] = await db
      .insert(vinculosEstagiario)
      .values({
        casoId: caso.id,
        estagiarioId: estagiario.id,
        vinculadoPor: supervisor.id,
      })
      .returning();
    return { caso: caso.id, vinculo: vinculo.id };
  }

  async function criarSessao(
    casoId: string,
    estagiarioId: string,
    inicio: Date,
    status: StatusSessao,
  ) {
    const termino = new Date(inicio.getTime() + 50 * 60_000);
    const [sessao] = await db
      .insert(sessoesAtendimento)
      .values({
        casoId,
        estagiarioId,
        inicio,
        termino,
        fimIntervaloAnotacoes: new Date(termino.getTime() + 10 * 60_000),
        status,
        agendadaPor: pessoas.secretaria.id,
      })
      .returning();
    return sessao.id;
  }

  const agenda = (quem: string, consulta: Record<string, string>) =>
    request(app.getHttpServer())
      .get('/agenda')
      .query(consulta)
      .set('x-usuario-teste', JSON.stringify(pessoas[quem]));
  const semana = { de: '2030-12-02', ate: '2030-12-08' };
  const ids = (body: { sessoes: { id: string }[] }) =>
    body.sessoes.map((s) => s.id);

  describe('estagiário', () => {
    it('vê as próprias sessões agendadas, confirmadas e realizadas da semana, em ordem', async () => {
      const resposta = await agenda('ana', semana).expect(200);

      expect(ids(resposta.body)).toEqual([
        sessoes.realizada,
        sessoes.confirmada,
        sessoes.daPatricia,
        sessoes.agendada,
        sessoes.domingoTarde,
      ]);
      expect(resposta.body).toMatchObject({
        estagiario: { id: pessoas.ana.id, nome: 'Ana Beatriz Costa' },
        de: '2030-12-02',
        ate: '2030-12-08',
        antecedenciaMinimaMinutos: 60,
      });
      expect(resposta.headers['cache-control']).toBe('no-store');
    });

    it('só o nome do paciente, a data, os horários e a situação (RNF13)', async () => {
      const { body } = await agenda('ana', semana).expect(200);

      expect(Object.keys(body.sessoes[0]).sort()).toEqual(
        [
          'acoes',
          'cancelamento',
          'casoId',
          'id',
          'inicio',
          'paciente',
          'prontuarioId',
          'status',
          'termino',
        ].sort(),
      );
      expect(JSON.stringify(body)).not.toMatch(
        /61998765432|paciente@exemplo|00000000001|queixa/,
      );
    });

    it('as canceladas e as faltas aparecem só quando o filtro as pede', async () => {
      const { body } = await agenda('ana', {
        ...semana,
        status: 'cancelada,falta_paciente',
      }).expect(200);

      expect(ids(body)).toEqual([sessoes.cancelada, sessoes.falta]);
      expect(body.sessoes[0].cancelamento).toEqual({
        classificacao: 'administrativo',
        origem: 'estagiario',
      });
    });

    it('o período vale de 00h00 do primeiro dia a 23h59 do último, em Brasília', async () => {
      const { body } = await agenda('ana', {
        de: '2030-12-08',
        ate: '2030-12-08',
      }).expect(200);

      expect(ids(body)).toEqual([sessoes.domingoTarde]);
    });

    it('um período sem sessões devolve a lista vazia', async () => {
      const { body } = await agenda('ana', {
        de: '2030-11-01',
        ate: '2030-11-07',
      }).expect(200);

      expect(body.sessoes).toEqual([]);
    });

    it('nunca vê a agenda de outro: o estagiarioId é ignorado', async () => {
      const { body } = await agenda('ana', {
        ...semana,
        estagiarioId: pessoas.joao.id,
      }).expect(200);

      expect(body.estagiario.id).toBe(pessoas.ana.id);
      expect(ids(body)).not.toContain(sessoes.doJoao);
    });

    it('as ações seguem as rotas: cancelar, registrar a falta e abrir o prontuário', async () => {
      const { body } = await agenda('ana', semana).expect(200);
      const realizada = body.sessoes.find(
        (s: { id: string }) => s.id === sessoes.realizada,
      );

      expect(realizada.prontuarioId).toBe(prontuarioDaCarla);
      expect(realizada.acoes).toEqual({
        pedidoPaciente: false,
        administrativo: true,
        ausenciaEstagiario: true,
        registrarFalta: true,
      });
    });

    it('sem vínculo vigente no caso, a sessão aparece sem ações', async () => {
      await db
        .update(vinculosEstagiario)
        .set({ vigente: false })
        .where(eq(vinculosEstagiario.casoId, casoDaPatricia));

      const { body } = await agenda('ana', semana).expect(200);
      const daPatricia = body.sessoes.find(
        (s: { id: string }) => s.id === sessoes.daPatricia,
      );

      expect(Object.values(daPatricia.acoes).some(Boolean)).toBe(false);
    });
  });

  describe('supervisor', () => {
    it('lista só os estagiários dele, sem repetir', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/agenda/estagiarios')
        .set('x-usuario-teste', JSON.stringify(pessoas.patricia))
        .expect(200);

      expect(body).toEqual([
        { id: pessoas.ana.id, nome: 'Ana Beatriz Costa' },
        { id: pessoas.joao.id, nome: 'João Victor Almeida' },
      ]);
    });

    it('vê a agenda do estagiário só com as sessões dos casos que supervisiona (RNF16)', async () => {
      const { body } = await agenda('carla', {
        ...semana,
        estagiarioId: pessoas.ana.id,
      }).expect(200);

      expect(ids(body)).toEqual([
        sessoes.realizada,
        sessoes.confirmada,
        sessoes.agendada,
        sessoes.domingoTarde,
      ]);
      expect(body.sessoes[0].acoes).toEqual({
        pedidoPaciente: false,
        administrativo: false,
        ausenciaEstagiario: true,
        registrarFalta: false,
      });
    });

    it('a outra supervisora vê da Ana só a sessão do caso dela', async () => {
      const { body } = await agenda('patricia', {
        ...semana,
        estagiarioId: pessoas.ana.id,
      }).expect(200);

      expect(ids(body)).toEqual([sessoes.daPatricia]);
    });

    it('agenda de um estagiário que não é dele: 403, sem nenhuma sessão, e a tentativa é registrada', async () => {
      const resposta = await agenda('carla', {
        ...semana,
        estagiarioId: pessoas.joao.id,
      }).expect(403);

      expect(resposta.body.message).toMatch(/não tem acesso à agenda/);
      expect(JSON.stringify(resposta.body)).not.toContain('Gustavo');
      const [evento] = await db
        .select()
        .from(auditoria)
        .where(
          and(
            eq(auditoria.operacao, 'consultar_agenda_negada'),
            eq(auditoria.entidadeId, pessoas.joao.id),
          ),
        );
      expect(evento.usuarioId).toBe(pessoas.carla.id);
    });

    it('estagiário sem caso vigente não é de nenhum supervisor', async () => {
      await agenda('carla', {
        ...semana,
        estagiarioId: pessoas.camila.id,
      }).expect(403);
    });

    it('sem escolher o estagiário: 400', async () => {
      await agenda('carla', semana).expect(400);
    });
  });

  describe('acesso e filtros', () => {
    it.each([['secretaria'], ['coordenacao']])(
      '%s não usa esta agenda (403)',
      async (quem) => {
        await agenda(quem, semana).expect(403);
      },
    );

    it('a lista de estagiários é só do supervisor', async () => {
      await request(app.getHttpServer())
        .get('/agenda/estagiarios')
        .set('x-usuario-teste', JSON.stringify(pessoas.ana))
        .expect(403);
    });

    it.each([
      ['data final antes da inicial', { de: '2030-12-08', ate: '2030-12-02' }],
      ['período maior que 93 dias', { de: '2030-01-01', ate: '2030-12-31' }],
      ['situação que não existe', { ...semana, status: 'adiada' }],
      ['sem o período', {}],
    ])('%s: 400', async (_caso, consulta) => {
      await agenda('ana', consulta as Record<string, string>).expect(400);
    });
  });
});
