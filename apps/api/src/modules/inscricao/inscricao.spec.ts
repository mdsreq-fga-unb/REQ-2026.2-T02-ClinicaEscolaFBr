import { Global, INestApplication, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { randomBytes, randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import request from 'supertest';
import { createDb, inscricoes, auditoria, type Db } from '@clinica/database';
import { inscricaoSchema, menorDeIdade } from '@clinica/shared';
import { eq, sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { AuditoriaModule } from '../../auditoria/auditoria.module';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { decifrar } from '../../common/criptografia';
import { DB } from '../../database/database.module';
import { EmailService } from '../../notificacoes/email.service';
import { ParametrosModule } from '../../parametros/parametros.module';
import { criarBancoDeTeste } from '../../test-utils/banco-de-teste';
import { AcessoModule } from '../acesso/acesso.module';
import { AcompanhamentoClinicoModule } from '../acompanhamento-clinico/acompanhamento-clinico.module';
import { InscricaoModule } from './inscricao.module';

const valido = () => ({
  nomeCompleto: 'Pessoa Fictícia de Teste',
  dataNascimento: '1994-08-22',
  cpf: '11144477735',
  rg: 'MG-12.345.678 SSP/MG',
  endereco: 'Rua de Teste, 10, Brasília DF',
  estadoCivil: 'Solteiro(a)',
  responsavelLegal: '',
  celular: '(61) 99999-9999',
  email: 'teste@example.com',
  canalPreferencial: 'email',
  queixa: 'Queixa fictícia privada',
  percepcaoUrgencia: 'Urgência fictícia privada',
  historicoRelevante: 'Histórico fictício privado',
  confirmado: true,
  chaveEnvio: randomUUID(),
});

describe('RF1/RF2: contrato compartilhado', () => {
  it.each([
    'nomeCompleto',
    'dataNascimento',
    'cpf',
    'rg',
    'endereco',
    'estadoCivil',
    'queixa',
    'percepcaoUrgencia',
    'historicoRelevante',
    'canalPreferencial',
  ])('recusa %s vazio', (campo) =>
    expect(
      inscricaoSchema.safeParse({ ...valido(), [campo]: '' }).success,
    ).toBe(false),
  );
  it.each(['123', '111.444.777-35', 'abcdefghijk'])('recusa CPF %s', (cpf) => {
    expect(inscricaoSchema.safeParse({ ...valido(), cpf }).success).toBe(false);
  });
  it.each(['2999-01-01', '2025-02-30', 'ontem'])(
    'recusa nascimento %s',
    (dataNascimento) => {
      expect(
        inscricaoSchema.safeParse({ ...valido(), dataNascimento }).success,
      ).toBe(false);
    },
  );
  it.each([
    { email: 'inválido' },
    { celular: '123' },
    { canalPreferencial: 'sms' },
    { confirmado: false },
  ])('recusa contrato inválido %j', (alteracao) => {
    expect(
      inscricaoSchema.safeParse({ ...valido(), ...alteracao }).success,
    ).toBe(false);
  });
  it('calcula a maioridade na data do aniversário', () => {
    expect(menorDeIdade('2008-10-25', '2026-10-24')).toBe(true);
    expect(menorDeIdade('2008-10-25', '2026-10-25')).toBe(false);
  });
});

// Mesma suíte sobre PGlite (padrão da equipe) e PostgreSQL real quando a URL
// explícita é fornecida. Uma URL inválida falha: nenhum teste é ignorado.
describe('RF1/RF2: HTTP, transações e migrations oficiais', () => {
  let app: INestApplication;
  let db: Db;
  let fechar: () => Promise<void>;
  let limpar: () => Promise<unknown>;
  let auditor: AuditoriaService;
  const chave = randomBytes(32).toString('base64');

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
          sql`TRUNCATE acessos_prontuario, links_confirmacao, sessoes_atendimento, prontuarios, vinculos_estagiario, atribuicoes_supervisor, casos, decisoes_prioridade, inscricoes, sessoes_login, convites_ativacao, auditoria, usuarios CASCADE`,
        );
    } else {
      ({ db, fechar, limpar } = await criarBancoDeTeste());
    }
    @Global()
    @Module({
      providers: [
        { provide: DB, useValue: db },
        { provide: EmailService, useValue: { enviar: jest.fn() } },
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
              CHAVE_DADOS: chave,
              WEB_URL: 'http://localhost:3000',
              LIMITE_INSCRICOES_POR_ORIGEM: 1000,
            }),
          ],
        }),
        Infra,
        AuditoriaModule,
        ParametrosModule,
        InscricaoModule,
        AcessoModule,
        AcompanhamentoClinicoModule,
      ],
    }).compile();
    app = modulo.createNestApplication();
    auditor = app.get(AuditoriaService);
    await app.init();
  }, 60_000);
  beforeEach(async () => {
    jest.restoreAllMocks();
    await limpar();
  });
  afterAll(async () => {
    await app?.close();
    await fechar?.();
  });
  const enviar = (dados = valido()) =>
    request(app.getHttpServer()).post('/inscricoes').send(dados);

  it.each([
    { email: 'teste@example.com', celular: '', canalPreferencial: 'email' },
    { email: '', celular: '61999999999', canalPreferencial: 'whatsapp' },
    { email: '', celular: '61999999999', canalPreferencial: 'ligacao' },
    {
      email: 'teste@example.com',
      celular: '61999999999',
      canalPreferencial: 'email',
    },
  ])(
    'registra adulto com %j, sem sessão e com RG alfanumérico',
    async (contatos) => {
      const res = await enviar({ ...valido(), ...contatos }).expect(201);
      expect(Object.keys(res.body).sort()).toEqual(['criadaEm', 'numero']);
      expect(res.body.numero).toMatch(/^\d{4}-\d{5,}$/);
      expect(Number.isNaN(Date.parse(res.body.criadaEm))).toBe(false);
      expect(res.headers['cache-control']).toBe('no-store');
      const [registro] = await db.select().from(inscricoes);
      expect(registro.rg).toBe(valido().rg);
      expect(registro.celular).toBe(contatos.celular || null);
      expect(registro.email).toBe(contatos.email || null);
    },
  );
  it.each([
    { email: '', celular: '' },
    { email: '', canalPreferencial: 'email' },
    { celular: '', canalPreferencial: 'whatsapp' },
    { celular: '', canalPreferencial: 'ligacao' },
    { dataNascimento: '2020-01-01', responsavelLegal: '' },
    { cpf: '123' },
    { email: 'inválido' },
    { celular: '123' },
    { dataNascimento: '2999-01-01' },
    { dataNascimento: '2025-02-30' },
    { confirmado: false },
    { queixa: '' },
  ])(
    'API recusa %j sem persistir nem emitir comprovante',
    async (alteracao) => {
      const res = await enviar({ ...valido(), ...alteracao }).expect(400);
      expect(res.body.numero).toBeUndefined();
      expect(await db.select().from(inscricoes)).toHaveLength(0);
    },
  );
  it('aceita menor com responsável', async () => {
    await enviar({
      ...valido(),
      dataNascimento: '2020-01-01',
      responsavelLegal: 'Responsável Fictício',
    }).expect(201);
  });
  it('cifra os três campos com a rotina oficial e audita sem conteúdo pessoal', async () => {
    const dados = valido();
    const res = await enviar(dados).expect(201);
    const [registro] = await db.select().from(inscricoes);
    for (const campo of [
      'queixa',
      'percepcaoUrgencia',
      'historicoRelevante',
    ] as const) {
      const cifrado =
        registro[
          `${campo === 'historicoRelevante' ? 'historicoRelevanteCifrado' : `${campo}Cifrada`}` as
            | 'queixaCifrada'
            | 'percepcaoUrgenciaCifrada'
            | 'historicoRelevanteCifrado'
        ];
      if (!cifrado)
        throw new Error(`A inscrição nova não gravou ${campo} cifrada.`);
      expect(cifrado).toMatch(/^v1\./);
      expect(cifrado).not.toContain(dados[campo]);
      expect(decifrar(cifrado, chave)).toBe(dados[campo]);
    }
    const [evento] = await db.select().from(auditoria);
    expect(evento.dadosNovos).toEqual({ numero: res.body.numero });
    expect(evento.usuarioId).toBeNull();
    expect(evento.entidadeId).toBe(registro.id);
    for (const valor of [
      dados.nomeCompleto,
      dados.cpf,
      dados.rg,
      dados.queixa,
      dados.percepcaoUrgencia,
      dados.historicoRelevante,
    ]) {
      expect(JSON.stringify(evento)).not.toContain(valor);
      expect(JSON.stringify(res.body)).not.toContain(valor);
    }
  });
  it('desfaz inscrição se a auditoria falhar, e permite nova tentativa', async () => {
    const dados = valido();
    jest
      .spyOn(auditor, 'registrar')
      .mockRejectedValueOnce(new Error(`driver: ${dados.queixa}`));
    const res = await enviar(dados).expect(503);
    expect(JSON.stringify(res.body)).not.toContain(dados.queixa);
    expect(res.body.numero).toBeUndefined();
    expect(await db.select().from(inscricoes)).toHaveLength(0);
    expect(await db.select().from(auditoria)).toHaveLength(0);
    await enviar(dados).expect(201);
  });
  it('falha de conexão não retorna detalhes internos', async () => {
    jest
      .spyOn(db, 'transaction')
      .mockRejectedValueOnce(new Error('password=segredo; dados privados'));
    const res = await enviar().expect(503);
    expect(JSON.stringify(res.body)).not.toMatch(/segredo|dados privados/);
    expect(res.body.numero).toBeUndefined();
  });
  it('reenvia depois de perder a resposta sem duplicar inscrição ou auditoria', async () => {
    const dados = valido();
    await enviar(dados).expect(201); // cliente perde esta resposta
    const [original] = await db.select().from(inscricoes);
    const repetido = await enviar(dados).expect(201);
    expect(repetido.body).toEqual({
      numero: original.numero,
      criadaEm: original.criadaEm.toISOString(),
    });
    expect(await db.select().from(inscricoes)).toHaveLength(1);
    expect(await db.select().from(auditoria)).toHaveLength(1);
  });
  it('recusa reuso da chave com dados diferentes', async () => {
    const dados = valido();
    await enviar(dados).expect(201);
    await enviar({ ...dados, queixa: 'Outra declaração' }).expect(409);
    await enviar({ ...dados, nomeCompleto: 'Outro nome' }).expect(409);
    expect(await db.select().from(inscricoes)).toHaveLength(1);
  });
  it('sequência e idempotência resistem a requisições concorrentes; mesmo CPF é permitido', async () => {
    const dados = valido();
    const repetidos = await Promise.all(
      Array.from({ length: 8 }, () => enviar(dados).expect(201)),
    );
    expect(new Set(repetidos.map((r) => r.body.numero)).size).toBe(1);
    const novos = await Promise.all(
      Array.from({ length: 8 }, () => enviar().expect(201)),
    );
    expect(new Set(novos.map((r) => r.body.numero)).size).toBe(8);
    expect(await db.select().from(inscricoes)).toHaveLength(9);
    expect(await db.select().from(auditoria)).toHaveLength(9);
  });
  it('a auditoria oficial permanece somente inserção', async () => {
    await enviar().expect(201);
    const [evento] = await db.select().from(auditoria);
    await expect(
      db.delete(auditoria).where(eq(auditoria.id, evento.id)),
    ).rejects.toThrow();
    await expect(
      db
        .update(auditoria)
        .set({ operacao: 'alterar' })
        .where(eq(auditoria.id, evento.id)),
    ).rejects.toThrow();
  });
  it('não publica consulta; as rotas internas mantêm a proteção de sessão', async () => {
    const dados = valido();
    const res = await enviar(dados).expect(201);
    for (const caminho of [
      '/inscricoes',
      `/inscricoes/${dados.chaveEnvio}`,
      `/inscricoes/${res.body.numero}`,
    ])
      await request(app.getHttpServer()).get(caminho).expect(404);
    for (const caminho of [
      '/usuarios',
      `/prontuarios/${randomUUID()}`,
      `/pacientes/${randomUUID()}/dados-administrativos`,
    ])
      await request(app.getHttpServer()).get(caminho).expect(401);
  });
});
