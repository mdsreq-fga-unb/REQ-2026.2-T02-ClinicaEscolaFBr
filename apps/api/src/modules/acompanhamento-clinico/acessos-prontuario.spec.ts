import { INestApplication } from '@nestjs/common';
import type { PGlite } from '@electric-sql/pglite';
import { Test } from '@nestjs/testing';
import {
  acessosProntuario,
  auditoria,
  casos,
  inscricoes,
  prontuarios,
  usuarios,
  vinculosEstagiario,
  type Db,
} from '@clinica/database';
import { PERFIS, periodoInicialAcessos, type Perfil } from '@clinica/shared';
import { eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { DB } from '../../database/database.module';
import { criarBancoDeTeste } from '../../test-utils/banco-de-teste';
import { AcessosProntuarioController } from './acessos-prontuario.controller';
import {
  AcessosProntuarioService,
  OPERACOES_PRONTUARIO,
  tipoDeAcesso,
} from './acessos-prontuario.service';
import { PoliticaProntuario } from './politica-prontuario';

describe('Consultar registro de acessos (RF56)', () => {
  let app: INestApplication;
  let db: Db;
  let banco: Awaited<ReturnType<typeof criarBancoDeTeste>>;
  const pessoas = {} as Record<Perfil, UsuarioAutenticado>;
  let pacienteId: string;
  let prontuarioId: string;
  let outroProntuarioId: string;

  beforeAll(async () => {
    banco = await criarBancoDeTeste();
    db = banco.db;
    const modulo = await Test.createTestingModule({
      controllers: [AcessosProntuarioController],
      providers: [
        { provide: DB, useValue: db },
        AuditoriaService,
        AcessosProntuarioService,
      ],
    }).compile();
    app = modulo.createNestApplication();
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
    await banco.fechar();
  });
  beforeEach(async () => {
    await banco.limpar();
    for (const perfil of PERFIS) {
      const [u] = await db
        .insert(usuarios)
        .values({
          nome: `Pessoa ${perfil}`,
          email: `${perfil}@example.com`,
          perfil,
          situacao: 'ativo',
        })
        .returning();
      pessoas[perfil] = { id: u.id, nome: u.nome, perfil };
    }
    const criarPaciente = async (numero: string, nome: string) => {
      const [i] = await db
        .insert(inscricoes)
        .values({
          numero,
          nomeCompleto: nome,
          dataNascimento: '1990-01-01',
          cpf: '52998224725',
          rg: '123',
          endereco: 'Rua fictícia',
          estadoCivil: 'Solteiro(a)',
          canalPreferencial: 'email',
          email: `${numero}@example.com`,
          queixaCifrada: 'CIFRADO_QUEIXA_SECRETA',
        })
        .returning();
      const [c] = await db
        .insert(casos)
        .values({ inscricaoId: i.id, entradaNaFilaEm: i.criadaEm })
        .returning();
      const [v] = await db
        .insert(vinculosEstagiario)
        .values({
          casoId: c.id,
          estagiarioId: pessoas.estagiario.id,
          vinculadoPor: pessoas.coordenacao.id,
        })
        .returning();
      const [p] = await db
        .insert(prontuarios)
        .values({
          casoId: c.id,
          cicloAtendimento: 1,
          vinculoOrigemId: v.id,
          anamneseCifrada: 'CIFRADO_ANAMNESE_SECRETA',
        })
        .returning();
      return { paciente: i.id, prontuario: p.id };
    };
    const primeiro = await criarPaciente('2026-00001', 'Ana Fictícia');
    pacienteId = primeiro.paciente;
    prontuarioId = primeiro.prontuario;
    outroProntuarioId = (await criarPaciente('2026-00002', 'Bia Fictícia'))
      .prontuario;
  });
  const http = () => request(app.getHttpServer());
  const como = (perfil: Perfil = 'coordenacao') => ({
    'x-usuario-teste': JSON.stringify(pessoas[perfil]),
  });
  const evento = async (
    dados: Partial<typeof acessosProntuario.$inferInsert> = {},
  ) => {
    const [linha] = await db
      .insert(acessosProntuario)
      .values({
        prontuarioId,
        usuarioId: pessoas.estagiario.id,
        perfil: 'estagiario',
        operacao: 'consultar_prontuario',
        permitido: true,
        criadoEm: new Date('2026-11-14T13:00:00Z'),
        ...dados,
      })
      .returning();
    return linha;
  };

  it('registra e consulta acessos permitidos e negados da política RF55, inclusive sem paciente (RNF52)', async () => {
    const politica = new PoliticaProntuario(db);
    await politica.exigirAcesso(
      pessoas.coordenacao,
      prontuarioId,
      'consultar_prontuario',
      'leitura',
    );
    await politica.exigirAcesso(
      pessoas.estagiario,
      prontuarioId,
      'registrar_anamnese',
      'registro_estagiario',
    );
    await politica.exigirAcesso(
      pessoas.estagiario,
      prontuarioId,
      'marcar_sessao_realizada',
      'registro_estagiario',
    );
    await expect(
      politica.exigirAcesso(
        pessoas.secretaria,
        prontuarioId,
        'consultar_prontuario',
        'leitura',
      ),
    ).rejects.toThrow();
    await expect(
      politica.exigirAcesso(
        pessoas.secretaria,
        randomUUID(),
        'consultar_prontuario',
        'leitura',
      ),
    ).rejects.toThrow();
    const { body, headers } = await http()
      .get('/acessos-prontuario')
      .set(como())
      .expect(200);
    expect(headers['cache-control']).toBe('no-store');
    expect(body.total).toBe(5);
    expect(
      body.acessos.map((a: { operacao: string }) => a.operacao).sort(),
    ).toEqual([
      'acesso_negado',
      'acesso_negado',
      'alteracao',
      'criacao',
      'visualizacao',
    ]);
    expect(body.acessos).toContainEqual(
      expect.objectContaining({ paciente: null, operacao: 'acesso_negado' }),
    );
    expect(body.acessos).toContainEqual(
      expect.objectContaining({
        usuario: pessoas.coordenacao.nome,
        perfil: 'coordenacao',
        operacao: 'visualizacao',
      }),
    );
  });
  it.each(Object.entries(OPERACOES_PRONTUARIO))(
    'classifica a operação %s como %s, inclusive registros legados',
    async (operacao, tipo) => {
      await evento({ operacao });
      const { body } = await http()
        .get('/acessos-prontuario')
        .set(como())
        .expect(200);
      expect(body.acessos[0].operacao).toBe(tipo);
    },
  );
  it('exige classificação para cada nome usado pela política, sem confundir com a auditoria geral', () => {
    const fontes: string[] = [];
    const visitar = (pasta: string) => {
      for (const f of readdirSync(pasta, { withFileTypes: true })) {
        const caminho = join(pasta, f.name);
        if (f.isDirectory()) visitar(caminho);
        else if (f.name.endsWith('.ts') && !f.name.endsWith('.spec.ts'))
          fontes.push(readFileSync(caminho, 'utf8'));
      }
    };
    visitar(join(__dirname, '..'));
    const nomes = fontes.flatMap((fonte) =>
      [
        ...fonte.matchAll(/\.exigirAcesso\(\s*[^,]+,\s*[^,]+,\s*'([^']+)'/g),
      ].map((m) => m[1]),
    );
    expect(nomes.length).toBeGreaterThanOrEqual(5);
    for (const nome of nomes) expect(OPERACOES_PRONTUARIO).toHaveProperty(nome);
    expect(() => tipoDeAcesso('operacao_nova', true)).toThrow();
    expect(tipoDeAcesso('operacao_nova', false)).toBe('acesso_negado');
  });
  it('retorna somente os metadados previstos, sem texto clínico nem identificadores/cadastro extras (RNF17)', async () => {
    await evento();
    const { body } = await http()
      .get('/acessos-prontuario')
      .set(como())
      .expect(200);
    expect(Object.keys(body.acessos[0]).sort()).toEqual(
      ['id', 'dataHora', 'usuario', 'perfil', 'paciente', 'operacao'].sort(),
    );
    expect(JSON.stringify(body)).not.toMatch(
      /SECRETA|52998224725|example.com|anamnese|queixa/,
    );
  });
  it('filtra por IDs de paciente/usuário e por partes literais dos nomes, isolados e combinados', async () => {
    const a = await evento();
    await evento({
      prontuarioId: outroProntuarioId,
      usuarioId: pessoas.coordenacao.id,
      perfil: 'coordenacao',
    });
    for (const filtro of [
      { pacienteId },
      { usuarioId: pessoas.estagiario.id },
      { paciente: 'ana' },
      { usuario: 'ESTAGIARIO' },
      {
        pacienteId,
        usuarioId: pessoas.estagiario.id,
        paciente: 'fictícia',
        inicio: '2026-11-14',
        fim: '2026-11-14',
      },
    ]) {
      const { body } = await http()
        .get('/acessos-prontuario')
        .query(filtro)
        .set(como())
        .expect(200);
      expect(body.acessos.map((r: { id: string }) => r.id)).toEqual([a.id]);
    }
    for (const filtro of [
      { paciente: '%' },
      { usuario: '_' },
      { pacienteId: randomUUID() },
      { paciente: "' OR 1=1 --" },
    ]) {
      const { body } = await http()
        .get('/acessos-prontuario')
        .query(filtro)
        .set(como())
        .expect(200);
      expect(body.total).toBe(0);
    }
  });
  it('inclui tentativas sem paciente somente sem filtro de paciente, mantendo total e demais filtros', async () => {
    const identificado = await evento({ permitido: false });
    const semPaciente = await evento({ prontuarioId: null, permitido: false });
    for (const filtro of [
      {},
      { paciente: '   ' },
      {
        usuarioId: pessoas.estagiario.id,
        inicio: '2026-11-14',
        fim: '2026-11-14',
      },
    ]) {
      const { body } = await http()
        .get('/acessos-prontuario')
        .query(filtro)
        .set(como())
        .expect(200);
      expect(body.total).toBe(2);
      expect(body.acessos).toContainEqual(
        expect.objectContaining({
          id: semPaciente.id,
          paciente: null,
          operacao: 'acesso_negado',
        }),
      );
    }
    for (const filtro of [{ pacienteId }, { paciente: 'Ana' }]) {
      const { body } = await http()
        .get('/acessos-prontuario')
        .query(filtro)
        .set(como())
        .expect(200);
      expect(body.total).toBe(1);
      expect(body.acessos.map((a: { id: string }) => a.id)).toEqual([
        identificado.id,
      ]);
    }
    const { body } = await http()
      .get('/acessos-prontuario')
      .query({ paciente: 'Inexistente' })
      .set(como())
      .expect(200);
    expect(body).toMatchObject({ total: 0, acessos: [] });
  });
  it('inclui o dia inteiro em Brasília e exclui os instantes fora dos limites', async () => {
    await evento({ criadoEm: new Date('2026-11-14T02:59:59.999Z') });
    const inicio = await evento({ criadoEm: new Date('2026-11-14T03:00:00Z') });
    const fim = await evento({
      criadoEm: new Date('2026-11-15T02:59:59.999Z'),
    });
    await evento({ criadoEm: new Date('2026-11-15T03:00:00Z') });
    const { body } = await http()
      .get('/acessos-prontuario')
      .query({ inicio: '2026-11-14', fim: '2026-11-14' })
      .set(como())
      .expect(200);
    expect(body.acessos.map((r: { id: string }) => r.id)).toEqual([
      fim.id,
      inicio.id,
    ]);
    expect(periodoInicialAcessos(new Date('2026-03-01T02:00:00Z'))).toEqual({
      inicio: '2026-01-30',
      fim: '2026-02-28',
    });
  });
  it('pagina 50 por vez, do mais recente ao antigo, com desempate estável', async () => {
    await db.insert(acessosProntuario).values(
      Array.from({ length: 51 }, () => ({
        prontuarioId,
        usuarioId: pessoas.estagiario.id,
        perfil: 'estagiario' as const,
        operacao: 'consultar_prontuario',
        permitido: true,
        criadoEm: new Date('2026-11-14T13:00:00Z'),
      })),
    );
    const a = (await http().get('/acessos-prontuario').set(como()).expect(200))
      .body;
    const b = (
      await http().get('/acessos-prontuario?pagina=2').set(como()).expect(200)
    ).body;
    expect(a.acessos).toHaveLength(50);
    expect(b.acessos).toHaveLength(1);
    expect(a.total).toBe(51);
    expect(b.total).toBe(51);
    const ids = [...a.acessos, ...b.acessos].map((r: { id: string }) => r.id);
    expect(new Set(ids).size).toBe(51);
    expect(ids).toEqual([...ids].sort().reverse());
  });
  it('preserva o perfil do momento do acesso, mesmo após alteração ou desativação do usuário', async () => {
    await evento();
    await db
      .update(usuarios)
      .set({ perfil: 'supervisor', situacao: 'desativado' })
      .where(eq(usuarios.id, pessoas.estagiario.id));
    const { body } = await http()
      .get('/acessos-prontuario')
      .set(como())
      .expect(200);
    expect(body.acessos[0].perfil).toBe('estagiario');
  });
  it('audita a consulta sem criar acesso recursivo, sem gravar nomes pesquisados (RNF10)', async () => {
    await evento();
    await http()
      .get('/acessos-prontuario?paciente=Ana')
      .set(como())
      .expect(200);
    expect(await db.select().from(acessosProntuario)).toHaveLength(1);
    const [registro] = await db.select().from(auditoria);
    expect(registro).toMatchObject({
      usuarioId: pessoas.coordenacao.id,
      operacao: 'consultar_registro_acessos',
      entidade: 'acessos_prontuario',
      dadosNovos: { pagina: 1, total: 1 },
    });
  });
  it.each([
    'inicio=2026-02-30',
    'fim=texto',
    'inicio=2026-11-15&fim=2026-11-14',
    'pacienteId=invalido',
    'usuarioId=invalido',
    'pagina=0',
    'pagina=-1',
    'pagina=1.5',
    'pagina=100001',
    'pagina=abc',
    'inicio=2026-11-14&inicio=2026-11-15',
  ])('recusa filtro inválido: %s', async (query) => {
    const { body } = await http()
      .get(`/acessos-prontuario?${query}`)
      .set(como())
      .expect(400);
    expect(body.message[0].path).toHaveLength(1);
  });
  it('recusa visitante sem sessão', async () => {
    await http().get('/acessos-prontuario').expect(401);
  });
  it.each(['secretaria', 'estagiario', 'supervisor'] as const)(
    'recusa consulta pelo perfil %s sem expor registros (RNF17)',
    async (perfil) => {
      await evento();
      const { body } = await http()
        .get('/acessos-prontuario')
        .set(como(perfil))
        .expect(403);
      expect(JSON.stringify(body)).not.toContain('Fictícia');
    },
  );
  it.each(PERFIS)(
    'não permite alterar ou apagar acessos pela API, perfil %s (RNF52)',
    async (perfil) => {
      const r = await evento();
      for (const method of ['patch', 'put', 'delete'] as const) {
        await http()
          [method](`/acessos-prontuario/${r.id}`)
          .set(como(perfil))
          .send({ permitido: false })
          .expect(404);
      }
      expect(await db.select().from(acessosProntuario)).toEqual([r]);
    },
  );
  it('mantém imutabilidade e permissões de somente inserção/consulta no banco (RNF52)', async () => {
    await evento();
    await expect(
      db.update(acessosProntuario).set({ permitido: false }),
    ).rejects.toThrow();
    await expect(db.delete(acessosProntuario)).rejects.toThrow();
    await (db as unknown as { $client: PGlite }).$client.exec(
      readFileSync(
        join(
          __dirname,
          '../../../../../packages/database/sql/usuario-da-aplicacao.sql',
        ),
        'utf8',
      ),
    );
    const permissao = await db.execute(
      sql`select has_table_privilege('clinica_app','acessos_prontuario','SELECT') as ler, has_table_privilege('clinica_app','acessos_prontuario','INSERT') as inserir, has_table_privilege('clinica_app','acessos_prontuario','UPDATE') as alterar, has_table_privilege('clinica_app','acessos_prontuario','DELETE') as apagar, has_table_privilege('clinica_app','acessos_prontuario','TRUNCATE') as esvaziar`,
    );
    expect(permissao.rows[0]).toEqual({
      ler: true,
      inserir: true,
      alterar: false,
      apagar: false,
      esvaziar: false,
    });
  });
});
