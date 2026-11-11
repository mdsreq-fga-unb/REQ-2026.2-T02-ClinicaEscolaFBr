import { Global, INestApplication, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import {
  atribuicoesSupervisor,
  casos,
  inscricoes,
  usuarios,
  vinculosEstagiario,
  type Db,
} from '@clinica/database';
import type { SituacaoCaso } from '@clinica/shared';
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
        // Só estes campos: nada de queixa, prioridade, número ou prontuário.
        expect(r.body).toEqual({
          casoId,
          situacao: 'em_atendimento',
          supervisor: 'Carla Mendes Souza',
          estagiario: 'Ana Beatriz Costa',
        });
        expect(JSON.stringify(r.body)).not.toMatch(/sigilos|2026-|prontuario/i);
      }
    });

    it('caso sem estagiário vem com o estagiário nulo, e sem os dois vem com ambos nulos (RF22)', async () => {
      const semEstagiario = await criarCaso('Rafael Gomes', {
        supervisor: 'carla',
        situacao: 'aguardando_vinculo',
      });
      const semNinguem = await criarCaso('Paulo Nunes', {});
      expect((await responsaveis(semEstagiario, 'secretaria')).body).toEqual({
        casoId: semEstagiario,
        situacao: 'aguardando_vinculo',
        supervisor: 'Carla Mendes Souza',
        estagiario: null,
      });
      expect((await responsaveis(semNinguem, 'coordenacao')).body).toEqual({
        casoId: semNinguem,
        situacao: 'aguardando_distribuicao',
        supervisor: null,
        estagiario: null,
      });
    });

    it('o vínculo e a atribuição encerrados não contam como responsáveis (RF22)', async () => {
      const casoId = await criarCaso('Ex Responsáveis', {
        supervisor: 'carla',
        estagiario: 'ana',
        situacao: 'em_atendimento',
      });
      await db.update(vinculosEstagiario).set({ vigente: false });
      await db.update(atribuicoesSupervisor).set({ vigente: false });
      const r = await responsaveis(casoId, 'secretaria');
      expect(r.body).toMatchObject({ supervisor: null, estagiario: null });
      // Quem foi responsável no passado perde a consulta.
      expect((await responsaveis(casoId, 'ana')).status).toBe(403);
      expect((await responsaveis(casoId, 'carla')).status).toBe(403);
    });

    it('estagiário e supervisor sem vínculo com o caso têm o acesso negado, sem dado (RF22, RNF16)', async () => {
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

    it('caso inexistente: 404 para a secretaria e a coordenação, e o mesmo 403 do negado para os demais (RNF25)', async () => {
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

    it('sem sessão, a resposta é 401, e o id inválido é recusado (RF22)', async () => {
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
      expect(r.body).toHaveLength(3);
      expect(r.body.map((p: { nome: string }) => p.nome)).toEqual([
        'Mariana Alves Toledo',
        'Paulo Nunes',
        'Rafael Gomes',
      ]);
      for (const paciente of r.body) {
        expect(Object.keys(paciente).sort()).toEqual([
          'casoId',
          'estagiario',
          'nome',
          'situacao',
          'supervisor',
        ]);
      }
      expect(JSON.stringify(r.body)).not.toMatch(/sigilos|2026-/);
      expect(r.body[0]).toMatchObject({
        supervisor: 'Carla Mendes Souza',
        estagiario: 'Ana Beatriz Costa',
      });
      expect(r.body[1]).toMatchObject({ supervisor: null, estagiario: null });
      expect(r.body[2]).toMatchObject({
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
      expect(r.body[0].numero).toMatch(/^2026-\d{5}$/);
      expect(Object.keys(r.body[0]).sort()).toEqual([
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
        (await lista('secretaria', busca)).body.map(
          (p: { nome: string }) => p.nome,
        );
      expect(await nomes('mar')).toEqual([
        'Marcos Pereira',
        'Mariana Alves Toledo',
      ]);
      expect(await nomes('%')).toEqual([]);
      expect(await nomes('_')).toEqual([]);
      expect(await nomes('zzz')).toEqual([]);
    });

    it('sem pacientes, a lista vem vazia (RF22)', async () => {
      const r = await lista('secretaria');
      expect(r.status).toBe(200);
      expect(r.body).toEqual([]);
    });

    it('estagiário e supervisor não acessam a lista de Pacientes (RF22, RNF16)', async () => {
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
