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
  desligamentoFaltas,
  desligamentosPorFaltas,
  faltasPaciente,
  inscricoes,
  sessoesAtendimento,
  usuarios,
  vagasLiberadas,
  vinculosEstagiario,
  type Db,
} from '@clinica/database';
import { AuditoriaModule } from '../../auditoria/auditoria.module';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { DB } from '../../database/database.module';
import { ParametrosModule } from '../../parametros/parametros.module';
import { AcompanhamentoClinicoModule } from '../acompanhamento-clinico/acompanhamento-clinico.module';
import { CasosModule } from '../casos/casos.module';
import {
  CHAVE_TESTE,
  criarBancoDeTeste,
} from '../../test-utils/banco-de-teste';
import { AssiduidadeModule } from './assiduidade.module';

// RF36, RF37 e RF38: alerta do limite de faltas, desligamento por faltas com a vaga
// liberada e reversão pela coordenação. O usuário da sessão (RF50) é simulado pelo
// cabeçalho x-usuario-teste.
const HORA = 60 * 60 * 1000;

describe('Alerta, desligamento por faltas e reversão (RF36, RF37, RF38)', () => {
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
        AssiduidadeModule,
        AcompanhamentoClinicoModule,
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

  // Caso em atendimento com a estagiária e a Carla como supervisora.
  async function criarCaso(nome = 'Mariana Alves Toledo', estagiaria = 'ana') {
    numero += 1;
    const [inscricao] = await db
      .insert(inscricoes)
      .values({
        numero: `2026-${String(numero).padStart(5, '0')}`,
        nomeCompleto: nome,
        dataNascimento: '1994-08-22',
        cpf: String(numero).padStart(11, '0'),
        rg: '1234567',
        endereco: 'Rua Fictícia, 1',
        estadoCivil: 'solteiro',
        canalPreferencial: 'email',
        email: 'mariana@exemplo.com',
        queixaCifrada: 'x',
        percepcaoUrgenciaCifrada: 'x',
        historicoRelevanteCifrado: 'x',
      })
      .returning();
    const [caso] = await db
      .insert(casos)
      .values({ inscricaoId: inscricao.id, situacao: 'em_atendimento' })
      .returning();
    await db.insert(atribuicoesSupervisor).values({
      casoId: caso.id,
      supervisorId: pessoas.carla.id,
      atribuidoPor: pessoas.coordenacao.id,
    });
    await db.insert(vinculosEstagiario).values({
      casoId: caso.id,
      estagiarioId: pessoas[estagiaria].id,
      vinculadoPor: pessoas.carla.id,
    });
    return caso.id;
  }

  // Sessão de 50 minutos que começa `horas` horas a partir de agora.
  async function criarSessao(casoId: string, horas: number, quem = 'ana') {
    const inicio = new Date(Date.now() + horas * HORA);
    const [sessao] = await db
      .insert(sessoesAtendimento)
      .values({
        casoId,
        estagiarioId: pessoas[quem].id,
        inicio,
        termino: new Date(inicio.getTime() + 50 * 60 * 1000),
        fimIntervaloAnotacoes: new Date(inicio.getTime() + HORA),
        agendadaPor: pessoas.secretaria.id,
      })
      .returning();
    return sessao.id;
  }

  const como = (quem: string) => ({
    'x-usuario-teste': JSON.stringify(pessoas[quem]),
  });
  const http = () => request(app.getHttpServer());
  const falta = (sessaoId: string) =>
    http()
      .post(`/sessoes/${sessaoId}/falta`)
      .set(como('secretaria'))
      .send({})
      .expect(201);
  // Caso com o limite atingido (2 faltas) e duas sessões futuras.
  async function casoNoLimite(nome?: string, estagiaria = 'ana') {
    const caso = await criarCaso(nome, estagiaria);
    await falta(await criarSessao(caso, -200, estagiaria));
    await falta(await criarSessao(caso, -50, estagiaria));
    await criarSessao(caso, 100, estagiaria);
    await criarSessao(caso, 268, estagiaria);
    return caso;
  }
  const alertas = (quem: string) =>
    http().get('/faltas/alertas').set(como(quem)).expect(200);
  const desligar = (casoId: string, quem = 'secretaria') =>
    http().post(`/casos/${casoId}/desligamento`).set(como(quem));
  const reverter = (id: string, corpo: object, quem = 'coordenacao') =>
    http().post(`/desligamentos/${id}/reversao`).set(como(quem)).send(corpo);

  describe('RF36 — alerta do limite de faltas', () => {
    it('na 2ª falta, o alerta aparece para a secretaria, a coordenação e o estagiário responsável, sem o motivo', async () => {
      const caso = await casoNoLimite();
      for (const quem of ['secretaria', 'coordenacao', 'ana']) {
        const { body } = await alertas(quem);
        expect(body.limite).toEqual([
          expect.objectContaining({
            casoId: caso,
            nome: 'Mariana Alves Toledo',
            faltas: 2,
          }),
        ]);
        expect(JSON.stringify(body)).not.toContain('motivo');
      }
    });

    it('o estagiário que não é o responsável e o supervisor não recebem o alerta', async () => {
      await casoNoLimite();
      expect((await alertas('pedro')).body.limite).toEqual([]);
      expect((await alertas('carla')).body).toEqual({
        limite: [],
        primeiraFalta: [],
      });
    });

    it('com 1 falta não há alerta; o aviso da 1ª falta vai à secretaria e ao estagiário, não à coordenação, e some quando a sessão seguinte termina', async () => {
      const caso = await criarCaso();
      await falta(await criarSessao(caso, -50));
      expect((await alertas('secretaria')).body).toEqual({
        limite: [],
        primeiraFalta: [expect.objectContaining({ casoId: caso, faltas: 1 })],
      });
      expect((await alertas('ana')).body.primeiraFalta).toHaveLength(1);
      expect((await alertas('coordenacao')).body.primeiraFalta).toEqual([]);

      const seguinte = await criarSessao(caso, -2);
      await db
        .update(sessoesAtendimento)
        .set({ status: 'realizada' })
        .where(eq(sessoesAtendimento.id, seguinte));
      expect((await alertas('secretaria')).body.primeiraFalta).toEqual([]);
    });

    it('o desligamento remove o alerta', async () => {
      const caso = await casoNoLimite();
      await desligar(caso).expect(201);
      expect((await alertas('secretaria')).body.limite).toEqual([]);
    });
  });

  describe('RF37 — desligamento por faltas e vaga liberada', () => {
    it('paciente sem alerta pendente não é desligado (422)', async () => {
      const caso = await criarCaso();
      await falta(await criarSessao(caso, -50));
      const res = await desligar(caso).expect(422);
      expect(res.body.message).toContain('não tem alerta');
    });

    it('só a secretaria e a coordenação desligam', async () => {
      const caso = await casoNoLimite();
      for (const quem of ['ana', 'carla']) {
        await desligar(caso, quem).expect(403);
      }
    });

    it('a confirmação registra a decisão, muda a situação, encerra o vínculo, cancela as sessões futuras e libera a vaga', async () => {
      const caso = await casoNoLimite();
      const { body } = await desligar(caso).expect(201);
      expect(body).toMatchObject({
        estagiario: 'Ana Beatriz Costa',
        sessoesCanceladas: 2,
      });

      const [registro] = await db
        .select()
        .from(desligamentosPorFaltas)
        .where(eq(desligamentosPorFaltas.casoId, caso));
      expect(registro.decididoPor).toBe(pessoas.secretaria.id);
      expect(
        await db
          .select()
          .from(desligamentoFaltas)
          .where(eq(desligamentoFaltas.desligamentoId, registro.id)),
      ).toHaveLength(2);
      const [situacao] = await db
        .select({ situacao: casos.situacao })
        .from(casos)
        .where(eq(casos.id, caso));
      expect(situacao.situacao).toBe('desligado_por_faltas');
      const vinculos = await db
        .select()
        .from(vinculosEstagiario)
        .where(eq(vinculosEstagiario.casoId, caso));
      expect(vinculos.every((v) => !v.vigente)).toBe(true);

      const canceladas = await db
        .select()
        .from(cancelamentosSessao)
        .where(eq(cancelamentosSessao.desligamentoId, registro.id));
      expect(canceladas).toHaveLength(2);
      expect(canceladas[0]).toMatchObject({
        classificacao: 'desligamento',
        origem: 'secretaria',
      });
      // Nenhuma falta nova com o cancelamento.
      expect(
        await db
          .select()
          .from(faltasPaciente)
          .where(eq(faltasPaciente.casoId, caso)),
      ).toHaveLength(2);

      const [vaga] = await db.select().from(vagasLiberadas);
      expect(vaga).toMatchObject({
        estagiarioId: pessoas.ana.id,
        supervisorId: pessoas.carla.id,
        ocupadaEm: null,
      });
      const [evento] = await db
        .select()
        .from(auditoria)
        .where(eq(auditoria.operacao, 'desligar_por_faltas'));
      expect(evento.usuarioId).toBe(pessoas.secretaria.id);
    });

    it('um segundo pedido de desligamento do mesmo caso é recusado (422)', async () => {
      const caso = await casoNoLimite();
      await desligar(caso).expect(201);
      await desligar(caso, 'coordenacao').expect(422);
      expect(await db.select().from(vagasLiberadas)).toHaveLength(1);
    });

    it('a vaga aparece para a coordenação e para o supervisor do caso, e não para outro supervisor', async () => {
      const caso = await casoNoLimite();
      await desligar(caso, 'coordenacao').expect(201);
      const vagas = (quem: string) =>
        http().get('/vagas/liberadas').set(como(quem)).expect(200);
      const esperado = [
        expect.objectContaining({
          estagiario: 'Ana Beatriz Costa',
          supervisor: 'Carla Mendes',
          proximoInscrito: null,
        }),
      ];
      expect((await vagas('coordenacao')).body).toEqual(esperado);
      expect((await vagas('carla')).body).toEqual(esperado);
      expect((await vagas('ricardo')).body).toEqual([]);
      await http().get('/vagas/liberadas').set(como('secretaria')).expect(403);
    });

    it('o supervisor não vincula estagiário ao caso desligado (409), e o caso desligado sai do limite de casos do supervisor', async () => {
      const caso = await casoNoLimite();
      await desligar(caso).expect(201);
      const res = await http()
        .post(`/casos/${caso}/estagiario`)
        .set(como('carla'))
        .send({ estagiarioId: pessoas.pedro.id })
        .expect(409);
      expect(res.body.message).toContain('só a coordenação reverte');

      const { body } = await http()
        .get('/supervisores/disponibilidade')
        .set(como('coordenacao'))
        .expect(200);
      expect(
        body.find((s: { nome: string }) => s.nome === 'Carla Mendes')
          .casosAtivos,
      ).toBe(0);

      const meus = await http()
        .get('/casos/meus')
        .set(como('carla'))
        .expect(200);
      expect(meus.body[0]).toMatchObject({
        situacao: 'desligado_por_faltas',
        estagiario: null,
      });
      expect(meus.body[0].vinculoEncerradoEm).toBeTruthy();
    });

    it('o vínculo de um paciente novo com o mesmo estagiário ocupa a vaga (RF21)', async () => {
      const caso = await casoNoLimite();
      await desligar(caso).expect(201);
      const novo = await criarCaso('Vitória Campos Neves');
      await db
        .update(vinculosEstagiario)
        .set({ vigente: false })
        .where(eq(vinculosEstagiario.casoId, novo));
      await db
        .update(casos)
        .set({ situacao: 'aguardando_vinculo' })
        .where(eq(casos.id, novo));
      await http()
        .post(`/casos/${novo}/estagiario`)
        .set(como('carla'))
        .send({ estagiarioId: pessoas.ana.id })
        .expect(201);
      const [vaga] = await db.select().from(vagasLiberadas);
      expect(vaga.ocupadaEm).not.toBeNull();
      expect(
        (await http().get('/vagas/liberadas').set(como('coordenacao'))).body,
      ).toEqual([]);
    });

    it('o banco não deixa apagar o desligamento nem trocar quem decidiu (RNF32)', async () => {
      const caso = await casoNoLimite();
      await desligar(caso).expect(201);
      await expect(db.delete(desligamentosPorFaltas)).rejects.toThrow();
      await expect(
        db
          .update(desligamentosPorFaltas)
          .set({ decididoPor: pessoas.coordenacao.id }),
      ).rejects.toThrow();
      await expect(db.delete(cancelamentosSessao)).rejects.toThrow();
    });
  });

  describe('RF38 — reversão do desligamento', () => {
    async function desligado(estagiaria = 'ana') {
      const caso = await casoNoLimite(undefined, estagiaria);
      const { body } = await desligar(caso).expect(201);
      const faltas = await db
        .select({ id: faltasPaciente.id })
        .from(faltasPaciente)
        .where(eq(faltasPaciente.casoId, caso));
      return { caso, id: body.desligamentoId as string, faltas };
    }

    it('outro perfil não reverte (403)', async () => {
      const { id } = await desligado();
      for (const quem of ['secretaria', 'carla', 'ana']) {
        await reverter(id, { motivo: 'x' }, quem).expect(403);
      }
    });

    it('a reversão sem motivo é recusada, com o campo indicado (400)', async () => {
      const { id } = await desligado();
      const res = await reverter(id, { motivo: ' ' }).expect(400);
      expect(JSON.stringify(res.body)).toContain(
        'Informe o motivo da reversão.',
      );
    });

    it('a falta de outro caso não pode ser retirada (400)', async () => {
      const { id } = await desligado();
      const outro = await desligado('pedro');
      await reverter(id, {
        motivo: 'Erro de registro',
        faltasRetiradas: [outro.faltas[0].id],
      }).expect(400);
    });

    it('com a contagem resultante no limite, pede a confirmação (422) e aceita com manterContagem', async () => {
      const { id } = await desligado();
      const res = await reverter(id, { motivo: 'Decisão da clínica' }).expect(
        422,
      );
      expect(res.body.contagemResultante).toBe(2);
      await reverter(id, {
        motivo: 'Decisão da clínica',
        manterContagem: true,
      }).expect(200);
      // Volta ao atendimento já no limite: o alerta aparece de novo.
      expect((await alertas('secretaria')).body.limite).toHaveLength(1);
    });

    it('com a vaga livre, volta ao atendimento com o mesmo estagiário, num vínculo novo, a vaga sai e as sessões ficam para reagendar', async () => {
      const { caso, id, faltas } = await desligado();
      const { body } = await reverter(id, {
        motivo: 'O cancelamento foi pedido para remarcar a sessão.',
        faltasRetiradas: [faltas[1].id],
      }).expect(200);
      expect(body).toEqual({
        situacao: 'em_atendimento',
        estagiario: 'Ana Beatriz Costa',
        sessoesAReagendar: 2,
      });
      const vinculos = await db
        .select()
        .from(vinculosEstagiario)
        .where(eq(vinculosEstagiario.casoId, caso));
      expect(vinculos).toHaveLength(2);
      expect(vinculos.filter((v) => v.vigente)).toHaveLength(1);
      const [vaga] = await db.select().from(vagasLiberadas);
      expect(vaga.encerradaEm).not.toBeNull();
      expect(
        (await http().get('/vagas/liberadas').set(como('coordenacao'))).body,
      ).toEqual([]);

      const [retirada] = await db
        .select()
        .from(faltasPaciente)
        .where(eq(faltasPaciente.id, faltas[1].id));
      expect(retirada.retiradaPor).toBe(pessoas.coordenacao.id);

      // O motivo fica cifrado no desligamento e fora da auditoria.
      const [registro] = await db
        .select()
        .from(desligamentosPorFaltas)
        .where(eq(desligamentosPorFaltas.id, id));
      expect(registro.motivoReversaoCifrado).not.toContain('remarcar');
      const [evento] = await db
        .select()
        .from(auditoria)
        .where(eq(auditoria.operacao, 'reverter_desligamento'));
      expect(JSON.stringify(evento.dadosNovos)).not.toContain('remarcar');

      // A secretaria vê as sessões a reagendar e o histórico, sem o motivo.
      const dados = await http()
        .get(`/pacientes/${caso}/dados-administrativos`)
        .set(como('secretaria'))
        .expect(200);
      expect(dados.body.sessoesAReagendar).toHaveLength(2);
      expect(dados.body.desligamentos[0]).toMatchObject({
        decididoPor: 'Juliana Rocha',
        revertidoPor: 'Helena Duarte',
        motivoReversao: null,
      });
      const daCoordenacao = await http()
        .get(`/pacientes/${caso}/dados-administrativos`)
        .set(como('coordenacao'))
        .expect(200);
      expect(daCoordenacao.body.desligamentos[0].motivoReversao).toBe(
        'O cancelamento foi pedido para remarcar a sessão.',
      );

      // Uma sessão nova agendada encerra a lista de sessões a reagendar.
      await criarSessao(caso, 300);
      const depois = await http()
        .get(`/pacientes/${caso}/dados-administrativos`)
        .set(como('secretaria'));
      expect(depois.body.sessoesAReagendar).toEqual([]);
    });

    it('com a vaga já ocupada, o caso fica aguardando vaga e o vínculo do paciente novo não é tocado; o supervisor vincula depois', async () => {
      const { caso, id, faltas } = await desligado();
      const novo = await criarCaso('Vitória Campos Neves');
      const [vinculoNovo] = await db
        .select()
        .from(vinculosEstagiario)
        .where(eq(vinculosEstagiario.casoId, novo));
      await db
        .update(vagasLiberadas)
        .set({ ocupadaEm: new Date(), ocupadaPorVinculoId: vinculoNovo.id });

      const { body } = await reverter(id, {
        motivo: 'Erro de registro',
        faltasRetiradas: [faltas[0].id],
      }).expect(200);
      expect(body.situacao).toBe('aguardando_vaga');
      const [situacao] = await db
        .select({ situacao: casos.situacao })
        .from(casos)
        .where(eq(casos.id, caso));
      expect(situacao.situacao).toBe('aguardando_vaga');
      const [mantido] = await db
        .select()
        .from(vinculosEstagiario)
        .where(eq(vinculosEstagiario.id, vinculoNovo.id));
      expect(mantido.vigente).toBe(true);

      const aguardando = await http()
        .get('/casos/aguardando-vaga')
        .set(como('coordenacao'))
        .expect(200);
      expect(aguardando.body).toEqual([
        expect.objectContaining({ casoId: caso, supervisor: 'Carla Mendes' }),
      ]);
      await http()
        .post(`/casos/${caso}/estagiario`)
        .set(como('carla'))
        .send({ estagiarioId: pessoas.pedro.id })
        .expect(201);
    });

    it('com o estagiário desativado depois do desligamento, o caso fica aguardando vaga', async () => {
      const { id, faltas } = await desligado();
      await db
        .update(usuarios)
        .set({ situacao: 'desativado' })
        .where(eq(usuarios.id, pessoas.ana.id));
      const { body } = await reverter(id, {
        motivo: 'Erro de registro',
        faltasRetiradas: [faltas[0].id],
      }).expect(200);
      expect(body.situacao).toBe('aguardando_vaga');
    });

    it('uma segunda reversão do mesmo desligamento é recusada (409)', async () => {
      const { id, faltas } = await desligado();
      await reverter(id, {
        motivo: 'Erro de registro',
        faltasRetiradas: [faltas[0].id],
      }).expect(200);
      await reverter(id, { motivo: 'De novo', manterContagem: true }).expect(
        409,
      );
      expect(
        await db
          .select()
          .from(vinculosEstagiario)
          .where(
            and(
              eq(vinculosEstagiario.vigente, true),
              eq(vinculosEstagiario.estagiarioId, pessoas.ana.id),
            ),
          ),
      ).toHaveLength(1);
    });
  });
});
