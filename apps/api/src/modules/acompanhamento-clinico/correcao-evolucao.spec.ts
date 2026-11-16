import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PGlite } from '@electric-sql/pglite';
import {
  BadRequestException,
  Global,
  Module,
  type INestApplication,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { and, eq, sql } from 'drizzle-orm';
import {
  acessosProntuario,
  alteracoesParametro,
  atribuicoesSupervisor,
  auditoria,
  casos,
  correcoesEvolucao,
  evolucoes,
  inscricoes,
  parametrosSemestre,
  prontuarios,
  sessoesAtendimento,
  usuarios,
  vinculosEstagiario,
  type Db,
} from '@clinica/database';
import { AuditoriaModule } from '../../auditoria/auditoria.module';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { DB } from '../../database/database.module';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { cifrar, decifrar } from '../../common/criptografia';
import {
  CHAVE_TESTE,
  criarBancoDeTeste,
} from '../../test-utils/banco-de-teste';
import { DesligamentosService } from '../assiduidade/desligamentos.service';
import { FaltasService } from '../assiduidade/faltas.service';
import { FilaService } from '../fila/fila.service';
import { AcompanhamentoClinicoModule } from './acompanhamento-clinico.module';
import { CorrecoesEvolucaoService } from './correcoes-evolucao.service';
import { PoliticaProntuario } from './politica-prontuario';
import { ProntuariosService } from './prontuarios.service';

const SCRIPT_USUARIO_APP = readFileSync(
  join(
    __dirname,
    '../../../../../packages/database/sql/usuario-da-aplicacao.sql',
  ),
  'utf8',
);

// Ficha da DF38 corrigida, sem o motivo e com ele.
const fichaSemMotivo = () => ({
  humorAparencia: 'Ansioso no início, tranquilo ao final.',
  conteudoTrabalhado: 'Rotina de sono.',
  tecnicasUtilizadas: 'Escuta qualificada.',
  intervencoesEncaminhamentos: '',
  planoProximaSessao: 'Retomar o tema.',
});
const ficha = (motivo = 'Corrigir o humor registrado.') => ({
  ...fichaSemMotivo(),
  motivo,
});

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

describe('Corrigir evolução registrada (RF29)', () => {
  let db: Db;
  let cliente: PGlite;
  let app: INestApplication;
  let limpar: () => Promise<unknown>;
  let fechar: () => Promise<void>;
  let correcoes: CorrecoesEvolucaoService;
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
    fichaAntiga = false,
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
        ...(fichaAntiga
          ? {
              queixaCifrada: cifrar('Queixa antiga.', CHAVE_TESTE),
              planejamentoCifrado: cifrar('Planejamento antigo.', CHAVE_TESTE),
            }
          : {
              humorAparenciaCifrado: cifrar('Tranquilo.', CHAVE_TESTE),
              conteudoTrabalhadoCifrado: cifrar('Rotina.', CHAVE_TESTE),
              tecnicasUtilizadasCifrado: cifrar('Escuta.', CHAVE_TESTE),
              planoProximaSessaoCifrado: cifrar('Seguir.', CHAVE_TESTE),
            }),
        registradaPor: autor.id,
      })
      .returning();
    return { sessaoId: sessao.id, evolucaoId: evolucao.id };
  };

  const definirDataLimite = (semestre: string, data: string) =>
    db.insert(parametrosSemestre).values({
      semestre,
      chave: 'data_limite_correcao',
      valor: data,
      alteradoPor: pessoas.coordenacao.id,
    });

  const contarCorrecoes = async () =>
    (await db.select().from(correcoesEvolucao)).length;

  beforeEach(async () => {
    await limpar();
    // Os parâmetros por semestre não entram na limpeza comum dos testes.
    await db.execute(sql`TRUNCATE parametros_semestre, alteracoes_parametro`);
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
    correcoes = new CorrecoesEvolucaoService(
      db,
      politica,
      config,
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

  it('a correção do estagiário no prazo preserva a original e registra a nova com autor, data/hora e motivo (RF29, RNF28, RNF51)', async () => {
    await definirDataLimite('2026/2', '2026-12-15');
    const resposta = await correcoes.corrigir(
      prontuarioId,
      evolucaoId,
      ficha(),
      pessoas.estagiarioA,
    );
    expect(resposta).toMatchObject({
      versao: 2,
      corrigidaPor: 'Ana Beatriz Costa',
      motivo: 'Corrigir o humor registrado.',
    });

    // A original continua igual no banco, e a correção está cifrada.
    const [original] = await db
      .select()
      .from(evolucoes)
      .where(eq(evolucoes.id, evolucaoId));
    expect(decifrar(original.humorAparenciaCifrado!, CHAVE_TESTE)).toBe(
      'Tranquilo.',
    );
    const [correcao] = await db.select().from(correcoesEvolucao);
    expect(correcao.humorAparenciaCifrado).not.toContain('Ansioso');
    expect(correcao.motivoCifrado).not.toContain('humor');

    // O prontuário mostra a versão vigente e a original, legível.
    const evolucao = await evolucaoNoProntuario(pessoas.estagiarioA);
    expect(evolucao.humorAparencia).toBe(
      'Ansioso no início, tranquilo ao final.',
    );
    expect(evolucao.versaoAtual).toBe(2);
    expect(evolucao.versoes.map((v) => [v.versao, v.autor, v.motivo])).toEqual([
      [2, 'Ana Beatriz Costa', 'Corrigir o humor registrado.'],
      [1, 'Ana Beatriz Costa', null],
    ]);
    expect(evolucao.versoes[1].humorAparencia).toBe('Tranquilo.');
    expect(evolucao.versoes[0].em).toBeInstanceOf(Date);

    // Auditoria da correção (RNF10).
    const registros = await db
      .select()
      .from(auditoria)
      .where(eq(auditoria.operacao, 'corrigir_evolucao_sessao'));
    expect(registros).toHaveLength(1);
    expect(registros[0].usuarioId).toBe(pessoas.estagiarioA.id);
  });

  it('cada nova correção vira a versão seguinte, mesmo enviadas ao mesmo tempo (RF29)', async () => {
    await Promise.all([
      correcoes.corrigir(
        prontuarioId,
        evolucaoId,
        ficha('Primeira.'),
        pessoas.estagiarioA,
      ),
      correcoes.corrigir(
        prontuarioId,
        evolucaoId,
        ficha('Segunda.'),
        pessoas.supervisor,
      ),
    ]);
    const versoes = (
      await db
        .select({ versao: correcoesEvolucao.versao })
        .from(correcoesEvolucao)
        .orderBy(correcoesEvolucao.versao)
    ).map((v) => v.versao);
    expect(versoes).toEqual([2, 3]);
  });

  it('o supervisor do caso corrige o registro do estagiário (RF29)', async () => {
    const resposta = await correcoes.corrigir(
      prontuarioId,
      evolucaoId,
      ficha('Ajuste pedido na supervisão.'),
      pessoas.supervisor,
    );
    expect(resposta).toMatchObject({
      versao: 2,
      corrigidaPor: 'Ricardo Menezes',
    });
    const evolucao = await evolucaoNoProntuario(pessoas.supervisor);
    expect(evolucao.versoes[0].autor).toBe('Ricardo Menezes');
    expect(evolucao.correcao.permitida).toBe(true);
  });

  it('a correção sem motivo é recusada com o campo indicado, e o registro continua como estava (RF29)', async () => {
    for (const corpo of [fichaSemMotivo(), ficha('   ')]) {
      const erro = await correcoes
        .corrigir(prontuarioId, evolucaoId, corpo, pessoas.estagiarioA)
        .catch((e: unknown) => e);
      expect(erro).toBeInstanceOf(BadRequestException);
      const problemas = (erro as BadRequestException).getResponse() as {
        message: { path: string[] }[];
      };
      expect(problemas.message.map((p) => p.path[0])).toContain('motivo');
    }
    // Campo acima do limite também é recusado.
    await expect(
      correcoes.corrigir(
        prontuarioId,
        evolucaoId,
        { ...ficha(), conteudoTrabalhado: 'x'.repeat(1001) },
        pessoas.estagiarioA,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(await contarCorrecoes()).toBe(0);
    const evolucao = await evolucaoNoProntuario(pessoas.estagiarioA);
    expect(evolucao.versaoAtual).toBe(1);
    expect(evolucao.humorAparencia).toBe('Tranquilo.');
  });

  it('depois da data-limite, nem o estagiário nem o supervisor corrigem (RF29)', async () => {
    // A data-limite foi ontem, em Brasília.
    await definirDataLimite('2026/2', '2026-11-15');
    for (const quem of [pessoas.estagiarioA, pessoas.supervisor]) {
      const erro = await correcoes
        .corrigir(prontuarioId, evolucaoId, ficha(), quem)
        .catch((e: unknown) => e);
      expect(erro).toBeInstanceOf(UnprocessableEntityException);
      expect(
        (erro as UnprocessableEntityException).getResponse(),
      ).toMatchObject({
        message:
          'O prazo para corrigir evoluções deste semestre terminou em 15/11/2026.',
        dataLimite: '2026-11-15',
      });
    }
    expect(await contarCorrecoes()).toBe(0);
    const evolucao = await evolucaoNoProntuario(pessoas.estagiarioA);
    expect(evolucao.correcao).toEqual({
      dataLimite: '2026-11-15',
      prazoEncerrado: true,
      permitida: false,
    });
  });

  it('no próprio dia da data-limite, em Brasília, a correção ainda é permitida (RF29)', async () => {
    // 16/11 às 23h30 em Brasília já é 17/11 em UTC.
    pararRelogioEm('2026-11-17T02:30:00Z');
    await definirDataLimite('2026/2', '2026-11-16');
    await expect(
      correcoes.corrigir(
        prontuarioId,
        evolucaoId,
        ficha(),
        pessoas.estagiarioA,
      ),
    ).resolves.toMatchObject({ versao: 2 });
  });

  it('sem data-limite, a correção é permitida, e a coordenação é avisada (RF29)', async () => {
    const evolucao = await evolucaoNoProntuario(pessoas.estagiarioA);
    expect(evolucao.correcao).toEqual({
      dataLimite: null,
      prazoEncerrado: false,
      permitida: true,
    });
    await expect(
      correcoes.corrigir(
        prontuarioId,
        evolucaoId,
        ficha(),
        pessoas.estagiarioA,
      ),
    ).resolves.toMatchObject({ versao: 2 });
    await expect(correcoes.consultarDataLimite()).resolves.toEqual({
      semestre: '2026/2',
      dataLimite: null,
      pendente: true,
      ultimaAlteracao: null,
    });
  });

  it('a coordenação registra a data-limite, com o valor anterior, o novo, o autor e a data/hora (RF29)', async () => {
    const primeira = await correcoes.registrarDataLimite(
      '2026-12-10',
      pessoas.coordenacao.id,
    );
    expect(primeira).toMatchObject({
      semestre: '2026/2',
      dataLimite: '2026-12-10',
      pendente: false,
      ultimaAlteracao: {
        valorAnterior: null,
        valorNovo: '2026-12-10',
        por: 'Helena Duarte',
      },
    });
    // O relógio do banco em memória acompanha o do teste.
    jest.setSystemTime(new Date('2026-11-16T16:00:00Z'));
    const segunda = await correcoes.registrarDataLimite(
      '2026-12-18',
      pessoas.coordenacao.id,
    );
    expect(segunda.ultimaAlteracao).toMatchObject({
      valorAnterior: '2026-12-10',
      valorNovo: '2026-12-18',
    });
    // Gravar a mesma data de novo não cria histórico.
    jest.setSystemTime(new Date('2026-11-16T17:00:00Z'));
    await correcoes.registrarDataLimite('2026-12-18', pessoas.coordenacao.id);
    const historico = await db
      .select()
      .from(alteracoesParametro)
      .where(eq(alteracoesParametro.chave, 'data_limite_correcao:2026/2'));
    expect(historico.map((h) => [h.valorAnterior, h.valorNovo])).toEqual([
      [null, '2026-12-10'],
      ['2026-12-10', '2026-12-18'],
    ]);
    const auditados = await db
      .select()
      .from(auditoria)
      .where(eq(auditoria.operacao, 'registrar_data_limite_correcao'));
    expect(auditados).toHaveLength(2);
  });

  it('a coordenação, a secretaria e o estagiário de outro caso não corrigem, e a tentativa fica registrada (RF29, RF55, RF56, RNF25)', async () => {
    for (const quem of [
      pessoas.coordenacao,
      pessoas.secretaria,
      pessoas.estagiarioOutroCaso,
    ]) {
      await expect(
        correcoes.corrigir(prontuarioId, evolucaoId, ficha(), quem),
      ).rejects.toBeInstanceOf(ForbiddenException);
    }
    // Prontuário inexistente: a mesma resposta (RNF25).
    await expect(
      correcoes.corrigir(
        '00000000-0000-4000-8000-000000000000',
        evolucaoId,
        ficha(),
        pessoas.estagiarioA,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(await contarCorrecoes()).toBe(0);
    const negados = await db
      .select()
      .from(acessosProntuario)
      .where(
        and(
          eq(acessosProntuario.operacao, 'corrigir_evolucao'),
          eq(acessosProntuario.permitido, false),
        ),
      );
    expect(negados).toHaveLength(4);
    // A coordenação vê o prontuário, mas sem a correção.
    const evolucao = await evolucaoNoProntuario(pessoas.coordenacao);
    expect(evolucao.correcao.permitida).toBe(false);
  });

  it('o acesso corrigir_evolucao permitido aparece no registro de acessos ao prontuário (RF29, RF56)', async () => {
    await correcoes.corrigir(
      prontuarioId,
      evolucaoId,
      ficha(),
      pessoas.estagiarioA,
    );
    const [acesso] = await db
      .select()
      .from(acessosProntuario)
      .where(eq(acessosProntuario.operacao, 'corrigir_evolucao'));
    expect(acesso).toMatchObject({
      prontuarioId,
      usuarioId: pessoas.estagiarioA.id,
      permitido: true,
    });
  });

  it('o usuário da aplicação não altera nem apaga uma versão, e corrige normalmente (RF29, RNF52)', async () => {
    await cliente.exec('set role clinica_app');
    try {
      // A correção funciona com as permissões do usuário da aplicação.
      await correcoes.corrigir(
        prontuarioId,
        evolucaoId,
        ficha(),
        pessoas.estagiarioA,
      );
      await expect(
        cliente.exec('update correcoes_evolucao set versao = 9'),
      ).rejects.toThrow(/permission denied/);
      await expect(
        cliente.exec('delete from correcoes_evolucao'),
      ).rejects.toThrow(/permission denied/);
    } finally {
      await cliente.exec('reset role');
    }
    // Nem o dono do banco altera: o gatilho recusa.
    await expect(
      cliente.exec('update correcoes_evolucao set versao = 9'),
    ).rejects.toThrow();
    expect(await contarCorrecoes()).toBe(1);
  });

  it('a evolução de 2026/2 corrigida em janeiro de 2027, depois da data-limite de 2026/2 e sem a de 2027/1, é recusada (RF29)', async () => {
    await definirDataLimite('2026/2', '2026-12-18');
    pararRelogioEm('2027-01-12T15:00:00Z');
    await expect(
      correcoes.corrigir(
        prontuarioId,
        evolucaoId,
        ficha(),
        pessoas.estagiarioA,
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    // A coordenação vê o semestre novo como pendente.
    await expect(correcoes.consultarDataLimite()).resolves.toMatchObject({
      semestre: '2027/1',
      pendente: true,
    });
  });

  it('o estagiário só corrige o que ele registrou; depois da transferência, o novo não corrige a do anterior, e o supervisor corrige (RF29, RF25, RF55, RF56)', async () => {
    // Transferência: o vínculo de A termina e B passa a ser o responsável.
    await db
      .update(vinculosEstagiario)
      .set({ vigente: false, encerradoEm: new Date() })
      .where(eq(vinculosEstagiario.casoId, casoId));
    await db.insert(vinculosEstagiario).values({
      casoId,
      estagiarioId: pessoas.estagiarioB.id,
      vinculadoPor: pessoas.supervisor.id,
    });
    for (const quem of [pessoas.estagiarioB, pessoas.estagiarioA]) {
      await expect(
        correcoes.corrigir(prontuarioId, evolucaoId, ficha(), quem),
      ).rejects.toBeInstanceOf(ForbiddenException);
    }
    const [acessoDoNovoEstagiario] = await db
      .select()
      .from(acessosProntuario)
      .where(
        and(
          eq(acessosProntuario.usuarioId, pessoas.estagiarioB.id),
          eq(acessosProntuario.operacao, 'corrigir_evolucao'),
        ),
      );
    expect(acessoDoNovoEstagiario).toMatchObject({ permitido: false });
    expect(
      (await evolucaoNoProntuario(pessoas.estagiarioB)).correcao.permitida,
    ).toBe(false);
    await expect(
      correcoes.corrigir(prontuarioId, evolucaoId, ficha(), pessoas.supervisor),
    ).resolves.toMatchObject({ versao: 2 });
  });

  it('a evolução anterior à DF38 é corrigida com os campos dela; a ficha de outro formato é recusada (RF29, DF23)', async () => {
    const antiga = await criarSessaoComEvolucao(
      '2026-11-03T13:00:00Z',
      pessoas.estagiarioA,
      true,
    );
    await expect(
      correcoes.corrigir(
        prontuarioId,
        antiga.evolucaoId,
        ficha(),
        pessoas.estagiarioA,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      correcoes.corrigir(
        prontuarioId,
        antiga.evolucaoId,
        {
          queixa: 'Queixa corrigida.',
          planejamento: 'Plano corrigido.',
          motivo: 'Erro de digitação.',
        },
        pessoas.estagiarioA,
      ),
    ).resolves.toMatchObject({ versao: 2 });
    const p = await prontuariosService.consultar(
      prontuarioId,
      pessoas.estagiarioA,
    );
    const evolucao = p.sessoes.find((s) => s.id === antiga.sessaoId)!.evolucao!;
    expect([evolucao.queixa, evolucao.planejamento]).toEqual([
      'Queixa corrigida.',
      'Plano corrigido.',
    ]);
    expect(evolucao.versoes[1].queixa).toBe('Queixa antiga.');
  });

  it('a evolução de outro prontuário não é encontrada (RF29)', async () => {
    await expect(
      correcoes.corrigir(
        prontuarioId,
        '00000000-0000-4000-8000-000000000000',
        ficha(),
        pessoas.estagiarioA,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  describe('pelas rotas da API', () => {
    const como = (quem: UsuarioAutenticado) => ({
      'x-usuario-teste': JSON.stringify(quem),
    });
    const http = () => request(app.getHttpServer());
    const rota = () =>
      `/prontuarios/${prontuarioId}/evolucoes/${evolucaoId}/correcoes`;

    it('a correção responde 201 com a versão nova, 400 com o campo do motivo e 403 sem permissão (RF29)', async () => {
      const criada = await http()
        .post(rota())
        .set(como(pessoas.estagiarioA))
        .send(ficha())
        .expect(201);
      expect(criada.body).toMatchObject({ versao: 2 });
      expect(criada.headers['cache-control']).toBe('no-store');

      const semMotivo = await http()
        .post(rota())
        .set(como(pessoas.estagiarioA))
        .send(fichaSemMotivo())
        .expect(400);
      expect(
        (semMotivo.body.message as { path: string[] }[]).map((p) => p.path[0]),
      ).toEqual(['motivo']);

      await http()
        .post(rota())
        .set(como(pessoas.coordenacao))
        .send(ficha())
        .expect(403);
      await http().post(rota()).send(ficha()).expect(401);
    });

    it('a correção depois da data-limite responde 422 com a data (RF29)', async () => {
      await definirDataLimite('2026/2', '2026-11-15');
      const resposta = await http()
        .post(rota())
        .set(como(pessoas.supervisor))
        .send(ficha())
        .expect(422);
      expect(resposta.body).toMatchObject({ dataLimite: '2026-11-15' });
    });

    it('só a coordenação consulta e registra a data-limite (RF29)', async () => {
      for (const quem of [
        pessoas.secretaria,
        pessoas.supervisor,
        pessoas.estagiarioA,
      ]) {
        await http()
          .get('/parametros/data-limite-correcao')
          .set(como(quem))
          .expect(403);
        await http()
          .put('/parametros/data-limite-correcao')
          .set(como(quem))
          .send({ dataLimite: '2026-12-10' })
          .expect(403);
      }
      await http()
        .put('/parametros/data-limite-correcao')
        .set(como(pessoas.coordenacao))
        .send({ dataLimite: '10/12/2026' })
        .expect(400);
      const gravada = await http()
        .put('/parametros/data-limite-correcao')
        .set(como(pessoas.coordenacao))
        .send({ dataLimite: '2026-12-10' })
        .expect(200);
      expect(gravada.body).toMatchObject({
        semestre: '2026/2',
        dataLimite: '2026-12-10',
        pendente: false,
      });
      const consulta = await http()
        .get('/parametros/data-limite-correcao')
        .set(como(pessoas.coordenacao))
        .expect(200);
      expect(consulta.body.ultimaAlteracao).toMatchObject({
        valorNovo: '2026-12-10',
        por: 'Helena Duarte',
      });
    });
  });
});
