import { Global, Module, type INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { eq } from 'drizzle-orm';
import {
  auditoria,
  casos,
  decisoesPrioridade,
  inscricoes,
  revogacoesConsentimento,
  usuarios,
  verificacoesIdentidade,
  vinculosEstagiario,
  sessoesAtendimento,
  type Db,
} from '@clinica/database';
import type { SituacaoCaso } from '@clinica/shared';
import { DB } from '../../database/database.module';
import { AuditoriaModule } from '../../auditoria/auditoria.module';
import { ParametrosModule } from '../../parametros/parametros.module';
import { EmailService } from '../../notificacoes/email.service';
import {
  CHAVE_TESTE,
  criarBancoDeTeste,
} from '../../test-utils/banco-de-teste';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { cifrar, decifrar } from '../../common/criptografia';
import { comunicarSePermitido } from '../../common/consentimento';
import { hashToken } from '../acesso/credenciais';
import { AgendamentoModule } from '../agendamento/agendamento.module';
import { SessoesService } from '../agendamento/sessoes.service';
import { CancelamentoService } from '../agendamento/cancelamento.service';
import { ConfirmacaoService } from '../agendamento/confirmacao.service';
import { InscricaoModule } from './inscricao.module';
import { TriagemModule } from '../triagem/triagem.module';
import { TriagemService } from '../triagem/triagem.service';
import { FilaService } from '../fila/fila.service';
import { ConsultaFilaService } from '../fila/consulta-fila.service';

describe('RF65 — revogação e integrações', () => {
  let app: INestApplication;
  let db: Db;
  let limpar: () => Promise<unknown>;
  let fechar: () => Promise<void>;
  const pessoas: Record<string, UsuarioAutenticado> = {};
  const enviar = jest.fn();
  let numero = 0;
  beforeAll(async () => {
    ({ db, limpar, fechar } = await criarBancoDeTeste());
    @Global()
    @Module({
      providers: [
        { provide: DB, useValue: db },
        { provide: EmailService, useValue: { enviar } },
      ],
      exports: [DB, EmailService],
    })
    class Infra {}
    const modulo = await Test.createTestingModule({
      providers: [ConsultaFilaService],
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              CHAVE_DADOS: CHAVE_TESTE,
              WEB_URL: 'http://localhost:3000',
              AMBIENTE_APLICACAO: 'validacao',
            }),
          ],
        }),
        Infra,
        AuditoriaModule,
        ParametrosModule,
        InscricaoModule,
        AgendamentoModule,
        TriagemModule,
      ],
    }).compile();
    app = modulo.createNestApplication();
    app.use(cookieParser());
    app.use(
      (
        req: { headers: Record<string, string>; usuario?: unknown },
        _res: unknown,
        next: () => void,
      ) => {
        if (req.headers['x-usuario-teste'])
          req.usuario = JSON.parse(req.headers['x-usuario-teste']);
        next();
      },
    );
    await app.init();
  }, 120000);
  afterAll(async () => {
    await app?.close();
    await fechar?.();
  });
  beforeEach(async () => {
    await limpar();
    enviar.mockReset();
    app.get(ConfigService).set('AMBIENTE_APLICACAO', 'validacao');
    for (const perfil of [
      'secretaria',
      'coordenacao',
      'supervisor',
      'estagiario',
    ] as const) {
      const [u] = await db
        .insert(usuarios)
        .values({ nome: perfil, perfil, email: `${perfil}@example.test` })
        .returning();
      pessoas[perfil] = { id: u.id, nome: u.nome, perfil };
    }
  });
  async function criar(
    situacao: SituacaoCaso = 'aguardando_distribuicao',
    menor = false,
  ) {
    numero++;
    const [i] = await db
      .insert(inscricoes)
      .values({
        numero: `2026-${numero}`,
        nomeCompleto: 'Paciente de teste',
        cpf: String(numero).padStart(11, '0'),
        dataNascimento: menor ? '2020-01-01' : '1990-01-01',
        responsavelLegal: menor ? 'Responsável de teste' : null,
        endereco: 'Rua fictícia',
        estadoCivil: 'solteiro',
        canalPreferencial: 'email',
        email: 'paciente@example.test',
        versaoTermoAceita: '0.1',
        termoAceitoEm: new Date(),
        aceitePeloResponsavel: menor,
      })
      .returning();
    const [c] = await db
      .insert(casos)
      .values({ inscricaoId: i.id, entradaNaFilaEm: i.criadaEm, situacao })
      .returning();
    return { i, c };
  }
  const corpo = {
    solicitante: 'titular',
    formaVerificacao: 'documento',
    documento: 'Carteira de identidade',
  };
  it('RF7 recalcula posições sem a inscrição revogada', async () => {
    const primeira = await criar();
    const segunda = await criar();
    await db.insert(decisoesPrioridade).values(
      [primeira, segunda].map(({ i }) => ({
        inscricaoId: i.id,
        corCifrada: cifrar('verde', CHAVE_TESTE),
        decididaPor: pessoas.coordenacao.id,
      })),
    );
    expect(
      (await app.get(FilaService).ordenada()).map((i) => i.posicao),
    ).toEqual([1, 2]);
    await post(primeira.i.id).send(corpo).expect(201);
    expect(await app.get(FilaService).ordenada()).toEqual([
      expect.objectContaining({ inscricaoId: segunda.i.id, posicao: 1 }),
    ]);
    expect(
      await app.get(ConsultaFilaService).consultar({ id: primeira.i.id }),
    ).toMatchObject({ situacao: 'procure_secretaria' });
  });
  it('revogação antes da triagem sai dos pendentes e impede classificação posterior', async () => {
    const { i, c } = await criar();
    await db.delete(casos).where(eq(casos.id, c.id));
    await post(i.id).send(corpo).expect(201);
    expect(await app.get(TriagemService).contarPendentes()).toEqual({
      total: 0,
    });
    await expect(
      app
        .get(TriagemService)
        .registrarPrioridade(i.id, 'verde', pessoas.coordenacao),
    ).rejects.toMatchObject({ status: 422 });
    expect(await db.select().from(casos)).toHaveLength(0);
    expect(
      await app.get(ConsultaFilaService).consultar({ id: i.id }),
    ).toMatchObject({ situacao: 'procure_secretaria' });
  });
  const post = (id: string, perfil = 'secretaria') =>
    request(app.getHttpServer())
      .post(`/inscricoes/${id}/revogacao`)
      .set('x-usuario-teste', JSON.stringify(pessoas[perfil]));
  it.each([
    'aguardando_distribuicao',
    'aguardando_vinculo',
    'aguardando_vaga',
  ] as const)(
    'retira %s da fila, conserva o aceite e registra autoria sem documento em auditoria',
    async (situacao) => {
      const { i, c } = await criar(situacao);
      const r = await post(i.id).send(corpo).expect(201);
      expect(r.headers['cache-control']).toBe('no-store');
      expect(r.body.situacao).toBe('cancelado_por_revogacao');
      const [salva] = await db
        .select()
        .from(inscricoes)
        .where(eq(inscricoes.id, i.id));
      expect(salva.termoAceitoEm).toEqual(i.termoAceitoEm);
      expect(salva.versaoTermoAceita).toBe('0.1');
      const [revogacao] = await db.select().from(revogacoesConsentimento);
      expect(decifrar(revogacao.documentoCifrado!, CHAVE_TESTE)).toBe(
        corpo.documento,
      );
      expect(revogacao.registradaPor).toBe(pessoas.secretaria.id);
      expect(JSON.stringify(await db.select().from(auditoria))).not.toContain(
        corpo.documento,
      );
      expect(
        (await db.select().from(casos).where(eq(casos.id, c.id)))[0].situacao,
      ).toBe('cancelado_por_revogacao');
      await expect(
        db.update(revogacoesConsentimento).set({ solicitante: 'responsavel' }),
      ).rejects.toThrow();
      await expect(db.delete(revogacoesConsentimento)).rejects.toThrow();
    },
  );
  it.each(['coordenacao', 'supervisor', 'estagiario'])(
    'recusa registro por %s',
    async (perfil) => {
      const { i } = await criar();
      await post(i.id, perfil).send(corpo).expect(403);
      expect(await db.select().from(revogacoesConsentimento)).toHaveLength(0);
    },
  );
  it('exige sessão autenticada', async () => {
    const { i } = await criar();
    await request(app.getHttpServer())
      .post(`/inscricoes/${i.id}/revogacao`)
      .send(corpo)
      .expect(401);
  });
  it('exige documento e recusa repetição', async () => {
    const { i } = await criar();
    await post(i.id)
      .send({ ...corpo, documento: ' ' })
      .expect(400);
    await post(i.id).send(corpo).expect(201);
    await post(i.id).send(corpo).expect(409);
    expect(await db.select().from(revogacoesConsentimento)).toHaveLength(1);
  });
  it('menor exige responsável legal e conserva o aceite do responsável', async () => {
    const { i } = await criar('aguardando_distribuicao', true);
    await post(i.id).send(corpo).expect(400);
    const r = await post(i.id)
      .send({ ...corpo, solicitante: 'responsavel' })
      .expect(201);
    expect(r.body.aceite.peloResponsavel).toBe(true);
  });
  it.each(['ausente', 'expirada', 'encerrada', 'outra_inscricao', 'valida'])(
    'verificação RF52 %s é conferida no servidor',
    async (estado) => {
      const { i } = await criar();
      if (estado !== 'ausente')
        await db.insert(verificacoesIdentidade).values({
          inscricaoId:
            estado === 'outra_inscricao' ? (await criar()).i.id : i.id,
          tokenHash: hashToken('token-teste'),
          expiraEm: new Date(
            Date.now() + (estado === 'expirada' ? -60000 : 60000),
          ),
          encerradaEm: estado === 'encerrada' ? new Date() : null,
        });
      await post(i.id)
        .set('Cookie', 'verificacao=token-teste')
        .send({ solicitante: 'titular', formaVerificacao: 'verificacao_rf52' })
        .expect(estado === 'valida' ? 201 : 400);
    },
  );
  it('termo provisório permanece bloqueado em produção', async () => {
    const { i } = await criar();
    app.get(ConfigService).set('AMBIENTE_APLICACAO', 'producao');
    await post(i.id).send(corpo).expect(403);
  });
  it('revogação não afeta nova inscrição independente', async () => {
    const primeira = await criar();
    const segunda = await criar();
    await post(primeira.i.id).send(corpo).expect(201);
    const r = await request(app.getHttpServer())
      .get(`/inscricoes/${segunda.i.id}/consentimento`)
      .set('x-usuario-teste', JSON.stringify(pessoas.secretaria))
      .expect(200);
    expect(r.body.revogacao).toBeNull();
  });
  it('em atendimento conserva caso, vínculo e sessão; bloqueia RF10, RF14 e comunicação RF17', async () => {
    const { i, c } = await criar('em_atendimento');
    await db.insert(vinculosEstagiario).values({
      casoId: c.id,
      estagiarioId: pessoas.estagiario.id,
      vinculadoPor: pessoas.supervisor.id,
    });
    const inicio = new Date(Date.now() + 3600000);
    const [s] = await db
      .insert(sessoesAtendimento)
      .values({
        casoId: c.id,
        estagiarioId: pessoas.estagiario.id,
        inicio,
        termino: new Date(+inicio + 3000000),
        fimIntervaloAnotacoes: new Date(+inicio + 3600000),
        agendadaPor: pessoas.secretaria.id,
      })
      .returning();
    await post(i.id).send(corpo).expect(201);
    expect((await db.select().from(casos))[0].situacao).toBe('em_atendimento');
    expect((await db.select().from(vinculosEstagiario))[0].vigente).toBe(true);
    expect(await db.select().from(sessoesAtendimento)).toHaveLength(1);
    expect(
      await app.get(SessoesService).buscarPacientes({}, pessoas.secretaria),
    ).toEqual([]);
    await expect(
      app
        .get(SessoesService)
        .agendar(
          { casoId: c.id, inicio: '2030-01-07T10:00:00-03:00' },
          pessoas.secretaria,
        ),
    ).rejects.toMatchObject({ status: 422 });
    const pendentes = await app.get(ConfirmacaoService).semConfirmacao();
    expect(JSON.stringify(pendentes)).not.toContain(s.id);
    const callback = jest.fn();
    expect(await comunicarSePermitido(db, c.id, callback)).toEqual({
      enviado: false,
    });
    expect(callback).not.toHaveBeenCalled();
    const cancelamento = await app
      .get(CancelamentoService)
      .registrarAusencia(
        s.id,
        { justificativa: 'Ausência do estagiário no teste.' },
        pessoas.estagiario,
      );
    expect(cancelamento.avisoAoPaciente).toBe('consentimento_revogado');
    expect(enviar).not.toHaveBeenCalled();
  });
});
