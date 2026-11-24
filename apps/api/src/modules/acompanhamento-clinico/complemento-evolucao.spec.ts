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
import { and, eq } from 'drizzle-orm';
import {
  acessosProntuario,
  atribuicoesSupervisor,
  auditoria,
  casos,
  complementosEvolucao,
  desligamentosPorFaltas,
  evolucoes,
  inscricoes,
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
import { ComplementosEvolucaoService } from './complementos-evolucao.service';
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

const ORIENTACAO =
  'Na supervisão, o supervisor orientou retomar o registro de pensamentos.';

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

describe('Registrar complemento de evolução (RF30)', () => {
  let db: Db;
  let cliente: PGlite;
  let app: INestApplication;
  let limpar: () => Promise<unknown>;
  let fechar: () => Promise<void>;
  let complementos: ComplementosEvolucaoService;
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

  const registrar = (texto: unknown, quem: UsuarioAutenticado) =>
    complementos.registrar(prontuarioId, evolucaoId, { texto }, quem);
  const gravados = () => db.select().from(complementosEvolucao);

  it('dois complementos ficam na ordem em que foram registrados, com autor e data/hora, sem mudar o original (RF30, RNF10, RNF51)', async () => {
    const [antes] = await db.select().from(evolucoes);
    const primeiro = await registrar(
      '  Paciente ligou para avisar.  ',
      pessoas.estagiarioA,
    );
    expect(primeiro).toMatchObject({
      tipo: 'complemento',
      texto: 'Paciente ligou para avisar.',
      autor: 'Ana Beatriz Costa',
    });
    expect(primeiro.em).toBeInstanceOf(Date);
    jest.setSystemTime(new Date('2026-11-17T15:00:00Z'));
    await registrar(ORIENTACAO, pessoas.estagiarioA);

    const evolucao = await evolucaoNoProntuario(pessoas.estagiarioA);
    expect(
      evolucao.complementos.map((c) => [c.tipo, c.texto, c.autor]),
    ).toEqual([
      ['complemento', 'Paciente ligou para avisar.', 'Ana Beatriz Costa'],
      ['complemento', ORIENTACAO, 'Ana Beatriz Costa'],
    ]);
    expect(evolucao.complementos[0].em.getTime()).toBeLessThan(
      evolucao.complementos[1].em.getTime(),
    );
    // Nem o original nem as versões mudam.
    const [depois] = await db.select().from(evolucoes);
    expect(depois).toEqual(antes);
    expect(evolucao.versoes.map((v) => v.versao)).toEqual([1]);

    const linhas = await gravados();
    expect(linhas.every((l) => !l.textoCifrado.includes('supervis'))).toBe(
      true,
    );
    expect(linhas.map((l) => decifrar(l.textoCifrado, CHAVE_TESTE))).toContain(
      ORIENTACAO,
    );
    const registros = await db
      .select()
      .from(auditoria)
      .where(eq(auditoria.operacao, 'complementar_evolucao_sessao'));
    expect(registros).toHaveLength(2);
    expect(JSON.stringify(registros)).not.toContain('supervisão');
  });

  it('o complemento fica separado das correções da evolução (RF30, RF29)', async () => {
    const correcoes = new CorrecoesEvolucaoService(
      db,
      new PoliticaProntuario(db),
      new ConfigService({ CHAVE_DADOS: CHAVE_TESTE }),
      new AuditoriaService(db),
    );
    await correcoes.corrigir(
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
    await registrar(ORIENTACAO, pessoas.estagiarioA);
    const evolucao = await evolucaoNoProntuario(pessoas.supervisor);
    expect(evolucao.versoes.map((v) => v.versao)).toEqual([2, 1]);
    expect(evolucao.complementos.map((c) => c.texto)).toEqual([ORIENTACAO]);
  });

  it('o complemento vazio ou com 1.001 caracteres é recusado com o campo indicado, e o de 1.000 é aceito (RF30)', async () => {
    for (const [texto, mensagem] of [
      ['', 'Escreva o complemento.'],
      ['   ', 'Escreva o complemento.'],
      [undefined, 'Escreva o complemento.'],
      ['x'.repeat(1001), 'Use até 1.000 caracteres (agora são 1.001).'],
    ]) {
      const erro = await registrar(texto, pessoas.estagiarioA).catch(
        (e: unknown) => e,
      );
      expect(erro).toBeInstanceOf(BadRequestException);
      const { message } = (erro as BadRequestException).getResponse() as {
        message: { path: string[]; message: string }[];
      };
      expect(message.map((p) => [p.path[0], p.message])).toEqual([
        ['texto', mensagem],
      ]);
    }
    expect(await gravados()).toHaveLength(0);
    await registrar('x'.repeat(1000), pessoas.estagiarioA);
    expect(await gravados()).toHaveLength(1);
  });

  it('o supervisor, a coordenação, a secretaria e o estagiário de outro caso não complementam, e a tentativa fica registrada (RF30, RF55, RF56, RNF25)', async () => {
    for (const quem of [
      pessoas.supervisor,
      pessoas.coordenacao,
      pessoas.secretaria,
      pessoas.estagiarioOutroCaso,
    ])
      await expect(registrar(ORIENTACAO, quem)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    // Prontuário inexistente: a mesma resposta (RNF25).
    await expect(
      complementos.registrar(
        '00000000-0000-4000-8000-000000000000',
        evolucaoId,
        { texto: ORIENTACAO },
        pessoas.estagiarioA,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(await gravados()).toHaveLength(0);
    const negados = await db
      .select()
      .from(acessosProntuario)
      .where(
        and(
          eq(acessosProntuario.operacao, 'complementar_evolucao'),
          eq(acessosProntuario.permitido, false),
        ),
      );
    expect(negados).toHaveLength(5);
    // Eles consultam sem a ação de complementar.
    for (const quem of [pessoas.supervisor, pessoas.coordenacao])
      expect((await evolucaoNoProntuario(quem)).complemento).toEqual({
        permitido: false,
        aviso: null,
      });
  });

  it('depois da transferência, só o novo responsável complementa, e o autor de cada registro é mantido (RF30, RF25)', async () => {
    await registrar('Do primeiro estagiário.', pessoas.estagiarioA);
    await db
      .update(vinculosEstagiario)
      .set({ vigente: false, encerradoEm: new Date() })
      .where(eq(vinculosEstagiario.casoId, casoId));
    await db.insert(vinculosEstagiario).values({
      casoId,
      estagiarioId: pessoas.estagiarioB.id,
      vinculadoPor: pessoas.supervisor.id,
    });
    await expect(
      registrar(ORIENTACAO, pessoas.estagiarioA),
    ).rejects.toBeInstanceOf(ForbiddenException);
    jest.setSystemTime(new Date('2026-11-17T15:00:00Z'));
    await registrar('Do novo responsável.', pessoas.estagiarioB);
    const evolucao = await evolucaoNoProntuario(pessoas.estagiarioB);
    expect(evolucao.complementos.map((c) => c.autor)).toEqual([
      'Ana Beatriz Costa',
      'João Victor Almeida',
    ]);
  });

  it('o caso desligado ou encerrado não aceita complemento, com a situação na resposta e o aviso no prontuário (RF30, RF37, RF68)', async () => {
    await db.insert(desligamentosPorFaltas).values({
      casoId,
      cicloAtendimento: 1,
      decididoPor: pessoas.coordenacao.id,
      dataDecisao: '2026-11-14',
    });
    for (const [situacao, aviso] of [
      [
        'desligado_por_faltas',
        'O paciente foi desligado por faltas em 14/11/2026. A evolução não aceita novos complementos.',
      ],
      [
        'encerrado',
        'O caso não está em atendimento. A evolução não aceita novos complementos.',
      ],
    ] as const) {
      await db.update(casos).set({ situacao });
      const erro = await registrar(ORIENTACAO, pessoas.estagiarioA).catch(
        (e: unknown) => e,
      );
      expect(erro).toBeInstanceOf(UnprocessableEntityException);
      expect(
        (erro as UnprocessableEntityException).getResponse(),
      ).toMatchObject({ situacao });
      expect(
        (await evolucaoNoProntuario(pessoas.supervisor)).complemento,
      ).toEqual({ permitido: false, aviso });
    }
    expect(await gravados()).toHaveLength(0);
  });

  it('a evolução de outro prontuário não é encontrada (RF30)', async () => {
    await expect(
      complementos.registrar(
        prontuarioId,
        '00000000-0000-4000-8000-000000000000',
        { texto: ORIENTACAO },
        pessoas.estagiarioA,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('o usuário da aplicação registra, mas não altera nem apaga um complemento; nem o dono do banco (RF30, RNF27)', async () => {
    await cliente.exec('set role clinica_app');
    try {
      await registrar(ORIENTACAO, pessoas.estagiarioA);
      await expect(
        cliente.exec("update complementos_evolucao set texto_cifrado = 'x'"),
      ).rejects.toThrow(/permission denied/);
      await expect(
        cliente.exec('delete from complementos_evolucao'),
      ).rejects.toThrow(/permission denied/);
    } finally {
      await cliente.exec('reset role');
    }
    await expect(
      cliente.exec('delete from complementos_evolucao'),
    ).rejects.toThrow();
    expect(await gravados()).toHaveLength(1);
  });

  it('pela rota, responde 201 sem cache, 400 com o campo, 403, 422 e 401 (RF30, RNF25)', async () => {
    const enviar = (quem: UsuarioAutenticado | null, texto: string) => {
      const pedido = request(app.getHttpServer()).post(
        `/prontuarios/${prontuarioId}/evolucoes/${evolucaoId}/complementos`,
      );
      if (quem) pedido.set('x-usuario-teste', JSON.stringify(quem));
      return pedido.send({ texto });
    };
    const criado = await enviar(pessoas.estagiarioA, ORIENTACAO).expect(201);
    expect(criado.body).toMatchObject({
      texto: ORIENTACAO,
      autor: 'Ana Beatriz Costa',
    });
    expect(criado.headers['cache-control']).toBe('no-store');
    const vazio = await enviar(pessoas.estagiarioA, ' ').expect(400);
    expect(vazio.body.message[0].path).toEqual(['texto']);
    await enviar(pessoas.supervisor, ORIENTACAO).expect(403);
    await enviar(null, ORIENTACAO).expect(401);
    await db.update(casos).set({ situacao: 'desligado_por_faltas' });
    const recusado = await enviar(pessoas.estagiarioA, ORIENTACAO).expect(422);
    expect(recusado.body.situacao).toBe('desligado_por_faltas');
  });
});
