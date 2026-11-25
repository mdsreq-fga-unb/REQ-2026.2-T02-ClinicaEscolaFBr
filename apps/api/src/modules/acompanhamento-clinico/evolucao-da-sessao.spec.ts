import { Global, Module, type INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { and, eq } from 'drizzle-orm';
import request from 'supertest';
import {
  acessosProntuario,
  atribuicoesSupervisor,
  casos,
  complementosEvolucao,
  correcoesEvolucao,
  evolucoes,
  inscricoes,
  prontuarios,
  sessoesAtendimento,
  usuarios,
  validacoesEvolucao,
  vinculosEstagiario,
  type Db,
} from '@clinica/database';
import { AuditoriaModule } from '../../auditoria/auditoria.module';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { cifrar } from '../../common/criptografia';
import { DB } from '../../database/database.module';
import {
  CHAVE_TESTE,
  criarBancoDeTeste,
} from '../../test-utils/banco-de-teste';
import { AcompanhamentoClinicoModule } from './acompanhamento-clinico.module';

// RF31: evolução de uma sessão específica, com o original, as correções, os
// complementos e a validação, e as ações de quem consulta.
describe('Evolução de uma sessão específica (RF31)', () => {
  let app: INestApplication;
  let db: Db;
  let limpar: () => Promise<unknown>;
  let fechar: () => Promise<void>;
  let casoId: string;
  let prontuarioId: string;
  let outroProntuario: string;
  const pessoas: Record<string, UsuarioAutenticado> = {};

  beforeAll(async () => {
    ({ db, limpar, fechar } = await criarBancoDeTeste());
    @Global()
    @Module({ providers: [{ provide: DB, useValue: db }], exports: [DB] })
    class Infra {}
    const m = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ CHAVE_DADOS: CHAVE_TESTE })],
        }),
        Infra,
        AuditoriaModule,
        AcompanhamentoClinicoModule,
      ],
    }).compile();
    app = m.createNestApplication();
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
  }, 120_000);

  afterAll(async () => {
    await app?.close();
    await fechar?.();
  });

  // Caso em atendimento, com o estagiário e o supervisor vigentes, e o prontuário.
  async function criarCaso(numero: string, estagiario: string) {
    const [i] = await db
      .insert(inscricoes)
      .values({
        numero,
        nomeCompleto: `Paciente ${numero}`,
        cpf: numero.replace(/\D/g, '').padStart(11, '0'),
        dataNascimento: '1990-01-01',
        endereco: 'Rua fictícia',
        estadoCivil: 'solteiro',
        canalPreferencial: 'email',
        email: `${numero}@example.test`,
      })
      .returning();
    const [c] = await db
      .insert(casos)
      .values({
        inscricaoId: i.id,
        entradaNaFilaEm: new Date('2026-09-01Z'),
        situacao: 'em_atendimento',
      })
      .returning();
    const [v] = await db
      .insert(vinculosEstagiario)
      .values({
        casoId: c.id,
        estagiarioId: pessoas[estagiario].id,
        vinculadoPor: pessoas.supervisor.id,
      })
      .returning();
    await db.insert(atribuicoesSupervisor).values({
      casoId: c.id,
      supervisorId: pessoas.supervisor.id,
      atribuidoPor: pessoas.coordenacao.id,
    });
    const [p] = await db
      .insert(prontuarios)
      .values({ casoId: c.id, cicloAtendimento: 1, vinculoOrigemId: v.id })
      .returning();
    return { casoId: c.id, prontuarioId: p.id };
  }

  beforeEach(async () => {
    await limpar();
    for (const [nome, perfil] of [
      ['ana', 'estagiario'],
      ['pedro', 'estagiario'],
      ['supervisor', 'supervisor'],
      ['secretaria', 'secretaria'],
      ['coordenacao', 'coordenacao'],
    ] as const) {
      const [u] = await db
        .insert(usuarios)
        .values({ nome, perfil, email: `${nome}@example.test` })
        .returning();
      pessoas[nome] = { id: u.id, nome, perfil };
    }
    ({ casoId, prontuarioId } = await criarCaso('2026-00001', 'ana'));
    ({ prontuarioId: outroProntuario } = await criarCaso(
      '2026-00002',
      'pedro',
    ));
  });

  async function sessao(inicio: string, status: 'realizada' | 'agendada') {
    const data = new Date(inicio);
    const [s] = await db
      .insert(sessoesAtendimento)
      .values({
        casoId,
        cicloAtendimento: 1,
        estagiarioId: pessoas.ana.id,
        agendadaPor: pessoas.secretaria.id,
        inicio: data,
        termino: new Date(+data + 50 * 60_000),
        fimIntervaloAnotacoes: new Date(+data + 60 * 60_000),
        status,
      })
      .returning();
    return s.id;
  }

  async function evoluir(sessaoId: string) {
    const [e] = await db
      .insert(evolucoes)
      .values({
        prontuarioId,
        sessaoId,
        registradaPor: pessoas.ana.id,
        registradaEm: new Date('2026-10-29T18:10:00Z'),
        humorAparenciaCifrado: cifrar('Tranquila.', CHAVE_TESTE),
        conteudoTrabalhadoCifrado: cifrar('Rotina de estudos.', CHAVE_TESTE),
        tecnicasUtilizadasCifrado: cifrar('Escuta qualificada.', CHAVE_TESTE),
        planoProximaSessaoCifrado: cifrar('Retomar o registro.', CHAVE_TESTE),
      })
      .returning();
    return e.id;
  }

  const consultar = (quem: string, sessaoId: string, id = prontuarioId) =>
    request(app.getHttpServer())
      .get(`/prontuarios/${id}/sessoes/${sessaoId}/evolucao`)
      .set('x-usuario-teste', JSON.stringify(pessoas[quem]));
  const acessos = (operacao: string, permitido: boolean) =>
    db
      .select()
      .from(acessosProntuario)
      .where(
        and(
          eq(acessosProntuario.operacao, operacao),
          eq(acessosProntuario.permitido, permitido),
        ),
      );

  it('mostra a versão vigente, o original, a correção e o complemento em ordem, e a situação da validação (RF31, RF29, RF30, RF67)', async () => {
    const s = await sessao('2026-10-29T17:00:00Z', 'realizada');
    const e = await evoluir(s);
    await db.insert(correcoesEvolucao).values({
      evolucaoId: e,
      versao: 2,
      corrigidaPor: pessoas.ana.id,
      corrigidaEm: new Date('2026-11-05T19:20:00Z'),
      motivoCifrado: cifrar('A técnica estava incompleta.', CHAVE_TESTE),
      humorAparenciaCifrado: cifrar('Tranquila.', CHAVE_TESTE),
      conteudoTrabalhadoCifrado: cifrar('Rotina de estudos.', CHAVE_TESTE),
      tecnicasUtilizadasCifrado: cifrar(
        'Escuta qualificada e registro de pensamentos.',
        CHAVE_TESTE,
      ),
      planoProximaSessaoCifrado: cifrar('Retomar o registro.', CHAVE_TESTE),
    });
    await db.insert(complementosEvolucao).values({
      evolucaoId: e,
      textoCifrado: cifrar('Orientação da supervisão.', CHAVE_TESTE),
      registradoPor: pessoas.ana.id,
      registradoEm: new Date('2026-11-06T13:20:00Z'),
    });
    await db.insert(validacoesEvolucao).values({
      evolucaoId: e,
      validadaPor: pessoas.supervisor.id,
      validadaEm: new Date('2026-11-06T21:05:00Z'),
    });

    const r = await consultar('ana', s).expect(200);
    expect(r.headers['cache-control']).toBe('no-store');
    expect(r.body).toMatchObject({
      prontuarioId,
      casoId,
      paciente: 'Paciente 2026-00001',
      supervisor: 'supervisor',
      sessao: {
        id: s,
        numeroNoCiclo: 1,
        status: 'realizada',
        estagiario: 'ana',
      },
      evolucao: {
        id: e,
        versaoAtual: 2,
        tecnicasUtilizadas: 'Escuta qualificada e registro de pensamentos.',
        validacao: { situacao: 'validada', ultima: { por: 'supervisor' } },
      },
    });
    expect(
      r.body.evolucao.versoes.map((v: { versao: number }) => v.versao),
    ).toEqual([2, 1]);
    expect(r.body.evolucao.versoes[0].motivo).toBe(
      'A técnica estava incompleta.',
    );
    expect(r.body.evolucao.complementos).toEqual([
      expect.objectContaining({
        tipo: 'complemento',
        texto: 'Orientação da supervisão.',
        autor: 'ana',
      }),
    ]);
    expect(r.body.acoes).toMatchObject({ registrar: false, validar: false });
  });

  it('a coordenação consulta só para leitura, e a consulta fica no registro de acessos (RF31, RF56)', async () => {
    const s = await sessao('2026-10-29T17:00:00Z', 'realizada');
    await evoluir(s);
    const r = await consultar('coordenacao', s).expect(200);
    expect(r.body.acoes).toEqual({
      registrar: false,
      corrigir: false,
      complementar: false,
      validar: false,
    });
    expect(await acessos('consultar_evolucao', true)).toHaveLength(1);
    // O supervisor do caso pode validar e corrigir.
    const doSupervisor = await consultar('supervisor', s).expect(200);
    expect(doSupervisor.body.acoes).toMatchObject({ validar: true });
  });

  it('a sessão sem evolução vem com evolucao nula, e o estagiário responsável pode registrar (RF31, RF28)', async () => {
    const realizada = await sessao('2026-11-05T17:00:00Z', 'realizada');
    const agendada = await sessao('2026-11-12T17:00:00Z', 'agendada');
    const r = await consultar('ana', realizada).expect(200);
    expect(r.body.evolucao).toBeNull();
    expect(r.body.acoes.registrar).toBe(true);
    expect(
      (await consultar('ana', agendada).expect(200)).body.acoes.registrar,
    ).toBe(false);
    expect(
      (await consultar('supervisor', realizada).expect(200)).body.acoes
        .registrar,
    ).toBe(false);
  });

  it('o estagiário de outro caso, a secretaria e a sessão de outro prontuário recebem 403, com a tentativa registrada (RF31, RF55, RNF25)', async () => {
    const s = await sessao('2026-10-29T17:00:00Z', 'realizada');
    await evoluir(s);
    const corpo = await consultar('pedro', s).expect(403);
    expect(JSON.stringify(corpo.body)).not.toMatch(/Tranquila|Rotina/);
    await consultar('secretaria', s).expect(403);
    // O Pedro abre o próprio prontuário com a sessão de outro caso.
    await consultar('pedro', s, outroProntuario).expect(403);
    expect(await acessos('consultar_evolucao', false)).toHaveLength(2);
    await request(app.getHttpServer())
      .get(`/prontuarios/${prontuarioId}/sessoes/${s}/evolucao`)
      .expect(401);
  });
});
