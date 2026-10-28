import { Global, INestApplication, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { and, eq } from 'drizzle-orm';
import request from 'supertest';
import {
  acessosProntuario,
  atribuicoesSupervisor,
  auditoria,
  casos,
  decisoesPrioridade,
  inscricoes,
  parametros,
  prontuarios,
  usuarios,
  vinculosEstagiario,
  type Db,
} from '@clinica/database';
import type { Cor } from '@clinica/shared';
import { AuditoriaModule } from '../../auditoria/auditoria.module';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { cifrar, decifrar } from '../../common/criptografia';
import { DB } from '../../database/database.module';
import { ParametrosModule } from '../../parametros/parametros.module';
import {
  CHAVE_TESTE,
  criarBancoDeTeste,
} from '../../test-utils/banco-de-teste';
import { AcompanhamentoClinicoModule } from '../acompanhamento-clinico/acompanhamento-clinico.module';
import { CasosModule } from './casos.module';

// Distribuição de casos (CP5). O usuário da sessão (RF50) é simulado pelo
// cabeçalho x-usuario-teste, como nos testes do agendamento.
describe('Distribuição de casos (RF18, RF20 e RF21)', () => {
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

  beforeEach(async () => {
    await limpar();
    await db.delete(parametros);
    for (const [chave, nome, perfil, situacao] of [
      ['coordenacao', 'Helena Duarte', 'coordenacao', 'ativo'],
      ['secretaria', 'Juliana Rocha', 'secretaria', 'ativo'],
      ['carla', 'Carla Mendes Souza', 'supervisor', 'ativo'],
      ['ricardo', 'Ricardo Menezes', 'supervisor', 'ativo'],
      ['ana', 'Ana Beatriz Costa', 'estagiario', 'ativo'],
      ['joao', 'João Victor Almeida', 'estagiario', 'ativo'],
      ['larissa', 'Larissa Fontes Melo', 'estagiario', 'desativado'],
    ] as const) {
      const [u] = await db
        .insert(usuarios)
        .values({ nome, email: `${chave}@fbr.edu.br`, perfil, situacao })
        .returning();
      pessoas[chave] = { id: u.id, nome, perfil };
    }
  });

  const como = (quem: string) => ({
    'x-usuario-teste': JSON.stringify(pessoas[quem]),
  });
  const http = () => request(app.getHttpServer());

  // Caso triado: inscrição, prioridade clínica cifrada (RNF51) e caso pendente.
  async function criarCaso(nome: string, cor: Cor, inscritoEm: string) {
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
        criadaEm: new Date(`${inscritoEm}T12:00:00-03:00`),
      })
      .returning();
    await db.insert(decisoesPrioridade).values({
      inscricaoId: inscricao.id,
      corCifrada: cifrar(cor, CHAVE_TESTE),
      decididaPor: pessoas.carla.id,
    });
    const [caso] = await db
      .insert(casos)
      .values({ inscricaoId: inscricao.id })
      .returning();
    return caso.id;
  }

  const distribuir = (
    casoId: string,
    supervisor: string,
    quem = 'coordenacao',
  ) =>
    http()
      .post(`/casos/${casoId}/supervisor`)
      .set(como(quem))
      .send({ supervisorId: pessoas[supervisor].id });
  const vincular = (casoId: string, estagiario: string, quem = 'carla') =>
    http()
      .post(`/casos/${casoId}/estagiario`)
      .set(como(quem))
      .send({ estagiarioId: pessoas[estagiario].id });

  describe('Listar casos aguardando distribuição (RF18)', () => {
    it('mostra só casos triados sem supervisor, por prioridade e, na mesma prioridade, da inscrição mais antiga', async () => {
      await criarCaso('Verde Antigo', 'verde', '2026-09-24');
      await criarCaso('Amarela Recente', 'amarela', '2026-10-13');
      await criarCaso('Vermelha Recente', 'vermelha', '2026-10-10');
      await criarCaso('Vermelha Antiga', 'vermelha', '2026-10-06');
      await criarCaso('Amarela Antiga', 'amarela', '2026-10-02');
      const distribuido = await criarCaso(
        'Já Distribuído',
        'vermelha',
        '2026-10-01',
      );
      await distribuir(distribuido, 'carla').expect(201);

      const res = await http()
        .get('/casos/aguardando-distribuicao')
        .set(como('coordenacao'))
        .expect(200);
      expect(res.body.map((c: { nome: string }) => c.nome)).toEqual([
        'Vermelha Antiga',
        'Vermelha Recente',
        'Amarela Antiga',
        'Amarela Recente',
        'Verde Antigo',
      ]);
    });

    it('cada caso traz só número, nome, prioridade e data da inscrição, sem a queixa (RF18, RNF17)', async () => {
      await criarCaso('Fernanda Lopes Brandão', 'vermelha', '2026-10-06');
      const res = await http()
        .get('/casos/aguardando-distribuicao')
        .set(como('coordenacao'))
        .expect(200);
      expect(Object.keys(res.body[0]).sort()).toEqual([
        'casoId',
        'dataInscricao',
        'nome',
        'numero',
        'prioridade',
      ]);
      expect(res.body[0].prioridade).toBe('vermelha');
      expect(JSON.stringify(res.body)).not.toContain('sigilos');
    });

    it('o supervisor consulta a lista, e a secretaria e o estagiário têm o acesso negado (RF18, RNF16)', async () => {
      await criarCaso('Fernanda Lopes Brandão', 'vermelha', '2026-10-06');
      await http()
        .get('/casos/aguardando-distribuicao')
        .set(como('carla'))
        .expect(200);
      for (const quem of ['secretaria', 'ana']) {
        await http()
          .get('/casos/aguardando-distribuicao')
          .set(como(quem))
          .expect(403);
      }
      await http().get('/casos/aguardando-distribuicao').expect(401);
    });

    it('sem casos pendentes, a lista vem vazia (RF18)', async () => {
      const res = await http()
        .get('/casos/aguardando-distribuicao')
        .set(como('coordenacao'))
        .expect(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('Distribuir caso a supervisor (RF20)', () => {
    it('registra o supervisor responsável com data e autor, e o caso passa a aguardar o vínculo (RF20, RNF18, RNF19)', async () => {
      const caso = await criarCaso(
        'Lucas Pereira Nunes',
        'amarela',
        '2026-10-15',
      );
      const res = await distribuir(caso, 'carla').expect(201);
      expect(res.body).toMatchObject({
        paciente: 'Lucas Pereira Nunes',
        supervisor: 'Carla Mendes Souza',
      });

      const [atribuicao] = await db
        .select()
        .from(atribuicoesSupervisor)
        .where(eq(atribuicoesSupervisor.casoId, caso));
      expect(atribuicao).toMatchObject({
        supervisorId: pessoas.carla.id,
        atribuidoPor: pessoas.coordenacao.id,
        vigente: true,
      });
      expect(atribuicao.atribuidoEm).toBeInstanceOf(Date);
      const [depois] = await db.select().from(casos).where(eq(casos.id, caso));
      expect(depois.situacao).toBe('aguardando_vinculo');

      const [evento] = await db
        .select()
        .from(auditoria)
        .where(eq(auditoria.operacao, 'distribuir_caso'));
      expect(evento).toMatchObject({
        usuarioId: pessoas.coordenacao.id,
        entidadeId: atribuicao.id,
        dadosAnteriores: { supervisorId: null },
        dadosNovos: { casoId: caso, supervisorId: pessoas.carla.id },
      });
    });

    it('a lista de supervisores mostra os casos ativos de cada um em relação ao limite (RF20)', async () => {
      const a = await criarCaso('Caso A', 'verde', '2026-10-01');
      const b = await criarCaso('Caso B', 'verde', '2026-10-02');
      await distribuir(a, 'carla').expect(201);
      await distribuir(b, 'carla').expect(201);
      // Caso encerrado não conta como ativo.
      await db
        .update(casos)
        .set({ situacao: 'encerrado' })
        .where(eq(casos.id, b));

      const res = await http()
        .get('/supervisores/disponibilidade')
        .set(como('coordenacao'))
        .expect(200);
      expect(res.body).toEqual([
        {
          id: pessoas.carla.id,
          nome: 'Carla Mendes Souza',
          casosAtivos: 1,
          limite: 50,
          noLimite: false,
        },
        {
          id: pessoas.ricardo.id,
          nome: 'Ricardo Menezes',
          casosAtivos: 0,
          limite: 50,
          noLimite: false,
        },
      ]);
    });

    it('supervisor no limite não recebe novo caso, e o motivo é informado (RF20)', async () => {
      await db
        .insert(parametros)
        .values({ chave: 'limite_casos_supervisor', valor: '1' });
      await distribuir(
        await criarCaso('Caso A', 'verde', '2026-10-01'),
        'carla',
      ).expect(201);
      const novo = await criarCaso('Caso B', 'verde', '2026-10-02');
      const res = await distribuir(novo, 'carla').expect(422);
      expect(res.body.message).toContain('limite de casos por supervisor');
      const [caso] = await db.select().from(casos).where(eq(casos.id, novo));
      expect(caso.situacao).toBe('aguardando_distribuicao');
    });

    it('com todos os supervisores no limite, todos aparecem como sem vaga (RF20)', async () => {
      await db
        .insert(parametros)
        .values({ chave: 'limite_casos_supervisor', valor: '1' });
      await distribuir(
        await criarCaso('Caso A', 'verde', '2026-10-01'),
        'carla',
      ).expect(201);
      await distribuir(
        await criarCaso('Caso B', 'verde', '2026-10-02'),
        'ricardo',
      ).expect(201);
      const res = await http()
        .get('/supervisores/disponibilidade')
        .set(como('coordenacao'))
        .expect(200);
      expect(res.body.every((s: { noLimite: boolean }) => s.noLimite)).toBe(
        true,
      );
    });

    it('caso que já tem supervisor não é distribuído de novo: 409 com o supervisor e a orientação da transferência (RF20, RNF19)', async () => {
      const caso = await criarCaso(
        'Gustavo Henrique Dias',
        'verde',
        '2026-09-24',
      );
      await distribuir(caso, 'ricardo').expect(201);
      const res = await distribuir(caso, 'carla').expect(409);
      expect(res.body).toMatchObject({ supervisor: 'Ricardo Menezes' });
      expect(res.body.message).toContain('transferência de caso');
      const vigentes = await db
        .select()
        .from(atribuicoesSupervisor)
        .where(
          and(
            eq(atribuicoesSupervisor.casoId, caso),
            eq(atribuicoesSupervisor.vigente, true),
          ),
        );
      expect(vigentes).toHaveLength(1);
    });

    it('duas distribuições simultâneas não passam do limite do supervisor (RF20, RNF19)', async () => {
      await db
        .insert(parametros)
        .values({ chave: 'limite_casos_supervisor', valor: '1' });
      const a = await criarCaso('Caso A', 'verde', '2026-10-01');
      const b = await criarCaso('Caso B', 'verde', '2026-10-02');
      const respostas = await Promise.all([
        distribuir(a, 'carla'),
        distribuir(b, 'carla'),
      ]);
      expect(respostas.map((r) => r.status).sort((a, b) => a - b)).toEqual([
        201, 422,
      ]);
    });

    it('só a coordenação distribui casos e vê a disponibilidade dos supervisores (RF20, RNF16)', async () => {
      const caso = await criarCaso('Caso A', 'verde', '2026-10-01');
      for (const quem of ['carla', 'secretaria', 'ana']) {
        await distribuir(caso, 'carla', quem).expect(403);
        await http()
          .get('/supervisores/disponibilidade')
          .set(como(quem))
          .expect(403);
      }
      expect(await db.select().from(atribuicoesSupervisor)).toEqual([]);
    });
  });

  describe('Vincular paciente a estagiário responsável (RF21)', () => {
    async function casoDaCarla(nome = 'Rafael Gomes Ribeiro') {
      const caso = await criarCaso(nome, 'amarela', '2026-10-02');
      await distribuir(caso, 'carla').expect(201);
      return caso;
    }

    it('o supervisor responsável vincula o estagiário, com data e autor, e o prontuário do ciclo é criado na mesma operação (RF21, RF66, RNF18)', async () => {
      const caso = await casoDaCarla();
      const res = await vincular(caso, 'ana').expect(201);
      expect(res.body).toMatchObject({
        paciente: 'Rafael Gomes Ribeiro',
        estagiario: 'Ana Beatriz Costa',
      });

      const [vinculo] = await db
        .select()
        .from(vinculosEstagiario)
        .where(eq(vinculosEstagiario.casoId, caso));
      expect(vinculo).toMatchObject({
        estagiarioId: pessoas.ana.id,
        vinculadoPor: pessoas.carla.id,
        vigente: true,
      });
      const [prontuario] = await db
        .select()
        .from(prontuarios)
        .where(eq(prontuarios.casoId, caso));
      expect(prontuario).toMatchObject({
        id: res.body.prontuarioId,
        cicloAtendimento: 1,
        vinculoOrigemId: vinculo.id,
      });
      const [depois] = await db.select().from(casos).where(eq(casos.id, caso));
      expect(depois.situacao).toBe('em_atendimento');
      const [evento] = await db
        .select()
        .from(auditoria)
        .where(eq(auditoria.operacao, 'vincular_estagiario'));
      expect(evento).toMatchObject({
        usuarioId: pessoas.carla.id,
        dadosAnteriores: { estagiarioId: null },
        dadosNovos: { casoId: caso, estagiarioId: pessoas.ana.id },
      });
    });

    it('as opções de vínculo trazem só estagiários ativos, com os pacientes em atendimento; o desativado não aparece (RF21)', async () => {
      await vincular(await casoDaCarla('Caso A'), 'ana').expect(201);
      const res = await http()
        .get('/estagiarios/disponiveis')
        .set(como('carla'))
        .expect(200);
      expect(res.body).toEqual([
        {
          id: pessoas.ana.id,
          nome: 'Ana Beatriz Costa',
          pacientesEmAtendimento: 1,
        },
        {
          id: pessoas.joao.id,
          nome: 'João Victor Almeida',
          pacientesEmAtendimento: 0,
        },
      ]);
    });

    it('sem estagiário com conta ativa, a lista de opções vem vazia (RF21)', async () => {
      await db
        .update(usuarios)
        .set({ situacao: 'desativado' })
        .where(eq(usuarios.perfil, 'estagiario'));
      const res = await http()
        .get('/estagiarios/disponiveis')
        .set(como('carla'))
        .expect(200);
      expect(res.body).toEqual([]);
    });

    it('estagiário com conta desativada não pode ser vinculado (RF21)', async () => {
      const caso = await casoDaCarla();
      await vincular(caso, 'larissa').expect(422);
      expect(await db.select().from(prontuarios)).toEqual([]);
    });

    it('supervisor que não é responsável pelo caso não vincula estagiário (RF21, RNF16)', async () => {
      const caso = await casoDaCarla();
      await vincular(caso, 'ana', 'ricardo').expect(403);
      for (const quem of ['coordenacao', 'secretaria', 'ana']) {
        await vincular(caso, 'ana', quem).expect(403);
      }
      expect(await db.select().from(vinculosEstagiario)).toEqual([]);
    });

    it('o prontuário criado no vínculo não copia dado de saúde em texto legível: a queixa segue cifrada na inscrição (RF66, RNF51)', async () => {
      const caso = await casoDaCarla();
      const { body } = await vincular(caso, 'ana').expect(201);
      const [prontuario] = await db
        .select()
        .from(prontuarios)
        .where(eq(prontuarios.id, body.prontuarioId));
      expect(JSON.stringify(prontuario)).not.toContain('queixa sigilosa');
      expect(prontuario).toMatchObject({
        anamneseCifrada: null,
        contratoCifrado: null,
      });
      const [inscricao] = await db
        .select({ queixaCifrada: inscricoes.queixaCifrada })
        .from(inscricoes)
        .innerJoin(casos, eq(casos.inscricaoId, inscricoes.id))
        .where(eq(casos.id, caso));
      expect(inscricao.queixaCifrada).not.toContain('queixa sigilosa');
      expect(decifrar(inscricao.queixaCifrada!, CHAVE_TESTE)).toBe(
        'queixa sigilosa',
      );
    });

    it('o prontuário criado no vínculo nega o acesso como se não existisse, sem o nome do paciente (RF66, RNF25)', async () => {
      const caso = await casoDaCarla('Paciente Sigiloso Teste');
      const { body } = await vincular(caso, 'ana').expect(201);
      for (const quem of ['secretaria', 'joao', 'ricardo']) {
        const negado = await http()
          .get(`/prontuarios/${body.prontuarioId}`)
          .set(como(quem));
        const inexistente = await http()
          .get('/prontuarios/00000000-0000-4000-8000-000000000000')
          .set(como(quem));
        expect(negado.status).toBe(403);
        expect(negado.status).toBe(inexistente.status);
        expect(negado.body).toEqual(inexistente.body);
        expect(JSON.stringify(negado.body)).not.toContain('Sigiloso');
      }
      await http()
        .get(`/prontuarios/${body.prontuarioId}`)
        .set(como('ana'))
        .expect(200);
    });

    it('os acessos ao prontuário criado no vínculo, permitidos e negados, ficam registrados (RF66, RNF52)', async () => {
      const caso = await casoDaCarla();
      const { body } = await vincular(caso, 'ana').expect(201);
      await http()
        .get(`/prontuarios/${body.prontuarioId}`)
        .set(como('ana'))
        .expect(200);
      await http()
        .get(`/prontuarios/${body.prontuarioId}`)
        .set(como('secretaria'))
        .expect(403);
      const registros = await db
        .select()
        .from(acessosProntuario)
        .where(eq(acessosProntuario.prontuarioId, body.prontuarioId));
      expect(
        registros.map((r) => [r.usuarioId, r.perfil, r.permitido]).sort(),
      ).toEqual(
        [
          [pessoas.ana.id, 'estagiario', true],
          [pessoas.secretaria.id, 'secretaria', false],
        ].sort(),
      );
    });

    it('o caso tem um único estagiário responsável vigente e um único prontuário no ciclo (RF21, RF66, RNF19)', async () => {
      const caso = await casoDaCarla();
      await vincular(caso, 'ana').expect(201);
      const res = await vincular(caso, 'joao').expect(409);
      expect(res.body.message).toContain('transferência de caso');
      expect(await db.select().from(vinculosEstagiario)).toHaveLength(1);
      expect(await db.select().from(prontuarios)).toHaveLength(1);
    });

    it('"Meus casos" mostra ao supervisor só os próprios casos, com o estagiário e o prontuário (RF21, RNF16)', async () => {
      const comEstagiario = await casoDaCarla('Mariana Alves Toledo');
      const semEstagiario = await casoDaCarla('Rafael Gomes Ribeiro');
      const outro = await criarCaso('Caso do Ricardo', 'verde', '2026-10-03');
      await distribuir(outro, 'ricardo').expect(201);
      const { body: vinculo } = await vincular(comEstagiario, 'ana').expect(
        201,
      );

      const res = await http()
        .get('/casos/meus')
        .set(como('carla'))
        .expect(200);
      expect(res.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            casoId: comEstagiario,
            estagiario: 'Ana Beatriz Costa',
            prontuarioId: vinculo.prontuarioId,
            prioridade: 'amarela',
          }),
          expect.objectContaining({
            casoId: semEstagiario,
            estagiario: null,
            prontuarioId: null,
          }),
        ]),
      );
      expect(res.body).toHaveLength(2);
      await http().get('/casos/meus').set(como('coordenacao')).expect(403);
    });
  });
});
