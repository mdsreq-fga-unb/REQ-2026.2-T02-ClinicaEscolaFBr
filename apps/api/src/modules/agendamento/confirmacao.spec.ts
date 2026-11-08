import { Global, INestApplication, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import {
  auditoria,
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
import { DB } from '../../database/database.module';
import { EmailService } from '../../notificacoes/email.service';
import { ParametrosModule } from '../../parametros/parametros.module';
import {
  CHAVE_TESTE,
  criarBancoDeTeste,
} from '../../test-utils/banco-de-teste';
import { gerarToken } from '../acesso/credenciais';
import { AgendamentoModule } from './agendamento.module';
import { prazoDeConfirmacao } from './confirmacao.service';

// RF14, RNF10 e RNF59: confirmação de presença pelo link e pela secretaria. O usuário
// da sessão é simulado pelo cabeçalho x-usuario-teste.
const HORA = 60 * 60 * 1000;
const LINK_INVALIDO = /não é mais válido/;

describe('Confirmação de presença (RF14)', () => {
  let app: INestApplication;
  let db: Db;
  let limpar: () => Promise<unknown>;
  let fechar: () => Promise<void>;
  const pessoas: Record<string, UsuarioAutenticado> = {};
  let numero = 0;
  let caso: string;
  let prazoDaMigration: string | undefined;

  beforeAll(async () => {
    ({ db, limpar, fechar } = await criarBancoDeTeste());
    // Lido antes da primeira limpeza: o TRUNCATE de usuarios esvazia os parâmetros.
    const [linha] = await db
      .select()
      .from(parametros)
      .where(eq(parametros.chave, 'prazo_confirmacao_horas'));
    prazoDaMigration = linha?.valor;

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
    await limpar();
    for (const [chave, nome, perfil] of [
      ['secretaria', 'Juliana Rocha', 'secretaria'],
      ['ana', 'Ana Beatriz Costa', 'estagiario'],
      ['supervisor', 'Carla Mendes', 'supervisor'],
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
    caso = await criarCaso();
  });

  async function criarCaso() {
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
        canalPreferencial: 'whatsapp',
        celular: '61998765432',
        email: 'mariana@exemplo.com',
        responsavelLegal: 'Cláudia Toledo',
        queixaCifrada: 'x',
        percepcaoUrgenciaCifrada: 'x',
        historicoRelevanteCifrado: 'x',
      })
      .returning();
    const [novo] = await db
      .insert(casos)
      .values({ inscricaoId: inscricao.id, situacao: 'em_atendimento' })
      .returning();
    await db.insert(vinculosEstagiario).values({
      casoId: novo.id,
      estagiarioId: pessoas.ana.id,
      vinculadoPor: pessoas.supervisor.id,
    });
    return novo.id;
  }

  // Sessão a `horas` de agora, com o link já gerado. Cada sessão fica num caso próprio
  // quando pedido, para horários próximos não caírem na restrição de sobreposição.
  async function criarSessao(
    horas: number,
    status: StatusSessao = 'agendada',
    opcoes: { casoId?: string; expiraEm?: Date; usadoEm?: Date } = {},
  ) {
    const inicio = new Date(Date.now() + horas * HORA);
    const termino = new Date(inicio.getTime() + 50 * 60_000);
    const [sessao] = await db
      .insert(sessoesAtendimento)
      .values({
        casoId: opcoes.casoId ?? caso,
        estagiarioId: pessoas.ana.id,
        inicio,
        termino,
        fimIntervaloAnotacoes: new Date(termino.getTime() + 10 * 60_000),
        status,
        agendadaPor: pessoas.secretaria.id,
      })
      .returning();
    const { token, hash } = gerarToken();
    await db.insert(linksConfirmacao).values({
      sessaoId: sessao.id,
      tokenHash: hash,
      expiraEm: opcoes.expiraEm ?? inicio,
      usadoEm: opcoes.usadoEm ?? null,
    });
    return { id: sessao.id, token, inicio };
  }

  const abrir = (token: string) =>
    request(app.getHttpServer()).get(`/confirmacao/${token}`);
  const confirmar = (token: string) =>
    request(app.getHttpServer()).post(`/confirmacao/${token}/confirmar`);
  const lista = (quem: string) =>
    request(app.getHttpServer())
      .get('/sessoes/sem-confirmacao')
      .set('x-usuario-teste', JSON.stringify(pessoas[quem]));
  const registrar = (quem: string, id: string) =>
    request(app.getHttpServer())
      .post(`/sessoes/${id}/confirmacao`)
      .set('x-usuario-teste', JSON.stringify(pessoas[quem]));

  const sessaoNoBanco = async (id: string) => {
    const [sessao] = await db
      .select()
      .from(sessoesAtendimento)
      .where(eq(sessoesAtendimento.id, id));
    return sessao;
  };
  const eventos = (id: string) =>
    db.select().from(auditoria).where(eq(auditoria.entidadeId, id));

  describe('prazo de confirmação', () => {
    it('sessão às 14h00: o prazo termina às 14h00 do dia anterior', () => {
      expect(
        prazoDeConfirmacao(new Date('2026-12-03T14:00:00-03:00'), 24),
      ).toEqual(new Date('2026-12-02T14:00:00-03:00'));
    });

    it('o parâmetro configurado pela coordenação substitui o padrão (DF45)', async () => {
      await db
        .insert(parametros)
        .values({ chave: 'prazo_confirmacao_horas', valor: '48' });
      const { token } = await criarSessao(30);

      const { body } = await abrir(token).expect(200);

      expect(body.podeConfirmar).toBe(false);
      await confirmar(token).expect(422);
    });

    it('o valor padrão de 24 horas vem da migration (DF45)', () => {
      expect(prazoDaMigration).toBe('24');
    });
  });

  describe('pelo link', () => {
    it('mostra só a data, o horário, o primeiro nome e a situação (RNF59)', async () => {
      const { token, inicio } = await criarSessao(48);

      const resposta = await abrir(token).expect(200);

      expect(resposta.body).toEqual({
        primeiroNome: 'Mariana',
        inicio: inicio.toISOString(),
        situacao: 'agendada',
        prazoConfirmacao: new Date(inicio.getTime() - 24 * HORA).toISOString(),
        podeConfirmar: true,
      });
      expect(JSON.stringify(resposta.body)).not.toMatch(
        /Toledo|Ana Beatriz|61998765432|mariana@/,
      );
      expect(resposta.headers['cache-control']).toBe('no-store');
    });

    it('dentro do prazo: confirma sem login, com a data, o meio e a auditoria do paciente (RF14, RNF10, RNF15)', async () => {
      const { id, token } = await criarSessao(48);

      const { body } = await confirmar(token).expect(200);

      expect(body).toMatchObject({
        situacao: 'confirmada',
        podeConfirmar: false,
      });
      const sessao = await sessaoNoBanco(id);
      expect(sessao.status).toBe('confirmada');
      expect(sessao.confirmadaPor).toBe('link');
      expect(sessao.confirmadaEm).toBeInstanceOf(Date);
      const [evento] = await eventos(id);
      expect(evento).toMatchObject({
        usuarioId: null,
        operacao: 'confirmar_presenca',
        dadosAnteriores: { status: 'agendada' },
        dadosNovos: {
          status: 'confirmada',
          canal: 'link',
          autor: 'paciente',
        },
      });
    });

    it('depois do prazo: recusa com a orientação de procurar a secretaria, sem mudar a sessão (RF14)', async () => {
      const { id, token } = await criarSessao(23);

      const aberta = await abrir(token).expect(200);
      expect(aberta.body).toMatchObject({
        situacao: 'agendada',
        podeConfirmar: false,
      });

      const { body } = await confirmar(token).expect(422);

      expect(body.message).toMatch(/procure a secretaria/);
      expect((await sessaoNoBanco(id)).status).toBe('agendada');
      expect(await eventos(id)).toHaveLength(0);
    });

    it('já confirmada: a página informa, e uma nova confirmação responde 409 sem nova auditoria (RNF59)', async () => {
      const { id, token } = await criarSessao(48);
      await confirmar(token).expect(200);

      const { body } = await abrir(token).expect(200);
      expect(body).toMatchObject({
        situacao: 'confirmada',
        podeConfirmar: false,
      });

      await confirmar(token).expect(409);
      expect(await eventos(id)).toHaveLength(1);
    });

    it('confirmações simultâneas: só uma confirma (RNF59)', async () => {
      const { id, token } = await criarSessao(48);

      const respostas = await Promise.all([confirmar(token), confirmar(token)]);

      expect(respostas.map((r) => r.status).sort((a, b) => a - b)).toEqual([
        200, 409,
      ]);
      expect(await eventos(id)).toHaveLength(1);
    });

    it.each([
      ['sessão cancelada', () => criarSessao(48, 'cancelada')],
      ['sessão realizada', () => criarSessao(48, 'realizada')],
      ['sessão com falta', () => criarSessao(48, 'falta_paciente')],
      ['sessão já iniciada', () => criarSessao(-1)],
      [
        'link vencido',
        () =>
          criarSessao(48, 'agendada', { expiraEm: new Date(Date.now() - 1) }),
      ],
      [
        'link já usado',
        () => criarSessao(48, 'agendada', { usadoEm: new Date() }),
      ],
    ])(
      '%s: a mesma resposta de link inválido, sem dados da sessão (RNF59)',
      async (_situacao, criar) => {
        const { id, token } = await criar();
        const statusAntes = (await sessaoNoBanco(id)).status;

        const consulta = await abrir(token).expect(404);
        const tentativa = await confirmar(token).expect(404);

        expect(consulta.body.message).toMatch(LINK_INVALIDO);
        expect(tentativa.body.message).toBe(consulta.body.message);
        expect(JSON.stringify(consulta.body)).not.toMatch(/Mariana|inicio/);
        expect((await sessaoNoBanco(id)).status).toBe(statusAntes);
      },
    );

    it('token inexistente ou alterado: a mesma resposta de link inválido (RNF59)', async () => {
      const { token } = await criarSessao(48);
      const vencido = await criarSessao(72, 'cancelada');
      const referencia = await abrir(vencido.token).expect(404);

      const alterado = await abrir(`${token}x`).expect(404);
      const inexistente = await confirmar('token-que-nao-existe').expect(404);

      expect(alterado.body).toEqual(referencia.body);
      expect(inexistente.body).toEqual(referencia.body);
    });
  });

  describe('lista da secretaria', () => {
    it('traz só a sessão futura agendada com o prazo vencido, sem telefone nem e-mail, e não cria falta (RF14, RNF13)', async () => {
      const vencida = await criarSessao(5);
      await criarSessao(48); // ainda no prazo
      await criarSessao(-3); // já passou
      await criarSessao(10, 'confirmada');
      await criarSessao(15, 'cancelada');

      const { body } = await lista('secretaria').expect(200);

      expect(body.prazoHoras).toBe(24);
      expect(body.sessoes).toHaveLength(1);
      expect(body.sessoes[0]).toMatchObject({
        id: vencida.id,
        casoId: caso,
        paciente: 'Mariana Alves Toledo',
        responsavelLegal: 'Cláudia Toledo',
        estagiario: 'Ana Beatriz Costa',
        canalPreferencial: 'whatsapp',
        inicio: vencida.inicio.toISOString(),
      });
      expect(JSON.stringify(body)).not.toMatch(
        /61998765432|mariana@exemplo|queixa|cpf/i,
      );
      expect(await db.select().from(faltasPaciente)).toHaveLength(0);
    });

    it('a sessão sai da lista depois de confirmada pela secretaria', async () => {
      const { id } = await criarSessao(5);

      await registrar('secretaria', id).expect(200);

      const { body } = await lista('secretaria').expect(200);
      expect(body.sessoes).toHaveLength(0);
    });

    it.each(['ana', 'supervisor', 'coordenacao'])(
      '%s não consulta a lista (403)',
      async (quem) => {
        await lista(quem).expect(403);
      },
    );

    it('sem sessão, a lista e o registro respondem 401', async () => {
      const { id } = await criarSessao(5);
      await request(app.getHttpServer())
        .get('/sessoes/sem-confirmacao')
        .expect(401);
      await request(app.getHttpServer())
        .post(`/sessoes/${id}/confirmacao`)
        .expect(401);
    });
  });

  describe('registro pela secretaria', () => {
    it('confirma depois do prazo do link, com a auditoria da secretaria (RF14, RNF10)', async () => {
      const { id } = await criarSessao(5);

      const { body } = await registrar('secretaria', id).expect(200);

      expect(body.status).toBe('confirmada');
      const sessao = await sessaoNoBanco(id);
      expect(sessao.status).toBe('confirmada');
      expect(sessao.confirmadaPor).toBe('secretaria');
      const [evento] = await eventos(id);
      expect(evento).toMatchObject({
        usuarioId: pessoas.secretaria.id,
        operacao: 'confirmar_presenca',
        dadosAnteriores: { status: 'agendada' },
        dadosNovos: { status: 'confirmada', canal: 'secretaria' },
      });
    });

    it.each(['ana', 'supervisor', 'coordenacao'])(
      '%s não registra a confirmação (403), e a sessão não muda',
      async (quem) => {
        const { id } = await criarSessao(5);

        await registrar(quem, id).expect(403);

        expect((await sessaoNoBanco(id)).status).toBe('agendada');
      },
    );

    it('sessão já confirmada: 409', async () => {
      const { id } = await criarSessao(5, 'confirmada');
      await registrar('secretaria', id).expect(409);
    });

    it.each([
      ['cancelada', () => criarSessao(5, 'cancelada')],
      ['já iniciada', () => criarSessao(-1)],
    ])('sessão %s: 422', async (_situacao, criar) => {
      const { id } = await criar();
      await registrar('secretaria', id).expect(422);
    });

    it('sessão inexistente: 404', async () => {
      await registrar(
        'secretaria',
        '00000000-0000-4000-8000-000000000000',
      ).expect(404);
    });
  });

  it('a sessão confirmada continua ocupando o horário da agenda (RNF9)', async () => {
    const { inicio } = await criarSessao(48, 'confirmada');
    const data = inicio
      .toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
      .slice(0, 10);

    const { body } = await request(app.getHttpServer())
      .get(`/sessoes/agenda?estagiarioId=${pessoas.ana.id}&data=${data}`)
      .set('x-usuario-teste', JSON.stringify(pessoas.secretaria))
      .expect(200);

    expect(body).toHaveLength(1);
  });
});
