import { Global, INestApplication, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { usuarios, type Db } from '@clinica/database';
import { AuditoriaModule } from '../../auditoria/auditoria.module';
import {
  exigirOrigemDaWeb,
  FORMATO_RECUSADO,
  ORIGEM_RECUSADA,
} from '../../common/origem-da-web';
import { DB } from '../../database/database.module';
import { EmailService } from '../../notificacoes/email.service';
import { ParametrosModule } from '../../parametros/parametros.module';
import {
  CHAVE_TESTE,
  criarBancoDeTeste,
} from '../../test-utils/banco-de-teste';
import { AcessoModule } from './acesso.module';
import { gerarHashSenha } from './credenciais';
import {
  FalhasDeEntrada,
  JANELA_ENTRADAS_MINUTOS,
  LIMITE_ENTRADAS_PADRAO,
} from './falhas-de-entrada';

const WEB = 'http://localhost:3000';
const OUTRO_SITE = 'https://outro-sistema.fbr.edu.br';

// Requisição forjada por outra página (CSRF) e limite de entradas com erro por
// origem (RNF49), com a API montada como no main.ts.
// Cada entrada confere a senha com bcrypt: com a suíte inteira rodando em paralelo,
// as entradas em série destes testes passam dos 5 s padrão do Jest. Um teste
// interrompido no meio deixaria tentativas contando na origem do teste seguinte.
const ENTRADAS_EM_SERIE = 30_000;

describe('Proteção da sessão contra outras páginas e tentativas em massa (RNF49, RNF16)', () => {
  let app: INestApplication;
  let db: Db;
  let limpar: () => Promise<unknown>;
  let fechar: () => Promise<void>;
  let hashSenha: string;
  const SENHA = 'senha1234';

  beforeAll(async () => {
    ({ db, limpar, fechar } = await criarBancoDeTeste());
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
              WEB_URL: WEB,
              CHAVE_DADOS: CHAVE_TESTE,
              LIMITE_ENTRADAS_POR_ORIGEM: 3,
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
    app.use(exigirOrigemDaWeb(WEB));
    await app.init();
  }, 60_000);

  beforeEach(async () => {
    await limpar();
    // A contagem por origem fica na memória da API: cada teste começa do zero.
    (
      app.get(FalhasDeEntrada) as unknown as { falhas: Map<string, number[]> }
    ).falhas.clear();
    await db.insert(usuarios).values([
      {
        nome: 'Helena Duarte',
        email: 'helena@fbr.edu.br',
        perfil: 'coordenacao',
        situacao: 'ativo',
        senhaHash: hashSenha,
      },
      {
        nome: 'Juliana Rocha',
        email: 'juliana@fbr.edu.br',
        perfil: 'secretaria',
        situacao: 'ativo',
        senhaHash: hashSenha,
      },
    ]);
  });

  afterAll(async () => {
    await app.close();
    await fechar();
  });

  const servidor = () => app.getHttpServer();
  const entrar = (email: string, senha = SENHA) =>
    request(servidor()).post('/auth/login').send({ email, senha });
  const cookieDaCoordenacao = async () =>
    ([] as string[])
      .concat((await entrar('helena@fbr.edu.br')).headers['set-cookie'] ?? [])
      .map((c) => c.split(';')[0]);
  const contasCom = async (email: string) =>
    db.select().from(usuarios).where(eq(usuarios.email, email));

  it('o formulário de outra página, com o cookie da coordenação, não cria conta nem desativa usuário (RNF16, RF53, RF54)', async () => {
    const cookie = await cookieDaCoordenacao();
    const formulario = await request(servidor())
      .post('/usuarios')
      .set('Cookie', cookie)
      .set('Origin', OUTRO_SITE)
      .type('form')
      .send({ nome: 'Conta Forjada', email: 'forjada@exemplo.com' });
    expect(formulario.status).toBe(403);
    expect(formulario.body.message).toBe(ORIGEM_RECUSADA);

    // Sem o Origin (navegador antigo ou envio sem página), o formulário também
    // é recusado, pelo formato.
    const semOrigem = await request(servidor())
      .post('/usuarios')
      .set('Cookie', cookie)
      .type('form')
      .send({
        nome: 'Conta Forjada',
        email: 'forjada@exemplo.com',
        perfil: 'coordenacao',
      });
    expect(semOrigem.status).toBe(415);
    expect(semOrigem.body.message).toBe(FORMATO_RECUSADO);

    // A desativação não tem corpo: um formulário vazio bastaria.
    const [juliana] = await contasCom('juliana@fbr.edu.br');
    await request(servidor())
      .post(`/usuarios/${juliana.id}/desativacao`)
      .set('Cookie', cookie)
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .expect(415);
    await request(servidor())
      .post(`/usuarios/${juliana.id}/desativacao`)
      .set('Cookie', cookie)
      .set('Content-Type', 'text/plain')
      .expect(415);

    expect(await contasCom('forjada@exemplo.com')).toHaveLength(0);
    expect((await contasCom('juliana@fbr.edu.br'))[0].situacao).toBe('ativo');
  });

  it('o JSON enviado por outra origem é recusado, e o da web passa (RNF16, RF53)', async () => {
    const cookie = await cookieDaCoordenacao();
    const corpo = {
      nome: 'Nova Secretária',
      email: 'nova@fbr.edu.br',
      perfil: 'secretaria',
    };
    await request(servidor())
      .post('/usuarios')
      .set('Cookie', cookie)
      .set('Origin', OUTRO_SITE)
      .send(corpo)
      .expect(403);
    await request(servidor())
      .post('/usuarios')
      .set('Cookie', cookie)
      .set('Origin', 'null')
      .send(corpo)
      .expect(403);
    expect(await contasCom('nova@fbr.edu.br')).toHaveLength(0);

    await request(servidor())
      .post('/usuarios')
      .set('Cookie', cookie)
      .set('Origin', WEB)
      .send(corpo)
      .expect(201);
    expect(await contasCom('nova@fbr.edu.br')).toHaveLength(1);

    // A leitura não muda nada e segue a regra de CORS do navegador.
    await request(servidor())
      .get('/auth/sessao')
      .set('Cookie', cookie)
      .set('Origin', OUTRO_SITE)
      .expect(200);
  });

  it(
    'a origem com muitas entradas erradas recebe 429, sem contar as entradas certas (RNF49, RF50)',
    async () => {
      // Entradas certas não gastam o limite.
      for (let i = 0; i < 5; i += 1)
        await entrar('juliana@fbr.edu.br').expect(200);
      // Uma senha errada em cada conta, para não chegar ao bloqueio de nenhuma.
      await entrar('helena@fbr.edu.br', 'errada111').expect(401);
      await entrar('juliana@fbr.edu.br', 'errada111').expect(401);
      await entrar('ninguem@fbr.edu.br', 'errada111').expect(401);
      // A 4ª tentativa da mesma origem é recusada antes de conferir a senha,
      // mesmo certa, e não conta para o bloqueio da conta.
      const recusada = await entrar('juliana@fbr.edu.br').expect(429);
      expect(recusada.body.message).toMatch(/Muitas tentativas de entrada/);
      expect((await contasCom('juliana@fbr.edu.br'))[0].tentativasFalhas).toBe(
        1,
      );
    },
    ENTRADAS_EM_SERIE,
  );

  it(
    'as tentativas numa conta já bloqueada não gastam o limite da origem (RNF49, DF25)',
    async () => {
      await db
        .update(usuarios)
        .set({ bloqueadoAte: new Date(Date.now() + 15 * 60_000) })
        .where(eq(usuarios.email, 'juliana@fbr.edu.br'));
      // Alguém da mesma rede clica em "Entrar" várias vezes na conta bloqueada.
      for (let i = 0; i < 5; i += 1)
        await entrar('juliana@fbr.edu.br').expect(423);
      // O resto da equipe, que sai pelo mesmo endereço, continua entrando.
      await entrar('helena@fbr.edu.br').expect(200);
      // A senha errada que bloqueia a conta conta: 401, 401 e o 423 do bloqueio.
      await entrar('helena@fbr.edu.br', 'errada111').expect(401);
      await entrar('helena@fbr.edu.br', 'errada222').expect(401);
      await entrar('helena@fbr.edu.br', 'errada333').expect(423);
      await entrar('ninguem@fbr.edu.br', 'errada111').expect(429);
    },
    ENTRADAS_EM_SERIE,
  );
});

describe('Contagem das entradas com erro por origem (RNF49)', () => {
  afterEach(() => jest.useRealTimers());

  it('recusa só a origem que chegou ao limite e libera depois de 10 minutos (RNF49)', () => {
    jest.useFakeTimers();
    const falhas = new FalhasDeEntrada(new ConfigService({}));
    for (let i = 0; i < LIMITE_ENTRADAS_PADRAO; i += 1) {
      falhas.exigirAbaixoDoLimite('10.0.0.1');
      falhas.registrar('10.0.0.1');
    }
    expect(() => falhas.exigirAbaixoDoLimite('10.0.0.1')).toThrow(
      expect.objectContaining({ status: 429 }),
    );
    expect(() => falhas.exigirAbaixoDoLimite('10.0.0.2')).not.toThrow();
    jest.advanceTimersByTime(JANELA_ENTRADAS_MINUTOS * 60_000 + 1);
    expect(() => falhas.exigirAbaixoDoLimite('10.0.0.1')).not.toThrow();
  });
});
