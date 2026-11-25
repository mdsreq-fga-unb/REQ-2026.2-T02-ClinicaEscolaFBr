import { Global, Module, type INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import {
  acessosProntuario,
  atribuicoesSupervisor,
  casos,
  inscricoes,
  usuarios,
  vinculosEstagiario,
  prontuarios,
  sessoesAtendimento,
  evolucoes,
  correcoesEvolucao,
  complementosEvolucao,
  validacoesEvolucao,
  transferenciasCaso,
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

describe('RF32 — histórico de evoluções por ciclo', () => {
  let app: INestApplication;
  let db: Db;
  let limpar: () => Promise<unknown>;
  let fechar: () => Promise<void>;
  let casoId: string, primeiro: string, segundo: string;
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
  }, 120000);
  afterAll(async () => {
    await app?.close();
    await fechar?.();
  });
  beforeEach(async () => {
    await limpar();
    for (const [nome, perfil] of [
      ['atual', 'estagiario'],
      ['anterior', 'estagiario'],
      ['supervisor', 'supervisor'],
      ['outro', 'supervisor'],
      ['secretaria', 'secretaria'],
      ['coordenacao', 'coordenacao'],
    ] as const) {
      const [u] = await db
        .insert(usuarios)
        .values({ nome, perfil, email: `${nome}@example.test` })
        .returning();
      pessoas[nome] = { id: u.id, nome, perfil };
    }
    const [i] = await db
      .insert(inscricoes)
      .values({
        numero: '2026-001',
        nomeCompleto: 'Paciente de teste',
        cpf: '11144477735',
        dataNascimento: '1990-01-01',
        endereco: 'Rua fictícia',
        estadoCivil: 'solteiro',
        canalPreferencial: 'email',
        email: 'teste@example.test',
      })
      .returning();
    const [c] = await db
      .insert(casos)
      .values({
        inscricaoId: i.id,
        entradaNaFilaEm: new Date('2026-01-01Z'),
        situacao: 'em_atendimento',
        cicloAtendimento: 2,
      })
      .returning();
    casoId = c.id;
    const [v] = await db
      .insert(vinculosEstagiario)
      .values({
        casoId,
        estagiarioId: pessoas.atual.id,
        vinculadoPor: pessoas.supervisor.id,
      })
      .returning();
    await db.insert(atribuicoesSupervisor).values({
      casoId,
      supervisorId: pessoas.supervisor.id,
      atribuidoPor: pessoas.coordenacao.id,
    });
    const ps = await db
      .insert(prontuarios)
      .values(
        [1, 2].map((ciclo) => ({
          casoId,
          cicloAtendimento: ciclo,
          vinculoOrigemId: v.id,
          criadoEm: new Date(`2026-0${ciclo === 1 ? 1 : 7}-01T12:00:00Z`),
        })),
      )
      .returning();
    primeiro = ps[0].id;
    segundo = ps[1].id;
  });
  const get = (perfil = 'atual', ciclo?: string, id = primeiro) =>
    request(app.getHttpServer())
      .get(`/prontuarios/${id}/evolucoes`)
      .query(ciclo === undefined ? {} : { ciclo })
      .set('x-usuario-teste', JSON.stringify(pessoas[perfil]));
  async function evoluir(inicio: string, autor: string) {
    const data = new Date(inicio);
    const [s] = await db
      .insert(sessoesAtendimento)
      .values({
        casoId,
        cicloAtendimento: 1,
        estagiarioId: pessoas[autor].id,
        agendadaPor: pessoas.secretaria.id,
        inicio: data,
        termino: new Date(+data + 3000000),
        fimIntervaloAnotacoes: new Date(+data + 3600000),
        status: 'realizada',
      })
      .returning();
    const [e] = await db
      .insert(evolucoes)
      .values({
        prontuarioId: primeiro,
        sessaoId: s.id,
        registradaPor: pessoas[autor].id,
        registradaEm: new Date(+data + 3600000),
        queixaCifrada: cifrar('Conteúdo original sigiloso', CHAVE_TESTE),
        planejamentoCifrado: cifrar('Planejamento', CHAVE_TESTE),
      })
      .returning();
    return e;
  }
  it('padrão é o ciclo atual, mesmo quando a URL tem o prontuário anterior; não busca dados de outro ciclo vazio', async () => {
    await evoluir('2026-02-10T13:00:00Z', 'anterior');
    const r = await get().expect(200);
    expect(r.body).toMatchObject({
      prontuarioId: segundo,
      ciclo: 2,
      sessoes: [],
      ciclos: [
        { numero: 1, atual: false },
        { numero: 2, atual: true },
      ],
    });
    expect(r.headers['cache-control']).toBe('no-store');
  });
  it('ordena sessões e versões, mantém autoria anterior e não expõe cifra ou motivo de transferência', async () => {
    await evoluir('2026-03-10T13:00:00Z', 'atual');
    const e = await evoluir('2026-02-10T13:00:00Z', 'anterior');
    await db.insert(correcoesEvolucao).values({
      evolucaoId: e.id,
      versao: 2,
      corrigidaPor: pessoas.supervisor.id,
      corrigidaEm: new Date('2026-02-11T13:00:00Z'),
      motivoCifrado: cifrar('Corrigir anotação', CHAVE_TESTE),
      queixaCifrada: cifrar('Conteúdo corrigido', CHAVE_TESTE),
      planejamentoCifrado: cifrar('Planejamento corrigido', CHAVE_TESTE),
    });
    await db.insert(transferenciasCaso).values({
      casoId,
      tipo: 'estagiario',
      estagiarioAnteriorId: pessoas.anterior.id,
      estagiarioNovoId: pessoas.atual.id,
      motivoCifrado: cifrar('MOTIVO RESTRITO', CHAVE_TESTE),
      transferidoPor: pessoas.supervisor.id,
      transferidoEm: new Date('2026-03-01T12:00:00Z'),
    });
    const r = await get('atual', '1').expect(200);
    expect(r.body.sessoes.map((s: { autor: string }) => s.autor)).toEqual([
      'anterior',
      'atual',
    ]);
    expect(
      r.body.sessoes[0].registros.map((v: { tipo: string; autor: string }) => [
        v.tipo,
        v.autor,
      ]),
    ).toEqual([
      ['original', 'anterior'],
      ['correcao', 'supervisor'],
    ]);
    expect(r.body.sessoes[0].registros[1].motivo).toBe('Corrigir anotação');
    expect(r.body.sessoes[0].validacao).toEqual({
      situacao: 'pendente',
      ultima: null,
      mudanca: null,
    });
    expect(r.body.transferencias[0]).toMatchObject({
      estagiarioAnterior: 'anterior',
      estagiarioNovo: 'atual',
    });
    expect(JSON.stringify(r.body)).not.toMatch(/MOTIVO RESTRITO|Cifrad/);
    const atual = await get().expect(200);
    expect(atual.body.transferencias).toEqual([]);
  });
  it.each(['correcao', 'complemento'] as const)(
    'RF67 volta a pendente após %s, preservando a validação anterior e o original',
    async (tipo) => {
      const e = await evoluir('2026-02-10T13:00:00Z', 'anterior');
      await db.insert(complementosEvolucao).values({
        evolucaoId: e.id,
        textoCifrado: cifrar('Informação adicional sigilosa', CHAVE_TESTE),
        registradoPor: pessoas.atual.id,
        registradoEm: new Date('2026-02-11T13:00:00Z'),
      });
      await db.insert(validacoesEvolucao).values({
        evolucaoId: e.id,
        validadaPor: pessoas.supervisor.id,
        validadaEm: new Date('2026-02-12T13:00:00Z'),
      });
      const validada = (await get('atual', '1').expect(200)).body.sessoes[0];
      expect(validada.validacao).toEqual({
        situacao: 'validada',
        ultima: { por: 'supervisor', em: '2026-02-12T13:00:00.000Z' },
        mudanca: null,
      });
      expect(validada.registros.map((r: { tipo: string }) => r.tipo)).toEqual([
        'original',
        'complemento',
      ]);
      expect(validada.registros[1]).toMatchObject({
        autor: 'atual',
        versao: null,
        campos: [
          { rotulo: 'Complemento', texto: 'Informação adicional sigilosa' },
        ],
      });
      const em = new Date('2026-02-13T13:00:00Z');
      if (tipo === 'complemento') {
        await db.insert(complementosEvolucao).values({
          evolucaoId: e.id,
          textoCifrado: cifrar('Complemento posterior', CHAVE_TESTE),
          registradoPor: pessoas.atual.id,
          registradoEm: em,
        });
      } else {
        await db.insert(correcoesEvolucao).values({
          evolucaoId: e.id,
          versao: 2,
          corrigidaPor: pessoas.supervisor.id,
          corrigidaEm: em,
          motivoCifrado: cifrar('Corrigir', CHAVE_TESTE),
          queixaCifrada: cifrar('Correção posterior', CHAVE_TESTE),
          planejamentoCifrado: cifrar('Plano', CHAVE_TESTE),
        });
      }
      const pendente = (await get('atual', '1').expect(200)).body.sessoes[0];
      expect(pendente.validacao).toEqual({
        situacao: 'pendente',
        ultima: validada.validacao.ultima,
        mudanca: { tipo, em: em.toISOString() },
      });
      expect(pendente.registros[0]).toEqual(validada.registros[0]);
      expect(
        new Set(pendente.registros.map((r: { id: string }) => r.id)).size,
      ).toBe(3);
      expect(pendente.registros.map((r: { tipo: string }) => r.tipo)).toEqual([
        'original',
        'complemento',
        tipo,
      ]);
      await get('anterior', '1').expect(403);
      const auditoria = JSON.stringify(
        await db.select().from(acessosProntuario),
      );
      expect(auditoria).not.toMatch(
        /Informação adicional sigilosa|Conteúdo original sigiloso|Complemento posterior|Correção posterior/,
      );
    },
  );
  it('filtro vazio seleciona o ciclo atual', async () => {
    expect((await get('atual', '').expect(200)).body.ciclo).toBe(2);
  });
  it.each(['atual', 'supervisor', 'coordenacao'])(
    'autoriza %s e registra leitura na RF56',
    async (perfil) => {
      await get(perfil, '1').expect(200);
      const registros = await db
        .select()
        .from(acessosProntuario)
        .where(eq(acessosProntuario.operacao, 'consultar_historico_evolucoes'));
      expect(registros).toEqual([
        expect.objectContaining({
          usuarioId: pessoas[perfil].id,
          permitido: true,
        }),
      ]);
    },
  );
  it.each(['anterior', 'outro', 'secretaria'])(
    'nega %s sem revelar dados e registra tentativa',
    async (perfil) => {
      const r = await get(perfil, '1').expect(403);
      expect(r.body.message).toBe('Você não tem acesso a este prontuário.');
      expect((await db.select().from(acessosProntuario))[0].permitido).toBe(
        false,
      );
    },
  );
  it.each(['0', '-1', '1.5', 'abc', '2147483648'])(
    'recusa filtro inválido %s',
    async (ciclo) => {
      await get('atual', ciclo).expect(400);
    },
  );
  it('ciclo não pertencente ao caso não retorna outro ciclo', async () => {
    await get('atual', '3').expect(404);
  });
  it('prontuário inexistente usa a mesma negação', async () => {
    await get(
      'atual',
      undefined,
      '00000000-0000-4000-8000-000000000000',
    ).expect(403);
  });
  it('sem sessão recebe 401', async () => {
    await request(app.getHttpServer())
      .get(`/prontuarios/${primeiro}/evolucoes`)
      .expect(401);
  });
});
