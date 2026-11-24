import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PGlite } from '@electric-sql/pglite';
import { Global, Module, type INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
  versoesRelatorio,
  vinculosEstagiario,
  type Db,
} from '@clinica/database';
import type {
  ElaboracaoDoRelatorio,
  RelatorioFinalDoCiclo,
} from '@clinica/shared';
import { AuditoriaModule } from '../../auditoria/auditoria.module';
import { DB } from '../../database/database.module';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { cifrar, decifrar } from '../../common/criptografia';
import {
  CHAVE_TESTE,
  criarBancoDeTeste,
} from '../../test-utils/banco-de-teste';
import { AcompanhamentoClinicoModule } from './acompanhamento-clinico.module';

const SCRIPT_USUARIO_APP = readFileSync(
  join(
    __dirname,
    '../../../../../packages/database/sql/usuario-da-aplicacao.sql',
  ),
  'utf8',
);

const secoes = {
  finalidade: 'Devolutiva do acompanhamento psicológico à paciente.',
  demanda: 'Dificuldade em organizar a rotina de estudos.',
  procedimentos: 'Nove sessões semanais de 50 minutos.',
  analise: 'Evolução na organização da rotina.',
  conclusao: 'Alta com orientações de continuidade.',
};

describe('Relatório final: elaboração, envio e decisão (RF33)', () => {
  let db: Db;
  let cliente: PGlite;
  let app: INestApplication;
  let limpar: () => Promise<unknown>;
  let fechar: () => Promise<void>;
  let casoId: string;
  let prontuarioId: string;
  const pessoas: Record<string, UsuarioAutenticado> = {};

  const como = (quem: UsuarioAutenticado) => ({
    'x-usuario-teste': JSON.stringify(quem),
  });
  const http = () => request(app.getHttpServer());
  const base = () => `/casos/${casoId}/relatorio-final`;

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

  // Sessão realizada num dia de outubro ou novembro, com a evolução ou sem ela.
  const criarSessao = async (inicio: string, comEvolucao: boolean) => {
    const comeco = new Date(inicio);
    const [sessao] = await db
      .insert(sessoesAtendimento)
      .values({
        casoId,
        estagiarioId: pessoas.estagiario.id,
        cicloAtendimento: 1,
        inicio: comeco,
        termino: new Date(comeco.getTime() + 50 * 60_000),
        fimIntervaloAnotacoes: new Date(comeco.getTime() + 60 * 60_000),
        status: 'realizada',
        agendadaPor: pessoas.secretaria.id,
      })
      .returning();
    if (comEvolucao)
      await db.insert(evolucoes).values({
        prontuarioId,
        sessaoId: sessao.id,
        humorAparenciaCifrado: cifrar('Tranquila.', CHAVE_TESTE),
        conteudoTrabalhadoCifrado: cifrar('Rotina.', CHAVE_TESTE),
        tecnicasUtilizadasCifrado: cifrar('Escuta.', CHAVE_TESTE),
        planoProximaSessaoCifrado: cifrar('Seguir.', CHAVE_TESTE),
        registradaPor: pessoas.estagiario.id,
      });
    return sessao.id;
  };
  // Sessões semanais a partir de 08/10; a de número `semEvolucao` é a lacuna.
  const criarCiclo = async (quantas: number, semEvolucao?: number) => {
    const primeira = new Date('2026-10-08T13:00:00Z').getTime();
    for (let n = 1; n <= quantas; n++)
      await criarSessao(
        new Date(primeira + (n - 1) * 7 * 86_400_000).toISOString(),
        n !== semEvolucao,
      );
  };

  beforeEach(async () => {
    await limpar();
    const criar = async (
      chave: string,
      nome: string,
      perfil: UsuarioAutenticado['perfil'],
      crp?: string,
    ) => {
      const [u] = await db
        .insert(usuarios)
        .values({
          nome,
          email: `${chave}@fbr.edu.br`,
          perfil,
          situacao: 'ativo',
          crp: crp ?? null,
        })
        .returning();
      pessoas[chave] = { id: u.id, nome, perfil };
    };
    await criar('estagiario', 'Ana Beatriz Costa', 'estagiario');
    await criar('estagiarioOutroCaso', 'Paula Nunes', 'estagiario');
    await criar('supervisor', 'Ricardo Menezes', 'supervisor', '01/12345');
    await criar(
      'outroSupervisor',
      'Patrícia Nogueira',
      'supervisor',
      '01/54321',
    );
    await criar('secretaria', 'Juliana Rocha', 'secretaria');
    await criar('coordenacao', 'Helena Duarte', 'coordenacao');

    const [inscricao] = await db
      .insert(inscricoes)
      .values({
        numero: '2026-00398',
        nomeCompleto: 'Mariana Alves Toledo',
        dataNascimento: '1994-08-22',
        cpf: '11144477735',
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
        estagiarioId: pessoas.estagiario.id,
        vinculadoPor: pessoas.supervisor.id,
      })
      .returning();
    const [prontuario] = await db
      .insert(prontuarios)
      .values({ casoId, cicloAtendimento: 1, vinculoOrigemId: vinculo.id })
      .returning();
    prontuarioId = prontuario.id;
  });

  const acessosNegados = async (operacao: string) =>
    db
      .select()
      .from(acessosProntuario)
      .where(
        and(
          eq(acessosProntuario.operacao, operacao),
          eq(acessosProntuario.permitido, false),
        ),
      );

  const ler = async (quem = pessoas.estagiario) =>
    (await http().get(`${base()}/elaboracao`).set(como(quem)).expect(200))
      .body as ElaboracaoDoRelatorio;
  const salvar = (corpo: object = secoes, quem = pessoas.estagiario) =>
    http().put(`${base()}/rascunho`).set(como(quem)).send(corpo);
  const enviar = (corpo: object = secoes, quem = pessoas.estagiario) =>
    http().post(`${base()}/envio`).set(como(quem)).send(corpo);
  const decidir = (versao: number, corpo: object, quem = pessoas.supervisor) =>
    http()
      .post(`${base()}/versoes/${versao}/decisao`)
      .set(como(quem))
      .send(corpo);
  const versoes = () =>
    db.select().from(versoesRelatorio).orderBy(versoesRelatorio.versao);
  const camposDoErro = (corpo: { message: { path: string[] }[] }) =>
    corpo.message.map((p) => p.path[0]);

  describe('elaboração', () => {
    it('mostra as sessões numeradas, a identificação e a lacuna da sessão sem evolução, sem texto do sistema', async () => {
      await criarCiclo(9, 6);
      const e = await ler();
      expect(e).toMatchObject({
        paciente: 'Mariana Alves Toledo',
        solicitante: null,
        estagiario: 'Ana Beatriz Costa',
        supervisor: { nome: 'Ricardo Menezes', crp: '01/12345' },
        semEvolucoes: false,
        exigeJustificativa: false,
        versoes: [],
        acoes: { elaborar: true, decidir: false },
      });
      expect(e.sessoes).toHaveLength(9);
      expect(e.sessoes.filter((s) => !s.temEvolucao)).toMatchObject([
        { numero: 6, data: '2026-11-12' },
      ]);
    });

    it('o rascunho aceita seção em branco, fica cifrado e só o estagiário o lê', async () => {
      await criarCiclo(9);
      await salvar({ ...secoes, analise: '', conclusao: '  ' }).expect(200);
      await salvar({ ...secoes, analise: 'Segunda redação.' }).expect(200);
      const [linha, ...outras] = await versoes();
      expect(outras).toHaveLength(0);
      expect(linha).toMatchObject({ versao: 1, estado: 'rascunho' });
      expect(linha.secoesCifradas).not.toContain('redação');
      expect((await ler()).versoes[0].secoes.analise).toBe('Segunda redação.');
      for (const quem of [pessoas.supervisor, pessoas.coordenacao])
        expect((await ler(quem)).versoes).toEqual([]);
      // O texto não vai para a auditoria (RNF51).
      const registros = await db.select().from(auditoria);
      expect(JSON.stringify(registros)).not.toContain('redação');
    });

    it('seção acima do limite é recusada com o campo', async () => {
      await criarCiclo(9);
      const r = await salvar({ ...secoes, analise: 'x'.repeat(5001) }).expect(
        400,
      );
      expect(camposDoErro(r.body)).toEqual(['analise']);
      expect(await versoes()).toHaveLength(0);
    });

    it('o ciclo sem evoluções não gera relatório', async () => {
      await criarSessao('2026-10-08T13:00:00Z', false);
      const e = await ler();
      expect(e).toMatchObject({
        semEvolucoes: true,
        acoes: { elaborar: false },
      });
      for (const pedido of [
        salvar(),
        enviar({ ...secoes, justificativaExcecao: 'Desistência.' }),
      ]) {
        const r = await pedido.expect(422);
        expect(r.body.semEvolucoes).toBe(true);
      }
      expect(await versoes()).toHaveLength(0);
    });

    it('depois da transferência, o novo responsável continua o rascunho e passa a ser o autor (RF25)', async () => {
      await criarCiclo(9);
      await salvar().expect(200);
      await db
        .update(vinculosEstagiario)
        .set({ vigente: false, encerradoEm: new Date() })
        .where(eq(vinculosEstagiario.casoId, casoId));
      await db.insert(vinculosEstagiario).values({
        casoId,
        estagiarioId: pessoas.estagiarioOutroCaso.id,
        vinculadoPor: pessoas.supervisor.id,
      });
      await enviar().expect(403);
      await enviar(secoes, pessoas.estagiarioOutroCaso).expect(201);
      const [linha] = await versoes();
      expect(linha).toMatchObject({
        versao: 1,
        autorId: pessoas.estagiarioOutroCaso.id,
      });
      // Enviada, a autoria não muda.
      await expect(
        cliente.query('update versoes_relatorio set autor_id = $1', [
          pessoas.estagiario.id,
        ]),
      ).rejects.toThrow(/não muda/);
    });
  });

  describe('envio para revisão', () => {
    it('fixa a versão em revisão, com as sessões e as evoluções de origem, disponível ao supervisor', async () => {
      await criarCiclo(9, 6);
      const r = await enviar().expect(201);
      expect(r.body).toMatchObject({ versao: 1, estado: 'em_revisao' });
      expect(r.headers['cache-control']).toBe('no-store');
      const [linha] = await versoes();
      expect(linha.origem!.sessoes).toHaveLength(9);
      expect(linha.origem!.evolucoes).toHaveLength(8);
      const doSupervisor = await ler(pessoas.supervisor);
      expect(doSupervisor.acoes).toEqual({ elaborar: false, decidir: true });
      expect(doSupervisor.versoes[0]).toMatchObject({
        estado: 'em_revisao',
        autor: 'Ana Beatriz Costa',
        secoes,
      });
      // Em revisão, o estagiário não muda nem envia de novo.
      expect((await ler()).acoes.elaborar).toBe(false);
      await salvar().expect(409);
      await enviar().expect(409);
    });

    it('exige todas as seções, com os campos indicados, e não grava nada', async () => {
      await criarCiclo(9);
      const r = await enviar({ ...secoes, analise: ' ', conclusao: '' }).expect(
        400,
      );
      expect(camposDoErro(r.body)).toEqual(['analise', 'conclusao']);
      expect(await versoes()).toHaveLength(0);
    });

    it.each([7, 11])(
      'o ciclo de %i sessões exige a justificativa',
      async (quantas) => {
        await criarCiclo(quantas);
        expect((await ler()).exigeJustificativa).toBe(true);
        const r = await enviar().expect(400);
        expect(r.body.message).toEqual([
          {
            path: ['justificativaExcecao'],
            message: 'Informe a justificativa.',
          },
        ]);
        expect(await versoes()).toHaveLength(0);
        // O rascunho ainda não a exige.
        await salvar().expect(200);
        await enviar({
          ...secoes,
          justificativaExcecao: 'Mudança de cidade.',
        }).expect(201);
        const [linha] = await versoes();
        expect(decifrar(linha.justificativaExcecaoCifrada!, CHAVE_TESTE)).toBe(
          'Mudança de cidade.',
        );
        expect(
          (await ler(pessoas.supervisor)).versoes[0].justificativaExcecao,
        ).toBe('Mudança de cidade.');
      },
    );

    it.each([8, 10])(
      'o ciclo de %i sessões não exige a justificativa',
      async (quantas) => {
        await criarCiclo(quantas);
        expect((await ler()).exigeJustificativa).toBe(false);
        await enviar().expect(201);
      },
    );

    it('dois envios ao mesmo tempo geram uma versão só', async () => {
      await criarCiclo(9);
      const respostas = await Promise.all([enviar(), enviar()]);
      expect(respostas.map((r) => r.status).sort((a, b) => a - b)).toEqual([
        201, 409,
      ]);
      expect(await versoes()).toHaveLength(1);
    });
  });

  describe('decisão do supervisor', () => {
    beforeEach(async () => {
      await criarCiclo(9);
      await enviar().expect(201);
    });

    it('a devolução exige observações; com elas, a versão 1 fica guardada e a 2 é aprovada', async () => {
      const vazia = await decidir(1, {
        decisao: 'devolver',
        observacoes: ' ',
      }).expect(400);
      expect(camposDoErro(vazia.body)).toEqual(['observacoes']);
      expect((await versoes())[0].estado).toBe('em_revisao');

      const devolvida = await decidir(1, {
        decisao: 'devolver',
        observacoes: 'Detalhar a análise.',
      }).expect(201);
      expect(devolvida.body).toMatchObject({
        estado: 'devolvido',
        decisao: { por: 'Ricardo Menezes', observacoes: 'Detalhar a análise.' },
      });
      const doEstagiario = await ler();
      expect(doEstagiario.acoes.elaborar).toBe(true);
      expect(doEstagiario.versoes[0]).toMatchObject({
        estado: 'devolvido',
        observacoes: 'Detalhar a análise.',
      });

      await salvar({ ...secoes, analise: 'Análise detalhada.' }).expect(200);
      await enviar({ ...secoes, analise: 'Análise detalhada.' }).expect(201);
      const aprovada = await decidir(2, { decisao: 'aprovar' }).expect(201);
      expect(aprovada.body).toMatchObject({
        versao: 2,
        estado: 'aprovado',
        decisao: { por: 'Ricardo Menezes', observacoes: null },
      });

      const linhas = await versoes();
      expect(linhas.map((v) => [v.versao, v.estado])).toEqual([
        [1, 'devolvido'],
        [2, 'aprovado'],
      ]);
      expect(
        JSON.parse(decifrar(linhas[0].secoesCifradas, CHAVE_TESTE)),
      ).toEqual(secoes);
      // A lista da secretaria e a impressão passam a ter a aprovada.
      const secretaria = await http()
        .get(base())
        .set(como(pessoas.secretaria))
        .expect(200);
      expect((secretaria.body as RelatorioFinalDoCiclo).aprovada?.versao).toBe(
        2,
      );
      await http()
        .get(`${base()}/versoes/2/impressao`)
        .set(como(pessoas.secretaria))
        .expect(200);
      // A aprovada fica fixa, na API e no banco.
      await salvar().expect(409);
      await enviar().expect(409);
      await decidir(2, { decisao: 'devolver', observacoes: 'Não.' }).expect(
        409,
      );
      await expect(
        cliente.exec(
          "update versoes_relatorio set secoes_cifradas = 'x' where versao = 2",
        ),
      ).rejects.toThrow(/não pode ser alterada/);
      const operacoes = (await db.select().from(auditoria)).map(
        (a) => a.operacao,
      );
      expect(operacoes).toEqual(
        expect.arrayContaining([
          'enviar_relatorio_final',
          'devolver_relatorio_final',
          'salvar_rascunho_relatorio_final',
          'aprovar_relatorio_final',
        ]),
      );
    });

    it('aprovar com observações é recusado, para o texto não se perder', async () => {
      const r = await decidir(1, {
        decisao: 'aprovar',
        observacoes: 'Ajustar depois.',
      }).expect(400);
      expect(camposDoErro(r.body)).toEqual(['observacoes']);
      await decidir(1, { decisao: 'publicar' }).expect(400);
      expect((await versoes())[0].estado).toBe('em_revisao');
    });

    it('a versão inexistente ou já decidida não recebe outra decisão', async () => {
      await decidir(9, { decisao: 'aprovar' }).expect(409);
      const respostas = await Promise.all([
        decidir(1, { decisao: 'aprovar' }),
        decidir(1, { decisao: 'devolver', observacoes: 'Ajustar.' }),
      ]);
      expect(respostas.map((r) => r.status).sort((a, b) => a - b)).toEqual([
        201, 409,
      ]);
    });

    it('com o usuário da aplicação, o fluxo funciona sem permissões a mais', async () => {
      await cliente.exec('set role clinica_app');
      try {
        await decidir(1, {
          decisao: 'devolver',
          observacoes: 'Ajustar.',
        }).expect(201);
        await salvar().expect(200);
        await enviar().expect(201);
        await decidir(2, { decisao: 'aprovar' }).expect(201);
      } finally {
        await cliente.exec('reset role');
      }
    });
  });

  it('os perfis sem a operação recebem 403, igual para caso inexistente, e a tentativa fica registrada (RF55, RNF25, RNF52)', async () => {
    await criarCiclo(9);
    const semElaborar = [
      pessoas.supervisor,
      pessoas.coordenacao,
      pessoas.secretaria,
      pessoas.estagiarioOutroCaso,
    ];
    for (const quem of semElaborar) {
      await salvar(secoes, quem).expect(403);
      // Nem o corpo inválido muda a resposta.
      await enviar({}, quem).expect(403);
    }
    expect(
      await acessosNegados('salvar_rascunho_relatorio_final'),
    ).toHaveLength(4);
    expect(await acessosNegados('enviar_relatorio_final')).toHaveLength(4);

    await enviar().expect(201);
    const semDecidir = [
      pessoas.estagiario,
      pessoas.outroSupervisor,
      pessoas.coordenacao,
      pessoas.secretaria,
    ];
    for (const quem of semDecidir)
      await decidir(1, { decisao: 'aprovar' }, quem).expect(403);
    expect(await acessosNegados('decidir_relatorio_final')).toHaveLength(4);
    expect((await versoes())[0].estado).toBe('em_revisao');

    const semLer = [
      pessoas.secretaria,
      pessoas.outroSupervisor,
      pessoas.estagiarioOutroCaso,
    ];
    for (const quem of semLer)
      await http().get(`${base()}/elaboracao`).set(como(quem)).expect(403);
    await http()
      .get(
        '/casos/00000000-0000-4000-8000-000000000000/relatorio-final/elaboracao',
      )
      .set(como(pessoas.coordenacao))
      .expect(403);
    await http().get(`${base()}/elaboracao`).expect(401);
    // A coordenação lê a versão enviada, sem ações.
    const daCoordenacao = await ler(pessoas.coordenacao);
    expect(daCoordenacao.versoes).toHaveLength(1);
    expect(daCoordenacao.acoes).toEqual({ elaborar: false, decidir: false });
  });
});
