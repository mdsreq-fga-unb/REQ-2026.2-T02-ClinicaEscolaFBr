import { Global, INestApplication, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { randomBytes, randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import request from 'supertest';
import {
  createDb,
  inscricoes,
  auditoria,
  versoesTermo,
  type Db,
} from '@clinica/database';
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
  queixa: 'Queixa fictícia privada',
  percepcaoUrgencia: 'Urgência fictícia privada',
  historicoRelevante: 'Histórico fictício privado',
  confirmado: true,
  aceiteTermo: true,
  versaoTermo: '0.1',
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
    'celular',
    'email',
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
    { confirmado: false },
    { cep: '7000' },
    {
      dataNascimento: '2015-03-10',
      responsavelLegal: 'Responsável Fictício',
      cpfResponsavel: '111.444.777-35',
    },
    { whatsapp: '123' },
    { contatoEmergenciaTelefone: '9999' },
  ])('recusa contrato inválido %j', (alteracao) => {
    expect(
      inscricaoSchema.safeParse({ ...valido(), ...alteracao }).success,
    ).toBe(false);
  });
  it('aceita a inscrição sem os dados opcionais da ficha de identificação (DF43)', () => {
    expect(inscricaoSchema.safeParse(valido()).success).toBe(true);
  });
  it('descarta os dados do responsável de adulto, sem conferir o formato (DF43, LGPD)', () => {
    const resultado = inscricaoSchema.safeParse({
      ...valido(),
      responsavelLegal: 'Responsável Fictício',
      cpfResponsavel: '5299822',
      documentoResponsavel: 'Certidão de nascimento',
    });
    expect(resultado.success).toBe(true);
    expect(resultado.data).toMatchObject({
      responsavelLegal: '',
      cpfResponsavel: '',
      documentoResponsavel: '',
    });
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
  const enviar = (dados: object = valido()) =>
    request(app.getHttpServer()).post('/inscricoes').send(dados);

  it('registra adulto com e-mail e celular, sem sessão e com RG alfanumérico, e os contatos são por e-mail (DF48)', async () => {
    const res = await enviar({ ...valido() }).expect(201);
    expect(Object.keys(res.body).sort()).toEqual(['criadaEm', 'numero']);
    expect(res.body.numero).toMatch(/^\d{4}-\d{5,}$/);
    expect(Number.isNaN(Date.parse(res.body.criadaEm))).toBe(false);
    expect(res.headers['cache-control']).toBe('no-store');
    const [registro] = await db.select().from(inscricoes);
    expect(registro.rg).toBe(valido().rg);
    expect(registro.celular).toBe('61999999999');
    expect(registro.email).toBe('teste@example.com');
    expect(registro.canalPreferencial).toBe('email');
  });
  it('guarda os dados da ficha de identificação e deixa nulos os que ficaram em branco (DF43)', async () => {
    await enviar({
      ...valido(),
      sexo: 'Feminino',
      profissao: 'Professora',
      escolaridade: 'Superior completo',
      bairro: 'Santa Maria',
      cidadeUf: 'Brasília/DF',
      cep: '72500-000',
      whatsapp: '(61) 98888-7777',
      contatoEmergenciaNome: 'Contato Fictício',
      contatoEmergenciaParentesco: 'Irmã',
      contatoEmergenciaTelefone: '(61) 3333-4444',
    }).expect(201);
    const [registro] = await db.select().from(inscricoes);
    expect(registro).toMatchObject({
      sexo: 'Feminino',
      profissao: 'Professora',
      escolaridade: 'Superior completo',
      bairro: 'Santa Maria',
      cidadeUf: 'Brasília/DF',
      cep: '72500000',
      whatsapp: '61988887777',
      contatoEmergenciaNome: 'Contato Fictício',
      contatoEmergenciaParentesco: 'Irmã',
      contatoEmergenciaTelefone: '6133334444',
      cpfResponsavel: null,
      documentoResponsavel: null,
    });
  });
  it('guarda o CPF e o documento do responsável legal de menor de idade (DF43)', async () => {
    await enviar({
      ...valido(),
      dataNascimento: '2015-03-10',
      responsavelLegal: 'Responsável Fictício',
      cpfResponsavel: '52998224725',
      documentoResponsavel: 'Certidão de nascimento',
    }).expect(201);
    const [registro] = await db.select().from(inscricoes);
    expect(registro.cpfResponsavel).toBe('52998224725');
    expect(registro.documentoResponsavel).toBe('Certidão de nascimento');
    expect(registro.sexo).toBeNull();
  });
  it.each([
    { email: '', celular: '' },
    { email: '' },
    { celular: '' },
    { dataNascimento: '2020-01-01', responsavelLegal: '' },
    {
      dataNascimento: '2020-01-01',
      responsavelLegal: 'Responsável Fictício',
      cpfResponsavel: '',
    },
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
  it('não guarda o CPF e o documento do responsável na inscrição de adulto (DF43, LGPD)', async () => {
    await enviar({
      ...valido(),
      responsavelLegal: 'Responsável Fictício',
      cpfResponsavel: '52998224725',
      documentoResponsavel: 'Certidão de nascimento',
    }).expect(201);
    const [registro] = await db.select().from(inscricoes);
    expect(registro.responsavelLegal).toBeNull();
    expect(registro.cpfResponsavel).toBeNull();
    expect(registro.documentoResponsavel).toBeNull();
  });
  it('aceita menor com responsável', async () => {
    await enviar({
      ...valido(),
      dataNascimento: '2020-01-01',
      responsavelLegal: 'Responsável Fictício',
      cpfResponsavel: '52998224725',
    }).expect(201);
  });
  it('cifra os três campos da inscrição com aceite e audita sem conteúdo pessoal (RF1, RF57, RNF51)', async () => {
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
    expect(evento.dadosNovos).toEqual({
      numero: res.body.numero,
      versaoTermoAceita: '0.1',
      aceitePeloResponsavel: false,
    });
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
  it('compara os dados da ficha de identificação no reenvio, depois de normalizados (DF43)', async () => {
    const dados = {
      ...valido(),
      cep: '72500-000',
      whatsapp: '(61) 98888-7777',
    };
    await enviar(dados).expect(201);
    await enviar({ ...dados, cep: '72500000', whatsapp: '61988887777' }).expect(
      201,
    );
    await enviar({ ...dados, cep: '72500-001' }).expect(409);
    await enviar({ ...dados, profissao: 'Professora' }).expect(409);
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
  it.each([
    { aceiteTermo: false },
    { aceiteTermo: undefined },
    { versaoTermo: '' },
    {
      dataNascimento: '2020-01-01',
      responsavelLegal: 'Responsável',
      cpfResponsavel: '',
    },
  ])('RF57 recusa aceite incompleto %j sem gravar', async (alteracao) => {
    await enviar({ ...valido(), ...alteracao }).expect(400);
    expect(await db.select().from(inscricoes)).toHaveLength(0);
  });
  it('RF57 guarda versão, horário do servidor e responsável; ignora valores forjados pelo cliente', async () => {
    await enviar({
      ...valido(),
      dataNascimento: '2020-01-01',
      responsavelLegal: 'Responsável',
      cpfResponsavel: '52998224725',
      aceitePeloResponsavel: false,
      termoAceitoEm: '1900-01-01',
    }).expect(201);
    const [registro] = await db.select().from(inscricoes);
    expect(registro.versaoTermoAceita).toBe('0.1');
    expect(registro.aceitePeloResponsavel).toBe(true);
    expect(
      Math.abs(Date.now() - registro.termoAceitoEm!.getTime()),
    ).toBeLessThan(10000);
  });
  it('RF57 expõe cinco tópicos e bloqueia provisório em produção, mesmo com a inscrição aberta', async () => {
    const termo = await request(app.getHttpServer())
      .get('/termo/vigente')
      .expect(200);
    expect(termo.headers['cache-control']).toBe('no-store');
    expect(termo.body).toMatchObject({ versao: '0.1', provisoria: true });
    expect(termo.body.topicos).toHaveLength(5);
    expect(termo.body.topicos[0].corpo).toContain(
      'e-mail, celular e, se você quiser informar, WhatsApp',
    );
    expect(termo.body.topicos[1].corpo).toContain(
      'Os avisos do sistema vão para o seu e-mail',
    );
    expect(JSON.stringify(termo.body.topicos)).not.toContain(
      'canal que você escolheu',
    );
    const config = app.get(ConfigService);
    config.set('AMBIENTE_APLICACAO', 'producao');
    try {
      await enviar().expect(403);
      expect(await db.select().from(inscricoes)).toHaveLength(0);
    } finally {
      config.set('AMBIENTE_APLICACAO', 'desenvolvimento');
    }
  });
  it('RF57 libera dados fictícios na validação explícita com NODE_ENV=production, como no contêiner', async () => {
    const config = app.get(ConfigService);
    const ambiente = config.get('AMBIENTE_APLICACAO');
    const nodeEnv = config.get('NODE_ENV');
    config.set('NODE_ENV', 'production');
    config.set('AMBIENTE_APLICACAO', 'validacao');
    try {
      await enviar().expect(201);
      expect((await db.select().from(inscricoes))[0].versaoTermoAceita).toBe(
        '0.1',
      );
    } finally {
      config.set('AMBIENTE_APLICACAO', ambiente);
      if (ambiente === undefined) delete process.env.AMBIENTE_APLICACAO;
      config.set('NODE_ENV', nodeEnv);
      if (nodeEnv === undefined) delete process.env.NODE_ENV;
    }
  });
  it('RF57 bloqueia provisório pelo NODE_ENV quando não há ambiente explícito', async () => {
    const config = app.get(ConfigService);
    const ambiente = config.get('AMBIENTE_APLICACAO');
    const nodeEnv = config.get('NODE_ENV');
    config.set('AMBIENTE_APLICACAO', undefined);
    // ConfigService.set serializa undefined na variável de ambiente.
    delete process.env.AMBIENTE_APLICACAO;
    config.set('NODE_ENV', 'production');
    try {
      await enviar().expect(403);
      expect(await db.select().from(inscricoes)).toHaveLength(0);
    } finally {
      config.set('AMBIENTE_APLICACAO', ambiente);
      config.set('NODE_ENV', nodeEnv);
    }
  });
  it('RF57 distingue troca de termo de conflito de chave e preserva reenvio após troca', async () => {
    const dados = valido();
    const primeiro = await enviar(dados).expect(201);
    const [original] = await db.select().from(versoesTermo);
    try {
      await db.insert(versoesTermo).values({
        ...original,
        versao: '0.2',
        provisoria: false,
        vigenteDesde: new Date(Date.now() - 1000),
      });
      const antigo = await enviar().expect(409);
      expect(antigo.body).toMatchObject({
        codigo: 'termo_desatualizado',
        versaoVigente: '0.2',
      });
      expect((await enviar(dados).expect(201)).body).toEqual(primeiro.body);
      const conflito = await enviar({
        ...dados,
        nomeCompleto: 'Outra pessoa',
      }).expect(409);
      expect(conflito.body.codigo).not.toBe('termo_desatualizado');
      const config = app.get(ConfigService);
      const ambiente = config.get('AMBIENTE_APLICACAO');
      config.set('AMBIENTE_APLICACAO', 'producao');
      try {
        // Só a versão aprovada fictícia libera uma inscrição nova em produção.
        await enviar({ ...valido(), versaoTermo: '0.2' }).expect(201);
      } finally {
        config.set('AMBIENTE_APLICACAO', ambiente);
      }
      expect(
        (await db.select().from(inscricoes))
          .map((i) => i.versaoTermoAceita)
          .sort((a, b) => a!.localeCompare(b!)),
      ).toEqual(['0.1', '0.2']);
      await expect(
        db
          .update(versoesTermo)
          .set({ titulo: 'Modificado' })
          .where(eq(versoesTermo.versao, '0.1')),
      ).rejects.toThrow();
    } finally {
      await limpar();
      await db.execute(sql`truncate versoes_termo cascade`);
      await db.insert(versoesTermo).values(original);
    }
  });
});
