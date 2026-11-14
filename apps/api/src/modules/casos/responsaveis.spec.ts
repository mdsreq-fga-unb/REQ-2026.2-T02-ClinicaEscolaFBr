import { Global, INestApplication, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import {
  atribuicoesSupervisor,
  auditoria,
  casos,
  inscricoes,
  usuarios,
  vinculosEstagiario,
  type Db,
} from '@clinica/database';
import { LIMITE_LISTA_PACIENTES, type SituacaoCaso } from '@clinica/shared';
import { AuditoriaModule } from '../../auditoria/auditoria.module';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { cifrar } from '../../common/criptografia';
import { DB } from '../../database/database.module';
import { ParametrosModule } from '../../parametros/parametros.module';
import {
  CHAVE_TESTE,
  criarBancoDeTeste,
} from '../../test-utils/banco-de-teste';
import { CasosModule } from './casos.module';

// Consulta de responsáveis pelo caso (RF22). O usuário da sessão (RF50) é simulado
// pelo cabeçalho x-usuario-teste, como nos outros testes do módulo.
describe('Consulta de responsáveis pelo caso (RF22)', () => {
  let app: INestApplication;
  let db: Db;
  let limpar: () => Promise<unknown>;
  let fechar: () => Promise<void>;
  const pessoas: Record<string, UsuarioAutenticado> = {};
  let numero = 0;

  beforeAll(async () => {
    ({ db, limpar, fechar } = await criarBancoDeTeste());

    @Global()
    @Module({
      providers: [{ provide: DB, useValue: db }],
      exports: [DB],
    })
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
        ParametrosModule,
        CasosModule,
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
      ['carla', 'Carla Mendes Souza', 'supervisor'],
      ['ricardo', 'Ricardo Menezes', 'supervisor'],
      ['ana', 'Ana Beatriz Costa', 'estagiario'],
      ['joao', 'João Victor Almeida', 'estagiario'],
    ] as const) {
      const [u] = await db
        .insert(usuarios)
        .values({ nome, email: `${chave}@fbr.edu.br`, perfil })
        .returning();
      pessoas[chave] = { id: u.id, nome, perfil };
    }
  });

  const como = (quem: string) => ({
    'x-usuario-teste': JSON.stringify(pessoas[quem]),
  });
  const http = () => request(app.getHttpServer());
  const responsaveis = (casoId: string, quem: string) =>
    http().get(`/casos/${casoId}/responsaveis`).set(como(quem));
  const lista = (quem: string, busca?: string) =>
    http()
      .get('/pacientes')
      .query(busca === undefined ? {} : { busca })
      .set(como(quem));

  // Caso com a queixa e a prioridade guardadas, para provar que não vazam (RNF17).
  async function criarCaso(
    nome: string,
    {
      supervisor,
      estagiario,
      situacao = 'aguardando_distribuicao',
    }: { supervisor?: string; estagiario?: string; situacao?: SituacaoCaso },
  ) {
    numero += 1;
    const [inscricao] = await db
      .insert(inscricoes)
      .values({
        numero: `2026-${String(numero).padStart(5, '0')}`,
        nomeCompleto: nome,
        dataNascimento: '1990-01-01',
        cpf: String(numero).padStart(11, '0'),
        rg: '1234567',
        endereco: 'Rua Fictícia, 1',
        estadoCivil: 'solteiro',
        canalPreferencial: 'email',
        email: `paciente${numero}@exemplo.com`,
        queixaCifrada: cifrar('queixa sigilosa', CHAVE_TESTE),
        percepcaoUrgenciaCifrada: cifrar('urgência sigilosa', CHAVE_TESTE),
        historicoRelevanteCifrado: cifrar('histórico sigiloso', CHAVE_TESTE),
      })
      .returning();
    const [caso] = await db
      .insert(casos)
      .values({
        inscricaoId: inscricao.id,
        entradaNaFilaEm: inscricao.criadaEm,
        situacao,
      })
      .returning();
    if (supervisor) {
      await db.insert(atribuicoesSupervisor).values({
        casoId: caso.id,
        supervisorId: pessoas[supervisor].id,
        atribuidoPor: pessoas.coordenacao.id,
      });
    }
    if (estagiario) {
      await db.insert(vinculosEstagiario).values({
        casoId: caso.id,
        estagiarioId: pessoas[estagiario].id,
        vinculadoPor: pessoas[supervisor ?? 'carla'].id,
      });
    }
    return caso.id;
  }

  describe('GET /casos/:id/responsaveis', () => {
    it('secretaria, coordenação, estagiário e supervisor responsáveis veem os dois nomes e a situação, sem dado clínico (RF22, RNF17)', async () => {
      const casoId = await criarCaso('Mariana Alves Toledo', {
        supervisor: 'carla',
        estagiario: 'ana',
        situacao: 'em_atendimento',
      });
      for (const quem of ['secretaria', 'coordenacao', 'ana', 'carla']) {
        const r = await responsaveis(casoId, quem);
        expect([quem, r.status]).toEqual([quem, 200]);
        // Só estes campos: nada de queixa, prioridade ou prontuário. O número da
        // inscrição não vai para a secretaria, como na lista.
        expect(r.body).toEqual({
          casoId,
          nome: 'Mariana Alves Toledo',
          ...(quem === 'secretaria'
            ? {}
            : { numero: expect.stringMatching(/^2026-\d{5}$/) }),
          situacao: 'em_atendimento',
          supervisor: 'Carla Mendes Souza',
          estagiario: 'Ana Beatriz Costa',
        });
        expect(JSON.stringify(r.body)).not.toMatch(
          /sigilos|prontuario|prioridade/i,
        );
        if (quem === 'secretaria') {
          expect(JSON.stringify(r.body)).not.toMatch(/2026-/);
        }
      }
    });

    it('a resposta não fica em cache (RF22, RNF17)', async () => {
      const casoId = await criarCaso('Mariana Alves Toledo', {});
      expect(
        (await responsaveis(casoId, 'secretaria')).headers['cache-control'],
      ).toBe('no-store');
      expect((await lista('secretaria')).headers['cache-control']).toBe(
        'no-store',
      );
    });

    it('caso sem estagiário vem com o estagiário nulo, e sem os dois vem com ambos nulos (RF22)', async () => {
      const semEstagiario = await criarCaso('Rafael Gomes', {
        supervisor: 'carla',
        situacao: 'aguardando_vinculo',
      });
      const semNinguem = await criarCaso('Paulo Nunes', {});
      expect((await responsaveis(semEstagiario, 'secretaria')).body).toEqual({
        casoId: semEstagiario,
        nome: 'Rafael Gomes',
        situacao: 'aguardando_vinculo',
        supervisor: 'Carla Mendes Souza',
        estagiario: null,
      });
      expect((await responsaveis(semNinguem, 'coordenacao')).body).toEqual({
        casoId: semNinguem,
        nome: 'Paulo Nunes',
        numero: expect.stringMatching(/^2026-\d{5}$/),
        situacao: 'aguardando_distribuicao',
        supervisor: null,
        estagiario: null,
      });
    });

    it('o vínculo e a atribuição encerrados não contam como responsáveis, e quem saiu perde a consulta (RF22, RNF17)', async () => {
      const casoId = await criarCaso('Ex Responsáveis', {
        supervisor: 'carla',
        estagiario: 'ana',
        situacao: 'em_atendimento',
      });
      await db
        .update(vinculosEstagiario)
        .set({ vigente: false, encerradoEm: new Date() });
      await db
        .update(atribuicoesSupervisor)
        .set({ vigente: false, encerradaEm: new Date() });
      const r = await responsaveis(casoId, 'secretaria');
      expect(r.body).toMatchObject({ supervisor: null, estagiario: null });
      // Quem foi responsável no passado perde a consulta.
      expect((await responsaveis(casoId, 'ana')).status).toBe(403);
      expect((await responsaveis(casoId, 'carla')).status).toBe(403);
    });

    it('estagiário e supervisor sem vínculo com o caso têm o acesso negado, sem dado (RF22, RNF16, RNF17)', async () => {
      const casoId = await criarCaso('Mariana Alves Toledo', {
        supervisor: 'carla',
        estagiario: 'ana',
        situacao: 'em_atendimento',
      });
      for (const quem of ['joao', 'ricardo']) {
        const r = await responsaveis(casoId, quem);
        expect([quem, r.status]).toEqual([quem, 403]);
        expect(JSON.stringify(r.body)).not.toMatch(/Ana|Carla|Mariana/);
      }
    });

    it('a tentativa negada fica registrada na auditoria, com quem tentou e o caso, e o acesso permitido não gera registro (RF22, RF23, RNF52)', async () => {
      const casoId = await criarCaso('Mariana Alves Toledo', {
        supervisor: 'carla',
        estagiario: 'ana',
        situacao: 'em_atendimento',
      });
      expect((await responsaveis(casoId, 'ana')).status).toBe(200);
      expect(await db.select().from(auditoria)).toEqual([]);
      expect((await responsaveis(casoId, 'joao')).status).toBe(403);
      const registros = await db.select().from(auditoria);
      expect(registros).toHaveLength(1);
      expect(registros[0]).toMatchObject({
        usuarioId: pessoas.joao.id,
        operacao: 'consultar_responsaveis_negada',
        entidade: 'casos',
        entidadeId: casoId,
      });
    });

    it('caso inexistente: 404 para a secretaria e a coordenação, e o mesmo 403 do negado para os demais (RF22, RNF17, RNF25)', async () => {
      const inexistente = '8f14e45f-ceea-467f-a0e6-0a8e3b3c0f10';
      expect((await responsaveis(inexistente, 'secretaria')).status).toBe(404);
      expect((await responsaveis(inexistente, 'coordenacao')).status).toBe(404);
      const casoDeOutro = await criarCaso('Outro', {
        supervisor: 'carla',
        estagiario: 'ana',
        situacao: 'em_atendimento',
      });
      const negado = await responsaveis(casoDeOutro, 'joao');
      const naoExiste = await responsaveis(inexistente, 'joao');
      expect(negado.status).toBe(403);
      expect(naoExiste.status).toBe(403);
      expect(naoExiste.body).toEqual(negado.body);
    });

    it('sem sessão, a resposta é 401, e o id inválido é recusado (RF22, RNF17)', async () => {
      const casoId = await criarCaso('Mariana', {});
      expect((await http().get(`/casos/${casoId}/responsaveis`)).status).toBe(
        401,
      );
      expect((await responsaveis('nao-e-uuid', 'secretaria')).status).toBe(400);
    });
  });

  describe('GET /pacientes', () => {
    it('a secretaria vê nome, situação e responsáveis, sem o número da inscrição nem dado clínico (RF22, RNF17)', async () => {
      await criarCaso('Mariana Alves Toledo', {
        supervisor: 'carla',
        estagiario: 'ana',
        situacao: 'em_atendimento',
      });
      await criarCaso('Rafael Gomes', {
        supervisor: 'carla',
        situacao: 'aguardando_vinculo',
      });
      await criarCaso('Paulo Nunes', {});
      const r = await lista('secretaria');
      expect(r.status).toBe(200);
      expect(r.body.cortada).toBe(false);
      const pacientes = r.body.pacientes;
      expect(pacientes).toHaveLength(3);
      expect(pacientes.map((p: { nome: string }) => p.nome)).toEqual([
        'Mariana Alves Toledo',
        'Paulo Nunes',
        'Rafael Gomes',
      ]);
      for (const paciente of pacientes) {
        expect(Object.keys(paciente).sort()).toEqual([
          'casoId',
          'estagiario',
          'nome',
          'situacao',
          'supervisor',
        ]);
      }
      expect(JSON.stringify(r.body)).not.toMatch(/sigilos|2026-/);
      expect(pacientes[0]).toMatchObject({
        supervisor: 'Carla Mendes Souza',
        estagiario: 'Ana Beatriz Costa',
      });
      expect(pacientes[1]).toMatchObject({
        supervisor: null,
        estagiario: null,
      });
      expect(pacientes[2]).toMatchObject({
        supervisor: 'Carla Mendes Souza',
        estagiario: null,
      });
    });

    it('a coordenação vê também o número da inscrição, mas nunca dado clínico (RF22, RNF17)', async () => {
      await criarCaso('Mariana Alves Toledo', {
        supervisor: 'carla',
        estagiario: 'ana',
        situacao: 'em_atendimento',
      });
      const r = await lista('coordenacao');
      expect(r.status).toBe(200);
      expect(r.body.pacientes[0].numero).toMatch(/^2026-\d{5}$/);
      expect(Object.keys(r.body.pacientes[0]).sort()).toEqual([
        'casoId',
        'estagiario',
        'nome',
        'numero',
        'situacao',
        'supervisor',
      ]);
      expect(JSON.stringify(r.body)).not.toMatch(/sigilos/);
    });

    it('a busca filtra pelo nome, sem tratar % e _ como curingas (RF22)', async () => {
      await criarCaso('Mariana Alves Toledo', {});
      await criarCaso('Marcos Pereira', {});
      await criarCaso('Paulo Nunes', {});
      const nomes = async (busca: string) =>
        (await lista('secretaria', busca)).body.pacientes.map(
          (p: { nome: string }) => p.nome,
        );
      expect(await nomes('mar')).toEqual([
        'Marcos Pereira',
        'Mariana Alves Toledo',
      ]);
      expect(await nomes('%')).toEqual([]);
      expect(await nomes('_')).toEqual([]);
      expect(await nomes('zzz')).toEqual([]);
      // Busca longa demais é recusada pela validação.
      expect((await lista('secretaria', 'a'.repeat(121))).status).toBe(400);
    });

    it('sem pacientes, a lista vem vazia (RF22, RNF17)', async () => {
      const r = await lista('secretaria');
      expect(r.status).toBe(200);
      expect(r.body).toEqual({ pacientes: [], cortada: false });
    });

    it(`com mais de ${LIMITE_LISTA_PACIENTES} pacientes, a lista traz só os primeiros e avisa que foi cortada (RF22, RNF21)`, async () => {
      for (let i = 0; i <= LIMITE_LISTA_PACIENTES; i += 1) {
        await criarCaso(`Paciente ${String(i).padStart(3, '0')}`, {});
      }
      const inicio = performance.now();
      const r = await lista('secretaria');
      const duracao = performance.now() - inicio;
      expect(r.status).toBe(200);
      expect(r.body.cortada).toBe(true);
      expect(r.body.pacientes).toHaveLength(LIMITE_LISTA_PACIENTES);
      // A busca pelo nome encontra quem ficou de fora.
      const fora = await lista(
        'secretaria',
        `Paciente ${LIMITE_LISTA_PACIENTES}`,
      );
      expect(fora.body).toEqual({
        pacientes: [
          expect.objectContaining({
            nome: `Paciente ${LIMITE_LISTA_PACIENTES}`,
          }),
        ],
        cortada: false,
      });
      // RNF21: a lista cheia responde dentro dos 3 s (aqui, uma requisição só; a
      // carga de 30 usuários fica no teste de carga).
      expect(duracao).toBeLessThan(3000);
    }, 60_000);

    it('estagiário e supervisor não acessam a lista de Pacientes (RF22, RNF16, RNF17)', async () => {
      await criarCaso('Mariana Alves Toledo', {
        supervisor: 'carla',
        estagiario: 'ana',
        situacao: 'em_atendimento',
      });
      for (const quem of ['ana', 'carla']) {
        const r = await lista(quem);
        expect([quem, r.status]).toEqual([quem, 403]);
      }
      expect((await http().get('/pacientes')).status).toBe(401);
    });
  });
});
