import { Global, INestApplication, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import {
  auditoria,
  casos,
  decisoesPrioridade,
  inscricoes,
  usuarios,
  verificacoesIdentidade,
  type Db,
} from '@clinica/database';
import { AuditoriaModule } from '../../auditoria/auditoria.module';
import { DB } from '../../database/database.module';
import { EmailService } from '../../notificacoes/email.service';
import { ParametrosModule } from '../../parametros/parametros.module';
import {
  CHAVE_TESTE,
  criarBancoDeTeste,
} from '../../test-utils/banco-de-teste';
import { cifrar } from '../../common/criptografia';
import { VerificacaoService } from '../acesso/verificacao.service';
import { ConsultaFilaModule } from './consulta-fila.module';
const enviarEmail = jest.fn<Promise<unknown>, [string, string, string]>();
describe('RF8 com a verificação real RF52', () => {
  let app: INestApplication;
  let db: Db;
  let limpar: () => Promise<unknown>;
  let fechar: () => Promise<void>;
  let pessoa: typeof inscricoes.$inferSelect;
  let secretaria: typeof usuarios.$inferSelect;
  let supervisor: typeof usuarios.$inferSelect;
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
        ConsultaFilaModule,
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
  }, 60000);
  afterAll(async () => {
    await app.close();
    await fechar();
  });
  beforeEach(async () => {
    await app.get(VerificacaoService).emCurso;
    await limpar();
    enviarEmail.mockReset();
    enviarEmail.mockResolvedValue(undefined);
    [secretaria, supervisor] = await db
      .insert(usuarios)
      .values([
        {
          nome: 'Secretaria',
          email: 'secretaria@example.com',
          perfil: 'secretaria',
        },
        {
          nome: 'Supervisor',
          email: 'supervisor@example.com',
          perfil: 'supervisor',
        },
      ])
      .returning();
    [pessoa] = await db
      .insert(inscricoes)
      .values({
        numero: '2026-00001',
        nomeCompleto: 'Pessoa protegida',
        dataNascimento: '1990-01-01',
        cpf: '52998224725',
        rg: '123',
        endereco: 'Rua fictícia',
        estadoCivil: 'Solteiro(a)',
        canalPreferencial: 'email',
        email: 'pessoa@example.com',
      })
      .returning();
  });
  const http = () => request(app.getHttpServer());
  const como = (u = secretaria) => ({
    'x-usuario-teste': JSON.stringify({
      id: u.id,
      nome: u.nome,
      perfil: u.perfil,
    }),
  });
  async function verificar() {
    await http()
      .post('/verificacao/codigo')
      .send({ identificador: pessoa.numero })
      .expect(202);
    await app.get(VerificacaoService).emCurso;
    const codigo = /(\d{6})<\/p>/.exec(enviarEmail.mock.calls.at(-1)![2])![1];
    const res = await http()
      .post('/verificacao/conferir')
      .send({ identificador: pessoa.numero, codigo })
      .expect(200);
    return ([] as string[]).concat(res.headers['set-cookie'] ?? []);
  }
  async function classificar(
    situacao: typeof casos.$inferInsert.situacao = 'aguardando_distribuicao',
  ) {
    await db.insert(decisoesPrioridade).values({
      inscricaoId: pessoa.id,
      corCifrada: cifrar('amarela', CHAVE_TESTE),
      decididaPor: supervisor.id,
    });
    await db.insert(casos).values({
      inscricaoId: pessoa.id,
      entradaNaFilaEm: pessoa.criadaEm,
      situacao,
    });
  }
  it('nega anônimo e token inválido sem dados (RNF6)', async () => {
    for (const cookie of ['', 'verificacao=invalido']) {
      const res = await http()
        .get('/fila/minha-situacao')
        .set('Cookie', cookie)
        .expect(401);
      expect(JSON.stringify(res.body)).not.toMatch(
        /Pessoa protegida|2026-00001|amarela/,
      );
    }
  });
  it('mostra aguardando triagem apenas depois de código real e ignora a inscrição da query', async () => {
    const cookie = await verificar();
    const res = await http()
      .get('/fila/minha-situacao?numero=2026-99999&inscricaoId=outra')
      .set('Cookie', cookie)
      .expect(200);
    expect(res.body).toEqual({
      numero: pessoa.numero,
      situacao: 'aguardando_triagem',
      posicao: null,
      consultadaEm: expect.any(String),
    });
    expect(res.headers['cache-control']).toBe('no-store');
  });
  it.each([
    'aguardando_distribuicao',
    'aguardando_vinculo',
    'aguardando_vaga',
  ] as const)(
    'mantém %s na fila global sem divulgar clínica ou outras pessoas',
    async (situacao) => {
      await classificar(situacao);
      const res = await http()
        .get('/fila/minha-situacao')
        .set('Cookie', await verificar())
        .expect(200);
      expect(res.body).toEqual({
        numero: pessoa.numero,
        situacao: 'na_fila',
        posicao: 1,
        consultadaEm: expect.any(String),
      });
      expect(JSON.stringify(res.body)).not.toMatch(
        /amarela|prioridade|nome|cpf|email|queixa/,
      );
    },
  );
  it.each([
    ['em_atendimento', 'em_atendimento'],
    ['encerrado', 'procure_secretaria'],
    ['desligado_por_faltas', 'procure_secretaria'],
  ] as const)(
    'traduz %s sem revelar o motivo clínico',
    async (estado, situacao) => {
      await classificar(estado);
      const res = await http()
        .get('/fila/minha-situacao')
        .set('Cookie', await verificar())
        .expect(200);
      expect(res.body).toMatchObject({ situacao, posicao: null });
    },
  );
  it('expiração da verificação impede nova consulta (RNF6)', async () => {
    const cookie = await verificar();
    await db.update(verificacoesIdentidade).set({ expiraEm: new Date(0) });
    await http().get('/fila/minha-situacao').set('Cookie', cookie).expect(401);
  });
  it('encerramento pelo RF52 impede reutilizar o cookie (RNF6)', async () => {
    const cookie = await verificar();
    await http()
      .post('/verificacao/encerrar')
      .set('Cookie', cookie)
      .expect(204);
    await http().get('/fila/minha-situacao').set('Cookie', cookie).expect(401);
  });
  it('secretaria consulta sem cor, audita o acesso e outros perfis são negados', async () => {
    await classificar();
    const res = await http()
      .get('/fila/situacao?numero=' + pessoa.numero)
      .set(como())
      .expect(200);
    expect(res.body).toMatchObject({
      numero: pessoa.numero,
      situacao: 'na_fila',
      posicao: 1,
    });
    expect(Object.keys(res.body).sort()).toEqual([
      'consultadaEm',
      'numero',
      'posicao',
      'situacao',
    ]);
    const acessos = await db
      .select()
      .from(auditoria)
      .where(eq(auditoria.operacao, 'consultar_situacao_inscricao'));
    expect(acessos).toEqual([
      expect.objectContaining({
        usuarioId: secretaria.id,
        entidadeId: pessoa.id,
        dadosNovos: { origem: 'secretaria' },
      }),
    ]);
    for (const perfil of ['supervisor', 'estagiario', 'coordenacao'])
      await http()
        .get('/fila/situacao?numero=' + pessoa.numero)
        .set(como({ ...supervisor, perfil } as typeof supervisor))
        .expect(403);
    await http()
      .get('/fila/situacao?numero=' + pessoa.numero)
      .expect(401);
    await http().get('/fila/situacao?numero=ruim').set(como()).expect(400);
    await http()
      .get('/fila/situacao?numero=2026-99999')
      .set(como())
      .expect(404);
  });
  it('nova consulta reflete reclassificação de outro caso', async () => {
    await classificar();
    const cookie = await verificar();
    expect(
      (await http().get('/fila/minha-situacao').set('Cookie', cookie)).body
        .posicao,
    ).toBe(1);
    const [outra] = await db
      .insert(inscricoes)
      .values({
        ...pessoa,
        id: undefined,
        numero: '2026-00002',
        cpf: '11144477735',
      })
      .returning();
    await db
      .insert(casos)
      .values({ inscricaoId: outra.id, entradaNaFilaEm: outra.criadaEm });
    await db.insert(decisoesPrioridade).values({
      inscricaoId: outra.id,
      corCifrada: cifrar('vermelha', CHAVE_TESTE),
      decididaPor: supervisor.id,
    });
    expect(
      (await http().get('/fila/minha-situacao').set('Cookie', cookie)).body
        .posicao,
    ).toBe(2);
  });
});
