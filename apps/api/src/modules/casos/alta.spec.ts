import { Global, INestApplication, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { and, eq, sql } from 'drizzle-orm';
import request from 'supertest';
import {
  auditoria,
  cancelamentosSessao,
  casos,
  decisoesPrioridade,
  encerramentosAlta,
  inscricoes,
  parametros,
  reaberturasCaso,
  sessoesAtendimento,
  usuarios,
  vagasLiberadas,
  vinculosEstagiario,
  type Db,
} from '@clinica/database';
import type { SituacaoAlta } from '@clinica/shared';
import { hojeEmBrasilia } from '@clinica/shared';
import { AuditoriaModule } from '../../auditoria/auditoria.module';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { cifrar, decifrar } from '../../common/criptografia';
import { DB } from '../../database/database.module';
import { EmailService } from '../../notificacoes/email.service';
import { ParametrosModule } from '../../parametros/parametros.module';
import {
  CHAVE_TESTE,
  criarBancoDeTeste,
} from '../../test-utils/banco-de-teste';
import { AcompanhamentoClinicoModule } from '../acompanhamento-clinico/acompanhamento-clinico.module';
import { AgendamentoModule } from '../agendamento/agendamento.module';
import { CasosModule } from './casos.module';

const HORA = 60 * 60 * 1000;

// Encerramento do caso por alta (RF68, prancha 6-5), pelo caminho real: a
// distribuição (RF20) e o vínculo (RF21) criam o caso ativo. O usuário da sessão
// (RF50) é simulado pelo cabeçalho x-usuario-teste.
describe('Encerrar caso por alta (RF68)', () => {
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
      providers: [
        { provide: DB, useValue: db },
        { provide: EmailService, useValue: { enviar: jest.fn() } },
      ],
      exports: [DB, EmailService],
    })
    class InfraDeTeste {}

    const modulo = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              CHAVE_DADOS: CHAVE_TESTE,
              WEB_URL: 'http://localhost:3000',
            }),
          ],
        }),
        InfraDeTeste,
        AuditoriaModule,
        ParametrosModule,
        CasosModule,
        AcompanhamentoClinicoModule,
        AgendamentoModule,
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
    for (const [chave, nome, perfil] of [
      ['coordenacao', 'Helena Duarte', 'coordenacao'],
      ['secretaria', 'Juliana Rocha', 'secretaria'],
      ['ricardo', 'Ricardo Menezes', 'supervisor'],
      ['patricia', 'Patrícia Nogueira', 'supervisor'],
      ['ana', 'Ana Beatriz Costa', 'estagiario'],
      ['camila', 'Camila Souza', 'estagiario'],
    ] as const) {
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
    }
  });

  const como = (quem: string) => ({
    'x-usuario-teste': JSON.stringify(pessoas[quem]),
  });
  const http = () => request(app.getHttpServer());

  // Caso ativo: Ricardo supervisiona e Ana atende.
  async function casoAtivo() {
    numero += 1;
    const [inscricao] = await db
      .insert(inscricoes)
      .values({
        numero: `2026-${String(numero).padStart(5, '0')}`,
        nomeCompleto: 'Mariana Alves Toledo',
        dataNascimento: '1990-01-01',
        cpf: String(numero).padStart(11, '0'),
        rg: '1234567',
        endereco: 'Rua Fictícia, 1',
        estadoCivil: 'solteiro',
        canalPreferencial: 'email',
        email: `paciente${numero}@exemplo.com`,
        queixaCifrada: cifrar('queixa sigilosa', CHAVE_TESTE),
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
    await http()
      .post(`/casos/${caso.id}/supervisor`)
      .set(como('coordenacao'))
      .send({ supervisorId: pessoas.ricardo.id })
      .expect(201);
    const vinculo = await http()
      .post(`/casos/${caso.id}/estagiario`)
      .set(como('ricardo'))
      .send({ estagiarioId: pessoas.ana.id })
      .expect(201);
    return { caso: caso.id, prontuarioId: vinculo.body.prontuarioId as string };
  }

  async function sessao(caso: string, horas: number) {
    const inicio = new Date(Date.now() + horas * HORA);
    const [s] = await db
      .insert(sessoesAtendimento)
      .values({
        casoId: caso,
        estagiarioId: pessoas.ana.id,
        inicio,
        termino: new Date(inicio.getTime() + 50 * 60_000),
        fimIntervaloAnotacoes: new Date(inicio.getTime() + 60 * 60_000),
        agendadaPor: pessoas.secretaria.id,
        status: horas < 0 ? 'realizada' : 'agendada',
      })
      .returning();
    return s.id;
  }

  const hoje = hojeEmBrasilia();
  const pedir = (caso: string, quem = 'ana', corpo?: object) =>
    http()
      .post(`/casos/${caso}/alta`)
      .set(como(quem))
      .send(
        corpo ?? {
          dataAlta: hoje,
          motivo: 'Objetivos terapêuticos do ciclo alcançados.',
        },
      );
  const confirmar = (caso: string, quem = 'ricardo') =>
    http().post(`/casos/${caso}/alta/confirmacao`).set(como(quem));
  const reabrir = (caso: string, corpo: object, quem = 'coordenacao') =>
    http().post(`/casos/${caso}/reabertura`).set(como(quem)).send(corpo);
  const situacao = async (caso: string, quem: string) =>
    (await http().get(`/casos/${caso}/alta`).set(como(quem)).expect(200))
      .body as SituacaoAlta;
  const negadas = (operacao: string) =>
    db.select().from(auditoria).where(eq(auditoria.operacao, operacao));
  const situacaoDoCaso = async (caso: string) =>
    (await db.select().from(casos).where(eq(casos.id, caso)))[0].situacao;

  it('o pedido do estagiário não muda nada até a confirmação do supervisor (RF68)', async () => {
    const { caso } = await casoAtivo();
    await pedir(caso).expect(201);
    expect(await situacaoDoCaso(caso)).toBe('em_atendimento');
    const [vinculo] = await db
      .select()
      .from(vinculosEstagiario)
      .where(eq(vinculosEstagiario.casoId, caso));
    expect(vinculo.vigente).toBe(true);
    const visto = await situacao(caso, 'ricardo');
    expect(visto.pedidoAberto).toMatchObject({
      dataAlta: hoje,
      motivo: 'Objetivos terapêuticos do ciclo alcançados.',
      pedidaPor: 'Ana Beatriz Costa',
      confirmadaEm: null,
    });
    expect(visto.acoes).toEqual({
      pedir: false,
      confirmar: true,
      reabrir: false,
    });
    // O motivo fica cifrado no banco e fora da auditoria.
    const [alta] = await db.select().from(encerramentosAlta);
    expect(alta.motivoCifrado).not.toContain('Objetivos');
    expect(decifrar(alta.motivoCifrado, CHAVE_TESTE)).toBe(
      'Objetivos terapêuticos do ciclo alcançados.',
    );
    const [registro] = await negadas('pedir_alta');
    expect(JSON.stringify(registro.dadosNovos)).not.toContain('Objetivos');
  });

  it('a confirmação encerra o caso, preserva o histórico, cancela as sessões futuras e libera a vaga (RF68)', async () => {
    const { caso } = await casoAtivo();
    const passada = await sessao(caso, -48);
    const futura = await sessao(caso, 48);
    await pedir(caso).expect(201);
    const res = await confirmar(caso).expect(200);
    expect(res.body).toEqual({ sessoesCanceladas: 1 });

    expect(await situacaoDoCaso(caso)).toBe('encerrado_por_alta');
    const [vinculo] = await db
      .select()
      .from(vinculosEstagiario)
      .where(eq(vinculosEstagiario.casoId, caso));
    expect(vinculo).toMatchObject({ vigente: false });
    expect(vinculo.encerradoEm).not.toBeNull();
    const sessoes = await db
      .select()
      .from(sessoesAtendimento)
      .where(eq(sessoesAtendimento.casoId, caso));
    expect(sessoes.find((s) => s.id === passada)?.status).toBe('realizada');
    expect(sessoes.find((s) => s.id === futura)?.status).toBe('cancelada');
    const [cancelamento] = await db
      .select()
      .from(cancelamentosSessao)
      .where(eq(cancelamentosSessao.sessaoId, futura));
    // Administrativo: não conta como falta do paciente nem do estagiário.
    expect(cancelamento).toMatchObject({
      classificacao: 'administrativo',
      origem: 'supervisor',
      registradoPor: pessoas.ricardo.id,
    });
    const [vaga] = await db.select().from(vagasLiberadas);
    expect(vaga).toMatchObject({
      desligamentoId: null,
      estagiarioId: pessoas.ana.id,
      supervisorId: pessoas.ricardo.id,
      ocupadaEm: null,
    });
    expect(vaga.altaId).not.toBeNull();

    // O histórico identifica a alta, distinta do desligamento por faltas.
    const visto = await situacao(caso, 'coordenacao');
    expect(visto.situacao).toBe('encerrado_por_alta');
    expect(visto.historico).toHaveLength(1);
    expect(visto.historico[0]).toMatchObject({
      confirmadaPor: 'Ricardo Menezes',
      reabertura: null,
    });
    expect(visto.acoes.reabrir).toBe(true);
    expect(visto.pedidoPorOpcoes).toEqual([
      { id: pessoas.ana.id, nome: 'Ana Beatriz Costa', papel: 'estagiario' },
      { id: pessoas.ricardo.id, nome: 'Ricardo Menezes', papel: 'supervisor' },
    ]);
  });

  it('o caso encerrado por alta não aceita agendamento, vínculo novo nem outro pedido (RF68, RF10, RF21)', async () => {
    const { caso } = await casoAtivo();
    await pedir(caso).expect(201);
    await confirmar(caso).expect(200);
    const inicio = new Date(Date.now() + 72 * HORA);
    inicio.setUTCMinutes(0, 0, 0);
    const agendamento = await http()
      .post('/sessoes')
      .set(como('secretaria'))
      .send({ casoId: caso, inicio: inicio.toISOString() })
      .expect(422);
    expect(JSON.stringify(agendamento.body)).toContain(
      'Caso encerrado por alta',
    );
    await http()
      .post(`/casos/${caso}/estagiario`)
      .set(como('ricardo'))
      .send({ estagiarioId: pessoas.camila.id })
      .expect(409);
    // A Ana perdeu o vínculo e não pede de novo; a nova evolução também não
    // passa, porque o registro exige o vínculo vigente (RF28).
    await pedir(caso).expect(403);
  });

  it('um segundo pedido aberto é recusado, a data futura também, e o caso fora de atendimento não recebe pedido (RF68)', async () => {
    const { caso } = await casoAtivo();
    await pedir(caso).expect(201);
    await pedir(caso).expect(409);
    const amanha = hojeEmBrasilia(new Date(Date.now() + 36 * HORA));
    await pedir(caso, 'ana', { dataAlta: amanha, motivo: 'x' }).expect(400);
    await pedir(caso, 'ana', { dataAlta: hoje, motivo: '  ' }).expect(400);
  });

  it('só o estagiário pede, só o supervisor do caso confirma e só a coordenação reabre; as tentativas ficam registradas (RF68)', async () => {
    const { caso } = await casoAtivo();
    for (const quem of ['secretaria', 'ricardo', 'camila', 'coordenacao']) {
      await pedir(caso, quem).expect(403);
    }
    expect(await negadas('pedir_alta_negada')).toHaveLength(4);
    await pedir(caso).expect(201);
    for (const quem of ['patricia', 'ana', 'coordenacao', 'secretaria']) {
      await confirmar(caso, quem).expect(403);
    }
    expect(await negadas('confirmar_alta_negada')).toHaveLength(4);
    await confirmar(caso).expect(200);
    for (const quem of ['ricardo', 'ana', 'secretaria']) {
      await reabrir(
        caso,
        { pedidaPor: pessoas.ana.id, motivo: 'Retorno' },
        quem,
      ).expect(403);
    }
    expect(await negadas('reabrir_caso_negada')).toHaveLength(3);
    await http().get(`/casos/${caso}/alta`).set(como('camila')).expect(403);
  });

  it('a secretaria vê a alta sem o motivo, e o estagiário vê as sessões sem evolução antes de pedir (RF68, RNF17)', async () => {
    const { caso } = await casoAtivo();
    await sessao(caso, -48);
    const daAna = await situacao(caso, 'ana');
    expect(daAna.acoes.pedir).toBe(true);
    expect(daAna.sessoesSemEvolucao).toBe(1);
    await pedir(caso).expect(201);
    const daSecretaria = await situacao(caso, 'secretaria');
    expect(daSecretaria.pedidoAberto?.motivo).toBeNull();
    expect(daSecretaria.sessoesSemEvolucao).toBe(0);
    expect(daSecretaria.acoes).toEqual({
      pedir: false,
      confirmar: false,
      reabrir: false,
    });
  });

  it('a reabertura com o estagiário ativo devolve o caso a ele, com o mesmo prontuário, e mantém a alta no histórico (RF68)', async () => {
    const { caso, prontuarioId } = await casoAtivo();
    await pedir(caso).expect(201);
    await confirmar(caso).expect(200);
    await http()
      .get(`/prontuarios/${prontuarioId}`)
      .set(como('ana'))
      .expect(403);

    const res = await reabrir(caso, {
      pedidaPor: pessoas.ana.id,
      motivo: 'A paciente pediu para retomar o atendimento.',
    }).expect(200);
    expect(res.body).toEqual({
      situacao: 'em_atendimento',
      estagiario: 'Ana Beatriz Costa',
      supervisor: 'Ricardo Menezes',
    });
    expect(await situacaoDoCaso(caso)).toBe('em_atendimento');
    const vinculos = await db
      .select()
      .from(vinculosEstagiario)
      .where(eq(vinculosEstagiario.casoId, caso));
    expect(vinculos.map((v) => v.vigente).sort()).toEqual([false, true]);
    await http()
      .get(`/prontuarios/${prontuarioId}`)
      .set(como('ana'))
      .expect(200);
    const [vaga] = await db.select().from(vagasLiberadas);
    expect(vaga.encerradaEm).not.toBeNull();

    const visto = await situacao(caso, 'coordenacao');
    expect(visto.historico[0].reabertura).toMatchObject({
      pedidaPor: 'Ana Beatriz Costa',
      reabertaPor: 'Helena Duarte',
      motivo: 'A paciente pediu para retomar o atendimento.',
    });
    const [registro] = await negadas('reabrir_caso');
    expect(registro).toMatchObject({ usuarioId: pessoas.coordenacao.id });
    // Reaberto, o caso volta a aceitar pedido de alta.
    expect((await situacao(caso, 'ana')).acoes.pedir).toBe(true);
  });

  it('com o estagiário desativado, o caso reaberto aguarda vínculo, com o supervisor mantido (RF68, RF21)', async () => {
    const { caso } = await casoAtivo();
    await pedir(caso).expect(201);
    await confirmar(caso).expect(200);
    await db
      .update(usuarios)
      .set({ situacao: 'desativado' })
      .where(eq(usuarios.id, pessoas.ana.id));
    const res = await reabrir(caso, {
      pedidaPor: pessoas.ricardo.id,
      motivo: 'Retorno combinado com o supervisor.',
    }).expect(200);
    expect(res.body).toEqual({
      situacao: 'aguardando_vinculo',
      estagiario: null,
      supervisor: 'Ricardo Menezes',
    });
    expect(await situacaoDoCaso(caso)).toBe('aguardando_vinculo');
    // O supervisor vincula outro estagiário pelo caminho normal (RF21).
    await http()
      .post(`/casos/${caso}/estagiario`)
      .set(como('ricardo'))
      .send({ estagiarioId: pessoas.camila.id })
      .expect(201);
  });

  it('a alta de semestre anterior não pode ser reaberta, e quem pediu tem de ser o estagiário da alta ou o supervisor (RF68)', async () => {
    const { caso } = await casoAtivo();
    await pedir(caso).expect(201);
    await confirmar(caso).expect(200);
    await reabrir(caso, {
      pedidaPor: pessoas.camila.id,
      motivo: 'Retorno',
    }).expect(400);
    // A data da alta volta para um semestre anterior, direto no banco.
    await db.execute(
      sql`alter table encerramentos_alta disable trigger encerramentos_alta_campos_preenchidos`,
    );
    await db
      .update(encerramentosAlta)
      .set({ dataAlta: '2025-03-10' })
      .where(eq(encerramentosAlta.casoId, caso));
    await db.execute(
      sql`alter table encerramentos_alta enable trigger encerramentos_alta_campos_preenchidos`,
    );
    const res = await reabrir(caso, {
      pedidaPor: pessoas.ana.id,
      motivo: 'Retorno',
    }).expect(422);
    expect(JSON.stringify(res.body)).toContain(
      'encerrado por alta no semestre 2025/1 e não pode ser reaberto',
    );
    const visto = await situacao(caso, 'coordenacao');
    expect(visto.acoes.reabrir).toBe(false);
    expect(visto.bloqueioReabertura).toContain('nova inscrição');
    expect(await db.select().from(reaberturasCaso)).toHaveLength(0);
  });

  it('a alta confirmada não pode ser alterada nem apagada no banco, e a reabertura é só inserção (RNF27)', async () => {
    const { caso } = await casoAtivo();
    await pedir(caso).expect(201);
    await confirmar(caso).expect(200);
    await expect(
      db
        .update(encerramentosAlta)
        .set({ confirmadaPor: pessoas.patricia.id })
        .where(eq(encerramentosAlta.casoId, caso)),
    ).rejects.toThrow();
    await expect(
      db.delete(encerramentosAlta).where(eq(encerramentosAlta.casoId, caso)),
    ).rejects.toThrow();
    await reabrir(caso, {
      pedidaPor: pessoas.ana.id,
      motivo: 'Retorno',
    }).expect(200);
    await expect(db.delete(reaberturasCaso)).rejects.toThrow();
    const [vaga] = await db
      .select()
      .from(vagasLiberadas)
      .where(and(eq(vagasLiberadas.estagiarioId, pessoas.ana.id)));
    await expect(
      db
        .update(vagasLiberadas)
        .set({ altaId: null })
        .where(eq(vagasLiberadas.id, vaga.id)),
    ).rejects.toThrow();
  });
});
