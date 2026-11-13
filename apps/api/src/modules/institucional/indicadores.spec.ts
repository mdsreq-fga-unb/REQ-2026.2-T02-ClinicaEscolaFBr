import { Global, INestApplication, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import {
  alteracoesParametro,
  atribuicoesSupervisor,
  auditoria,
  casos,
  desligamentosPorFaltas,
  inscricoes,
  sessoesAtendimento,
  transferenciasCaso,
  usuarios,
  vinculosEstagiario,
  type Db,
} from '@clinica/database';
import { hojeEmBrasilia, type Indicadores } from '@clinica/shared';
import { eq } from 'drizzle-orm';
import { AuditoriaModule } from '../../auditoria/auditoria.module';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { cifrar } from '../../common/criptografia';
import { DB } from '../../database/database.module';
import {
  CHAVE_TESTE,
  criarBancoDeTeste,
} from '../../test-utils/banco-de-teste';
import {
  calcularIndicadores,
  type DadosIndicadores,
} from './calculo-indicadores';
import { InstitucionalModule } from './institucional.module';

const d = (iso: string) => new Date(iso);

// Cálculo dos indicadores, sem banco: os critérios de aceitação do RF48 com datas
// escolhidas. Os horários estão em Brasília (-03:00).
describe('Cálculo dos indicadores operacionais (RF48)', () => {
  const vazio: DadosIndicadores = {
    vinculos: [],
    atribuicoes: [],
    desligamentos: [],
    primeirasSessoes: [],
    supervisores: [],
    vagasOfertadas: null,
  };
  const em15DeSetembro = d('2026-09-15T10:00:00-03:00');
  const agosto = { inicio: '2026-08-01', fim: '2026-08-31' };

  it('consulta de agosto feita em 15/09: os de posição olham o fim de 31/08 e os de fluxo, de 01/08 a 31/08 (RF48)', () => {
    const r = calcularIndicadores(
      {
        ...vazio,
        vinculos: [
          // Ativo em 31/08 e ainda hoje.
          {
            casoId: 'a',
            vinculadoEm: d('2026-07-10T09:00:00-03:00'),
            encerradoEm: null,
            encerradoPorTransferencia: false,
          },
          // Encerrado em 05/09: ainda contava em 31/08.
          {
            casoId: 'b',
            vinculadoEm: d('2026-08-20T09:00:00-03:00'),
            encerradoEm: d('2026-09-05T09:00:00-03:00'),
            encerradoPorTransferencia: false,
          },
          // Vinculado em 01/09: não conta em 31/08.
          {
            casoId: 'c',
            vinculadoEm: d('2026-09-01T09:00:00-03:00'),
            encerradoEm: null,
            encerradoPorTransferencia: false,
          },
        ],
        primeirasSessoes: [
          // Inscrição em 01/07 e primeira sessão em 11/08: 41 dias.
          {
            casoId: 'a',
            inscritaEm: d('2026-07-01T20:00:00-03:00'),
            realizadaEm: d('2026-08-11T14:00:00-03:00'),
          },
          // Inscrição em 01/08 e primeira sessão em 31/08: 30 dias.
          {
            casoId: 'b',
            inscritaEm: d('2026-08-01T08:00:00-03:00'),
            realizadaEm: d('2026-08-31T18:00:00-03:00'),
          },
          // Primeira sessão em setembro: fora do intervalo.
          {
            casoId: 'c',
            inscritaEm: d('2026-08-02T08:00:00-03:00'),
            realizadaEm: d('2026-09-03T14:00:00-03:00'),
          },
        ],
        vagasOfertadas: 100,
      },
      agosto,
      em15DeSetembro,
    );
    expect(r.referenciaEhAgora).toBe(false);
    expect(r.referencia).toBe(d('2026-08-31T23:59:59.999-03:00').toISOString());
    expect(r.vagas).toEqual({
      ocupadas: 2,
      semestre: '2026/2',
      ofertadas: 100,
      percentual: 2,
    });
    expect(r.espera).toEqual({ mediaDias: 35.5, pacientes: 2 });
  });

  it('com a data final no dia da consulta, os indicadores de posição olham o momento da consulta (RF48)', () => {
    const agora = d('2026-11-13T10:00:00-03:00');
    const r = calcularIndicadores(
      {
        ...vazio,
        vinculos: [
          // Encerrado às 09:00 de hoje: já não conta às 10:00.
          {
            casoId: 'a',
            vinculadoEm: d('2026-10-01T09:00:00-03:00'),
            encerradoEm: d('2026-11-13T09:00:00-03:00'),
            encerradoPorTransferencia: false,
          },
          {
            casoId: 'b',
            vinculadoEm: d('2026-10-01T09:00:00-03:00'),
            encerradoEm: null,
            encerradoPorTransferencia: false,
          },
        ],
      },
      { inicio: '2026-11-01', fim: '2026-11-13' },
      agora,
    );
    expect(r.referenciaEhAgora).toBe(true);
    expect(r.referencia).toBe(agora.toISOString());
    expect(r.vagas.ocupadas).toBe(1);
  });

  it('o desligamento revertido não entra na taxa de evasão (RF48)', () => {
    const r = calcularIndicadores(
      {
        ...vazio,
        vinculos: [
          {
            casoId: 'a',
            vinculadoEm: d('2026-07-01T09:00:00-03:00'),
            encerradoEm: d('2026-08-10T09:00:00-03:00'),
            encerradoPorTransferencia: false,
          },
          {
            casoId: 'b',
            vinculadoEm: d('2026-07-01T09:00:00-03:00'),
            encerradoEm: d('2026-08-20T09:00:00-03:00'),
            encerradoPorTransferencia: false,
          },
          {
            casoId: 'c',
            vinculadoEm: d('2026-07-01T09:00:00-03:00'),
            encerradoEm: null,
            encerradoPorTransferencia: false,
          },
          {
            casoId: 'd',
            vinculadoEm: d('2026-07-01T09:00:00-03:00'),
            encerradoEm: null,
            encerradoPorTransferencia: false,
          },
        ],
        desligamentos: [
          // Desligado em 10/08 e revertido em 12/08: não conta.
          {
            casoId: 'a',
            decididoEm: d('2026-08-10T09:00:00-03:00'),
            revertidoEm: d('2026-08-12T09:00:00-03:00'),
          },
          {
            casoId: 'b',
            decididoEm: d('2026-08-20T09:00:00-03:00'),
            revertidoEm: null,
          },
          // Desligado em setembro: fora do intervalo.
          {
            casoId: 'c',
            decididoEm: d('2026-09-02T09:00:00-03:00'),
            revertidoEm: null,
          },
        ],
      },
      agosto,
      em15DeSetembro,
    );
    // 1 desligamento em 4 pacientes ativos em algum dia de agosto.
    expect(r.evasao).toEqual({ percentual: 25, desligamentos: 1, ativos: 4 });
  });

  it('a transferência mantém o paciente em atendimento ativo até o vínculo seguinte (RF48, RF25)', () => {
    const r = calcularIndicadores(
      {
        ...vazio,
        vinculos: [
          // Transferência só de supervisor em 20/08; o novo vínculo vem em 03/09.
          {
            casoId: 'a',
            vinculadoEm: d('2026-07-01T09:00:00-03:00'),
            encerradoEm: d('2026-08-20T09:00:00-03:00'),
            encerradoPorTransferencia: true,
          },
          {
            casoId: 'a',
            vinculadoEm: d('2026-09-03T09:00:00-03:00'),
            encerradoEm: null,
            encerradoPorTransferencia: false,
          },
        ],
      },
      agosto,
      em15DeSetembro,
    );
    expect(r.vagas.ocupadas).toBe(1);
    expect(r.evasao.ativos).toBe(1);
  });

  it('período sem registros: todos os indicadores aparecem como zero, e não em branco (RF48)', () => {
    const r = calcularIndicadores(
      {
        ...vazio,
        supervisores: [{ id: 's', nome: 'Silvia Prado' }],
        vagasOfertadas: 100,
      },
      { inicio: '2026-01-01', fim: '2026-01-31' },
      em15DeSetembro,
    );
    expect(r.vagas).toEqual({
      ocupadas: 0,
      semestre: '2026/1',
      ofertadas: 100,
      percentual: 0,
    });
    expect(r.espera).toEqual({ mediaDias: 0, pacientes: 0 });
    expect(r.evasao).toEqual({ percentual: 0, desligamentos: 0, ativos: 0 });
    expect(r.supervisores).toEqual([
      { id: 's', nome: 'Silvia Prado', casos: 0 },
    ]);
  });

  it('sem vagas ofertadas registradas, as vagas ocupadas aparecem sem o total nem o percentual (RF48)', () => {
    const r = calcularIndicadores(
      {
        ...vazio,
        vinculos: [
          {
            casoId: 'a',
            vinculadoEm: d('2026-07-01T09:00:00-03:00'),
            encerradoEm: null,
            encerradoPorTransferencia: false,
          },
        ],
      },
      agosto,
      em15DeSetembro,
    );
    expect(r.vagas).toEqual({
      ocupadas: 1,
      semestre: '2026/2',
      ofertadas: null,
      percentual: null,
    });
  });

  it('a distribuição conta, por supervisor, os casos ativos com a atribuição vigente na data de referência, inclusive quem tem zero (RF48)', () => {
    const r = calcularIndicadores(
      {
        ...vazio,
        vinculos: [
          {
            casoId: 'a',
            vinculadoEm: d('2026-07-01T09:00:00-03:00'),
            encerradoEm: null,
            encerradoPorTransferencia: false,
          },
          {
            casoId: 'b',
            vinculadoEm: d('2026-07-01T09:00:00-03:00'),
            encerradoEm: null,
            encerradoPorTransferencia: false,
          },
        ],
        atribuicoes: [
          // O caso a passou do Ricardo para a Patrícia em 10/09: em 31/08 era do Ricardo.
          {
            casoId: 'a',
            supervisorId: 'ricardo',
            atribuidoEm: d('2026-06-20T09:00:00-03:00'),
            encerradaEm: d('2026-09-10T09:00:00-03:00'),
          },
          {
            casoId: 'a',
            supervisorId: 'patricia',
            atribuidoEm: d('2026-09-10T09:00:00-03:00'),
            encerradaEm: null,
          },
          {
            casoId: 'b',
            supervisorId: 'ricardo',
            atribuidoEm: d('2026-06-20T09:00:00-03:00'),
            encerradaEm: null,
          },
        ],
        supervisores: [
          { id: 'patricia', nome: 'Patrícia Nogueira' },
          { id: 'ricardo', nome: 'Ricardo Menezes' },
          { id: 'silvia', nome: 'Silvia Prado' },
        ],
      },
      agosto,
      em15DeSetembro,
    );
    expect(r.supervisores).toEqual([
      { id: 'ricardo', nome: 'Ricardo Menezes', casos: 2 },
      { id: 'patricia', nome: 'Patrícia Nogueira', casos: 0 },
      { id: 'silvia', nome: 'Silvia Prado', casos: 0 },
    ]);
  });
});

// Rotas, com o banco de teste: o perfil, o intervalo recusado, as vagas e a leitura
// dos registros gravados pelas outras features.
describe('Rotas dos indicadores operacionais (RF48)', () => {
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
        InstitucionalModule,
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
    for (const [chave, nome, perfil] of [
      ['coordenacao', 'Helena Duarte', 'coordenacao'],
      ['secretaria', 'Juliana Rocha', 'secretaria'],
      ['ricardo', 'Ricardo Menezes', 'supervisor'],
      ['silvia', 'Silvia Prado', 'supervisor'],
      ['ana', 'Ana Beatriz Costa', 'estagiario'],
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
  });

  const como = (quem: string) => ({
    'x-usuario-teste': JSON.stringify(pessoas[quem]),
  });
  const http = () => request(app.getHttpServer());
  const hoje = hojeEmBrasilia();
  const consultar = (quem: string, inicio: string, fim: string) =>
    http().get('/indicadores').query({ inicio, fim }).set(como(quem));

  async function casoEmAtendimento(vinculadoEm: Date) {
    numero += 1;
    const [inscricao] = await db
      .insert(inscricoes)
      .values({
        numero: `2026-${String(numero).padStart(5, '0')}`,
        nomeCompleto: `Paciente ${numero}`,
        dataNascimento: '1990-01-01',
        cpf: String(numero).padStart(11, '0'),
        rg: '1234567',
        endereco: 'Rua Fictícia, 1',
        estadoCivil: 'solteiro',
        canalPreferencial: 'email',
        email: `paciente${numero}@exemplo.com`,
        queixaCifrada: cifrar('queixa', CHAVE_TESTE),
        percepcaoUrgenciaCifrada: cifrar('urgência', CHAVE_TESTE),
        historicoRelevanteCifrado: cifrar('histórico', CHAVE_TESTE),
      })
      .returning();
    const [caso] = await db
      .insert(casos)
      .values({
        inscricaoId: inscricao.id,
        entradaNaFilaEm: inscricao.criadaEm,
        situacao: 'em_atendimento',
      })
      .returning();
    const [atribuicao] = await db
      .insert(atribuicoesSupervisor)
      .values({
        casoId: caso.id,
        supervisorId: pessoas.ricardo.id,
        atribuidoPor: pessoas.coordenacao.id,
        atribuidoEm: vinculadoEm,
      })
      .returning();
    const [vinculo] = await db
      .insert(vinculosEstagiario)
      .values({
        casoId: caso.id,
        estagiarioId: pessoas.ana.id,
        vinculadoPor: pessoas.ricardo.id,
        vinculadoEm,
      })
      .returning();
    return { caso, atribuicao, vinculo };
  }

  it.each(['secretaria', 'ricardo', 'ana'])(
    '%s não consulta os indicadores nem as vagas (RF48)',
    async (quem) => {
      await consultar(quem, hoje, hoje).expect(403);
      await http().get('/vagas-ofertadas/2026-2').set(como(quem)).expect(403);
      await http()
        .put('/vagas-ofertadas/2026-2')
        .send({ total: 100 })
        .set(como(quem))
        .expect(403);
    },
  );

  it('recusa a data final depois do dia da consulta e a inicial depois da final, com o motivo, sem calcular nada (RF48)', async () => {
    const amanha = hojeEmBrasilia(new Date(Date.now() + 86_400_000));
    const futuro = await consultar('coordenacao', hoje, amanha).expect(400);
    expect(JSON.stringify(futuro.body)).toContain(
      'A data final não pode ser posterior à data da consulta',
    );
    const invertido = await consultar(
      'coordenacao',
      '2026-08-31',
      '2026-08-01',
    ).expect(400);
    expect(JSON.stringify(invertido.body)).toContain(
      'A data inicial não pode ser posterior à data final',
    );
  });

  it('lê os vínculos, as atribuições e os supervisores ativos do banco, e um desligamento entra na hora na evasão (RF48, RNF46)', async () => {
    const antes = new Date(Date.now() - 30 * 86_400_000);
    const um = await casoEmAtendimento(antes);
    await casoEmAtendimento(antes);
    const inicio = hojeEmBrasilia(antes);

    let r = (await consultar('coordenacao', inicio, hoje).expect(200))
      .body as Indicadores;
    expect(r.referenciaEhAgora).toBe(true);
    expect(r.vagas.ocupadas).toBe(2);
    expect(r.evasao).toEqual({ percentual: 0, desligamentos: 0, ativos: 2 });
    expect(r.supervisores).toEqual([
      { id: pessoas.ricardo.id, nome: 'Ricardo Menezes', casos: 2 },
      { id: pessoas.silvia.id, nome: 'Silvia Prado', casos: 0 },
    ]);

    // O desligamento encerra o vínculo (RF37) e já aparece na consulta seguinte.
    await db.insert(desligamentosPorFaltas).values({
      casoId: um.caso.id,
      cicloAtendimento: 1,
      dataDecisao: hoje,
      decididoPor: pessoas.secretaria.id,
    });
    await db
      .update(vinculosEstagiario)
      .set({ vigente: false, encerradoEm: new Date() })
      .where(eq(vinculosEstagiario.id, um.vinculo.id));
    r = (await consultar('coordenacao', inicio, hoje).expect(200))
      .body as Indicadores;
    expect(r.vagas.ocupadas).toBe(1);
    expect(r.evasao).toEqual({ percentual: 50, desligamentos: 1, ativos: 2 });
  });

  it('o vínculo encerrado por transferência continua contado até o vínculo seguinte (RF48, RF25)', async () => {
    const antes = new Date(Date.now() - 10 * 86_400_000);
    const { caso, atribuicao, vinculo } = await casoEmAtendimento(antes);
    await db
      .update(vinculosEstagiario)
      .set({ vigente: false, encerradoEm: new Date() })
      .where(eq(vinculosEstagiario.id, vinculo.id));
    await db
      .update(atribuicoesSupervisor)
      .set({ vigente: false, encerradaEm: new Date() })
      .where(eq(atribuicoesSupervisor.id, atribuicao.id));
    await db.insert(atribuicoesSupervisor).values({
      casoId: caso.id,
      supervisorId: pessoas.silvia.id,
      atribuidoPor: pessoas.coordenacao.id,
    });
    await db.insert(transferenciasCaso).values({
      casoId: caso.id,
      tipo: 'supervisor',
      supervisorAnteriorId: pessoas.ricardo.id,
      supervisorNovoId: pessoas.silvia.id,
      estagiarioAnteriorId: pessoas.ana.id,
      atribuicaoAnteriorId: atribuicao.id,
      vinculoAnteriorId: vinculo.id,
      motivoCifrado: cifrar('motivo', CHAVE_TESTE),
      transferidoPor: pessoas.coordenacao.id,
    });
    const r = (
      await consultar('coordenacao', hojeEmBrasilia(antes), hoje).expect(200)
    ).body as Indicadores;
    expect(r.vagas.ocupadas).toBe(1);
    expect(r.supervisores.find((s) => s.nome === 'Silvia Prado')?.casos).toBe(
      1,
    );
  });

  it('o tempo de espera usa a primeira sessão realizada de cada paciente (RF48)', async () => {
    const antes = new Date(Date.now() - 20 * 86_400_000);
    const { caso } = await casoEmAtendimento(antes);
    // Inscrição feita 20 dias antes, ao meio-dia de Brasília.
    const inscritaEm = new Date(`${hojeEmBrasilia(antes)}T12:00:00-03:00`);
    await db
      .update(inscricoes)
      .set({ criadaEm: inscritaEm })
      .where(eq(inscricoes.id, caso.inscricaoId));
    const [sessao1, sessao2] = [5, 2].map(
      (dias) => new Date(Date.now() - dias * 86_400_000),
    );
    for (const inicio of [sessao1, sessao2]) {
      await db.insert(sessoesAtendimento).values({
        casoId: caso.id,
        estagiarioId: pessoas.ana.id,
        inicio,
        termino: new Date(inicio.getTime() + 50 * 60_000),
        fimIntervaloAnotacoes: new Date(inicio.getTime() + 60 * 60_000),
        status: 'realizada',
        agendadaPor: pessoas.ana.id,
      });
    }
    const r = (
      await consultar('coordenacao', hojeEmBrasilia(antes), hoje).expect(200)
    ).body as Indicadores;
    expect(r.espera.pacientes).toBe(1);
    // A primeira sessão realizada foi 5 dias atrás: 15 dias corridos de espera.
    expect(r.espera.mediaDias).toBe(15);
  });

  it('registra as vagas ofertadas do semestre com o valor anterior, o novo, o autor e a data/hora, e o total entra nas vagas ocupadas (RF48)', async () => {
    const semVagas = await http()
      .get('/vagas-ofertadas/2026-2')
      .set(como('coordenacao'))
      .expect(200);
    expect(semVagas.body).toEqual({
      semestre: '2026/2',
      total: null,
      ultimaAlteracao: null,
    });

    await http()
      .put('/vagas-ofertadas/2026-2')
      .send({ total: 90 })
      .set(como('coordenacao'))
      .expect(200);
    const depois = await http()
      .put('/vagas-ofertadas/2026-2')
      .send({ total: 100 })
      .set(como('coordenacao'))
      .expect(200);
    expect(depois.body).toMatchObject({
      semestre: '2026/2',
      total: 100,
      ultimaAlteracao: {
        valorAnterior: '90',
        valorNovo: '100',
        por: 'Helena Duarte',
      },
    });

    const historico = await db.select().from(alteracoesParametro);
    expect(historico.map((h) => [h.valorAnterior, h.valorNovo])).toEqual(
      expect.arrayContaining([
        [null, '90'],
        ['90', '100'],
      ]),
    );
    const eventos = await db
      .select()
      .from(auditoria)
      .where(eq(auditoria.operacao, 'registrar_vagas_ofertadas'));
    expect(eventos).toHaveLength(2);
  });

  it('recusa total de vagas inválido e semestre em formato errado (RF48)', async () => {
    for (const total of [0, -1, 1.5]) {
      await http()
        .put('/vagas-ofertadas/2026-2')
        .send({ total })
        .set(como('coordenacao'))
        .expect(400);
    }
    await http()
      .get('/vagas-ofertadas/2026')
      .set(como('coordenacao'))
      .expect(400);
  });

  it('o histórico das vagas não pode ser alterado nem apagado (RF48)', async () => {
    await http()
      .put('/vagas-ofertadas/2026-2')
      .send({ total: 80 })
      .set(como('coordenacao'))
      .expect(200);
    await expect(db.delete(alteracoesParametro)).rejects.toThrow();
  });
});
