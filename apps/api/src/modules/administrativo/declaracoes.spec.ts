import { Global, INestApplication, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import {
  casos,
  inscricoes,
  sessoesAtendimento,
  usuarios,
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
import { VerificacaoService } from '../acesso/verificacao.service';
import { DeclaracoesModule } from './declaracoes.module';

// RF44 e RNF38: sessões com presença registrada, com a verificação real do RF52
// para o paciente ou o responsável. O usuário da equipe (RF50) é simulado pelo
// cabeçalho x-usuario-teste.
const enviarEmail = jest.fn<Promise<unknown>, [string, string, string]>();
const HORA = 60 * 60 * 1000;
// Sessões das 14h de Brasília (17h UTC), como na prancha 8-2.
const as14h = (dia: string) => new Date(`${dia}T17:00:00Z`);

describe('Sessões com presença registrada (RF44, RNF38)', () => {
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
    await db.insert(sessoesAtendimento).values({
      casoId,
      cicloAtendimento: ciclo,
      estagiarioId: pessoas[estagiario].id,
      inicio,
      termino: new Date(inicio.getTime() + 50 * 60 * 1000),
      fimIntervaloAnotacoes: new Date(inicio.getTime() + HORA),
      status,
      agendadaPor: pessoas.secretaria.id,
    });
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
      expect(res.body).toEqual(ESPERADAS_A);
      expect(res.headers['cache-control']).toBe('no-store');
    });

    it('traz só a data, o horário e o estagiário, sem dado clínico nem pessoal (RNF6)', async () => {
      await semearSessoes();
      const res = await http()
        .get('/declaracoes/minhas-sessoes')
        .set('Cookie', await verificar(inscricaoA))
        .expect(200);
      for (const s of res.body as object[])
        expect(Object.keys(s).sort()).toEqual(['estagiario', 'inicio']);
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
      expect(res.body).toEqual(ESPERADAS_A);
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
});
