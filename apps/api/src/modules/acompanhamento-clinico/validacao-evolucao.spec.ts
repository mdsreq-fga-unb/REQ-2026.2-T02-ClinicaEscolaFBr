import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PGlite } from '@electric-sql/pglite';
import {
  ConflictException,
  Global,
  Module,
  type INestApplication,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { and, eq } from 'drizzle-orm';
import {
  acessosProntuario,
  atribuicoesSupervisor,
  auditoria,
  casos,
  evolucoes,
  inscricoes,
  prontuarios,
  sessoesAtendimento,
  usuarios,
  validacoesEvolucao,
  vinculosEstagiario,
  type Db,
} from '@clinica/database';
import { AuditoriaModule } from '../../auditoria/auditoria.module';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { DB } from '../../database/database.module';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { cifrar } from '../../common/criptografia';
import {
  CHAVE_TESTE,
  criarBancoDeTeste,
} from '../../test-utils/banco-de-teste';
import { DesligamentosService } from '../assiduidade/desligamentos.service';
import { FaltasService } from '../assiduidade/faltas.service';
import { FilaService } from '../fila/fila.service';
import { AcompanhamentoClinicoModule } from './acompanhamento-clinico.module';
import { ComplementosEvolucaoService } from './complementos-evolucao.service';
import { CorrecoesEvolucaoService } from './correcoes-evolucao.service';
import { PoliticaProntuario } from './politica-prontuario';
import { ProntuariosService } from './prontuarios.service';
import { ValidacoesEvolucaoService } from './validacoes-evolucao.service';

const SCRIPT_USUARIO_APP = readFileSync(
  join(
    __dirname,
    '../../../../../packages/database/sql/usuario-da-aplicacao.sql',
  ),
  'utf8',
);

// Só o relógio do JavaScript para: o banco segue normal.
const pararRelogioEm = (instante: string) =>
  jest.useFakeTimers({
    now: new Date(instante),
    doNotFake: [
      'nextTick',
      'setImmediate',
      'clearImmediate',
      'setInterval',
      'clearInterval',
      'setTimeout',
      'clearTimeout',
      'queueMicrotask',
      'hrtime',
      'performance',
    ],
  });

describe('Validar evolução pelo supervisor (RF67)', () => {
  let db: Db;
  let cliente: PGlite;
  let app: INestApplication;
  let limpar: () => Promise<unknown>;
  let fechar: () => Promise<void>;
  let complementos: ComplementosEvolucaoService;
  let correcoes: CorrecoesEvolucaoService;
  let validacoes: ValidacoesEvolucaoService;
  let prontuariosService: ProntuariosService;
  let prontuarioId: string;
  let casoId: string;
  let evolucaoId: string;
  let sessaoId: string;
  const pessoas: Record<string, UsuarioAutenticado> = {};

  beforeAll(async () => {
    ({ db, limpar, fechar } = await criarBancoDeTeste());
    cliente = (db as unknown as { $client: PGlite }).$client;
    await cliente.exec(SCRIPT_USUARIO_APP);

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
  }, 60_000);

  afterAll(async () => {
    await app.close();
    await fechar();
  });
  afterEach(() => jest.useRealTimers());

  // Sessão realizada num dia do semestre, com a evolução original (versão 1).
  const criarSessaoComEvolucao = async (
    inicio: string,
    autor: UsuarioAutenticado,
  ) => {
    const comeco = new Date(inicio);
    const [sessao] = await db
      .insert(sessoesAtendimento)
      .values({
        casoId,
        estagiarioId: autor.id,
        cicloAtendimento: 1,
        inicio: comeco,
        termino: new Date(comeco.getTime() + 50 * 60_000),
        fimIntervaloAnotacoes: new Date(comeco.getTime() + 60 * 60_000),
        status: 'realizada',
        agendadaPor: pessoas.secretaria.id,
      })
      .returning();
    const [evolucao] = await db
      .insert(evolucoes)
      .values({
        prontuarioId,
        sessaoId: sessao.id,
        humorAparenciaCifrado: cifrar('Tranquilo.', CHAVE_TESTE),
        conteudoTrabalhadoCifrado: cifrar('Rotina.', CHAVE_TESTE),
        tecnicasUtilizadasCifrado: cifrar('Escuta.', CHAVE_TESTE),
        planoProximaSessaoCifrado: cifrar('Seguir.', CHAVE_TESTE),
        registradaPor: autor.id,
      })
      .returning();
    return { sessaoId: sessao.id, evolucaoId: evolucao.id };
  };

  beforeEach(async () => {
    await limpar();
    pararRelogioEm('2026-11-16T15:00:00Z');
    const criar = async (
      chave: string,
      nome: string,
      perfil: UsuarioAutenticado['perfil'],
    ) => {
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
    };
    await criar('estagiarioA', 'Ana Beatriz Costa', 'estagiario');
    await criar('estagiarioB', 'João Victor Almeida', 'estagiario');
    await criar('estagiarioOutroCaso', 'Paula Nunes', 'estagiario');
    await criar('supervisor', 'Ricardo Menezes', 'supervisor');
    await criar('outroSupervisor', 'Carla Mendes', 'supervisor');
    await criar('secretaria', 'Juliana Rocha', 'secretaria');
    await criar('coordenacao', 'Helena Duarte', 'coordenacao');

    const [inscricao] = await db
      .insert(inscricoes)
      .values({
        numero: '2026-00398',
        nomeCompleto: 'Mariana Alves Toledo',
        dataNascimento: '1994-08-22',
        cpf: '11144477735',
        rg: '3.214.567',
        endereco: 'SQN 104',
        estadoCivil: 'solteira',
        celular: '61998765432',
        email: 'mariana@exemplo.com.br',
        canalPreferencial: 'whatsapp',
        queixaCifrada: cifrar('Cansaço.', CHAVE_TESTE),
        percepcaoUrgenciaCifrada: cifrar('media', CHAVE_TESTE),
        historicoRelevanteCifrado: cifrar('Nada.', CHAVE_TESTE),
      })
      .returning();
    const [caso] = await db
      .insert(casos)
      .values({
        entradaNaFilaEm: inscricao.criadaEm,
        inscricaoId: inscricao.id,
        situacao: 'em_atendimento',
      })
      .returning();
    casoId = caso.id;
    await db.insert(atribuicoesSupervisor).values({
      casoId,
      supervisorId: pessoas.supervisor.id,
      atribuidoPor: pessoas.coordenacao.id,
    });
    const [vinculo] = await db
      .insert(vinculosEstagiario)
      .values({
        casoId,
        estagiarioId: pessoas.estagiarioA.id,
        vinculadoPor: pessoas.supervisor.id,
      })
      .returning();
    const [prontuario] = await db
      .insert(prontuarios)
      .values({ casoId, cicloAtendimento: 1, vinculoOrigemId: vinculo.id })
      .returning();
    prontuarioId = prontuario.id;
    ({ sessaoId, evolucaoId } = await criarSessaoComEvolucao(
      '2026-11-10T13:00:00Z',
      pessoas.estagiarioA,
    ));

    const config = new ConfigService({ CHAVE_DADOS: CHAVE_TESTE });
    const politica = new PoliticaProntuario(db);
    complementos = new ComplementosEvolucaoService(
      db,
      politica,
      config,
      new AuditoriaService(db),
    );
    correcoes = new CorrecoesEvolucaoService(
      db,
      politica,
      config,
      new AuditoriaService(db),
    );
    validacoes = new ValidacoesEvolucaoService(
      db,
      politica,
      new AuditoriaService(db),
    );
    prontuariosService = new ProntuariosService(
      db,
      politica,
      config,
      new AuditoriaService(db),
      new FaltasService(db, config, new AuditoriaService(db)),
      new DesligamentosService(
        db,
        config,
        new AuditoriaService(db),
        new FilaService(db, config),
      ),
    );
  });

  const evolucaoNoProntuario = async (quem: UsuarioAutenticado) => {
    const p = await prontuariosService.consultar(prontuarioId, quem);
    return p.sessoes.find((s) => s.id === sessaoId)!.evolucao!;
  };

  const validar = (quem = pessoas.supervisor) =>
    validacoes.validar(prontuarioId, evolucaoId, quem);
  const gravadas = () => db.select().from(validacoesEvolucao);
  const complementar = () =>
    complementos.registrar(
      prontuarioId,
      evolucaoId,
      { texto: 'Informação adicional.' },
      pessoas.estagiarioA,
    );
  const corrigir = () =>
    correcoes.corrigir(
      prontuarioId,
      evolucaoId,
      {
        humorAparencia: 'Ansioso.',
        conteudoTrabalhado: 'Rotina.',
        tecnicasUtilizadas: 'Escuta.',
        planoProximaSessao: 'Seguir.',
        motivo: 'Humor errado.',
      },
      pessoas.estagiarioA,
    );
  // O banco em memória acompanha o relógio do teste.
  const as = (hora: string) =>
    jest.setSystemTime(new Date(`2026-11-16T${hora}:00Z`));

  it('a evolução sem validação está pendente, e só o supervisor do caso vê a ação (RF67)', async () => {
    for (const [quem, permitida] of [
      [pessoas.supervisor, true],
      [pessoas.estagiarioA, false],
      [pessoas.coordenacao, false],
    ] as const)
      expect((await evolucaoNoProntuario(quem)).validacao).toEqual({
        situacao: 'pendente',
        ultima: null,
        mudanca: null,
        permitida,
      });
  });

  it('o supervisor valida a evolução com uma correção e um complemento, com autor e data/hora, sem alterar o conteúdo (RF67, RNF10, RNF27)', async () => {
    const antes = await db.select().from(evolucoes);
    as('15:10');
    await corrigir();
    as('15:20');
    await complementar();
    as('15:30');
    const resposta = await validar();
    expect(resposta).toMatchObject({
      situacao: 'validada',
      ultima: { por: 'Ricardo Menezes' },
    });
    expect(resposta.ultima.em.toISOString()).toContain('2026-11-16T15:30');
    expect(await db.select().from(evolucoes)).toEqual(antes);
    for (const quem of [
      pessoas.supervisor,
      pessoas.estagiarioA,
      pessoas.coordenacao,
    ])
      expect((await evolucaoNoProntuario(quem)).validacao).toMatchObject({
        situacao: 'validada',
        ultima: { por: 'Ricardo Menezes' },
        permitida: false,
      });
    const [registro] = await db
      .select()
      .from(auditoria)
      .where(eq(auditoria.operacao, 'validar_evolucao_sessao'));
    expect(registro.usuarioId).toBe(pessoas.supervisor.id);
    const [acesso] = await db
      .select()
      .from(acessosProntuario)
      .where(eq(acessosProntuario.operacao, 'validar_evolucao'));
    expect(acesso).toMatchObject({ permitido: true, prontuarioId });
  });

  it('a validação repetida sem mudança é recusada com 409 e a validação atual (RF67)', async () => {
    await validar();
    as('15:30');
    const erro = await validar().catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ConflictException);
    expect((erro as ConflictException).getResponse()).toMatchObject({
      validacao: { situacao: 'validada', ultima: { por: 'Ricardo Menezes' } },
    });
    expect(await gravadas()).toHaveLength(1);
  });

  it('duas validações ao mesmo tempo gravam uma só (RF67)', async () => {
    const resultados = await Promise.allSettled([validar(), validar()]);
    expect(resultados.map((r) => r.status).sort()).toEqual([
      'fulfilled',
      'rejected',
    ]);
    expect(await gravadas()).toHaveLength(1);
  });

  it.each([
    ['uma correção', 'correcao', corrigir],
    ['um complemento', 'complemento', complementar],
  ] as const)(
    '%s depois da validação devolve a evolução a pendente, até validar de novo (RF67, RF29, RF30)',
    async (_nome, tipo, mudar) => {
      await validar();
      as('15:30');
      await mudar();
      const pendente = (await evolucaoNoProntuario(pessoas.supervisor))
        .validacao;
      expect(pendente).toMatchObject({
        situacao: 'pendente',
        ultima: { por: 'Ricardo Menezes' },
        mudanca: { tipo },
        permitida: true,
      });
      expect(pendente.mudanca!.em.toISOString()).toContain('15:30');
      as('15:40');
      await validar();
      expect(
        (await evolucaoNoProntuario(pessoas.supervisor)).validacao.situacao,
      ).toBe('validada');
      expect(await gravadas()).toHaveLength(2);
    },
  );

  it('a mudança no mesmo instante da validação deixa a evolução pendente (RF67)', async () => {
    await validar();
    await complementar();
    expect(
      (await evolucaoNoProntuario(pessoas.supervisor)).validacao.situacao,
    ).toBe('pendente');
  });

  it('a situação é de cada evolução: uma validada e outra pendente na mesma consulta (RF67)', async () => {
    const outra = await criarSessaoComEvolucao(
      '2026-11-03T13:00:00Z',
      pessoas.estagiarioA,
    );
    await validar();
    const p = await prontuariosService.consultar(
      prontuarioId,
      pessoas.coordenacao,
    );
    const situacao = (id: string) =>
      p.sessoes.find((s) => s.id === id)!.evolucao!.validacao.situacao;
    expect(situacao(sessaoId)).toBe('validada');
    expect(situacao(outra.sessaoId)).toBe('pendente');
  });

  it('a coordenação, a secretaria, outro supervisor e o estagiário não validam, e a tentativa fica registrada (RF67, RF55, RF56, RNF25)', async () => {
    for (const quem of [
      pessoas.coordenacao,
      pessoas.secretaria,
      pessoas.outroSupervisor,
      pessoas.estagiarioA,
      pessoas.estagiarioOutroCaso,
    ])
      await expect(validar(quem)).rejects.toBeInstanceOf(ForbiddenException);
    // Prontuário inexistente: a mesma resposta (RNF25).
    await expect(
      validacoes.validar(
        '00000000-0000-4000-8000-000000000000',
        evolucaoId,
        pessoas.supervisor,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(await gravadas()).toHaveLength(0);
    const negados = await db
      .select()
      .from(acessosProntuario)
      .where(
        and(
          eq(acessosProntuario.operacao, 'validar_evolucao'),
          eq(acessosProntuario.permitido, false),
        ),
      );
    expect(negados).toHaveLength(6);
  });

  it('depois da troca do supervisor, só o novo valida (RF67)', async () => {
    await db
      .update(atribuicoesSupervisor)
      .set({ vigente: false, encerradaEm: new Date() })
      .where(eq(atribuicoesSupervisor.casoId, casoId));
    await db.insert(atribuicoesSupervisor).values({
      casoId,
      supervisorId: pessoas.outroSupervisor.id,
      atribuidoPor: pessoas.coordenacao.id,
    });
    await expect(validar()).rejects.toBeInstanceOf(ForbiddenException);
    await expect(validar(pessoas.outroSupervisor)).resolves.toMatchObject({
      ultima: { por: 'Carla Mendes' },
    });
  });

  it('a evolução de outro prontuário não é encontrada (RF67)', async () => {
    await expect(
      validacoes.validar(
        prontuarioId,
        '00000000-0000-4000-8000-000000000000',
        pessoas.supervisor,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('o usuário da aplicação valida, mas não altera nem apaga uma validação; nem o dono do banco (RF67, RNF27)', async () => {
    await cliente.exec('set role clinica_app');
    try {
      await validar();
      await expect(
        cliente.exec('update validacoes_evolucao set validada_em = now()'),
      ).rejects.toThrow(/permission denied/);
      await expect(
        cliente.exec('delete from validacoes_evolucao'),
      ).rejects.toThrow(/permission denied/);
    } finally {
      await cliente.exec('reset role');
    }
    await expect(
      cliente.exec('delete from validacoes_evolucao'),
    ).rejects.toThrow();
    expect(await gravadas()).toHaveLength(1);
  });

  it('pela rota, responde 201 sem cache, 409, 403 e 401 (RF67)', async () => {
    const enviar = (quem: UsuarioAutenticado | null) => {
      const pedido = request(app.getHttpServer()).post(
        `/prontuarios/${prontuarioId}/evolucoes/${evolucaoId}/validacao`,
      );
      if (quem) pedido.set('x-usuario-teste', JSON.stringify(quem));
      return pedido.send();
    };
    const criada = await enviar(pessoas.supervisor).expect(201);
    expect(criada.body).toMatchObject({ situacao: 'validada' });
    expect(criada.headers['cache-control']).toBe('no-store');
    const repetida = await enviar(pessoas.supervisor).expect(409);
    expect(repetida.body.validacao.situacao).toBe('validada');
    await enviar(pessoas.coordenacao).expect(403);
    await enviar(null).expect(401);
  });
});
