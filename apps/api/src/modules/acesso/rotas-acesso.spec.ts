import { Global, INestApplication, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { usuarios, type Db } from '@clinica/database';
import { AuditoriaModule } from '../../auditoria/auditoria.module';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { DB } from '../../database/database.module';
import { EmailService } from '../../notificacoes/email.service';
import { ParametrosModule } from '../../parametros/parametros.module';
import {
  CHAVE_TESTE,
  criarBancoDeTeste,
} from '../../test-utils/banco-de-teste';
import { AcompanhamentoClinicoModule } from '../acompanhamento-clinico/acompanhamento-clinico.module';
import { AcessoModule } from './acesso.module';

// Permissões por perfil nas rotas do RF53, RF54 e RF55. O usuário da sessão (RF50)
// é simulado pelo cabeçalho x-usuario-teste.
describe('Rotas de acesso: perfis e sessão', () => {
  let app: INestApplication;
  let db: Db;
  let fechar: () => Promise<void>;
  const pessoas: Record<string, UsuarioAutenticado> = {};

  beforeAll(async () => {
    const banco = await criarBancoDeTeste();
    db = banco.db;
    fechar = banco.fechar;

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
        AcompanhamentoClinicoModule,
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

    for (const [chave, perfil] of [
      ['coordenacao', 'coordenacao'],
      ['secretaria', 'secretaria'],
      ['estagiario', 'estagiario'],
      ['supervisor', 'supervisor'],
    ] as const) {
      const [u] = await db
        .insert(usuarios)
        .values({
          nome: chave,
          email: `${chave}@fbr.edu.br`,
          perfil,
          situacao: 'ativo',
        })
        .returning();
      pessoas[chave] = { id: u.id, nome: chave, perfil };
    }
  }, 60_000);

  afterAll(async () => {
    await app.close();
    await fechar();
  });

  const como = (quem: string) => ({
    'x-usuario-teste': JSON.stringify(pessoas[quem]),
  });
  const novoUsuario = {
    nome: 'Pedro Lima',
    email: 'pedro@fbr.edu.br',
    perfil: 'estagiario',
  };

  it('sem sessão, as rotas internas respondem 401', async () => {
    await request(app.getHttpServer()).get('/usuarios').expect(401);
    await request(app.getHttpServer())
      .post('/usuarios')
      .send(novoUsuario)
      .expect(401);
  });

  it.each(['secretaria', 'estagiario', 'supervisor'])(
    '%s não lista, não cadastra nem desativa usuários (403)',
    async (quem) => {
      const servidor = app.getHttpServer();
      await request(servidor).get('/usuarios').set(como(quem)).expect(403);
      await request(servidor)
        .post('/usuarios')
        .set(como(quem))
        .send(novoUsuario)
        .expect(403);
      await request(servidor)
        .post(`/usuarios/${pessoas.estagiario.id}/desativacao`)
        .set(como(quem))
        .expect(403);
    },
  );

  it('a coordenação cadastra, recebe 409 no e-mail repetido e 400 no e-mail inválido', async () => {
    const servidor = app.getHttpServer();
    await request(servidor)
      .post('/usuarios')
      .set(como('coordenacao'))
      .send(novoUsuario)
      .expect(201);
    await request(servidor)
      .post('/usuarios')
      .set(como('coordenacao'))
      .send(novoUsuario)
      .expect(409);
    await request(servidor)
      .post('/usuarios')
      .set(como('coordenacao'))
      .send({ ...novoUsuario, email: 'sem-arroba' })
      .expect(400);
  });

  it('a ativação é pública e recusa link inválido com 410', async () => {
    await request(app.getHttpServer())
      .get('/ativacao/token-inexistente')
      .expect(410);
  });

  it('a secretaria consulta os dados administrativos, e o estagiário não (403)', async () => {
    const id = '00000000-0000-4000-8000-000000000000';
    await request(app.getHttpServer())
      .get(`/pacientes/${id}/dados-administrativos`)
      .set(como('estagiario'))
      .expect(403);
    await request(app.getHttpServer())
      .get(`/pacientes/${id}/dados-administrativos`)
      .set(como('secretaria'))
      .expect(404);
  });
});
