import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PGlite } from '@electric-sql/pglite';
import { Global, Module, type INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { and, eq, sql } from 'drizzle-orm';
import {
  acessosProntuario,
  atribuicoesSupervisor,
  auditoria,
  casos,
  entregasRelatorio,
  impressoesRelatorio,
  inscricoes,
  prontuarios,
  relatoriosFinais,
  sessoesAtendimento,
  usuarios,
  versoesRelatorio,
  vinculosEstagiario,
  type Db,
} from '@clinica/database';
import type {
  RelatorioFinalDoCiclo,
  RelatorioParaImpressao,
} from '@clinica/shared';
import { AuditoriaModule } from '../../auditoria/auditoria.module';
import { DB } from '../../database/database.module';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { cifrar } from '../../common/criptografia';
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

describe('Relatório final: consulta, impressão e entrega (RF33)', () => {
  let db: Db;
  let cliente: PGlite;
  let app: INestApplication;
  let limpar: () => Promise<unknown>;
  let fechar: () => Promise<void>;
  let casoId: string;
  let prontuarioId: string;
  let relatorioId: string;
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

  // Versão do relatório já no estado final, como o envio e a decisão a deixam.
  const inserirVersao = async (
    versao: number,
    estado: 'rascunho' | 'em_revisao' | 'devolvido' | 'aprovado',
    decididaEm = new Date('2026-11-18T21:40:00Z'),
  ) => {
    const enviada = estado !== 'rascunho';
    const decidida = estado === 'aprovado' || estado === 'devolvido';
    const [linha] = await db
      .insert(versoesRelatorio)
      .values({
        relatorioId,
        versao,
        estado,
        secoesCifradas: cifrar(JSON.stringify(secoes), CHAVE_TESTE),
        autorId: pessoas.estagiario.id,
        enviadaEm: enviada ? new Date('2026-11-14T13:14:00Z') : null,
        origem: enviada ? { sessoes: [], evolucoes: [] } : null,
        decididaPor: decidida ? pessoas.supervisor.id : null,
        decididaEm: decidida ? decididaEm : null,
        observacoesCifradas:
          estado === 'devolvido'
            ? cifrar('Detalhar a análise.', CHAVE_TESTE)
            : null,
      })
      .returning();
    return linha;
  };

  beforeEach(async () => {
    await limpar();
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
    await criar('estagiario', 'Ana Beatriz Costa', 'estagiario');
    await criar('estagiarioOutroCaso', 'Paula Nunes', 'estagiario');
    await criar('supervisor', 'Ricardo Menezes', 'supervisor');
    await criar('outroSupervisor', 'Patrícia Nogueira', 'supervisor');
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
    // Primeira sessão realizada às 22h de 08/10 em Brasília: 01h de 09/10 em UTC.
    for (const inicio of ['2026-10-09T01:00:00Z', '2026-10-15T13:00:00Z']) {
      const comeco = new Date(inicio);
      await db.insert(sessoesAtendimento).values({
        casoId,
        estagiarioId: pessoas.estagiario.id,
        cicloAtendimento: 1,
        inicio: comeco,
        termino: new Date(comeco.getTime() + 50 * 60_000),
        fimIntervaloAnotacoes: new Date(comeco.getTime() + 60 * 60_000),
        status: 'realizada',
        agendadaPor: pessoas.secretaria.id,
      });
    }
    const [relatorio] = await db
      .insert(relatoriosFinais)
      .values({ prontuarioId })
      .returning();
    relatorioId = relatorio.id;
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

  describe('consulta das versões', () => {
    it('estagiário, supervisor e coordenação veem todas as versões; a secretaria, só a aprovada, sem observações', async () => {
      await inserirVersao(1, 'devolvido', new Date('2026-11-15T18:00:00Z'));
      await inserirVersao(2, 'aprovado');

      const coordenacao = await http()
        .get(base())
        .set(como(pessoas.coordenacao))
        .expect(200);
      const corpo = coordenacao.body as RelatorioFinalDoCiclo;
      expect(corpo.versoes.map((v) => [v.versao, v.estado])).toEqual([
        [2, 'aprovado'],
        [1, 'devolvido'],
      ]);
      expect(corpo.versoes[1].decisao).toEqual({
        por: 'Ricardo Menezes',
        em: '2026-11-15T18:00:00.000Z',
        observacoes: 'Detalhar a análise.',
      });
      expect(corpo.aprovada).toEqual({
        versao: 2,
        aprovadaPor: 'Ricardo Menezes',
        aprovadaEm: '2026-11-18T21:40:00.000Z',
      });

      for (const quem of [pessoas.estagiario, pessoas.supervisor]) {
        const resposta = await http().get(base()).set(como(quem)).expect(200);
        expect((resposta.body as RelatorioFinalDoCiclo).versoes).toHaveLength(
          2,
        );
      }

      const secretaria = await http()
        .get(base())
        .set(como(pessoas.secretaria))
        .expect(200);
      const daSecretaria = secretaria.body as RelatorioFinalDoCiclo;
      expect(daSecretaria.versoes).toHaveLength(1);
      expect(daSecretaria.versoes[0].versao).toBe(2);
      expect(daSecretaria.versoes[0].decisao?.observacoes).toBeNull();
      expect(JSON.stringify(daSecretaria)).not.toContain('Detalhar');
    });

    it('para a secretaria, o relatório ainda em revisão não mostra versão', async () => {
      await inserirVersao(1, 'em_revisao');
      const resposta = await http()
        .get(base())
        .set(como(pessoas.secretaria))
        .expect(200);
      expect(resposta.body).toMatchObject({ versoes: [], aprovada: null });
    });

    it('o estagiário de outro caso é negado, e a tentativa fica no registro de acessos (RF55, RNF52)', async () => {
      await inserirVersao(1, 'aprovado');
      await http()
        .get(base())
        .set(como(pessoas.estagiarioOutroCaso))
        .expect(403);
      await http().get(base()).set(como(pessoas.outroSupervisor)).expect(403);
      expect(await acessosNegados('consultar_relatorio_final')).toHaveLength(2);
    });

    it('caso sem relatório no ciclo: resposta vazia para quem tem acesso', async () => {
      await db.execute(sql`DELETE FROM relatorios_finais`);
      const resposta = await http()
        .get(base())
        .set(como(pessoas.estagiario))
        .expect(200);
      expect(resposta.body).toEqual({});
    });

    it('caso sem prontuário no ciclo pedido: vazio para a secretaria e negado ao estagiário', async () => {
      await http()
        .get(`${base()}?ciclo=2`)
        .set(como(pessoas.secretaria))
        .expect(200)
        .expect((r) => expect(r.body).toEqual({}));
      // O caso inexistente tem a mesma resposta, e as duas consultas ficam no
      // registro de acessos, sem prontuário (RNF25, RNF52).
      await http()
        .get('/casos/00000000-0000-4000-8000-000000000000/relatorio-final')
        .set(como(pessoas.secretaria))
        .expect(200)
        .expect((r) => expect(r.body).toEqual({}));
      const registros = await db
        .select()
        .from(acessosProntuario)
        .where(eq(acessosProntuario.operacao, 'consultar_relatorio_final'));
      expect(registros).toHaveLength(2);
      expect(
        registros.every((r) => r.prontuarioId === null && r.permitido),
      ).toBe(true);
      await http()
        .get(`${base()}?ciclo=2`)
        .set(como(pessoas.estagiario))
        .expect(403);
    });
  });

  describe('versão para impressão', () => {
    it('devolve a versão aprovada com a identificação, o supervisor sem o CRP (vem no carimbo, DF71) e o início do acompanhamento', async () => {
      await inserirVersao(1, 'aprovado');
      const resposta = await http()
        .get(`${base()}/versoes/1/impressao`)
        .set(como(pessoas.secretaria))
        .expect(200);
      const corpo = resposta.body as RelatorioParaImpressao;
      expect(corpo).toMatchObject({
        versao: 1,
        ciclo: 1,
        paciente: 'Mariana Alves Toledo',
        solicitante: null,
        estagiario: 'Ana Beatriz Costa',
        supervisor: { nome: 'Ricardo Menezes' },
        inicioAcompanhamento: '2026-10-08',
        secoes,
        aprovadaEm: '2026-11-18T21:40:00.000Z',
      });
    });

    it('versão em revisão, devolvida ou inexistente não abre para impressão', async () => {
      await inserirVersao(1, 'devolvido');
      await inserirVersao(2, 'em_revisao');
      for (const versao of [1, 2, 3])
        await http()
          .get(`${base()}/versoes/${versao}/impressao`)
          .set(como(pessoas.secretaria))
          .expect(403);
      expect(
        await acessosNegados('abrir_impressao_relatorio_final'),
      ).toHaveLength(3);
    });

    it('a coordenação consulta as versões, mas não imprime', async () => {
      await inserirVersao(1, 'aprovado');
      await http()
        .get(`${base()}/versoes/1/impressao`)
        .set(como(pessoas.coordenacao))
        .expect(403);
      await http()
        .post(`${base()}/versoes/1/impressoes`)
        .set(como(pessoas.coordenacao))
        .expect(403);
    });

    it('registra quem imprimiu e quando, na consulta e na auditoria', async () => {
      await inserirVersao(1, 'aprovado');
      const resposta = await http()
        .post(`${base()}/versoes/1/impressoes`)
        .set(como(pessoas.secretaria))
        .expect(201);
      expect(resposta.body.por).toBe('Juliana Rocha');

      const consulta = await http()
        .get(base())
        .set(como(pessoas.secretaria))
        .expect(200);
      expect((consulta.body as RelatorioFinalDoCiclo).impressoes).toEqual([
        { por: 'Juliana Rocha', em: resposta.body.em },
      ]);
      const [evento] = await db
        .select()
        .from(auditoria)
        .where(eq(auditoria.operacao, 'imprimir_relatorio_final'));
      expect(evento.usuarioId).toBe(pessoas.secretaria.id);
    });
  });

  describe('entrega pela secretaria', () => {
    const entrega = (dados: Record<string, unknown> = {}) => ({
      viaAssinada: true,
      entregueA: 'paciente',
      entregueEm: '2026-11-20',
      ...dados,
    });
    const imprimir = () =>
      http()
        .post(`${base()}/versoes/1/impressoes`)
        .set(como(pessoas.secretaria))
        .expect(201);

    it('registra a entrega da versão aprovada e impressa, uma vez', async () => {
      await inserirVersao(1, 'aprovado');
      await imprimir();
      const resposta = await http()
        .post(`${base()}/entrega`)
        .set(como(pessoas.secretaria))
        .send(entrega())
        .expect(201);
      expect(resposta.body).toMatchObject({
        versao: 1,
        entregueA: 'paciente',
        entregueEm: '2026-11-20',
        registradaPor: 'Juliana Rocha',
      });
      const consulta = await http()
        .get(base())
        .set(como(pessoas.secretaria))
        .expect(200);
      expect((consulta.body as RelatorioFinalDoCiclo).entrega?.entregueEm).toBe(
        '2026-11-20',
      );

      await http()
        .post(`${base()}/entrega`)
        .set(como(pessoas.secretaria))
        .send(entrega())
        .expect(409);
      expect(await db.select().from(entregasRelatorio)).toHaveLength(1);
      const [evento] = await db
        .select()
        .from(auditoria)
        .where(eq(auditoria.operacao, 'registrar_entrega_relatorio_final'));
      expect(evento.dadosNovos).toMatchObject({ viaAssinada: true });
    });

    it('sem a confirmação da via assinada, a entrega não é registrada', async () => {
      await inserirVersao(1, 'aprovado');
      await imprimir();
      const resposta = await http()
        .post(`${base()}/entrega`)
        .set(como(pessoas.secretaria))
        .send(entrega({ viaAssinada: false }))
        .expect(400);
      expect(JSON.stringify(resposta.body)).toContain('via impressa');
      expect(await db.select().from(entregasRelatorio)).toHaveLength(0);
    });

    it('recusa a entrega antes da impressão, com data futura, anterior à aprovação ou ao responsável inexistente', async () => {
      await inserirVersao(1, 'aprovado');
      await http()
        .post(`${base()}/entrega`)
        .set(como(pessoas.secretaria))
        .send(entrega())
        .expect(409);
      await imprimir();
      await http()
        .post(`${base()}/entrega`)
        .set(como(pessoas.secretaria))
        .send(entrega({ entregueEm: '2999-01-01' }))
        .expect(400);
      await http()
        .post(`${base()}/entrega`)
        .set(como(pessoas.secretaria))
        .send(entrega({ entregueEm: '2026-11-17' }))
        .expect(400);
      await http()
        .post(`${base()}/entrega`)
        .set(como(pessoas.secretaria))
        .send(entrega({ entregueA: 'responsavel_legal' }))
        .expect(400);
      expect(await db.select().from(entregasRelatorio)).toHaveLength(0);
    });

    it('relatório sem aprovação não é entregue, e só a secretaria registra a entrega', async () => {
      await inserirVersao(1, 'em_revisao');
      await http()
        .post(`${base()}/entrega`)
        .set(como(pessoas.secretaria))
        .send(entrega())
        .expect(403);
      expect(
        await acessosNegados('registrar_entrega_relatorio_final'),
      ).toHaveLength(1);
    });

    it('estagiário, supervisor e coordenação não registram a entrega', async () => {
      await inserirVersao(1, 'aprovado');
      await imprimir();
      for (const quem of [
        pessoas.estagiario,
        pessoas.supervisor,
        pessoas.coordenacao,
      ])
        await http()
          .post(`${base()}/entrega`)
          .set(como(quem))
          .send(entrega())
          .expect(403);
    });
  });

  describe('regras no banco', () => {
    it('a versão aprovada não muda nem é apagada', async () => {
      const aprovada = await inserirVersao(1, 'aprovado');
      await expect(
        db
          .update(versoesRelatorio)
          .set({ secoesCifradas: cifrar('{}', CHAVE_TESTE) })
          .where(eq(versoesRelatorio.id, aprovada.id)),
      ).rejects.toThrow();
      await expect(
        db.delete(versoesRelatorio).where(eq(versoesRelatorio.id, aprovada.id)),
      ).rejects.toThrow();
    });

    it('a versão em revisão só recebe a decisão, sem mudar o texto', async () => {
      const emRevisao = await inserirVersao(1, 'em_revisao');
      await expect(
        db
          .update(versoesRelatorio)
          .set({ secoesCifradas: cifrar('{}', CHAVE_TESTE) })
          .where(eq(versoesRelatorio.id, emRevisao.id)),
      ).rejects.toThrow();
      await db
        .update(versoesRelatorio)
        .set({
          estado: 'aprovado',
          decididaPor: pessoas.supervisor.id,
          decididaEm: new Date(),
        })
        .where(eq(versoesRelatorio.id, emRevisao.id));
    });

    it('o rascunho não vai direto para aprovado, e só há uma versão aberta', async () => {
      const rascunho = await inserirVersao(1, 'rascunho');
      await expect(
        db
          .update(versoesRelatorio)
          .set({
            estado: 'aprovado',
            decididaPor: pessoas.supervisor.id,
            decididaEm: new Date(),
            enviadaEm: new Date(),
            origem: { sessoes: [], evolucoes: [] },
          })
          .where(eq(versoesRelatorio.id, rascunho.id)),
      ).rejects.toThrow();
      await expect(inserirVersao(2, 'em_revisao')).rejects.toThrow();
    });

    it('impressão e entrega só da versão aprovada, e a entrega exige a via assinada', async () => {
      const emRevisao = await inserirVersao(1, 'em_revisao');
      await expect(
        db.insert(impressoesRelatorio).values({
          versaoId: emRevisao.id,
          impressaPor: pessoas.secretaria.id,
        }),
      ).rejects.toThrow();
      const [aprovada] = await db
        .update(versoesRelatorio)
        .set({
          estado: 'aprovado',
          decididaPor: pessoas.supervisor.id,
          decididaEm: new Date(),
        })
        .where(eq(versoesRelatorio.id, emRevisao.id))
        .returning();
      await expect(
        db.insert(entregasRelatorio).values({
          versaoId: aprovada.id,
          viaAssinada: false,
          entregueA: 'paciente',
          entregueEm: '2026-11-20',
          registradaPor: pessoas.secretaria.id,
        }),
      ).rejects.toThrow();
    });
  });
});
