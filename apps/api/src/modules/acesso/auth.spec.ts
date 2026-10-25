import { Global, INestApplication, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { sessoesLogin, usuarios, type Db } from '@clinica/database';
import { AuditoriaModule } from '../../auditoria/auditoria.module';
import { DB } from '../../database/database.module';
import { EmailService } from '../../notificacoes/email.service';
import { ParametrosModule } from '../../parametros/parametros.module';
import {
  CHAVE_TESTE,
  criarBancoDeTeste,
} from '../../test-utils/banco-de-teste';
import { AcessoModule } from './acesso.module';
import { gerarHashSenha } from './credenciais';

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

  it('na 3ª tentativa seguida com erro, bloqueia por 15 minutos, mesmo com a senha certa', async () => {
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

  it('tentativas simultâneas não passam de 3 antes do bloqueio', async () => {
    const respostas = await Promise.all(
      ['e1', 'e2', 'e3', 'e4', 'e5', 'e6'].map((s) =>
        entrar('ana@fbr.edu.br', `errada${s}00`),
      ),
    );
    const status = respostas.map((r) => r.status).sort((a, b) => a - b);
    expect(status).toEqual([401, 401, 423, 423, 423, 423]);
    await entrar('ana@fbr.edu.br', SENHA).expect(423);
  });

  it('e-mail sem conta também chega ao bloqueio, sem revelar se o e-mail existe', async () => {
    await entrar('sem.conta@fbr.edu.br', 'errada111').expect(401);
    await entrar('sem.conta@fbr.edu.br', 'errada222').expect(401);
    const bloqueio = await entrar('sem.conta@fbr.edu.br', 'errada333').expect(
      423,
    );
    expect(bloqueio.body.message).toBe('Acesso bloqueado por 15 minutos.');
    await entrar('sem.conta@fbr.edu.br', SENHA).expect(423);
  });

  it('depois dos 15 minutos, a senha certa entra e zera o bloqueio', async () => {
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

  it('a entrada com sucesso zera as tentativas: o bloqueio exige 3 erros seguidos', async () => {
    await entrar('ana@fbr.edu.br', 'errada111').expect(401);
    await entrar('ana@fbr.edu.br', 'errada222').expect(401);
    await entrar('ana@fbr.edu.br', SENHA).expect(200);
    await entrar('ana@fbr.edu.br', 'errada333').expect(401);
    await entrar('ana@fbr.edu.br', 'errada444').expect(401);
  });

  it('cada requisição renova a sessão por 30 minutos, e a sessão parada expira (RNF50)', async () => {
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
