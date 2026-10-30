import { Global, INestApplication, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import {
  auditoria,
  casos,
  inscricoes,
  linksConfirmacao,
  sessoesAtendimento,
  usuarios,
  vinculosEstagiario,
  type Db,
} from '@clinica/database';
import { AuditoriaModule } from '../../auditoria/auditoria.module';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { DB } from '../../database/database.module';
import { EmailService } from '../../notificacoes/email.service';
import { ParametrosModule } from '../../parametros/parametros.module';
import {
  CHAVE_TESTE,
  criarBancoDeTeste,
} from '../../test-utils/banco-de-teste';
import { AgendamentoModule } from './agendamento.module';

// RF10: agendamento de sessão. O usuário da sessão (RF50) é simulado pelo cabeçalho
// x-usuario-teste. A data de referência é quinta-feira, 03/12/2026, em Brasília.
const DIA = '2026-12-03';
const as = (hora: string) => `${DIA}T${hora}:00-03:00`;
const iso = (hora: string) => new Date(as(hora)).toISOString();

describe('Agendamento de sessão (RF10)', () => {
  let app: INestApplication;
  let db: Db;
  let limpar: () => Promise<unknown>;
  let fechar: () => Promise<void>;
  let emails: { para: string; html: string }[];
  const pessoas: Record<string, UsuarioAutenticado> = {};
  const pacientes: Record<string, string> = {};

  beforeAll(async () => {
    ({ db, limpar, fechar } = await criarBancoDeTeste());

    @Global()
    @Module({
      providers: [
        { provide: DB, useValue: db },
        {
          provide: EmailService,
          useValue: {
            enviar: jest.fn(async (para: string, _a: string, html: string) => {
              emails.push({ para, html });
            }),
          },
        },
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

  let numero = 0;
  async function criarPaciente(
    nome: string,
    contato: { canal: 'email' | 'whatsapp'; email?: string; celular?: string },
    estagiario?: string,
  ) {
    numero += 1;
    const [inscricao] = await db
      .insert(inscricoes)
      .values({
        numero: `2026-${String(numero).padStart(4, '0')}`,
        nomeCompleto: nome,
        dataNascimento: '1990-01-01',
        cpf: String(numero).padStart(11, '0'),
        rg: '1234567',
        endereco: 'Rua Fictícia, 1',
        estadoCivil: 'solteiro',
        canalPreferencial: contato.canal,
        email: contato.email ?? null,
        celular: contato.celular ?? null,
        queixaCifrada: 'x',
        percepcaoUrgenciaCifrada: 'x',
        historicoRelevanteCifrado: 'x',
      })
      .returning();
    const [caso] = await db
      .insert(casos)
      .values({
        inscricaoId: inscricao.id,
        situacao: estagiario ? 'em_atendimento' : 'aguardando_vinculo',
      })
      .returning();
    if (estagiario) {
      await db.insert(vinculosEstagiario).values({
        casoId: caso.id,
        estagiarioId: pessoas[estagiario].id,
        vinculadoPor: pessoas.supervisor.id,
      });
    }
    return caso.id;
  }

  beforeEach(async () => {
    await limpar();
    emails = [];
    for (const [chave, nome, perfil] of [
      ['secretaria', 'Juliana Rocha', 'secretaria'],
      ['ana', 'Ana Beatriz Costa', 'estagiario'],
      ['pedro', 'Pedro Henrique Lima', 'estagiario'],
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
    pacientes.sergio = await criarPaciente(
      'Sérgio Antunes Freitas',
      { canal: 'email', email: 'sergio@exemplo.com' },
      'ana',
    );
    pacientes.mariana = await criarPaciente(
      'Mariana Alves Toledo',
      { canal: 'whatsapp', celular: '(61) 99876-5432' },
      'ana',
    );
    pacientes.lucia = await criarPaciente(
      'Lúcia Prado',
      { canal: 'email', email: 'lucia@exemplo.com' },
      'pedro',
    );
    pacientes.rafael = await criarPaciente('Rafael Gomes Ribeiro', {
      canal: 'email',
      email: 'rafael@exemplo.com',
    });
  });

  const como = (quem: string) => ({
    'x-usuario-teste': JSON.stringify(pessoas[quem]),
  });
  const agendar = (quem: string, corpo: object) =>
    request(app.getHttpServer()).post('/sessoes').set(como(quem)).send(corpo);

  it('sem sessão, as rotas respondem 401', async () => {
    await request(app.getHttpServer())
      .post('/sessoes')
      .send({ casoId: pacientes.sergio, inicio: as('15:00') })
      .expect(401);
    await request(app.getHttpServer()).get('/sessoes/pacientes').expect(401);
  });

  it('a secretaria agenda informando só o início: término pela duração padrão, status agendada, auditoria e link por e-mail (RF10, RNF10)', async () => {
    const { body } = await agendar('secretaria', {
      casoId: pacientes.sergio,
      inicio: as('10:00'),
    }).expect(201);

    expect(body).toMatchObject({
      paciente: 'Sérgio Antunes Freitas',
      estagiario: 'Ana Beatriz Costa',
      inicio: iso('10:00'),
      termino: iso('10:50'),
      fimIntervaloAnotacoes: iso('11:00'),
      canal: 'email',
      linkEnviadoPorEmail: true,
      whatsapp: null,
    });
    const [sessao] = await db
      .select()
      .from(sessoesAtendimento)
      .where(eq(sessoesAtendimento.id, body.id));
    expect(sessao.status).toBe('agendada');
    expect(sessao.estagiarioId).toBe(pessoas.ana.id);
    expect(sessao.agendadaPor).toBe(pessoas.secretaria.id);

    const [registro] = await db
      .select()
      .from(auditoria)
      .where(eq(auditoria.entidadeId, body.id));
    expect(registro).toMatchObject({
      usuarioId: pessoas.secretaria.id,
      operacao: 'agendar_sessao',
      entidade: 'sessoes_atendimento',
    });
    // RNF10: quem agendou, quando, o novo estado e a data e o horário da sessão.
    expect(registro.criadoEm).toBeInstanceOf(Date);
    expect(registro.dadosNovos).toMatchObject({
      status: 'agendada',
      inicio: sessao.inicio.toISOString(),
      termino: sessao.termino.toISOString(),
    });

    expect(emails).toHaveLength(1);
    expect(emails[0].para).toBe('sergio@exemplo.com');
    expect(emails[0].html).toContain('quinta-feira, 03/12/2026, às 10:00');
    const token = /\/confirmacao\/([\w-]+)/.exec(emails[0].html)![1];
    const [link] = await db
      .select()
      .from(linksConfirmacao)
      .where(eq(linksConfirmacao.sessaoId, body.id));
    // O banco guarda só o hash do token, que vale até 12 horas antes do início.
    expect(link.tokenHash).not.toBe(token);
    expect(link.expiraEm.toISOString()).toBe(
      new Date(`2026-12-02T22:00:00-03:00`).toISOString(),
    );
  });

  it('o estagiário responsável agenda; o término ajustado por quem agenda é mantido', async () => {
    const { body } = await agendar('ana', {
      casoId: pacientes.sergio,
      inicio: as('15:00'),
      termino: as('15:40'),
    }).expect(201);
    expect(body.termino).toBe(iso('15:40'));
    expect(body.fimIntervaloAnotacoes).toBe(iso('15:50'));
  });

  it('paciente com WhatsApp: devolve a mensagem pronta, não envia e-mail e registra quando o botão foi usado', async () => {
    const { body } = await agendar('secretaria', {
      casoId: pacientes.mariana,
      inicio: as('15:00'),
    }).expect(201);
    expect(emails).toHaveLength(0);
    expect(body.linkEnviadoPorEmail).toBe(false);
    expect(body.whatsapp.celular).toBe('(61) 99876-5432');
    expect(body.whatsapp.mensagem).toContain(
      'Olá, Mariana! Sua sessão na Clínica Escola de Psicologia da FBr está agendada para quinta-feira, 03/12/2026, às 15:00.',
    );
    expect(body.whatsapp.mensagem).toContain(
      'http://localhost:3000/confirmacao/',
    );
    expect(body.whatsapp.url).toMatch(
      /^https:\/\/wa\.me\/5561998765432\?text=/,
    );

    const { body: envio } = await request(app.getHttpServer())
      .post(`/sessoes/${body.id}/whatsapp`)
      .set(como('secretaria'))
      .expect(200);
    const [sessao] = await db
      .select()
      .from(sessoesAtendimento)
      .where(eq(sessoesAtendimento.id, body.id));
    expect(sessao.mensagemWhatsappEm?.toISOString()).toBe(
      envio.mensagemWhatsappEm,
    );
    await request(app.getHttpServer())
      .post(`/sessoes/${body.id}/whatsapp`)
      .set(como('pedro'))
      .expect(403);
  });

  it('com sessão do estagiário das 14:00 às 14:50 e anotações até 15:00, bloqueia às 14:50 e permite às 15:00', async () => {
    await agendar('secretaria', {
      casoId: pacientes.sergio,
      inicio: as('14:00'),
    }).expect(201);

    const { body } = await agendar('secretaria', {
      casoId: pacientes.mariana,
      inicio: as('14:50'),
    }).expect(409);
    expect(body).toMatchObject({
      message:
        'Conflito de horário. Ana Beatriz Costa tem sessão em 03/12/2026 das 14:00 às 14:50, com anotações até 15:00. Escolha outro horário.',
      conflito: 'estagiario',
      blocoOcupado: { inicio: iso('14:00'), fim: iso('15:00') },
      primeiroHorarioLivre: iso('15:00'),
    });

    await agendar('secretaria', {
      casoId: pacientes.mariana,
      inicio: as('15:00'),
    }).expect(201);
  });

  it('com sessão do paciente das 14:00 às 14:50, bloqueia outra sessão dele às 14:30', async () => {
    // Sessão anterior com outro estagiário, para isolar a regra do paciente.
    await db.insert(sessoesAtendimento).values({
      casoId: pacientes.sergio,
      estagiarioId: pessoas.pedro.id,
      inicio: new Date(as('14:00')),
      termino: new Date(as('14:50')),
      fimIntervaloAnotacoes: new Date(as('15:00')),
      agendadaPor: pessoas.secretaria.id,
    });
    const { body } = await agendar('secretaria', {
      casoId: pacientes.sergio,
      inicio: as('14:30'),
    }).expect(409);
    expect(body.conflito).toBe('paciente');
    expect(body.message).toBe(
      'Conflito de horário. O paciente já tem sessão em 03/12/2026 das 14:00 às 14:50. Escolha outro horário.',
    );
    expect(body.blocoOcupado).toEqual({
      inicio: iso('14:00'),
      fim: iso('14:50'),
    });
    expect(body.primeiroHorarioLivre).toBe(iso('14:50'));
  });

  it('dois agendamentos simultâneos no mesmo horário: um entra e o outro recebe 409', async () => {
    const respostas = await Promise.all([
      agendar('secretaria', { casoId: pacientes.sergio, inicio: as('09:00') }),
      agendar('secretaria', { casoId: pacientes.mariana, inicio: as('09:00') }),
    ]);
    expect(respostas.map((r) => r.status).sort((a, b) => a - b)).toEqual([
      201, 409,
    ]);
    const sessoes = await db.select().from(sessoesAtendimento);
    expect(sessoes).toHaveLength(1);
  });

  it('paciente sem estagiário vinculado não pode ter sessão agendada (422)', async () => {
    const { body } = await agendar('secretaria', {
      casoId: pacientes.rafael,
      inicio: as('10:00'),
    }).expect(422);
    expect(body.message).toContain('ainda não tem estagiário vinculado');
    expect(await db.select().from(sessoesAtendimento)).toHaveLength(0);
  });

  it.each([
    ['antes do início', '14:30'],
    ['igual ao início', '15:00'],
  ])('recusa término %s, com a indicação do erro (422)', async (_, termino) => {
    const { body } = await agendar('secretaria', {
      casoId: pacientes.sergio,
      inicio: as('15:00'),
      termino: as(termino),
    }).expect(422);
    expect(body.message).toBe(
      'O término precisa ser depois do início (15:00).',
    );
  });

  it('o estagiário que não é o responsável não agenda (403)', async () => {
    await agendar('pedro', {
      casoId: pacientes.sergio,
      inicio: as('10:00'),
    }).expect(403);
  });

  it.each(['supervisor', 'coordenacao'])(
    '%s não agenda nem busca pacientes (403)',
    async (quem) => {
      await agendar(quem, {
        casoId: pacientes.sergio,
        inicio: as('10:00'),
      }).expect(403);
      await request(app.getHttpServer())
        .get('/sessoes/pacientes')
        .set(como(quem))
        .expect(403);
    },
  );

  it('recusa dados inválidos (400)', async () => {
    await agendar('secretaria', {
      casoId: pacientes.sergio,
      inicio: '03/12/2026 15:00',
    }).expect(400);
    await agendar('secretaria', { inicio: as('15:00') }).expect(400);
  });

  it('a busca mostra à secretaria todos os pacientes, com e sem vínculo, e ao estagiário só os próprios', async () => {
    const { body: daSecretaria } = await request(app.getHttpServer())
      .get('/sessoes/pacientes')
      .set(como('secretaria'))
      .expect(200);
    expect(daSecretaria.map((p: { nome: string }) => p.nome)).toEqual([
      'Lúcia Prado',
      'Mariana Alves Toledo',
      'Rafael Gomes Ribeiro',
      'Sérgio Antunes Freitas',
    ]);
    expect(
      daSecretaria.find((p: { nome: string }) => p.nome.startsWith('Rafael'))
        .estagiario,
    ).toBeNull();

    const { body: daAna } = await request(app.getHttpServer())
      .get('/sessoes/pacientes')
      .query({ busca: 'mari' })
      .set(como('ana'))
      .expect(200);
    expect(daAna).toEqual([
      {
        casoId: pacientes.mariana,
        nome: 'Mariana Alves Toledo',
        estagiario: { id: pessoas.ana.id, nome: 'Ana Beatriz Costa' },
      },
    ]);
  });

  it('a agenda do dia mostra os blocos sem o nome dos pacientes, e o estagiário vê só a própria', async () => {
    await agendar('secretaria', {
      casoId: pacientes.sergio,
      inicio: as('14:00'),
    }).expect(201);
    const { body } = await request(app.getHttpServer())
      .get('/sessoes/agenda')
      .query({ estagiarioId: pessoas.ana.id, data: DIA })
      .set(como('ana'))
      .expect(200);
    expect(body).toEqual([
      {
        inicio: iso('14:00'),
        termino: iso('14:50'),
        fimIntervaloAnotacoes: iso('15:00'),
      },
    ]);
    await request(app.getHttpServer())
      .get('/sessoes/agenda')
      .query({ estagiarioId: pessoas.ana.id, data: DIA })
      .set(como('pedro'))
      .expect(403);
  });
  it('a sessão fica no ciclo de atendimento do caso (RF10, RF28)', async () => {
    await db
      .update(casos)
      .set({ cicloAtendimento: 2 })
      .where(eq(casos.id, pacientes.sergio));
    const { body } = await agendar('secretaria', {
      casoId: pacientes.sergio,
      inicio: as('10:00'),
    }).expect(201);
    const [sessao] = await db
      .select()
      .from(sessoesAtendimento)
      .where(eq(sessoesAtendimento.id, body.id));
    expect(sessao.cicloAtendimento).toBe(2);
  });

  it('caso que não está em atendimento não recebe sessão, mesmo com vínculo vigente (RF10)', async () => {
    await db
      .update(casos)
      .set({ situacao: 'encerrado' })
      .where(eq(casos.id, pacientes.sergio));
    const res = await agendar('secretaria', {
      casoId: pacientes.sergio,
      inicio: as('10:00'),
    }).expect(422);
    expect(res.body.message).toContain('paciente em atendimento');
    expect(await db.select().from(sessoesAtendimento)).toEqual([]);
  });
});
