import { Global, INestApplication, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import {
  atribuicoesSupervisor,
  auditoria,
  autorizacoesMenor,
  casos,
  emissoesDeclaracao,
  inscricoes,
  sessoesAtendimento,
  usuarios,
  type Db,
} from '@clinica/database';
import { eq, sql } from 'drizzle-orm';
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
import { VerificacaoService } from '../acesso/verificacao.service';
import { DeclaracoesModule } from './declaracoes.module';

// RF44 e RNF38: sessões com presença registrada, com a verificação real do RF52
// para o paciente ou o responsável. O usuário da equipe (RF50) é simulado pelo
// cabeçalho x-usuario-teste.
const enviarEmail = jest.fn<Promise<unknown>, [string, string, string]>();
const HORA = 60 * 60 * 1000;
// Sessões das 14h de Brasília (17h UTC), como na prancha 8-2.
const as14h = (dia: string) => new Date(`${dia}T17:00:00Z`);

describe('Sessões com presença registrada e declaração de comparecimento (RF44, RF45, RNF38, RNF39)', () => {
  let app: INestApplication;
  let db: Db;
  let limpar: () => Promise<unknown>;
  let fechar: () => Promise<void>;
  const pessoas: Record<string, UsuarioAutenticado> = {};
  let inscricaoA: typeof inscricoes.$inferSelect;
  let inscricaoB: typeof inscricoes.$inferSelect;
  let casoA: string;
  let casoB: string;

  beforeAll(async () => {
    ({ db, limpar, fechar } = await criarBancoDeTeste());
    @Global()
    @Module({
      providers: [
        { provide: DB, useValue: db },
        { provide: EmailService, useValue: { enviar: enviarEmail } },
      ],
      exports: [DB, EmailService],
    })
    class Infra {}
    const modulo = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              CHAVE_DADOS: CHAVE_TESTE,
              WEB_URL: 'http://localhost:3000',
              LIMITE_VERIFICACAO_POR_ORIGEM: '100000',
            }),
          ],
        }),
        Infra,
        AuditoriaModule,
        ParametrosModule,
        DeclaracoesModule,
      ],
    }).compile();
    app = modulo.createNestApplication();
    app.use(cookieParser());
    app.use(
      (
        req: { headers: Record<string, string>; usuario?: unknown },
        _res: unknown,
        next: () => void,
      ) => {
        if (req.headers['x-usuario-teste'])
          req.usuario = JSON.parse(req.headers['x-usuario-teste']);
        next();
      },
    );
    await app.listen(0, '127.0.0.1');
  }, 60_000);

  afterAll(async () => {
    await app.close();
    await fechar();
  });

  beforeEach(async () => {
    await app.get(VerificacaoService).emCurso;
    await limpar();
    enviarEmail.mockReset();
    enviarEmail.mockResolvedValue(undefined);
    for (const [chave, nome, perfil] of [
      ['secretaria', 'Juliana Rocha', 'secretaria'],
      ['ana', 'Ana Beatriz Costa', 'estagiario'],
      ['pedro', 'Pedro Henrique Lima', 'estagiario'],
      ['supervisor', 'Carla Mendes', 'supervisor'],
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
    [inscricaoA, inscricaoB] = await db
      .insert(inscricoes)
      .values(
        (
          [
            ['2026-00398', 'Mariana Alves Toledo', '52998224725', 'a'],
            ['2026-00399', 'Pessoa sem sessões', '11144477735', 'b'],
          ] as const
        ).map(([numero, nomeCompleto, cpf, letra]) => ({
          numero,
          nomeCompleto,
          dataNascimento: '1990-01-01',
          cpf,
          rg: '123',
          endereco: 'Rua fictícia',
          estadoCivil: 'Solteiro(a)',
          canalPreferencial: 'email' as const,
          email: `paciente.${letra}@example.com`,
          queixaCifrada: 'queixa-sigilosa',
        })),
      )
      .returning();
    [{ id: casoA }, { id: casoB }] = await db
      .insert(casos)
      .values(
        [inscricaoA, inscricaoB].map((i) => ({
          inscricaoId: i.id,
          entradaNaFilaEm: i.criadaEm,
          situacao: 'em_atendimento' as const,
          cicloAtendimento: 2,
        })),
      )
      .returning();
  });

  const http = () => request(app.getHttpServer());
  const como = (chave: string) => ({
    'x-usuario-teste': JSON.stringify(pessoas[chave]),
  });

  async function sessao(
    casoId: string,
    inicio: Date,
    status: StatusSessao,
    { ciclo = 2, estagiario = 'ana' } = {},
  ) {
    const [criada] = await db
      .insert(sessoesAtendimento)
      .values({
        casoId,
        cicloAtendimento: ciclo,
        estagiarioId: pessoas[estagiario].id,
        inicio,
        termino: new Date(inicio.getTime() + 50 * 60 * 1000),
        fimIntervaloAnotacoes: new Date(inicio.getTime() + HORA),
        status,
        agendadaPor: pessoas.secretaria.id,
      })
      .returning();
    return criada.id;
  }

  // Três sessões realizadas (uma no ciclo 1, com outro estagiário), uma
  // cancelada, uma com falta e uma agendada. No caso B, só uma falta.
  async function semearSessoes() {
    await sessao(casoA, as14h('2026-10-22'), 'realizada', {
      ciclo: 1,
      estagiario: 'pedro',
    });
    await sessao(casoA, as14h('2026-11-05'), 'realizada');
    await sessao(casoA, as14h('2026-10-29'), 'realizada');
    await sessao(casoA, as14h('2026-10-15'), 'cancelada');
    await sessao(casoA, as14h('2026-11-12'), 'falta_paciente');
    await sessao(casoA, as14h('2026-11-19'), 'agendada');
    await sessao(casoB, as14h('2026-11-05'), 'falta_paciente', {
      estagiario: 'pedro',
    });
  }

  const ESPERADAS_A = [
    { inicio: '2026-11-05T17:00:00.000Z', estagiario: 'Ana Beatriz Costa' },
    { inicio: '2026-10-29T17:00:00.000Z', estagiario: 'Ana Beatriz Costa' },
    { inicio: '2026-10-22T17:00:00.000Z', estagiario: 'Pedro Henrique Lima' },
  ];

  // Verificação real do RF52: pede o código, lê no e-mail e confere.
  async function verificar(inscricao: typeof inscricoes.$inferSelect) {
    await http()
      .post('/verificacao/codigo')
      .send({ identificador: inscricao.numero })
      .expect(202);
    await app.get(VerificacaoService).emCurso;
    const codigo = /(\d{6})<\/p>/.exec(enviarEmail.mock.calls.at(-1)![2])![1];
    const res = await http()
      .post('/verificacao/conferir')
      .send({ identificador: inscricao.numero, codigo })
      .expect(200);
    return ([] as string[]).concat(res.headers['set-cookie'] ?? []);
  }

  describe('GET /declaracoes/minhas-sessoes (paciente ou responsável)', () => {
    it('lista só as sessões realizadas, de todos os ciclos, da mais recente para a mais antiga', async () => {
      await semearSessoes();
      const res = await http()
        .get('/declaracoes/minhas-sessoes')
        .set('Cookie', await verificar(inscricaoA))
        .expect(200);
      expect(res.body).toMatchObject(ESPERADAS_A);
      expect(res.headers['cache-control']).toBe('no-store');
    });

    it('traz só a data, o horário e o estagiário, sem dado clínico nem pessoal (RNF6)', async () => {
      await semearSessoes();
      const res = await http()
        .get('/declaracoes/minhas-sessoes')
        .set('Cookie', await verificar(inscricaoA))
        .expect(200);
      for (const s of res.body as object[])
        expect(Object.keys(s).sort()).toEqual(['estagiario', 'id', 'inicio']);
      expect(JSON.stringify(res.body)).not.toMatch(
        /queixa|Mariana|52998224725|2026-00398|paciente\.a|status|caso/i,
      );
    });

    it('mostra só as sessões da inscrição verificada e ignora id na query', async () => {
      await semearSessoes();
      const res = await http()
        .get(
          `/declaracoes/minhas-sessoes?inscricaoId=${inscricaoA.id}&casoId=${casoA}&numero=${inscricaoA.numero}`,
        )
        .set('Cookie', await verificar(inscricaoB))
        .expect(200);
      expect(res.body).toEqual([]);
    });

    it('volta 200 com a lista vazia quando não há sessão realizada', async () => {
      await sessao(casoB, as14h('2026-11-05'), 'confirmada', {
        estagiario: 'pedro',
      });
      const res = await http()
        .get('/declaracoes/minhas-sessoes')
        .set('Cookie', await verificar(inscricaoB))
        .expect(200);
      expect(res.body).toEqual([]);
    });

    it('volta a lista vazia para a inscrição que ainda não tem caso', async () => {
      const [semCaso] = await db
        .insert(inscricoes)
        .values({
          numero: '2026-00400',
          nomeCompleto: 'Inscrição em triagem',
          dataNascimento: '1990-01-01',
          cpf: '39053344705',
          rg: '123',
          endereco: 'Rua fictícia',
          estadoCivil: 'Solteiro(a)',
          canalPreferencial: 'email',
          email: 'paciente.c@example.com',
        })
        .returning();
      const res = await http()
        .get('/declaracoes/minhas-sessoes')
        .set('Cookie', await verificar(semCaso))
        .expect(200);
      expect(res.body).toEqual([]);
    });

    it.each(['', 'verificacao=invalido'])(
      'recusa com 401, sem nenhuma sessão, quem não verificou a identidade (cookie "%s")',
      async (cookie) => {
        await semearSessoes();
        const res = await http()
          .get('/declaracoes/minhas-sessoes')
          .set('Cookie', cookie)
          .expect(401);
        expect(JSON.stringify(res.body)).not.toMatch(/Ana Beatriz|2026-1/);
      },
    );

    it('recusa com 401 a sessão da equipe sem verificação de identidade', async () => {
      await semearSessoes();
      await http()
        .get('/declaracoes/minhas-sessoes')
        .set(como('secretaria'))
        .expect(401);
    });

    it('recusa com 401 depois que a consulta é encerrada', async () => {
      await semearSessoes();
      const cookie = await verificar(inscricaoA);
      await http()
        .post('/verificacao/encerrar')
        .set('Cookie', cookie)
        .expect((r) => expect(r.status).toBeLessThan(300));
      await http()
        .get('/declaracoes/minhas-sessoes')
        .set('Cookie', cookie)
        .expect(401);
    });
  });

  describe('GET /pacientes/:casoId/sessoes-realizadas (secretaria)', () => {
    it('lista para a secretaria as sessões realizadas do caso, de todos os ciclos', async () => {
      await semearSessoes();
      const res = await http()
        .get(`/pacientes/${casoA}/sessoes-realizadas`)
        .set(como('secretaria'))
        .expect(200);
      expect(res.body).toMatchObject(ESPERADAS_A);
      expect(res.headers['cache-control']).toBe('no-store');
    });

    it('volta a lista vazia para o caso sem sessão realizada', async () => {
      await semearSessoes();
      const res = await http()
        .get(`/pacientes/${casoB}/sessoes-realizadas`)
        .set(como('secretaria'))
        .expect(200);
      expect(res.body).toEqual([]);
    });

    it.each(['ana', 'supervisor', 'coordenacao'])(
      'recusa com 403 o perfil %s, sem nenhuma sessão (RNF38)',
      async (chave) => {
        await semearSessoes();
        const res = await http()
          .get(`/pacientes/${casoA}/sessoes-realizadas`)
          .set(como(chave))
          .expect(403);
        expect(JSON.stringify(res.body)).not.toMatch(/Ana Beatriz|2026-1/);
      },
    );

    it('recusa com 401 quem não tem sessão, mesmo com a identidade verificada', async () => {
      await semearSessoes();
      await http()
        .get(`/pacientes/${casoA}/sessoes-realizadas`)
        .set('Cookie', await verificar(inscricaoA))
        .expect(401);
    });

    it('responde 404 ao caso que não existe e 400 ao id inválido', async () => {
      await http()
        .get(
          '/pacientes/00000000-0000-4000-8000-000000000000/sessoes-realizadas',
        )
        .set(como('secretaria'))
        .expect(404);
      await http()
        .get('/pacientes/nao-e-uuid/sessoes-realizadas')
        .set(como('secretaria'))
        .expect(400);
    });
  });

  describe('Declaração de comparecimento (RF45, RNF39)', () => {
    let s1105: string;
    let s1029: string;
    let falta: string;
    let cancelada: string;
    let agendada: string;
    let sessaoB: string;

    // Ricardo supervisionou o caso A até 01/11, e a Carla depois (RF25). Só a
    // Carla tem o CRP no cadastro (RF53).
    beforeEach(async () => {
      const [ricardo] = await db
        .insert(usuarios)
        .values({
          nome: 'Ricardo Menezes',
          email: 'ricardo@fbr.edu.br',
          perfil: 'supervisor',
          situacao: 'ativo',
        })
        .returning();
      await db
        .update(usuarios)
        .set({ crp: '01/12345' })
        .where(eq(usuarios.id, pessoas.supervisor.id));
      await db.insert(atribuicoesSupervisor).values([
        {
          casoId: casoA,
          supervisorId: ricardo.id,
          atribuidoPor: pessoas.coordenacao.id,
          atribuidoEm: new Date('2026-10-01T12:00:00Z'),
          vigente: false,
          encerradaEm: new Date('2026-11-01T12:00:00Z'),
        },
        {
          casoId: casoA,
          supervisorId: pessoas.supervisor.id,
          atribuidoPor: pessoas.coordenacao.id,
          atribuidoEm: new Date('2026-11-01T12:00:00Z'),
        },
      ]);
      s1105 = await sessao(casoA, as14h('2026-11-05'), 'realizada');
      s1029 = await sessao(casoA, as14h('2026-10-29'), 'realizada');
      falta = await sessao(casoA, as14h('2026-11-12'), 'falta_paciente');
      cancelada = await sessao(casoA, as14h('2026-10-15'), 'cancelada');
      agendada = await sessao(casoA, as14h('2026-11-19'), 'agendada');
      sessaoB = await sessao(casoB, as14h('2026-11-05'), 'realizada', {
        estagiario: 'pedro',
      });
    });

    const emitirComo = (sessaoId: string, cookie: string[]) =>
      http()
        .post(`/declaracoes/minhas-sessoes/${sessaoId}/emissao`)
        .set('Cookie', cookie);
    const emitirPelaEquipe = (sessaoId: string, chave: string) =>
      http().post(`/declaracoes/sessoes/${sessaoId}/emissao`).set(como(chave));
    const auditoriaDe = (operacao: string) =>
      db.select().from(auditoria).where(eq(auditoria.operacao, operacao));

    it('o paciente verificado emite a declaração da sessão com presença, com o supervisor e o CRP, e a emissão fica registrada', async () => {
      const res = await emitirComo(s1105, await verificar(inscricaoA)).expect(
        201,
      );
      expect(res.headers['cache-control']).toBe('no-store');
      expect(res.body).toEqual({
        emissaoId: expect.any(String),
        emitidaEm: expect.any(String),
        paciente: 'Mariana Alves Toledo',
        sessao: { id: s1105, inicio: '2026-11-05T17:00:00.000Z' },
        estagiario: 'Ana Beatriz Costa',
        psicologoResponsavel: { nome: 'Carla Mendes', crp: '01/12345' },
      });
      const [emissao] = await db.select().from(emissoesDeclaracao);
      expect(emissao).toMatchObject({
        id: res.body.emissaoId,
        sessaoId: s1105,
        inscricaoId: inscricaoA.id,
        canal: 'verificacao',
        emitidaPor: null,
        tipo: 'emissao',
      });
      const [registro] = await auditoriaDe('emitir_declaracao');
      expect(registro).toMatchObject({
        usuarioId: null,
        entidadeId: emissao.id,
        dadosNovos: {
          tipo: 'emissao',
          canal: 'verificacao',
          sessaoId: s1105,
          inscricaoId: inscricaoA.id,
        },
      });
    });

    it('não traz nenhum dado clínico nem documento do paciente', async () => {
      const res = await emitirComo(s1105, await verificar(inscricaoA)).expect(
        201,
      );
      expect(JSON.stringify(res.body)).not.toMatch(
        /queixa|52998224725|2026-00398|paciente\.a|prioridade|status/i,
      );
    });

    it('o psicólogo responsável é o supervisor na data da sessão, mesmo depois da transferência, e o CRP vem nulo se não foi informado', async () => {
      const res = await emitirComo(s1029, await verificar(inscricaoA)).expect(
        201,
      );
      expect(res.body.psicologoResponsavel).toEqual({
        nome: 'Ricardo Menezes',
        crp: null,
      });
    });

    it.each([
      ['falta', 'A sessão de 12/11/2026 foi registrada como falta.'],
      ['cancelada', 'A sessão de 15/10/2026 foi cancelada.'],
      ['agendada', 'A sessão de 19/11/2026 ainda não tem presença registrada.'],
    ])(
      'a sessão %s não gera declaração, e o motivo é informado (422)',
      async (qual, inicio) => {
        const id = { falta, cancelada, agendada }[qual]!;
        const res = await emitirComo(id, await verificar(inscricaoA)).expect(
          422,
        );
        expect(res.body).toMatchObject({
          motivo: 'sem_presenca',
          message: `${inicio} A declaração de comparecimento só é emitida para sessão com presença registrada.`,
        });
        expect(await db.select().from(emissoesDeclaracao)).toHaveLength(0);
      },
    );

    it('o paciente verificado não emite a declaração de outro paciente, nem de sessão que não existe, e a tentativa é registrada (403)', async () => {
      const cookie = await verificar(inscricaoB);
      const res = await emitirComo(s1105, cookie).expect(403);
      expect(JSON.stringify(res.body)).not.toMatch(/Mariana|Ana Beatriz/);
      await emitirComo('00000000-0000-4000-8000-000000000000', cookie).expect(
        403,
      );
      const negadas = await auditoriaDe('emitir_declaracao_negada');
      expect(negadas).toHaveLength(2);
      expect(negadas[0]).toMatchObject({
        usuarioId: null,
        entidadeId: s1105,
        dadosNovos: {
          tipo: 'emissao',
          canal: 'verificacao',
          inscricaoVerificada: inscricaoB.id,
        },
      });
      expect(await db.select().from(emissoesDeclaracao)).toHaveLength(0);
      // A própria sessão continua liberada para a inscrição B.
      await emitirComo(sessaoB, cookie).expect(201);
    });

    it('a secretaria emite a declaração, com o seu usuário na emissão', async () => {
      const res = await emitirPelaEquipe(s1105, 'secretaria').expect(201);
      expect(res.body.paciente).toBe('Mariana Alves Toledo');
      const [emissao] = await db.select().from(emissoesDeclaracao);
      expect(emissao).toMatchObject({
        canal: 'secretaria',
        emitidaPor: pessoas.secretaria.id,
      });
    });

    it.each(['ana', 'supervisor', 'coordenacao'])(
      'o perfil %s não emite, e a tentativa é registrada com o usuário (403)',
      async (chave) => {
        const res = await emitirPelaEquipe(s1105, chave).expect(403);
        expect(JSON.stringify(res.body)).not.toMatch(/Mariana/);
        const [negada] = await auditoriaDe('emitir_declaracao_negada');
        expect(negada).toMatchObject({
          usuarioId: pessoas[chave].id,
          entidadeId: s1105,
          dadosNovos: { canal: 'secretaria', inscricaoVerificada: null },
        });
        expect(await db.select().from(emissoesDeclaracao)).toHaveLength(0);
      },
    );

    it('sem verificação nem sessão, as duas rotas respondem 401', async () => {
      await http()
        .post(`/declaracoes/minhas-sessoes/${s1105}/emissao`)
        .expect(401);
      await http().post(`/declaracoes/sessoes/${s1105}/emissao`).expect(401);
    });

    // A matriz do RNF38 num teste só, com os dois caminhos de acesso: a sessão
    // institucional da secretaria (RF50) e a verificação de identidade do
    // paciente ou responsável (RF52). A reemissão (RF46) está fora do MVP.
    it('autorização das declarações por perfil: a secretaria autenticada lista e emite para qualquer paciente, o paciente com a identidade verificada só para as próprias sessões, e sem verificação, o estagiário e o supervisor não listam nem emitem (RF50, RF52, RNF38)', async () => {
      const listaDaFicha = (casoId: string) =>
        http().get(`/pacientes/${casoId}/sessoes-realizadas`);

      // Secretaria, com a sessão institucional (RF50): qualquer paciente.
      await listaDaFicha(casoA).set(como('secretaria')).expect(200);
      await listaDaFicha(casoB).set(como('secretaria')).expect(200);
      await emitirPelaEquipe(s1105, 'secretaria').expect(201);
      await emitirPelaEquipe(sessaoB, 'secretaria').expect(201);
      // Sem a sessão institucional, as rotas da equipe recusam.
      await listaDaFicha(casoA).expect(401);
      await http().post(`/declaracoes/sessoes/${s1105}/emissao`).expect(401);

      // Estagiário e supervisor do caso: nem listam nem emitem.
      for (const chave of ['ana', 'supervisor']) {
        await listaDaFicha(casoA).set(como(chave)).expect(403);
        await emitirPelaEquipe(s1105, chave).expect(403);
      }

      // Paciente ou responsável com a identidade verificada (RF52): só as
      // sessões da própria inscrição.
      const cookieA = await verificar(inscricaoA);
      const lista = await http()
        .get('/declaracoes/minhas-sessoes')
        .set('Cookie', cookieA)
        .expect(200);
      const ids = (lista.body as { id: string }[]).map((s) => s.id);
      expect(ids).toEqual(expect.arrayContaining([s1105, s1029]));
      expect(ids).not.toContain(sessaoB);
      await emitirComo(s1105, cookieA).expect(201);
      await emitirComo(sessaoB, cookieA).expect(403);

      // Sem a verificação, nada é listado nem emitido.
      await http().get('/declaracoes/minhas-sessoes').expect(401);
      await http()
        .post(`/declaracoes/minhas-sessoes/${s1105}/emissao`)
        .expect(401);

      // Só as três emissões permitidas ficaram registradas.
      expect(await db.select().from(emissoesDeclaracao)).toHaveLength(3);
    });

    it('a secretaria recebe 404 para a sessão que não existe e 400 para o id inválido', async () => {
      await emitirPelaEquipe(
        '00000000-0000-4000-8000-000000000000',
        'secretaria',
      ).expect(404);
      await emitirPelaEquipe('nao-e-uuid', 'secretaria').expect(400);
    });

    it('a emissão não pode ser alterada nem apagada no banco (RNF39)', async () => {
      await emitirPelaEquipe(s1105, 'secretaria').expect(201);
      await expect(
        db.execute(sql`update emissoes_declaracao set tipo = 'reemissao'`),
      ).rejects.toThrow();
      await expect(
        db.execute(sql`delete from emissoes_declaracao`),
      ).rejects.toThrow();
    });

    describe('paciente menor de idade', () => {
      let menor: typeof inscricoes.$inferSelect;
      let casoMenor: string;
      let sessaoMenor: string;
      beforeEach(async () => {
        [menor] = await db
          .insert(inscricoes)
          .values({
            numero: '2026-00401',
            nomeCompleto: 'João Pedro Lima',
            dataNascimento: '2014-03-10',
            cpf: '24843803010',
            rg: '123',
            endereco: 'Rua fictícia',
            estadoCivil: 'Solteiro(a)',
            canalPreferencial: 'email',
            email: 'responsavel.d@example.com',
            responsavelLegal: 'Fernanda Lima',
            cpfResponsavel: '86288366757',
          })
          .returning();
        [{ id: casoMenor }] = await db
          .insert(casos)
          .values({
            inscricaoId: menor.id,
            entradaNaFilaEm: menor.criadaEm,
            situacao: 'em_atendimento',
            cicloAtendimento: 2,
          })
          .returning();
        sessaoMenor = await sessao(
          casoMenor,
          as14h('2026-11-06'),
          'realizada',
          {
            estagiario: 'pedro',
          },
        );
      });

      it('sem a autorização registrada, a emissão é bloqueada para o responsável e para a secretaria, com a pendência informada (422)', async () => {
        const res = await emitirComo(
          sessaoMenor,
          await verificar(menor),
        ).expect(422);
        expect(res.body).toMatchObject({
          motivo: 'autorizacao_pendente',
          message:
            'A Autorização para Acompanhamento Psicoterapêutico de Crianças e Adolescentes ainda não foi registrada. Procure a secretaria da clínica.',
        });
        const secretaria = await emitirPelaEquipe(
          sessaoMenor,
          'secretaria',
        ).expect(422);
        expect(secretaria.body.message).toContain(
          'Registre a entrega na ficha do paciente',
        );
        expect(await db.select().from(emissoesDeclaracao)).toHaveLength(0);
      });

      it('com a autorização registrada pela secretaria, o responsável emite normalmente', async () => {
        const ficha = await http()
          .get(`/pacientes/${casoMenor}/autorizacao-menor`)
          .set(como('secretaria'))
          .expect(200);
        expect(ficha.body).toEqual({
          menor: true,
          responsavelLegal: 'Fernanda Lima',
          autorizacao: null,
        });
        const registro = await http()
          .put(`/pacientes/${casoMenor}/autorizacao-menor`)
          .set(como('secretaria'))
          .send({ entregueEm: '2026-11-03' })
          .expect(200);
        expect(registro.body).toEqual({
          menor: true,
          responsavelLegal: 'Fernanda Lima',
          autorizacao: {
            entregueEm: '2026-11-03',
            registradoPor: 'Juliana Rocha',
            registradoEm: expect.any(String),
          },
        });
        await emitirComo(sessaoMenor, await verificar(menor)).expect(201);
      });

      it('a correção da data fica na auditoria com a anterior, e uma data futura é recusada', async () => {
        const registrar = (entregueEm: string) =>
          http()
            .put(`/pacientes/${casoMenor}/autorizacao-menor`)
            .set(como('secretaria'))
            .send({ entregueEm });
        await registrar('2026-11-03').expect(200);
        await registrar('2026-11-04').expect(200);
        const registros = await auditoriaDe('registrar_autorizacao_menor');
        expect(registros.map((r) => [r.dadosAnteriores, r.dadosNovos])).toEqual(
          expect.arrayContaining([
            [null, { entregueEm: '2026-11-03' }],
            [{ entregueEm: '2026-11-03' }, { entregueEm: '2026-11-04' }],
          ]),
        );
        expect(await db.select().from(autorizacoesMenor)).toHaveLength(1);
        await registrar('2999-01-01').expect(400);
        await registrar('ontem').expect(400);
      });

      it('para paciente adulto a autorização não se aplica (409), e só a secretaria registra (403)', async () => {
        await http()
          .put(`/pacientes/${casoA}/autorizacao-menor`)
          .set(como('secretaria'))
          .send({ entregueEm: '2026-11-03' })
          .expect(409);
        for (const chave of ['ana', 'supervisor', 'coordenacao']) {
          await http()
            .put(`/pacientes/${casoMenor}/autorizacao-menor`)
            .set(como(chave))
            .send({ entregueEm: '2026-11-03' })
            .expect(403);
          await http()
            .get(`/pacientes/${casoMenor}/autorizacao-menor`)
            .set(como(chave))
            .expect(403);
        }
      });
    });
  });
});
