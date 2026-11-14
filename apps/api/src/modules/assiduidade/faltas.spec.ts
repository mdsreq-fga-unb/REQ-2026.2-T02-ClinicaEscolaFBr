import { Global, INestApplication, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import {
  atribuicoesSupervisor,
  auditoria,
  casos,
  faltasPaciente,
  inscricoes,
  sessoesAtendimento,
  usuarios,
  vinculosEstagiario,
  type Db,
} from '@clinica/database';
import { AuditoriaModule } from '../../auditoria/auditoria.module';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { DB } from '../../database/database.module';
import { AcompanhamentoClinicoModule } from '../acompanhamento-clinico/acompanhamento-clinico.module';
import {
  CHAVE_TESTE,
  criarBancoDeTeste,
} from '../../test-utils/banco-de-teste';
import { AssiduidadeModule } from './assiduidade.module';
import { FaltasService } from './faltas.service';

// RF34 e RF35: falta do paciente e contagem no ciclo. O usuário da sessão (RF50) é
// simulado pelo cabeçalho x-usuario-teste.
const HORA = 60 * 60 * 1000;

describe('Falta do paciente e contagem no ciclo (RF34, RF35)', () => {
  let app: INestApplication;
  let db: Db;
  let limpar: () => Promise<unknown>;
  let fechar: () => Promise<void>;
  let faltas: FaltasService;
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
        AssiduidadeModule,
        AcompanhamentoClinicoModule,
      ],
    }).compile();
    faltas = modulo.get(FaltasService);
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
      ['secretaria', 'Juliana Rocha', 'secretaria'],
      ['ana', 'Ana Beatriz Costa', 'estagiario'],
      ['pedro', 'Pedro Henrique Lima', 'estagiario'],
      ['carla', 'Carla Mendes', 'supervisor'],
      ['ricardo', 'Ricardo Souza', 'supervisor'],
      ['coordenacao', 'Helena Duarte', 'coordenacao'],
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

  // Caso em atendimento com a Ana (estagiária) e a Carla (supervisora).
  async function criarCaso(ciclo = 1) {
    numero += 1;
    const [inscricao] = await db
      .insert(inscricoes)
      .values({
        numero: `2026-${String(numero).padStart(4, '0')}`,
        nomeCompleto: 'Sérgio Antunes Freitas',
        dataNascimento: '1990-01-01',
        cpf: String(numero).padStart(11, '0'),
        rg: '1234567',
        endereco: 'Rua Fictícia, 1',
        estadoCivil: 'solteiro',
        canalPreferencial: 'email',
        email: 'sergio@exemplo.com',
        queixaCifrada: 'x',
        percepcaoUrgenciaCifrada: 'x',
        historicoRelevanteCifrado: 'x',
      })
      .returning();
    const [caso] = await db
      .insert(casos)
      .values({
        entradaNaFilaEm: inscricao.criadaEm,
        inscricaoId: inscricao.id,
        situacao: 'em_atendimento',
        cicloAtendimento: ciclo,
      })
      .returning();
    await db.insert(atribuicoesSupervisor).values({
      casoId: caso.id,
      supervisorId: pessoas.carla.id,
      atribuidoPor: pessoas.coordenacao.id,
    });
    await db.insert(vinculosEstagiario).values({
      casoId: caso.id,
      estagiarioId: pessoas.ana.id,
      vinculadoPor: pessoas.carla.id,
    });
    return caso.id;
  }

  // Sessão de 50 minutos que começa `horas` horas a partir de agora (negativo = passado).
  async function criarSessao(
    casoId: string,
    horas: number,
    status: 'agendada' | 'confirmada' | 'cancelada' | 'realizada' = 'agendada',
    ciclo = 1,
  ) {
    const inicio = new Date(Date.now() + horas * HORA);
    const [sessao] = await db
      .insert(sessoesAtendimento)
      .values({
        casoId,
        cicloAtendimento: ciclo,
        estagiarioId: pessoas.ana.id,
        inicio,
        termino: new Date(inicio.getTime() + 50 * 60 * 1000),
        fimIntervaloAnotacoes: new Date(inicio.getTime() + HORA),
        status,
        agendadaPor: pessoas.secretaria.id,
      })
      .returning();
    return sessao.id;
  }

  const como = (quem: string) => ({
    'x-usuario-teste': JSON.stringify(pessoas[quem]),
  });
  const registrar = (quem: string, sessaoId: string, corpo: object = {}) =>
    request(app.getHttpServer())
      .post(`/sessoes/${sessaoId}/falta`)
      .set(como(quem))
      .send(corpo);
  const justificar = (quem: string, faltaId: string, corpo: object) =>
    request(app.getHttpServer())
      .post(`/faltas/${faltaId}/justificativa`)
      .set(como(quem))
      .send(corpo);

  it('sem sessão, as rotas respondem 401', async () => {
    const caso = await criarCaso();
    const sessao = await criarSessao(caso, -2);
    await request(app.getHttpServer())
      .post(`/sessoes/${sessao}/falta`)
      .send({})
      .expect(401);
  });

  it('a secretaria registra a falta em sessão já passada: muda o status, grava autor e data/hora, audita e avisa da 1ª falta (RF34, RF35, RNF10)', async () => {
    const caso = await criarCaso();
    const sessao = await criarSessao(caso, -2);

    const { body } = await registrar('secretaria', sessao).expect(201);

    expect(body.contagem).toEqual({
      faltas: 1,
      limite: 2,
      aviso: 'primeira_falta',
    });
    const [s] = await db
      .select()
      .from(sessoesAtendimento)
      .where(eq(sessoesAtendimento.id, sessao));
    expect(s.status).toBe('falta_paciente');
    const [falta] = await db.select().from(faltasPaciente);
    expect(falta).toMatchObject({
      sessaoId: sessao,
      origem: 'falta',
      registradaPor: pessoas.secretaria.id,
      justificada: false,
    });
    const eventos = await db
      .select()
      .from(auditoria)
      .where(eq(auditoria.operacao, 'registrar_falta'));
    expect(eventos).toHaveLength(1);
    expect(eventos[0].usuarioId).toBe(pessoas.secretaria.id);
  });

  it('o estagiário responsável registra a falta em sessão confirmada, já justificada, com o motivo cifrado e fora da auditoria (RF34, RNF51, RNF32)', async () => {
    const caso = await criarCaso();
    const sessao = await criarSessao(caso, -3, 'confirmada');

    await registrar('ana', sessao, {
      justificada: true,
      motivo: 'Atestado médico de 2 dias',
    }).expect(201);

    const [falta] = await db.select().from(faltasPaciente);
    expect(falta.justificada).toBe(true);
    expect(falta.justificadaPor).toBe(pessoas.ana.id);
    expect(falta.motivoJustificativaCifrado).not.toContain('Atestado');
    const eventos = await db.select().from(auditoria);
    expect(JSON.stringify(eventos)).not.toContain('Atestado');
  });

  it('falta justificada sem motivo não é registrada, e o campo é indicado (RF34)', async () => {
    const caso = await criarCaso();
    const sessao = await criarSessao(caso, -2);
    const { body } = await registrar('secretaria', sessao, {
      justificada: true,
    }).expect(400);
    expect(JSON.stringify(body)).toContain('motivo');
    expect(await db.select().from(faltasPaciente)).toHaveLength(0);
  });

  it('sessão futura, cancelada, realizada ou já com falta não aceita a falta (RF34)', async () => {
    const caso = await criarCaso();
    const futura = await criarSessao(caso, 24);
    const cancelada = await criarSessao(caso, -50, 'cancelada');
    const realizada = await criarSessao(caso, -26, 'realizada');
    const passada = await criarSessao(caso, -2);

    await registrar('secretaria', futura).expect(422);
    await registrar('secretaria', cancelada).expect(422);
    await registrar('secretaria', realizada).expect(422);
    await registrar('secretaria', passada).expect(201);
    await registrar('secretaria', passada).expect(422);
    expect(await db.select().from(faltasPaciente)).toHaveLength(1);
  });

  it('só a secretaria e o estagiário responsável registram a falta; os outros recebem 403 sem dado da sessão (RF34, RF55)', async () => {
    const caso = await criarCaso();
    const sessao = await criarSessao(caso, -2);

    for (const quem of ['pedro', 'carla', 'coordenacao']) {
      const { body } = await registrar(quem, sessao).expect(403);
      expect(JSON.stringify(body)).not.toContain('Sérgio');
    }
    expect(await db.select().from(faltasPaciente)).toHaveLength(0);
  });

  it('a justificativa feita depois pelo supervisor responsável grava autor e data/hora e não muda a origem nem a contagem (RF34, RF35)', async () => {
    const caso = await criarCaso();
    const sessao = await criarSessao(caso, -2);
    const { body } = await registrar('ana', sessao).expect(201);

    await justificar('carla', body.faltaId, {
      motivo: 'Comprovante de trabalho',
    }).expect(200);

    const [falta] = await db.select().from(faltasPaciente);
    expect(falta).toMatchObject({
      origem: 'falta',
      justificada: true,
      justificadaPor: pessoas.carla.id,
    });
    expect(falta.justificadaEm).toBeInstanceOf(Date);
    expect(await faltas.contar(caso)).toMatchObject({ faltas: 1 });
    await justificar('secretaria', body.faltaId, { motivo: 'Outro' }).expect(
      409,
    );
  });

  it('estagiário e supervisor sem vínculo com o caso não justificam a falta (RF34)', async () => {
    const caso = await criarCaso();
    const sessao = await criarSessao(caso, -2);
    const { body } = await registrar('secretaria', sessao).expect(201);

    await justificar('pedro', body.faltaId, { motivo: 'x' }).expect(403);
    await justificar('ricardo', body.faltaId, { motivo: 'x' }).expect(403);
    await justificar('coordenacao', body.faltaId, { motivo: 'x' }).expect(403);
  });

  it('a 2ª falta do ciclo, mesmo depois de sessões realizadas, atinge o limite; a justificada continua contando (RF35, RF36)', async () => {
    const caso = await criarCaso();
    const primeira = await criarSessao(caso, -100);
    await criarSessao(caso, -76, 'realizada');
    await criarSessao(caso, -52, 'realizada');
    const segunda = await criarSessao(caso, -2);

    await registrar('secretaria', primeira, {
      justificada: true,
      motivo: 'Atestado',
    }).expect(201);
    const { body } = await registrar('secretaria', segunda).expect(201);

    expect(body.contagem).toEqual({
      faltas: 2,
      limite: 2,
      aviso: 'limite_atingido',
    });
  });

  it('a contagem é do ciclo vigente: num novo ciclo, começa em zero (RF35)', async () => {
    const caso = await criarCaso(2);
    await registrar('secretaria', await criarSessao(caso, -200, 'agendada', 1));
    await registrar('secretaria', await criarSessao(caso, -150, 'agendada', 1));
    expect(await faltas.contar(caso)).toEqual({
      faltas: 0,
      limite: 2,
      aviso: null,
    });
    // O prontuário do ciclo 1 continua mostrando a contagem do ciclo dele.
    expect(await faltas.contar(caso, undefined, 1)).toMatchObject({
      faltas: 2,
      aviso: 'limite_atingido',
    });
  });

  it('a falta registrada responde com a contagem do ciclo da sessão (RF35)', async () => {
    const caso = await criarCaso(2);
    await registrar('secretaria', await criarSessao(caso, -200, 'agendada', 1));
    const { body } = await registrar(
      'secretaria',
      await criarSessao(caso, -150, 'agendada', 1),
    ).expect(201);
    expect(body.contagem).toMatchObject({ faltas: 2 });
  });

  it('os botões de falta seguem o vínculo e a atribuição vigentes, e não o estagiário da sessão (RF34, RF25)', async () => {
    const caso = await criarCaso();
    await criarSessao(caso, -2);
    // Transferência: a Ana, estagiária da sessão, sai, e o Pedro assume o caso.
    await db
      .update(vinculosEstagiario)
      .set({ vigente: false, encerradoEm: new Date() })
      .where(eq(vinculosEstagiario.casoId, caso));
    await db.insert(vinculosEstagiario).values({
      casoId: caso,
      estagiarioId: pessoas.pedro.id,
      vinculadoPor: pessoas.carla.id,
    });

    expect(await faltas.acoesPermitidas(caso, pessoas.pedro)).toEqual({
      registrar: true,
      justificar: true,
    });
    expect(await faltas.acoesPermitidas(caso, pessoas.ana)).toEqual({
      registrar: false,
      justificar: false,
    });
    expect(await faltas.acoesPermitidas(caso, pessoas.carla)).toEqual({
      registrar: false,
      justificar: true,
    });
    expect(await faltas.acoesPermitidas(caso, pessoas.ricardo)).toEqual({
      registrar: false,
      justificar: false,
    });
    expect(await faltas.acoesPermitidas(caso, pessoas.secretaria)).toEqual({
      registrar: true,
      justificar: true,
    });
  });

  it('a falta retirada da contagem na reversão deixa de contar e continua no histórico (RF35, RF38)', async () => {
    const caso = await criarCaso();
    await registrar('secretaria', await criarSessao(caso, -50));
    const { body } = await registrar(
      'secretaria',
      await criarSessao(caso, -2),
    ).expect(201);
    expect(body.contagem.faltas).toBe(2);

    await db
      .update(faltasPaciente)
      .set({ retiradaEm: new Date(), retiradaPor: pessoas.coordenacao.id })
      .where(eq(faltasPaciente.id, body.faltaId));

    expect(await faltas.contar(caso)).toMatchObject({
      faltas: 1,
      aviso: 'primeira_falta',
    });
    expect(await db.select().from(faltasPaciente)).toHaveLength(2);
  });

  it('o cancelamento fora do prazo pelo link vira falta sem usuário, registrada pelo paciente (RF15, RF35, RNF10)', async () => {
    const caso = await criarCaso();
    const sessao = await criarSessao(caso, 0.5);

    const contagem = await db.transaction((tx) =>
      faltas.registrarCancelamentoForaDoPrazo(tx, sessao, {
        pacientePeloLink: true,
      }),
    );

    expect(contagem).toMatchObject({ faltas: 1, aviso: 'primeira_falta' });
    const [falta] = await db.select().from(faltasPaciente);
    expect(falta).toMatchObject({
      origem: 'cancelamento_fora_do_prazo',
      registradaPor: null,
      registradaPeloPaciente: true,
    });
  });

  it('o banco não deixa apagar a falta nem trocar a origem ou um campo já preenchido (RNF32)', async () => {
    const caso = await criarCaso();
    const sessao = await criarSessao(caso, -2);
    const { body } = await registrar('secretaria', sessao, {
      justificada: true,
      motivo: 'Atestado',
    }).expect(201);
    const daFalta = eq(faltasPaciente.id, body.faltaId);

    await expect(db.delete(faltasPaciente).where(daFalta)).rejects.toThrow();
    await expect(
      db
        .update(faltasPaciente)
        .set({ origem: 'cancelamento_fora_do_prazo' })
        .where(daFalta),
    ).rejects.toThrow();
    await expect(
      db
        .update(faltasPaciente)
        .set({ justificadaPor: pessoas.carla.id })
        .where(daFalta),
    ).rejects.toThrow();
    const [falta] = await db.select().from(faltasPaciente).where(daFalta);
    expect(falta.origem).toBe('falta');
  });

  it('a sessão cancelada libera o horário; as outras continuam ocupando (RNF9)', async () => {
    const caso = await criarCaso();
    const cancelada = await criarSessao(caso, 48, 'cancelada');
    await expect(criarSessao(caso, 48)).resolves.toBeDefined();
    await expect(criarSessao(caso, 48.5, 'confirmada')).rejects.toThrow();
    expect(cancelada).toBeDefined();
  });

  it('o prontuário e os dados administrativos mostram a falta na sessão e a contagem do ciclo, fora da agenda (RF34, RF35, RNF13)', async () => {
    const caso = await criarCaso();
    const sessao = await criarSessao(caso, -2);
    await registrar('secretaria', sessao, {
      justificada: true,
      motivo: 'Atestado',
    }).expect(201);

    const { body } = await request(app.getHttpServer())
      .get(`/pacientes/${caso}/dados-administrativos`)
      .set(como('secretaria'))
      .expect(200);

    expect(body.faltasNoCiclo).toEqual({
      faltas: 1,
      limite: 2,
      aviso: 'primeira_falta',
    });
    expect(body.sessoes).toHaveLength(1);
    expect(body.sessoes[0].status).toBe('falta_paciente');
    expect(body.sessoes[0].falta).toMatchObject({
      justificada: true,
      motivo: 'Atestado',
      registradaPor: 'Juliana Rocha',
    });
  });
});
