import { Global, INestApplication, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { sessoesLogin, usuarios, type Db } from '@clinica/database';
import { AuditoriaModule } from '../../auditoria/auditoria.module';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { DB } from '../../database/database.module';
import { EmailService } from '../../notificacoes/email.service';
import { ParametrosModule } from '../../parametros/parametros.module';
import {
  CHAVE_TESTE,
  criarBancoDeTeste,
} from '../../test-utils/banco-de-teste';
import { AcessoModule } from './acesso.module';
import { gerarHashSenha } from './credenciais';
import { ESPERA_MAXIMA_MS } from './sessoes.service';

// Entrada, sessão e saída do sistema (RF50, RF51, RNF49 e RNF50).
describe('Autenticação: login, sessão e logout', () => {
  let app: INestApplication;
  let db: Db;
  let limpar: () => Promise<unknown>;
  let fechar: () => Promise<void>;
  let hashSenha: string;
  const SENHA = 'senha1234';

  beforeAll(async () => {
    const banco = await criarBancoDeTeste();
    ({ db, limpar, fechar } = banco);
    hashSenha = await gerarHashSenha(SENHA);

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
        AcessoModule,
      ],
    }).compile();
    app = modulo.createNestApplication();
    app.use(cookieParser());
    await app.init();
  }, 60_000);

  beforeEach(async () => {
    await limpar();
    await db.insert(usuarios).values([
      {
        nome: 'Ana Costa',
        email: 'ana@fbr.edu.br',
        perfil: 'coordenacao',
        situacao: 'ativo',
        senhaHash: hashSenha,
      },
      {
        nome: 'Bruno Dias',
        email: 'bruno@fbr.edu.br',
        perfil: 'estagiario',
        situacao: 'desativado',
        senhaHash: hashSenha,
      },
      {
        nome: 'Carla Souza',
        email: 'carla@fbr.edu.br',
        perfil: 'secretaria',
        situacao: 'pendente_ativacao',
      },
    ]);
  });

  afterAll(async () => {
    await app.close();
    await fechar();
  });

  const servidor = () => app.getHttpServer();
  const entrar = (email: string, senha: string) =>
    request(servidor()).post('/auth/login').send({ email, senha });
  const cookieDe = (res: request.Response) =>
    ([] as string[]).concat(res.headers['set-cookie'] ?? []);
  const ana = async () =>
    (
      await db
        .select()
        .from(usuarios)
        .where(eq(usuarios.email, 'ana@fbr.edu.br'))
    )[0];

  it('usuário ativo entra, recebe o cookie de sessão e só acessa o que o perfil permite', async () => {
    const res = await entrar('ANA@fbr.edu.br', SENHA).expect(200);
    expect(res.body).toEqual({
      id: expect.any(String),
      nome: 'Ana Costa',
      perfil: 'coordenacao',
    });
    const [cookie] = cookieDe(res);
    expect(cookie).toMatch(/^sessao=/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);

    const sessao = await request(servidor())
      .get('/auth/sessao')
      .set('Cookie', cookieDe(res))
      .expect(200);
    expect(sessao.body).toEqual(res.body);
    // A sessão alimenta o PerfisGuard: a coordenação lista usuários.
    await request(servidor())
      .get('/usuarios')
      .set('Cookie', cookieDe(res))
      .expect(200);

    const [registro] = await db.select().from(sessoesLogin);
    expect(registro.tokenHash).not.toContain(
      cookie.split(';')[0].split('=')[1],
    );
  });

  it('sem sessão, GET /auth/sessao responde 401', async () => {
    await request(servidor()).get('/auth/sessao').expect(401);
    await request(servidor())
      .get('/auth/sessao')
      .set('Cookie', ['sessao=token-que-nao-existe'])
      .expect(401);
  });

  it('e-mail ou senha incorretos negam o acesso com a mesma mensagem', async () => {
    const senhaErrada = await entrar('ana@fbr.edu.br', 'outra1234').expect(401);
    const emailInexistente = await entrar('ninguem@fbr.edu.br', SENHA).expect(
      401,
    );
    expect(senhaErrada.body.message).toBe('E-mail ou senha incorretos.');
    expect(emailInexistente.body.message).toBe(senhaErrada.body.message);
    expect(cookieDe(senhaErrada)).toEqual([]);
  });

  it('usuário desativado (RF54) ou pendente de ativação (RF53) não entra', async () => {
    const desativado = await entrar('bruno@fbr.edu.br', SENHA).expect(401);
    const pendente = await entrar('carla@fbr.edu.br', SENHA).expect(401);
    expect(desativado.body.message).toBe('E-mail ou senha incorretos.');
    expect(pendente.body.message).toBe('E-mail ou senha incorretos.');
  });

  it('dados de entrada inválidos respondem 400', async () => {
    await request(servidor())
      .post('/auth/login')
      .send({ email: 'ana' })
      .expect(400);
  });

  it('na 3ª tentativa seguida com erro, bloqueia por 15 minutos, mesmo com a senha certa (RF50, RNF49)', async () => {
    await entrar('ana@fbr.edu.br', 'errada111').expect(401);
    await entrar('ana@fbr.edu.br', 'errada222').expect(401);
    const antes = Date.now();
    const bloqueio = await entrar('ana@fbr.edu.br', 'errada333').expect(423);
    const ate = new Date(bloqueio.body.bloqueadoAte).getTime();
    expect(ate - antes).toBeGreaterThanOrEqual(15 * 60_000 - 1_000);
    expect(ate - antes).toBeLessThanOrEqual(15 * 60_000 + 5_000);
    expect(bloqueio.body.message).toBe('Acesso bloqueado por 15 minutos.');

    const comSenhaCerta = await entrar('ana@fbr.edu.br', SENHA).expect(423);
    expect(comSenhaCerta.body.bloqueadoAte).toBe(bloqueio.body.bloqueadoAte);
  });

  it('tentativas simultâneas não passam de 3 antes do bloqueio (RF50, RNF49)', async () => {
    const respostas = await Promise.all(
      ['e1', 'e2', 'e3', 'e4', 'e5', 'e6'].map((s) =>
        entrar('ana@fbr.edu.br', `errada${s}00`),
      ),
    );
    const status = respostas.map((r) => r.status).sort((a, b) => a - b);
    expect(status).toEqual([401, 401, 423, 423, 423, 423]);
    await entrar('ana@fbr.edu.br', SENHA).expect(423);
  });

  it('entradas simultâneas com a senha certa são todas aceitas, sem bloquear a conta (RF50, RNF49)', async () => {
    const respostas = await Promise.all(
      Array.from({ length: 8 }, () => entrar('ana@fbr.edu.br', SENHA)),
    );
    expect(respostas.map((r) => r.status)).toEqual(Array(8).fill(200));
    const depois = await ana();
    expect(depois).toMatchObject({
      tentativasFalhas: 0,
      bloqueadoAte: null,
      entradasEmCurso: 0,
    });
    // As entradas esperam a vez de 3 em 3, e cada senha leva o tempo do bcrypt.
  }, 30_000);

  it('entradas certas ao mesmo tempo que uma errada não contam como erro (RF50, RNF49)', async () => {
    const respostas = await Promise.all([
      entrar('ana@fbr.edu.br', SENHA),
      entrar('ana@fbr.edu.br', 'errada111'),
      entrar('ana@fbr.edu.br', SENHA),
      entrar('ana@fbr.edu.br', SENHA),
    ]);
    const status = respostas.map((r) => r.status).sort((a, b) => a - b);
    expect(status).toEqual([200, 200, 200, 401]);
    expect(await ana()).toMatchObject({
      bloqueadoAte: null,
      entradasEmCurso: 0,
    });
  });

  it('duas senhas erradas ao mesmo tempo que entradas certas não bloqueiam a conta (RF50, RNF49)', async () => {
    const respostas = await Promise.all([
      entrar('ana@fbr.edu.br', 'errada111'),
      entrar('ana@fbr.edu.br', SENHA),
      entrar('ana@fbr.edu.br', 'errada222'),
      entrar('ana@fbr.edu.br', SENHA),
      entrar('ana@fbr.edu.br', SENHA),
      entrar('ana@fbr.edu.br', SENHA),
    ]);
    const status = respostas.map((r) => r.status).sort((a, b) => a - b);
    expect(status).toEqual([200, 200, 200, 200, 401, 401]);
    expect(await ana()).toMatchObject({
      bloqueadoAte: null,
      entradasEmCurso: 0,
    });
  }, 30_000);

  it('um erro inesperado no meio da entrada devolve a vaga reservada (RF50, RNF49)', async () => {
    const registrar = jest
      .spyOn(app.get(AuditoriaService), 'registrar')
      .mockRejectedValue(new Error('auditoria fora do ar'));
    try {
      for (let i = 0; i < 3; i++) {
        await entrar('ana@fbr.edu.br', SENHA).expect(500);
      }
    } finally {
      registrar.mockRestore();
    }
    expect((await ana()).entradasEmCurso).toBe(0);
    await entrar('ana@fbr.edu.br', SENHA).expect(200);
  });

  it('sem vaga por 5 segundos, a entrada recebe 429 e não conta como erro (RF50, RNF49)', async () => {
    await db
      .update(usuarios)
      .set({ entradasEmCurso: 3, emCursoDesde: new Date() })
      .where(eq(usuarios.email, 'ana@fbr.edu.br'));
    const inicio = Date.now();
    await entrar('ana@fbr.edu.br', SENHA).expect(429);
    expect(Date.now() - inicio).toBeGreaterThanOrEqual(ESPERA_MAXIMA_MS);
    expect(Date.now() - inicio).toBeLessThan(ESPERA_MAXIMA_MS + 2_000);
    expect(await ana()).toMatchObject({
      tentativasFalhas: 0,
      bloqueadoAte: null,
    });
  }, 15_000);

  it('uma reserva interrompida há mais de 30 segundos não ocupa a vaga (RF50, RNF49)', async () => {
    await db
      .update(usuarios)
      .set({
        entradasEmCurso: 3,
        emCursoDesde: new Date(Date.now() - 60_000),
      })
      .where(eq(usuarios.email, 'ana@fbr.edu.br'));
    await entrar('ana@fbr.edu.br', SENHA).expect(200);
    expect((await ana()).entradasEmCurso).toBe(0);
  });

  it('e-mail sem conta também chega ao bloqueio, sem revelar se o e-mail existe (RF50, RNF49)', async () => {
    await entrar('sem.conta@fbr.edu.br', 'errada111').expect(401);
    await entrar('sem.conta@fbr.edu.br', 'errada222').expect(401);
    const bloqueio = await entrar('sem.conta@fbr.edu.br', 'errada333').expect(
      423,
    );
    expect(bloqueio.body.message).toBe('Acesso bloqueado por 15 minutos.');
    await entrar('sem.conta@fbr.edu.br', SENHA).expect(423);
  });

  it('tentativas simultâneas com e-mail sem conta também param na 3ª (RF50, RNF49)', async () => {
    const respostas = await Promise.all(
      ['e1', 'e2', 'e3', 'e4', 'e5', 'e6'].map((s) =>
        entrar('outro.sem.conta@fbr.edu.br', `errada${s}00`),
      ),
    );
    const status = respostas.map((r) => r.status).sort((a, b) => a - b);
    expect(status).toEqual([401, 401, 423, 423, 423, 423]);
  });

  it('com e-mail sem conta, as tentativas simultâneas esperam a vez como numa conta real (RF50, RNF49)', async () => {
    const tentar = (email: string) =>
      Promise.all(
        ['e1', 'e2', 'e3', 'e4'].map(async (s) => {
          const inicio = Date.now();
          const res = await entrar(email, `errada${s}00`);
          return { status: res.status, ms: Date.now() - inicio };
        }),
      );
    // O 423 da 4ª tentativa só vem depois das 3 conferências em curso, nos dois
    // casos: a espera não revela se o e-mail tem conta.
    for (const email of ['ana@fbr.edu.br', 'mais.um.sem.conta@fbr.edu.br']) {
      const respostas = await tentar(email);
      expect(respostas.map((r) => r.status).sort((a, b) => a - b)).toEqual([
        401, 401, 423, 423,
      ]);
      const ms = (status: number) =>
        respostas.filter((r) => r.status === status).map((r) => r.ms);
      expect(Math.max(...ms(423))).toBeGreaterThanOrEqual(Math.min(...ms(401)));
    }
  }, 30_000);

  it('depois dos 15 minutos, a senha certa entra e zera o bloqueio (RF50, RNF49)', async () => {
    for (const senha of ['errada111', 'errada222', 'errada333']) {
      await entrar('ana@fbr.edu.br', senha);
    }
    await db
      .update(usuarios)
      .set({ bloqueadoAte: new Date(Date.now() - 1_000) })
      .where(eq(usuarios.email, 'ana@fbr.edu.br'));

    await entrar('ana@fbr.edu.br', SENHA).expect(200);
    const depois = await ana();
    expect(depois.bloqueadoAte).toBeNull();
    expect(depois.tentativasFalhas).toBe(0);
  });

  it('a entrada com sucesso zera as tentativas: o bloqueio exige 3 erros seguidos (RF50, RNF49)', async () => {
    await entrar('ana@fbr.edu.br', 'errada111').expect(401);
    await entrar('ana@fbr.edu.br', 'errada222').expect(401);
    await entrar('ana@fbr.edu.br', SENHA).expect(200);
    await entrar('ana@fbr.edu.br', 'errada333').expect(401);
    await entrar('ana@fbr.edu.br', 'errada444').expect(401);
  });

  it('cada requisição renova a sessão por 30 minutos, e a sessão parada expira (RF51, RNF50)', async () => {
    const res = await entrar('ana@fbr.edu.br', SENHA).expect(200);
    await db
      .update(sessoesLogin)
      .set({ expiraEm: new Date(Date.now() + 60_000) });

    const antes = Date.now();
    await request(servidor())
      .get('/auth/sessao')
      .set('Cookie', cookieDe(res))
      .expect(200);
    const [renovada] = await db.select().from(sessoesLogin);
    expect(renovada.expiraEm.getTime() - antes).toBeGreaterThanOrEqual(
      30 * 60_000 - 1_000,
    );

    await db
      .update(sessoesLogin)
      .set({ expiraEm: new Date(Date.now() - 1_000) });
    await request(servidor())
      .get('/auth/sessao')
      .set('Cookie', cookieDe(res))
      .expect(401);
  });

  it('ao sair, a sessão é revogada e o cookie antigo não dá mais acesso (RF51)', async () => {
    const res = await entrar('ana@fbr.edu.br', SENHA).expect(200);
    const saida = await request(servidor())
      .post('/auth/logout')
      .set('Cookie', cookieDe(res))
      .expect(204);
    expect(cookieDe(saida).join(';')).toMatch(/sessao=;/);

    const [registro] = await db.select().from(sessoesLogin);
    expect(registro.revogadaEm).not.toBeNull();
    await request(servidor())
      .get('/auth/sessao')
      .set('Cookie', cookieDe(res))
      .expect(401);
    await request(servidor())
      .get('/usuarios')
      .set('Cookie', cookieDe(res))
      .expect(401);
  });

  it('a desativação (RF54) encerra a sessão aberta do usuário', async () => {
    const res = await entrar('ana@fbr.edu.br', SENHA).expect(200);
    await db
      .update(usuarios)
      .set({ situacao: 'desativado' })
      .where(eq(usuarios.email, 'ana@fbr.edu.br'));
    await request(servidor())
      .get('/auth/sessao')
      .set('Cookie', cookieDe(res))
      .expect(401);
  });
});
