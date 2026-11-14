import { Global, INestApplication, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { and, eq } from 'drizzle-orm';
import request from 'supertest';
import {
  atribuicoesSupervisor,
  auditoria,
  cancelamentosSessao,
  casos,
  decisoesPrioridade,
  inscricoes,
  parametros,
  prontuarios,
  sessoesAtendimento,
  transferenciasCaso,
  usuarios,
  vinculosEstagiario,
  type Db,
} from '@clinica/database';
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

const HORA = 60 * 60 * 1000;

// Transferência de caso (RF25), com as regras de perfil do RNF16. O usuário da
// sessão (RF50) é simulado pelo cabeçalho x-usuario-teste, como nos testes da
// distribuição.
describe('Transferir caso para outro estagiário ou supervisor (RF25)', () => {
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
      ['ricardo', 'Ricardo Menezes', 'supervisor', 'ativo'],
      ['patricia', 'Patrícia Nogueira', 'supervisor', 'ativo'],
      ['paulo', 'Paulo Sérgio Nogueira', 'supervisor', 'ativo'],
      ['ana', 'Ana Beatriz Costa', 'estagiario', 'ativo'],
      ['camila', 'Camila Souza', 'estagiario', 'ativo'],
      ['lucas', 'Lucas Ferreira', 'estagiario', 'ativo'],
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

  async function criarCaso(nome: string) {
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
    await db.insert(decisoesPrioridade).values({
      inscricaoId: inscricao.id,
      corCifrada: cifrar('amarela', CHAVE_TESTE),
      decididaPor: pessoas.coordenacao.id,
    });
    const [caso] = await db
      .insert(casos)
      .values({
        entradaNaFilaEm: inscricao.criadaEm,
        inscricaoId: inscricao.id,
      })
      .returning();
    return caso.id;
  }

  // Caso ativo pelo caminho real: distribuição (RF20) e vínculo (RF21).
  async function casoAtivo(
    nome: string,
    supervisor: string,
    estagiario?: string,
  ) {
    const caso = await criarCaso(nome);
    await http()
      .post(`/casos/${caso}/supervisor`)
      .set(como('coordenacao'))
      .send({ supervisorId: pessoas[supervisor].id })
      .expect(201);
    let prontuarioId: string | null = null;
    if (estagiario) {
      const res = await http()
        .post(`/casos/${caso}/estagiario`)
        .set(como(supervisor))
        .send({ estagiarioId: pessoas[estagiario].id })
        .expect(201);
      prontuarioId = res.body.prontuarioId;
    }
    return { caso, prontuarioId };
  }

  const transferir = (caso: string, quem: string, corpo: object) =>
    http().post(`/casos/${caso}/transferencia`).set(como(quem)).send(corpo);
  const opcoes = (caso: string, quem: string) =>
    http().get(`/casos/${caso}/transferencia`).set(como(quem));
  const abrirProntuario = (prontuarioId: string, quem: string) =>
    http().get(`/prontuarios/${prontuarioId}`).set(como(quem));

  async function sessao(caso: string, estagiario: string, horas: number) {
    const inicio = new Date(Date.now() + horas * HORA);
    const [s] = await db
      .insert(sessoesAtendimento)
      .values({
        casoId: caso,
        estagiarioId: pessoas[estagiario].id,
        inicio,
        termino: new Date(inicio.getTime() + 50 * 60_000),
        fimIntervaloAnotacoes: new Date(inicio.getTime() + 60 * 60_000),
        agendadaPor: pessoas.secretaria.id,
        status: horas < 0 ? 'realizada' : 'agendada',
      })
      .returning();
    return s.id;
  }

  const vinculoVigente = async (caso: string) =>
    (
      await db
        .select()
        .from(vinculosEstagiario)
        .where(
          and(
            eq(vinculosEstagiario.casoId, caso),
            eq(vinculosEstagiario.vigente, true),
          ),
        )
    )[0];
  const atribuicaoVigente = async (caso: string) =>
    (
      await db
        .select()
        .from(atribuicoesSupervisor)
        .where(
          and(
            eq(atribuicoesSupervisor.casoId, caso),
            eq(atribuicoesSupervisor.vigente, true),
          ),
        )
    )[0];

  describe('Supervisor responsável', () => {
    it('transfere para outro estagiário dele: o anterior perde o acesso, o novo vê o mesmo prontuário, e tudo fica registrado (RF25, RNF16, RNF18, RNF20)', async () => {
      const { caso, prontuarioId } = await casoAtivo(
        'Mariana Alves Toledo',
        'ricardo',
        'ana',
      );
      // Camila é estagiária do Ricardo por outro caso dele.
      await casoAtivo('Outro paciente', 'ricardo', 'camila');

      const res = await transferir(caso, 'ricardo', {
        estagiarioId: pessoas.camila.id,
        motivo: 'Término do estágio de Ana Beatriz Costa.',
      }).expect(201);
      expect(res.body).toMatchObject({
        casoId: caso,
        paciente: 'Mariana Alves Toledo',
        supervisor: 'Ricardo Menezes',
        estagiario: 'Camila Souza',
        sessoesCanceladas: 0,
      });

      const vinculo = await vinculoVigente(caso);
      expect(vinculo).toMatchObject({
        estagiarioId: pessoas.camila.id,
        vinculadoPor: pessoas.ricardo.id,
      });
      expect((await atribuicaoVigente(caso)).supervisorId).toBe(
        pessoas.ricardo.id,
      );

      // O prontuário do ciclo é o mesmo, e o acesso segue o vínculo vigente (RF55).
      await abrirProntuario(prontuarioId!, 'ana').expect(403);
      await abrirProntuario(prontuarioId!, 'camila').expect(200);
      const todos = await db
        .select()
        .from(prontuarios)
        .where(eq(prontuarios.casoId, caso));
      expect(todos).toHaveLength(1);

      const [registro] = await db
        .select()
        .from(transferenciasCaso)
        .where(eq(transferenciasCaso.casoId, caso));
      expect(registro).toMatchObject({
        tipo: 'estagiario',
        estagiarioAnteriorId: pessoas.ana.id,
        estagiarioNovoId: pessoas.camila.id,
        supervisorAnteriorId: null,
        supervisorNovoId: null,
        transferidoPor: pessoas.ricardo.id,
      });
      expect(registro.vinculoAnteriorId).not.toBe(vinculo.id);
      expect(registro.transferidoEm).toBeInstanceOf(Date);

      const [evento] = await db
        .select()
        .from(auditoria)
        .where(eq(auditoria.operacao, 'transferir_caso'));
      expect(evento).toMatchObject({
        usuarioId: pessoas.ricardo.id,
        entidadeId: registro.id,
        dadosAnteriores: { estagiarioId: pessoas.ana.id },
        dadosNovos: { casoId: caso, estagiarioId: pessoas.camila.id },
      });
    });

    it('o motivo fica cifrado na transferência e não aparece na auditoria (RF25, RNF18, RNF51)', async () => {
      const { caso } = await casoAtivo('Paciente A', 'ricardo', 'ana');
      await casoAtivo('Paciente B', 'ricardo', 'camila');
      await transferir(caso, 'ricardo', {
        estagiarioId: pessoas.camila.id,
        motivo: 'Motivo com informação sigilosa',
      }).expect(201);
      const [registro] = await db.select().from(transferenciasCaso);
      expect(registro.motivoCifrado).not.toContain('sigilosa');
      expect(decifrar(registro.motivoCifrado, CHAVE_TESTE)).toBe(
        'Motivo com informação sigilosa',
      );
      const eventos = await db.select().from(auditoria);
      expect(JSON.stringify(eventos)).not.toContain('sigilosa');
    });

    it('as sessões futuras do estagiário anterior são canceladas como administrativas, sem falta, e as passadas ficam como estão (RF25, RNF16)', async () => {
      const { caso } = await casoAtivo('Paciente A', 'ricardo', 'ana');
      await casoAtivo('Paciente B', 'ricardo', 'camila');
      const futura = await sessao(caso, 'ana', 48);
      const passada = await sessao(caso, 'ana', -48);

      const res = await transferir(caso, 'ricardo', {
        estagiarioId: pessoas.camila.id,
        motivo: 'Reorganização.',
      }).expect(201);
      expect(res.body.sessoesCanceladas).toBe(1);

      const [cancelamento] = await db
        .select()
        .from(cancelamentosSessao)
        .where(eq(cancelamentosSessao.sessaoId, futura));
      expect(cancelamento).toMatchObject({
        origem: 'supervisor',
        classificacao: 'administrativo',
        registradoPor: pessoas.ricardo.id,
      });
      const [s1] = await db
        .select()
        .from(sessoesAtendimento)
        .where(eq(sessoesAtendimento.id, futura));
      const [s2] = await db
        .select()
        .from(sessoesAtendimento)
        .where(eq(sessoesAtendimento.id, passada));
      expect(s1.status).toBe('cancelada');
      expect(s2.status).toBe('realizada');
      // A resposta traz o horário da sessão cancelada, para reagendar.
      expect(res.body.sessoesAReagendar).toEqual([s1.inicio.toISOString()]);
    });

    it('o supervisor A não transfere para estagiário do supervisor B: 403 com a orientação de pedir à coordenação, e nada muda (RF25, RNF16)', async () => {
      const { caso } = await casoAtivo('Paciente A', 'ricardo', 'ana');
      await casoAtivo('Paciente da Patrícia', 'patricia', 'lucas');
      const res = await transferir(caso, 'ricardo', {
        estagiarioId: pessoas.lucas.id,
        motivo: 'Tentativa.',
      }).expect(403);
      expect(res.body.message).toContain('peça a transferência à coordenação');
      expect((await vinculoVigente(caso)).estagiarioId).toBe(pessoas.ana.id);
      expect(await db.select().from(transferenciasCaso)).toHaveLength(0);
    });

    it('estagiário sem caso vigente não é de nenhum supervisor: a transferência para ele é pela coordenação (RF25, RNF16)', async () => {
      const { caso } = await casoAtivo('Paciente A', 'ricardo', 'ana');
      await transferir(caso, 'ricardo', {
        estagiarioId: pessoas.joao.id,
        motivo: 'Tentativa.',
      }).expect(403);
      await transferir(caso, 'coordenacao', {
        estagiarioId: pessoas.joao.id,
        motivo: 'Novo estagiário do semestre.',
      }).expect(201);
      expect((await vinculoVigente(caso)).estagiarioId).toBe(pessoas.joao.id);
      expect((await atribuicaoVigente(caso)).supervisorId).toBe(
        pessoas.ricardo.id,
      );
    });

    it('o supervisor não troca o supervisor do caso: 403 com a orientação (RF25, RNF16)', async () => {
      const { caso } = await casoAtivo('Paciente A', 'ricardo', 'ana');
      const res = await transferir(caso, 'ricardo', {
        supervisorId: pessoas.patricia.id,
        motivo: 'Tentativa.',
      }).expect(403);
      expect(res.body.message).toContain('peça a transferência à coordenação');
      expect((await atribuicaoVigente(caso)).supervisorId).toBe(
        pessoas.ricardo.id,
      );
    });

    it('supervisor que não é o responsável não abre nem faz a transferência (RF25, RNF16)', async () => {
      const { caso } = await casoAtivo('Paciente A', 'ricardo', 'ana');
      await casoAtivo('Paciente da Patrícia', 'patricia', 'camila');
      await opcoes(caso, 'patricia').expect(403);
      await transferir(caso, 'patricia', {
        estagiarioId: pessoas.camila.id,
        motivo: 'Tentativa.',
      }).expect(403);
    });

    it('as opções do supervisor trazem só os estagiários ativos dele, sem o atual, com os pacientes em atendimento, e nenhum supervisor (RF25, RNF16)', async () => {
      const { caso } = await casoAtivo('Paciente A', 'ricardo', 'ana');
      await casoAtivo('Paciente B', 'ricardo', 'camila');
      await casoAtivo('Paciente C', 'ricardo', 'camila');
      await casoAtivo('Paciente da Patrícia', 'patricia', 'lucas');
      const res = await opcoes(caso, 'ricardo').expect(200);
      expect(res.body).toMatchObject({
        casoId: caso,
        paciente: 'Paciente A',
        supervisorAtual: { nome: 'Ricardo Menezes' },
        estagiarioAtual: { nome: 'Ana Beatriz Costa' },
        supervisores: [],
      });
      expect(res.body.estagiarios).toEqual([
        {
          id: pessoas.camila.id,
          nome: 'Camila Souza',
          pacientesEmAtendimento: 2,
        },
      ]);
    });

    it('caso que ainda aguarda o vínculo não é transferido pelo supervisor: ele vincula o estagiário (RF21, RF25, RNF16)', async () => {
      const { caso } = await casoAtivo('Paciente A', 'ricardo');
      const res = await opcoes(caso, 'ricardo').expect(422);
      expect(res.body.message).toContain('Vincular estagiário');
    });
  });

  describe('Coordenação', () => {
    it('transfere para outro supervisor e novo estagiário: os anteriores perdem o acesso, e os novos passam a ver o histórico (RF25, RNF16, RNF18, RNF20)', async () => {
      const { caso, prontuarioId } = await casoAtivo(
        'Mariana Alves Toledo',
        'ricardo',
        'ana',
      );
      const futura = await sessao(caso, 'ana', 72);

      const res = await transferir(caso, 'coordenacao', {
        supervisorId: pessoas.patricia.id,
        estagiarioId: pessoas.lucas.id,
        motivo: 'Reorganização da carga de casos.',
      }).expect(201);
      expect(res.body).toMatchObject({
        supervisor: 'Patrícia Nogueira',
        estagiario: 'Lucas Ferreira',
        sessoesCanceladas: 1,
      });

      const atribuicoes = await db
        .select()
        .from(atribuicoesSupervisor)
        .where(eq(atribuicoesSupervisor.casoId, caso));
      expect(atribuicoes).toHaveLength(2);
      expect((await atribuicaoVigente(caso)).supervisorId).toBe(
        pessoas.patricia.id,
      );
      expect((await vinculoVigente(caso)).estagiarioId).toBe(pessoas.lucas.id);
      const [depois] = await db.select().from(casos).where(eq(casos.id, caso));
      expect(depois.situacao).toBe('em_atendimento');

      await abrirProntuario(prontuarioId!, 'ana').expect(403);
      await abrirProntuario(prontuarioId!, 'ricardo').expect(403);
      await abrirProntuario(prontuarioId!, 'lucas').expect(200);
      await abrirProntuario(prontuarioId!, 'patricia').expect(200);

      // "Meus casos" do supervisor anterior não mostra mais o caso.
      const ricardo = await http().get('/casos/meus').set(como('ricardo'));
      expect(ricardo.body).toHaveLength(0);
      const patricia = await http().get('/casos/meus').set(como('patricia'));
      expect(patricia.body).toEqual([
        expect.objectContaining({ casoId: caso, estagiario: 'Lucas Ferreira' }),
      ]);

      const [registro] = await db.select().from(transferenciasCaso);
      expect(registro).toMatchObject({
        tipo: 'supervisor',
        supervisorAnteriorId: pessoas.ricardo.id,
        supervisorNovoId: pessoas.patricia.id,
        estagiarioAnteriorId: pessoas.ana.id,
        estagiarioNovoId: pessoas.lucas.id,
        transferidoPor: pessoas.coordenacao.id,
      });
      expect(registro.atribuicaoAnteriorId).toBe(
        atribuicoes.find((a) => a.supervisorId === pessoas.ricardo.id)!.id,
      );
      const [evento] = await db
        .select()
        .from(auditoria)
        .where(eq(auditoria.operacao, 'transferir_caso'));
      expect(evento).toMatchObject({
        usuarioId: pessoas.coordenacao.id,
        entidadeId: registro.id,
      });
      const [cancelamento] = await db
        .select()
        .from(cancelamentosSessao)
        .where(eq(cancelamentosSessao.sessaoId, futura));
      expect(cancelamento).toMatchObject({
        origem: 'coordenacao',
        classificacao: 'administrativo',
      });
    });

    it('sem novo estagiário, o caso fica aguardando o vínculo pelo novo supervisor, que vincula usando o mesmo prontuário (RF25, RF21, RF66, RNF20)', async () => {
      const { caso, prontuarioId } = await casoAtivo(
        'Paciente A',
        'ricardo',
        'ana',
      );
      const res = await transferir(caso, 'coordenacao', {
        supervisorId: pessoas.patricia.id,
        motivo: 'Saída do supervisor.',
      }).expect(201);
      expect(res.body).toMatchObject({
        supervisor: 'Patrícia Nogueira',
        estagiario: null,
      });
      expect(await vinculoVigente(caso)).toBeUndefined();
      const [depois] = await db.select().from(casos).where(eq(casos.id, caso));
      expect(depois.situacao).toBe('aguardando_vinculo');
      await abrirProntuario(prontuarioId!, 'ana').expect(403);

      const vinculo = await http()
        .post(`/casos/${caso}/estagiario`)
        .set(como('patricia'))
        .send({ estagiarioId: pessoas.lucas.id })
        .expect(201);
      expect(vinculo.body.prontuarioId).toBe(prontuarioId);
    });

    it('a coordenação transfere para um supervisor no limite de casos, e a auditoria registra que o limite foi ultrapassado (RF25, DF50, RNF18)', async () => {
      await db
        .insert(parametros)
        .values({ chave: 'limite_casos_supervisor', valor: '1' });
      const { caso } = await casoAtivo('Paciente A', 'ricardo', 'ana');
      await casoAtivo('Paciente da Patrícia', 'patricia', 'lucas');

      const lista = await opcoes(caso, 'coordenacao').expect(200);
      expect(lista.body.supervisores).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            nome: 'Patrícia Nogueira',
            casosAtivos: 1,
            limite: 1,
            noLimite: true,
          }),
          expect.objectContaining({
            nome: 'Paulo Sérgio Nogueira',
            noLimite: false,
          }),
        ]),
      );
      // O supervisor atual não aparece entre as opções.
      expect(
        lista.body.supervisores.map((s: { nome: string }) => s.nome),
      ).not.toContain('Ricardo Menezes');

      const res = await transferir(caso, 'coordenacao', {
        supervisorId: pessoas.patricia.id,
        motivo: 'Reorganização acima do limite.',
      }).expect(201);
      expect(res.body.acimaDoLimite).toBe(true);
      expect((await atribuicaoVigente(caso)).supervisorId).toBe(
        pessoas.patricia.id,
      );
      const [evento] = await db
        .select()
        .from(auditoria)
        .where(eq(auditoria.operacao, 'transferir_caso'));
      expect(evento.dadosNovos).toMatchObject({ acimaDoLimite: true });
    });

    it('as opções da coordenação trazem todos os estagiários ativos, sem o atual nem o desativado (RF25, RNF16)', async () => {
      const { caso } = await casoAtivo('Paciente A', 'ricardo', 'ana');
      const res = await opcoes(caso, 'coordenacao').expect(200);
      const nomes = res.body.estagiarios.map((e: { nome: string }) => e.nome);
      expect(nomes).toEqual([
        'Camila Souza',
        'João Victor Almeida',
        'Lucas Ferreira',
      ]);
    });

    it('estagiário com conta desativada não recebe o caso (RF25, RF54, RNF16)', async () => {
      const { caso } = await casoAtivo('Paciente A', 'ricardo', 'ana');
      await transferir(caso, 'coordenacao', {
        estagiarioId: pessoas.larissa.id,
        motivo: 'Tentativa.',
      }).expect(422);
    });
  });

  describe('Validação e acesso', () => {
    it.each([
      ['sem motivo', { motivo: '' }],
      ['motivo só com espaços', { motivo: '   ' }],
      ['motivo com mais de 1.000 caracteres', { motivo: 'x'.repeat(1001) }],
      [
        'sem novo responsável',
        { motivo: 'Motivo válido.', estagiarioId: undefined },
      ],
    ])('%s: 400, e nada muda (RF25)', async (_nome, corpo) => {
      const { caso } = await casoAtivo('Paciente A', 'ricardo', 'ana');
      await casoAtivo('Paciente B', 'ricardo', 'camila');
      await transferir(caso, 'ricardo', {
        estagiarioId: pessoas.camila.id,
        ...corpo,
      }).expect(400);
      expect((await vinculoVigente(caso)).estagiarioId).toBe(pessoas.ana.id);
      expect(await db.select().from(transferenciasCaso)).toHaveLength(0);
    });

    it('o mesmo responsável não é uma transferência: 422 (RF25)', async () => {
      const { caso } = await casoAtivo('Paciente A', 'ricardo', 'ana');
      await transferir(caso, 'coordenacao', {
        supervisorId: pessoas.ricardo.id,
        estagiarioId: pessoas.ana.id,
        motivo: 'Nada muda.',
      }).expect(422);
    });

    it('secretaria e estagiário não abrem nem fazem a transferência (RF25, RNF16)', async () => {
      const { caso } = await casoAtivo('Paciente A', 'ricardo', 'ana');
      for (const quem of ['secretaria', 'ana']) {
        await opcoes(caso, quem).expect(403);
        await transferir(caso, quem, {
          estagiarioId: pessoas.camila.id,
          motivo: 'Tentativa.',
        }).expect(403);
      }
    });

    it('sem sessão, a transferência é recusada (RF25, RNF16)', async () => {
      const { caso } = await casoAtivo('Paciente A', 'ricardo', 'ana');
      await http()
        .post(`/casos/${caso}/transferencia`)
        .send({ estagiarioId: pessoas.camila.id, motivo: 'Tentativa.' })
        .expect(401);
    });

    it('caso ainda sem supervisor ou desligado não é transferido: 422 (RF25, RNF16)', async () => {
      const pendente = await criarCaso('Pendente');
      const res = await transferir(pendente, 'coordenacao', {
        supervisorId: pessoas.patricia.id,
        motivo: 'Tentativa.',
      }).expect(422);
      expect(res.body.message).toContain('distribuição');

      const { caso } = await casoAtivo('Desligado', 'ricardo', 'ana');
      await db
        .update(casos)
        .set({ situacao: 'desligado_por_faltas' })
        .where(eq(casos.id, caso));
      await transferir(caso, 'coordenacao', {
        supervisorId: pessoas.patricia.id,
        motivo: 'Tentativa.',
      }).expect(422);
    });

    it('caso inexistente: 404 (RF25)', async () => {
      await opcoes(
        '00000000-0000-4000-8000-000000000000',
        'coordenacao',
      ).expect(404);
    });

    it('o histórico de transferências não pode ser alterado nem apagado (RF25, RNF16, RNF18)', async () => {
      const { caso } = await casoAtivo('Paciente A', 'ricardo', 'ana');
      await transferir(caso, 'coordenacao', {
        estagiarioId: pessoas.camila.id,
        motivo: 'Motivo.',
      }).expect(201);
      await expect(
        db.update(transferenciasCaso).set({ motivoCifrado: 'outro' }),
      ).rejects.toThrow();
      await expect(db.delete(transferenciasCaso)).rejects.toThrow();
    });
  });
});
