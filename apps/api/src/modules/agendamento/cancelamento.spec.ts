import { Global, INestApplication, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import {
  atribuicoesSupervisor,
  auditoria,
  cancelamentosSessao,
  casos,
  faltasPaciente,
  inscricoes,
  linksConfirmacao,
  parametros,
  sessoesAtendimento,
  usuarios,
  vinculosEstagiario,
  type Db,
} from '@clinica/database';
import type { StatusSessao } from '@clinica/shared';
import { AuditoriaModule } from '../../auditoria/auditoria.module';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { decifrar } from '../../common/criptografia';
import { DB } from '../../database/database.module';
import { EmailService } from '../../notificacoes/email.service';
import { ParametrosModule } from '../../parametros/parametros.module';
import {
  CHAVE_TESTE,
  criarBancoDeTeste,
} from '../../test-utils/banco-de-teste';
import { gerarToken } from '../acesso/credenciais';
import { acoesDeCancelamento } from './acoes-cancelamento';
import { AgendamentoModule } from './agendamento.module';

// RF15, RF16, RNF10 e RNF59: cancelamento pelo link, pela equipe e ausência do
// estagiário. O usuário da sessão é simulado pelo cabeçalho x-usuario-teste.
const MINUTO = 60_000;
const LINK_INVALIDO = /não é mais válido/;
const JUSTIFICATIVA = 'Consulta médica marcada no mesmo horário.';

describe('Cancelamento de sessão (RF15 e RF16)', () => {
  let app: INestApplication;
  let db: Db;
  let limpar: () => Promise<unknown>;
  let fechar: () => Promise<void>;
  const enviar = jest.fn();
  const pessoas: Record<string, UsuarioAutenticado> = {};
  let numero = 0;
  let caso: string;
  let outroCaso: string;
  let antecedenciaDaMigration: string | undefined;

  beforeAll(async () => {
    ({ db, limpar, fechar } = await criarBancoDeTeste());
    // Lido antes da primeira limpeza: o TRUNCATE de usuarios esvazia os parâmetros.
    const [linha] = await db
      .select()
      .from(parametros)
      .where(eq(parametros.chave, 'antecedencia_minima_cancelamento_minutos'));
    antecedenciaDaMigration = linha?.valor;

    @Global()
    @Module({
      providers: [
        { provide: DB, useValue: db },
        { provide: EmailService, useValue: { enviar } },
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
              WEB_URL: 'http://localhost:3000',
              CHAVE_DADOS: CHAVE_TESTE,
            }),
          ],
        }),
        InfraDeTeste,
        AuditoriaModule,
        ParametrosModule,
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
    jest.useRealTimers();
    enviar.mockReset();
    await limpar();
    for (const [chave, nome, perfil] of [
      ['secretaria', 'Juliana Rocha', 'secretaria'],
      ['ana', 'Ana Beatriz Costa', 'estagiario'],
      ['joao', 'João Victor Almeida', 'estagiario'],
      ['carla', 'Carla Mendes', 'supervisor'],
      ['patricia', 'Patrícia Nogueira', 'supervisor'],
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
    caso = await criarCaso(pessoas.ana, pessoas.carla);
    outroCaso = await criarCaso(pessoas.joao, pessoas.patricia);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  async function criarCaso(
    estagiario: UsuarioAutenticado,
    supervisor: UsuarioAutenticado,
    email: string | null = 'mariana@exemplo.com',
  ) {
    numero += 1;
    const [inscricao] = await db
      .insert(inscricoes)
      .values({
        numero: `2026-${String(numero).padStart(4, '0')}`,
        nomeCompleto: 'Mariana Alves Toledo',
        dataNascimento: '1990-01-01',
        cpf: String(numero).padStart(11, '0'),
        rg: '1234567',
        endereco: 'Rua Fictícia, 1',
        estadoCivil: 'solteiro',
        canalPreferencial: email ? 'email' : 'whatsapp',
        celular: '61998765432',
        email,
        queixaCifrada: 'x',
        percepcaoUrgenciaCifrada: 'x',
        historicoRelevanteCifrado: 'x',
      })
      .returning();
    const [novo] = await db
      .insert(casos)
      .values({
        inscricaoId: inscricao.id,
        entradaNaFilaEm: inscricao.criadaEm,
        situacao: 'em_atendimento',
      })
      .returning();
    await db.insert(atribuicoesSupervisor).values({
      casoId: novo.id,
      supervisorId: supervisor.id,
      atribuidoPor: pessoas.coordenacao.id,
    });
    await db.insert(vinculosEstagiario).values({
      casoId: novo.id,
      estagiarioId: estagiario.id,
      vinculadoPor: supervisor.id,
    });
    return novo.id;
  }

  // Sessão com início em `inicio` (ou daqui a `minutos`), com o link já gerado.
  async function criarSessao(
    quando: number | Date,
    status: StatusSessao = 'agendada',
    opcoes: { casoId?: string; estagiarioId?: string } = {},
  ) {
    const inicio =
      quando instanceof Date ? quando : new Date(Date.now() + quando * MINUTO);
    const termino = new Date(inicio.getTime() + 50 * MINUTO);
    const [sessao] = await db
      .insert(sessoesAtendimento)
      .values({
        casoId: opcoes.casoId ?? caso,
        estagiarioId: opcoes.estagiarioId ?? pessoas.ana.id,
        inicio,
        termino,
        fimIntervaloAnotacoes: new Date(termino.getTime() + 10 * MINUTO),
        status,
        agendadaPor: pessoas.secretaria.id,
      })
      .returning();
    const { token, hash } = gerarToken();
    await db
      .insert(linksConfirmacao)
      .values({ sessaoId: sessao.id, tokenHash: hash, expiraEm: inicio });
    return { id: sessao.id, token, inicio };
  }

  const servidor = () => request(app.getHttpServer());
  const abrir = (token: string) => servidor().get(`/confirmacao/${token}`);
  const cancelarPeloLink = (token: string, justificativa?: string) =>
    servidor()
      .post(`/confirmacao/${token}/cancelar`)
      .send(justificativa === undefined ? {} : { justificativa });
  const cancelar = (
    quem: string,
    id: string,
    tipo: string,
    justificativa: string | undefined = JUSTIFICATIVA,
  ) =>
    servidor()
      .post(`/sessoes/${id}/cancelamento`)
      .set('x-usuario-teste', JSON.stringify(pessoas[quem]))
      .send({ tipo, justificativa });
  const ausencia = (
    quem: string,
    id: string,
    justificativa: string | undefined = 'Prova da disciplina no mesmo horário.',
  ) =>
    servidor()
      .post(`/sessoes/${id}/ausencia-estagiario`)
      .set('x-usuario-teste', JSON.stringify(pessoas[quem]))
      .send({ justificativa });

  const sessaoNoBanco = async (id: string) => {
    const [sessao] = await db
      .select()
      .from(sessoesAtendimento)
      .where(eq(sessoesAtendimento.id, id));
    return sessao;
  };
  const cancelamentoNoBanco = async (id: string) => {
    const [linha] = await db
      .select()
      .from(cancelamentosSessao)
      .where(eq(cancelamentosSessao.sessaoId, id));
    return linha;
  };
  const faltasDa = (id: string) =>
    db.select().from(faltasPaciente).where(eq(faltasPaciente.sessaoId, id));
  const eventos = (id: string) =>
    db.select().from(auditoria).where(eq(auditoria.entidadeId, id));
  const linkUsado = async (id: string) => {
    const [link] = await db
      .select()
      .from(linksConfirmacao)
      .where(eq(linksConfirmacao.sessaoId, id));
    return link.usadoEm;
  };

  // Só o relógio do JavaScript para: o banco e o servidor seguem normais.
  const pararRelogioEm = (instante: Date) =>
    jest.useFakeTimers({
      now: instante,
      doNotFake: [
        'nextTick',
        'setImmediate',
        'clearImmediate',
        'setInterval',
        'clearInterval',
        'setTimeout',
        'clearTimeout',
        'queueMicrotask',
        'hrtime',
        'performance',
      ],
    });

  describe('antecedência (DF20)', () => {
    // Sessão às 14h00 de um dia futuro, com a antecedência mínima de 1 hora.
    const sessaoAs14 = new Date('2030-12-05T14:00:00-03:00');
    const em = (hora: string) => new Date(`2030-12-05T${hora}-03:00`);

    it.each([
      ['12:59:00', 'no_prazo', 61, 0],
      ['13:00:00', 'no_prazo', 60, 0],
      ['13:01:00', 'fora_do_prazo', 59, 1],
    ])(
      'cancelado às %s: %s, com %i minutos de antecedência e %i falta',
      async (hora, classificacao, minutos, faltas) => {
        const { id, token } = await criarSessao(sessaoAs14);
        pararRelogioEm(em(hora));

        const { body } = await cancelarPeloLink(token, JUSTIFICATIVA).expect(
          200,
        );

        expect(body.contaComoFalta).toBe(faltas === 1);
        expect(await cancelamentoNoBanco(id)).toMatchObject({
          classificacao,
          antecedenciaMinutos: minutos,
        });
        expect(await faltasDa(id)).toHaveLength(faltas);
      },
    );

    it('o valor padrão de 60 minutos vem da migration (DF20)', () => {
      expect(antecedenciaDaMigration).toBe('60');
    });

    it('o parâmetro vigente no momento do registro decide e vai para a página do link', async () => {
      await db.insert(parametros).values({
        chave: 'antecedencia_minima_cancelamento_minutos',
        valor: '120',
      });
      const { id, token } = await criarSessao(90);

      const aberta = await abrir(token).expect(200);
      expect(aberta.body.antecedenciaMinimaMinutos).toBe(120);
      await cancelarPeloLink(token, JUSTIFICATIVA).expect(200);

      expect((await cancelamentoNoBanco(id)).classificacao).toBe(
        'fora_do_prazo',
      );
    });
  });

  describe('pelo link, sem login (RF15, RNF59)', () => {
    it('no prazo: cancela, guarda a justificativa cifrada, usa o link e audita o paciente, sem falta', async () => {
      const { id, token, inicio } = await criarSessao(3 * 60);

      const resposta = await cancelarPeloLink(token, JUSTIFICATIVA).expect(200);

      expect(resposta.body).toEqual({
        primeiroNome: 'Mariana',
        inicio: inicio.toISOString(),
        situacao: 'cancelada',
        contaComoFalta: false,
      });
      expect(resposta.headers['cache-control']).toBe('no-store');
      expect((await sessaoNoBanco(id)).status).toBe('cancelada');
      const cancelamento = await cancelamentoNoBanco(id);
      expect(cancelamento).toMatchObject({
        origem: 'link',
        classificacao: 'no_prazo',
        registradoPor: null,
      });
      expect(cancelamento.justificativaCifrada).not.toContain('Consulta');
      expect(decifrar(cancelamento.justificativaCifrada!, CHAVE_TESTE)).toBe(
        JUSTIFICATIVA,
      );
      expect(await linkUsado(id)).toBeInstanceOf(Date);
      expect(await faltasDa(id)).toHaveLength(0);
      const [evento] = await eventos(id);
      expect(evento).toMatchObject({
        usuarioId: null,
        operacao: 'cancelar_sessao',
        dadosAnteriores: { status: 'agendada' },
        dadosNovos: {
          status: 'cancelada',
          origem: 'link',
          classificacao: 'no_prazo',
          autor: 'paciente',
        },
      });
      expect(JSON.stringify(evento)).not.toContain('Consulta');
      expect(enviar).not.toHaveBeenCalled();
    });

    it('fora do prazo: a falta vem do paciente, pelo link, na mesma transação (RF35)', async () => {
      const { id, token } = await criarSessao(30);

      const { body } = await cancelarPeloLink(token, JUSTIFICATIVA).expect(200);

      expect(body.contaComoFalta).toBe(true);
      const [falta] = await faltasDa(id);
      expect(falta).toMatchObject({
        origem: 'cancelamento_fora_do_prazo',
        registradaPor: null,
        registradaPeloPaciente: true,
      });
    });

    it('a sessão confirmada também pode ser cancelada', async () => {
      const { id, token } = await criarSessao(48 * 60, 'confirmada');

      await cancelarPeloLink(token, JUSTIFICATIVA).expect(200);

      const [evento] = await eventos(id);
      expect(evento.dadosAnteriores).toEqual({ status: 'confirmada' });
    });

    it.each([
      ['sem justificativa', undefined],
      ['com a justificativa em branco', '   '],
    ])(
      '%s: não cancela, e o campo é indicado',
      async (_caso, justificativa) => {
        const { id, token } = await criarSessao(3 * 60);

        const { body } = await cancelarPeloLink(token, justificativa).expect(
          400,
        );

        expect(JSON.stringify(body)).toMatch(/Informe o motivo/);
        expect((await sessaoNoBanco(id)).status).toBe('agendada');
        expect(await linkUsado(id)).toBeNull();
      },
    );

    it('depois do cancelamento, o link não permite nenhuma nova operação', async () => {
      const { token } = await criarSessao(3 * 60);
      await cancelarPeloLink(token, JUSTIFICATIVA).expect(200);

      for (const resposta of [
        await abrir(token),
        await servidor().post(`/confirmacao/${token}/confirmar`),
        await cancelarPeloLink(token, JUSTIFICATIVA),
      ]) {
        expect(resposta.status).toBe(404);
        expect(resposta.body.message).toMatch(LINK_INVALIDO);
      }
    });

    it('sessão já iniciada: a mesma resposta do link inválido, sem dados da sessão', async () => {
      const { id, token } = await criarSessao(-5);

      const { body } = await cancelarPeloLink(token, JUSTIFICATIVA).expect(404);

      expect(body.message).toMatch(LINK_INVALIDO);
      expect((await sessaoNoBanco(id)).status).toBe('agendada');
    });

    it('dois cancelamentos ao mesmo tempo: só um vale', async () => {
      const { id, token } = await criarSessao(3 * 60);

      const respostas = await Promise.all([
        cancelarPeloLink(token, JUSTIFICATIVA),
        cancelarPeloLink(token, JUSTIFICATIVA),
      ]);

      expect(respostas.map((r) => r.status).sort((a, b) => a - b)).toEqual([
        200, 404,
      ]);
      expect(await eventos(id)).toHaveLength(1);
    });

    it('a sessão cancelada libera o horário na agenda (RNF9)', async () => {
      const { inicio, token } = await criarSessao(3 * 60);
      await cancelarPeloLink(token, JUSTIFICATIVA).expect(200);

      await expect(criarSessao(inicio)).resolves.toBeDefined();
    });
  });

  describe('pela equipe (RF15)', () => {
    it('pedido do paciente pela secretaria, fora do prazo: a falta fica com a secretaria, sem aviso ao paciente', async () => {
      const { id } = await criarSessao(40);

      const { body } = await cancelar(
        'secretaria',
        id,
        'pedido_paciente',
      ).expect(200);

      expect(body).toMatchObject({
        classificacao: 'fora_do_prazo',
        antecedenciaMinutos: 39,
        avisoAoPaciente: null,
      });
      expect(await cancelamentoNoBanco(id)).toMatchObject({
        origem: 'secretaria',
        registradoPor: pessoas.secretaria.id,
      });
      const [falta] = await faltasDa(id);
      expect(falta).toMatchObject({
        origem: 'cancelamento_fora_do_prazo',
        registradaPor: pessoas.secretaria.id,
      });
      expect(enviar).not.toHaveBeenCalled();
    });

    it('administrativo 10 minutos antes: não gera falta, invalida o link e avisa o paciente por e-mail, sem o motivo', async () => {
      const { id, token } = await criarSessao(10);

      const { body } = await cancelar(
        'secretaria',
        id,
        'administrativo',
      ).expect(200);

      expect(body).toMatchObject({
        classificacao: 'administrativo',
        avisoAoPaciente: 'email_enviado',
      });
      expect(await faltasDa(id)).toHaveLength(0);
      await abrir(token).expect(404);
      expect(enviar).toHaveBeenCalledTimes(1);
      const [para, assunto, html] = enviar.mock.calls[0];
      expect(para).toBe('mariana@exemplo.com');
      expect(assunto).toMatch(/cancelada/);
      expect(html).toMatch(/não conta como falta/);
      expect(html).not.toContain('Consulta');
    });

    it('administrativo pelo estagiário responsável', async () => {
      const { id } = await criarSessao(3 * 60);

      await cancelar('ana', id, 'administrativo').expect(200);

      expect(await cancelamentoNoBanco(id)).toMatchObject({
        origem: 'estagiario',
        classificacao: 'administrativo',
        registradoPor: pessoas.ana.id,
      });
    });

    it('o estagiário não registra o pedido do paciente: é a secretaria', async () => {
      const { id } = await criarSessao(3 * 60);

      const { body } = await cancelar('ana', id, 'pedido_paciente').expect(403);

      expect(body.message).toMatch(/secretaria/);
      expect((await sessaoNoBanco(id)).status).toBe('agendada');
    });

    it.each([
      ['o estagiário de outro caso', 'joao'],
      ['o supervisor', 'carla'],
      ['a coordenação', 'coordenacao'],
    ])('%s não cancela (403)', async (_quem, chave) => {
      const { id } = await criarSessao(3 * 60);

      await cancelar(chave, id, 'administrativo').expect(403);

      expect((await sessaoNoBanco(id)).status).toBe('agendada');
      expect(await eventos(id)).toHaveLength(0);
    });

    it.each([
      ['já iniciada', -5, 'agendada' as const, /já começou/],
      ['realizada', -120, 'realizada' as const, /realizada/],
      ['já cancelada', 3 * 60, 'cancelada' as const, /já foi cancelada/],
    ])(
      'sessão %s: não pode ser cancelada (422)',
      async (_caso, minutos, status, mensagem) => {
        const { id } = await criarSessao(minutos, status);

        const { body } = await cancelar(
          'secretaria',
          id,
          'pedido_paciente',
        ).expect(422);

        expect(body.message).toMatch(mensagem);
        expect(await cancelamentoNoBanco(id)).toBeUndefined();
      },
    );

    it('sem justificativa: não cancela', async () => {
      const { id } = await criarSessao(3 * 60);

      await cancelar('secretaria', id, 'pedido_paciente', '').expect(400);

      expect((await sessaoNoBanco(id)).status).toBe('agendada');
    });

    it('sessão inexistente: 404', async () => {
      await cancelar(
        'secretaria',
        '00000000-0000-4000-8000-000000000000',
        'pedido_paciente',
      ).expect(404);
    });
  });

  describe('ausência do estagiário (RF16)', () => {
    it('pelo estagiário: cancela como ausência, sem falta do paciente, e avisa por e-mail', async () => {
      const { id } = await criarSessao(3 * 60);

      const { body } = await ausencia('ana', id).expect(200);

      expect(body).toMatchObject({
        classificacao: 'ausencia_estagiario',
        avisoAoPaciente: 'email_enviado',
      });
      expect(await cancelamentoNoBanco(id)).toMatchObject({
        origem: 'estagiario',
        classificacao: 'ausencia_estagiario',
      });
      expect(await faltasDa(id)).toHaveLength(0);
      const [evento] = await eventos(id);
      expect(evento).toMatchObject({
        usuarioId: pessoas.ana.id,
        operacao: 'cancelar_sessao',
        dadosNovos: { classificacao: 'ausencia_estagiario' },
      });
      expect(enviar.mock.calls[0][2]).not.toContain('Prova');
    });

    it.each([
      ['o supervisor do caso', 'carla', 'supervisor'],
      ['a secretaria', 'secretaria', 'secretaria'],
    ])('por %s', async (_quem, chave, origem) => {
      const { id } = await criarSessao(3 * 60);

      await ausencia(chave, id).expect(200);

      expect((await cancelamentoNoBanco(id)).origem).toBe(origem);
    });

    it.each([
      ['o estagiário de outro caso', 'joao'],
      ['o supervisor de outro caso', 'patricia'],
      ['a coordenação', 'coordenacao'],
    ])('%s não registra (403)', async (_quem, chave) => {
      const { id } = await criarSessao(3 * 60);

      await ausencia(chave, id).expect(403);

      expect((await sessaoNoBanco(id)).status).toBe('agendada');
    });

    it('sem motivo: não registra', async () => {
      const { id } = await criarSessao(3 * 60);

      await ausencia('ana', id, '').expect(400);

      expect((await sessaoNoBanco(id)).status).toBe('agendada');
    });

    it('sessão já iniciada: não registra', async () => {
      const { id } = await criarSessao(-5);

      await ausencia('ana', id).expect(422);
    });

    it('paciente sem e-mail: a resposta diz que ele ainda não foi avisado', async () => {
      const semEmail = await criarCaso(pessoas.ana, pessoas.carla, null);
      const { id } = await criarSessao(3 * 60, 'agendada', {
        casoId: semEmail,
      });

      const { body } = await ausencia('ana', id).expect(200);

      expect(body.avisoAoPaciente).toBe('sem_email');
      expect(enviar).not.toHaveBeenCalled();
    });

    it('falha no e-mail: a ausência continua registrada, e a resposta avisa', async () => {
      enviar.mockRejectedValueOnce(new Error('SMTP fora do ar'));
      const { id } = await criarSessao(3 * 60);

      const { body } = await ausencia('ana', id).expect(200);

      expect(body.avisoAoPaciente).toBe('email_nao_enviado');
      expect((await sessaoNoBanco(id)).status).toBe('cancelada');
    });
  });

  describe('opções de cada perfil, para a tela', () => {
    it.each([
      ['secretaria', true, true, true],
      ['ana', false, true, true],
      ['carla', false, false, true],
      ['joao', false, false, false],
      ['patricia', false, false, false],
      ['coordenacao', false, false, false],
    ])(
      '%s: pedido %s, administrativo %s, ausência %s',
      async (chave, pedidoPaciente, administrativo, ausenciaEstagiario) => {
        expect(await acoesDeCancelamento(db, caso, pessoas[chave])).toEqual({
          pedidoPaciente,
          administrativo,
          ausenciaEstagiario,
          antecedenciaMinimaMinutos: 60,
        });
      },
    );

    it('o estagiário de outro caso tem as opções no caso dele', async () => {
      expect(
        await acoesDeCancelamento(db, outroCaso, pessoas.joao),
      ).toMatchObject({ administrativo: true, ausenciaEstagiario: true });
    });
  });
});
