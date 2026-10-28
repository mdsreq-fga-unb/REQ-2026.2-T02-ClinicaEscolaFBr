import { Global, INestApplication, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import {
  auditoria,
  casos,
  decisoesPrioridade,
  inscricoes,
  usuarios,
  type Db,
} from '@clinica/database';
import { AuditoriaModule } from '../../auditoria/auditoria.module';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { cifrar, decifrar } from '../../common/criptografia';
import { DB } from '../../database/database.module';
import {
  CHAVE_TESTE,
  criarBancoDeTeste,
} from '../../test-utils/banco-de-teste';
import { TriagemModule } from './triagem.module';

// Triagem (RF4) e prioridade clínica (RF6). O usuário da sessão (RF50) é simulado
// pelo cabeçalho x-usuario-teste, como nos testes do agendamento.
describe('Triagem e prioridade clínica (RF4 e RF6)', () => {
  let app: INestApplication;
  let db: Db;
  let limpar: () => Promise<unknown>;
  let fechar: () => Promise<void>;
  const pessoas: Record<string, UsuarioAutenticado> = {};
  let numero = 0;

  beforeAll(async () => {
    ({ db, limpar, fechar } = await criarBancoDeTeste());

    @Global()
    @Module({ providers: [{ provide: DB, useValue: db }], exports: [DB] })
    class InfraDeTeste {}

    const modulo = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ CHAVE_DADOS: CHAVE_TESTE })],
        }),
        InfraDeTeste,
        AuditoriaModule,
        TriagemModule,
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
    for (const [chave, perfil] of [
      ['coordenacao', 'coordenacao'],
      ['supervisor', 'supervisor'],
      ['secretaria', 'secretaria'],
      ['estagiario', 'estagiario'],
    ] as const) {
      const [u] = await db
        .insert(usuarios)
        .values({ nome: chave, email: `${chave}@fbr.edu.br`, perfil })
        .returning();
      pessoas[chave] = { id: u.id, nome: chave, perfil };
    }
  });

  const como = (quem: string) => ({
    'x-usuario-teste': JSON.stringify(pessoas[quem]),
  });
  const http = () => request(app.getHttpServer());

  // Inscrição com as respostas cifradas, ou sem elas (inscrição legada).
  async function inscrever(inscritaEm: Date, legada = false) {
    numero += 1;
    const resposta = (texto: string) =>
      legada ? null : cifrar(texto, CHAVE_TESTE);
    const [inscricao] = await db
      .insert(inscricoes)
      .values({
        numero: `2026-${String(numero).padStart(5, '0')}`,
        nomeCompleto: `Pessoa ${numero}`,
        dataNascimento: '1990-01-01',
        cpf: String(numero).padStart(11, '0'),
        rg: '1234567',
        endereco: 'Rua Fictícia, 1',
        estadoCivil: 'solteiro',
        canalPreferencial: 'email',
        email: `pessoa${numero}@exemplo.com`,
        queixaCifrada: resposta('Queixa fictícia'),
        percepcaoUrgenciaCifrada: resposta('Urgência fictícia'),
        historicoRelevanteCifrado: resposta('Histórico fictício'),
        criadaEm: inscritaEm,
      })
      .returning();
    return inscricao.id;
  }
  const diasAtras = (dias: number) => new Date(Date.now() - dias * 86_400_000);

  it('mostra a supervisores e à coordenação o número e as três respostas, como declaração do interessado, com os dias aguardando (RF4)', async () => {
    await inscrever(diasAtras(3));
    for (const quem of ['supervisor', 'coordenacao']) {
      const res = await http()
        .get('/triagem/inscricoes')
        .set(como(quem))
        .expect(200);
      expect(res.body).toEqual([
        expect.objectContaining({
          numero: '2026-' + String(numero).padStart(5, '0'),
          diasAguardando: 3,
          declaracaoInteressado: {
            queixa: 'Queixa fictícia',
            percepcaoUrgencia: 'Urgência fictícia',
            historicoRelevante: 'Histórico fictício',
          },
        }),
      ]);
    }
  });

  it('campo sem resposta em inscrição legada aparece como ausente, sem conteúdo presumido (RF4)', async () => {
    await inscrever(diasAtras(1), true);
    const res = await http()
      .get('/triagem/inscricoes')
      .set(como('supervisor'))
      .expect(200);
    expect(res.body[0].declaracaoInteressado).toEqual({
      queixa: null,
      percepcaoUrgencia: null,
      historicoRelevante: null,
    });
  });

  it('a lista pode ser ordenada pelo tempo de espera, nos dois sentidos (RF4)', async () => {
    const antiga = await inscrever(diasAtras(10));
    const recente = await inscrever(diasAtras(2));
    const antigas = await http()
      .get('/triagem/inscricoes?ordem=antigas')
      .set(como('supervisor'))
      .expect(200);
    expect(antigas.body.map((i: { id: string }) => i.id)).toEqual([
      antiga,
      recente,
    ]);
    const recentes = await http()
      .get('/triagem/inscricoes?ordem=recentes')
      .set(como('supervisor'))
      .expect(200);
    expect(recentes.body.map((i: { id: string }) => i.id)).toEqual([
      recente,
      antiga,
    ]);
  });

  it('sem inscrições aguardando triagem, a lista vem vazia (RF4)', async () => {
    const res = await http()
      .get('/triagem/inscricoes')
      .set(como('coordenacao'))
      .expect(200);
    expect(res.body).toEqual([]);
  });

  it('secretaria e estagiário não veem as respostas da inscrição (RF4, RF55)', async () => {
    await inscrever(diasAtras(1));
    for (const quem of ['secretaria', 'estagiario']) {
      const res = await http()
        .get('/triagem/inscricoes')
        .set(como(quem))
        .expect(403);
      expect(JSON.stringify(res.body)).not.toContain('fictíci');
    }
    await http().get('/triagem/inscricoes').expect(401);
  });

  it('a prioridade confirmada registra a cor cifrada, o responsável e a data, e cria o caso para a distribuição (RF6, RNF51)', async () => {
    const inscricao = await inscrever(diasAtras(1));
    await http()
      .post(`/triagem/inscricoes/${inscricao}/prioridade`)
      .set(como('supervisor'))
      .send({ cor: 'vermelha' })
      .expect(201);
    const [decisao] = await db
      .select()
      .from(decisoesPrioridade)
      .where(eq(decisoesPrioridade.inscricaoId, inscricao));
    expect(decisao.decididaPor).toBe(pessoas.supervisor.id);
    expect(decisao.decididaEm).toBeInstanceOf(Date);
    expect(decisao.corCifrada).not.toContain('vermelha');
    expect(decifrar(decisao.corCifrada, CHAVE_TESTE)).toBe('vermelha');
    const [caso] = await db
      .select()
      .from(casos)
      .where(eq(casos.inscricaoId, inscricao));
    expect(caso.situacao).toBe('aguardando_distribuicao');
    const lista = await http()
      .get('/triagem/inscricoes')
      .set(como('supervisor'))
      .expect(200);
    expect(lista.body).toEqual([]);
  });

  it('a nova decisão preserva o histórico e passa a valer, sem um segundo caso (RF6, RNF5)', async () => {
    const inscricao = await inscrever(diasAtras(1));
    for (const cor of ['verde', 'amarela']) {
      await http()
        .post(`/triagem/inscricoes/${inscricao}/prioridade`)
        .set(como('coordenacao'))
        .send({ cor })
        .expect(201);
    }
    const res = await http()
      .get('/triagem/inscricoes/classificadas')
      .set(como('coordenacao'))
      .expect(200);
    expect(res.body[0].prioridade).toBe('amarela');
    expect(
      res.body[0].historico.map((h: { prioridade: string }) => h.prioridade),
    ).toEqual(['amarela', 'verde']);
    expect(
      await db.select().from(casos).where(eq(casos.inscricaoId, inscricao)),
    ).toHaveLength(1);
    const eventos = await db
      .select()
      .from(auditoria)
      .where(eq(auditoria.entidade, 'decisoes_prioridade'));
    expect(eventos.map((e) => e.operacao).sort()).toEqual([
      'reclassificar_prioridade_clinica',
      'registrar_prioridade_clinica',
    ]);
  });

  it('sem autorização clínica, não registra nem altera a prioridade, e a vigente é preservada (RF6)', async () => {
    const inscricao = await inscrever(diasAtras(1));
    await http()
      .post(`/triagem/inscricoes/${inscricao}/prioridade`)
      .set(como('supervisor'))
      .send({ cor: 'verde' })
      .expect(201);
    for (const quem of ['secretaria', 'estagiario']) {
      await http()
        .post(`/triagem/inscricoes/${inscricao}/prioridade`)
        .set(como(quem))
        .send({ cor: 'vermelha' })
        .expect(403);
    }
    await http()
      .post(`/triagem/inscricoes/${inscricao}/prioridade`)
      .set(como('supervisor'))
      .send({ cor: 'roxa' })
      .expect(400);
    expect(await db.select().from(decisoesPrioridade)).toHaveLength(1);
  });
});
