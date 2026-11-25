import { Global, INestApplication, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import {
  atribuicoesSupervisor,
  casos,
  inscricoes,
  pagamentosContribuicao,
  sessoesAtendimento,
  usuarios,
  vinculosEstagiario,
  type Db,
} from '@clinica/database';
import {
  hojeEmBrasilia,
  prazoDaContribuicao,
  type ContribuicaoDoPaciente,
  type StatusSessao,
} from '@clinica/shared';
import { AuditoriaModule } from '../../auditoria/auditoria.module';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import {
  casosComContribuicaoPendente,
  primeirasSessoesComContribuicaoPendente,
} from '../../common/contribuicao-pendente';
import { DB } from '../../database/database.module';
import {
  CHAVE_TESTE,
  criarBancoDeTeste,
} from '../../test-utils/banco-de-teste';
import { AdministrativoModule } from './administrativo.module';

// RF42: situação da contribuição social dos pacientes em atendimento, para a
// secretaria e a coordenação, e a indicação na 1ª sessão do ciclo.
const DIA = 24 * 60 * 60 * 1000;
const daqui = (dias: number) => new Date(Date.now() + dias * DIA);

describe('Situação da contribuição social dos pacientes (RF42)', () => {
  let app: INestApplication;
  let db: Db;
  let limpar: () => Promise<unknown>;
  let fechar: () => Promise<void>;
  const pessoas: Record<string, UsuarioAutenticado> = {};
  let numero = 0;

  beforeAll(async () => {
    ({ db, limpar, fechar } = await criarBancoDeTeste());

    @Global()
    @Module({ providers: [{ provide: DB, useValue: db }], exports: [DB] })
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
        AdministrativoModule,
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
      ['carla', 'Carla Mendes', 'supervisor'],
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

  // Paciente em atendimento, vinculado à Ana há `vinculadoHa` dias.
  async function criarCaso(
    nome: string,
    { vinculadoHa = 3, situacao = 'em_atendimento' as const } = {},
  ) {
    numero += 1;
    const [inscricao] = await db
      .insert(inscricoes)
      .values({
        numero: `2026-${String(numero).padStart(5, '0')}`,
        nomeCompleto: nome,
        dataNascimento: '1990-01-01',
        cpf: String(numero).padStart(11, '0'),
        endereco: 'Rua Fictícia, 1',
        estadoCivil: 'solteira',
        canalPreferencial: 'email',
        email: 'paciente@exemplo.com',
        queixaCifrada: 'x',
        percepcaoUrgenciaCifrada: 'x',
        historicoRelevanteCifrado: 'x',
      })
      .returning();
    const [caso] = await db
      .insert(casos)
      .values({
        inscricaoId: inscricao.id,
        entradaNaFilaEm: daqui(-30),
        situacao,
      })
      .returning();
    await db.insert(atribuicoesSupervisor).values({
      casoId: caso.id,
      supervisorId: pessoas.carla.id,
      atribuidoPor: pessoas.coordenacao.id,
      atribuidoEm: daqui(-29),
    });
    const vinculadoEm = daqui(-vinculadoHa);
    await db.insert(vinculosEstagiario).values({
      casoId: caso.id,
      estagiarioId: pessoas.ana.id,
      vinculadoPor: pessoas.carla.id,
      vinculadoEm,
    });
    return { id: caso.id, vinculadoEm };
  }

  async function sessao(casoId: string, dias: number, status: StatusSessao) {
    const inicio = daqui(dias);
    const [s] = await db
      .insert(sessoesAtendimento)
      .values({
        casoId,
        cicloAtendimento: 1,
        estagiarioId: pessoas.ana.id,
        inicio,
        termino: new Date(inicio.getTime() + 50 * 60_000),
        fimIntervaloAnotacoes: new Date(inicio.getTime() + 60 * 60_000),
        status,
        agendadaPor: pessoas.secretaria.id,
      })
      .returning();
    return s;
  }

  async function pagar(casoId: string, pagoEm: string, versao = 1) {
    await db.insert(pagamentosContribuicao).values({
      casoId,
      cicloAtendimento: 1,
      versao,
      valorCentavos: 3500,
      pagoEm,
      forma: 'pix',
      motivoCorrecao: versao > 1 ? 'Data errada.' : null,
      registradoPor: pessoas.secretaria.id,
    });
  }

  const listar = (quem: string, situacao?: string) =>
    request(app.getHttpServer())
      .get(`/contribuicoes${situacao ? `?situacao=${situacao}` : ''}`)
      .set('x-usuario-teste', JSON.stringify(pessoas[quem]));

  it('lista os pacientes em atendimento com a situação, a 1ª sessão, o pagamento e o prazo (RF42)', async () => {
    const mariana = await criarCaso('Mariana Alves Toledo');
    const joao = await criarCaso('João Pedro Lima', { vinculadoHa: 2 });
    const camila = await criarCaso('Camila Souza Reis', { vinculadoHa: 1 });
    await criarCaso('Paciente na Fila', {
      situacao: 'aguardando_distribuicao' as never,
    });
    const s1 = await sessao(mariana.id, -2, 'realizada');
    await sessao(mariana.id, 5, 'agendada');
    // A sessão cancelada não conta como a primeira.
    await sessao(joao.id, 1, 'cancelada');
    const s2 = await sessao(joao.id, 3, 'agendada');
    await pagar(mariana.id, hojeEmBrasilia(daqui(-5)));
    // A correção vale: a data do pagamento é a da versão vigente.
    await pagar(mariana.id, hojeEmBrasilia(daqui(-2)), 2);

    const res = await listar('secretaria').expect(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body as ContribuicaoDoPaciente[]).toEqual([
      {
        casoId: camila.id,
        paciente: 'Camila Souza Reis',
        situacao: 'pendente',
        primeiraSessao: null,
        pagoEm: null,
        prazoAte: prazoDaContribuicao(camila.vinculadoEm),
      },
      {
        casoId: joao.id,
        paciente: 'João Pedro Lima',
        situacao: 'pendente',
        primeiraSessao: s2.inicio.toISOString(),
        pagoEm: null,
        prazoAte: prazoDaContribuicao(joao.vinculadoEm),
      },
      {
        casoId: mariana.id,
        paciente: 'Mariana Alves Toledo',
        situacao: 'efetivada',
        primeiraSessao: s1.inicio.toISOString(),
        pagoEm: hojeEmBrasilia(daqui(-2)),
        prazoAte: null,
      },
    ]);
    // Sem a forma nem o valor do pagamento.
    expect(JSON.stringify(res.body)).not.toMatch(/pix|3500|valor|forma/i);
  });

  it('o filtro traz só a situação pedida, e a lista vazia vem sem erro (RF42)', async () => {
    const mariana = await criarCaso('Mariana Alves Toledo');
    const joao = await criarCaso('João Pedro Lima');
    await pagar(mariana.id, hojeEmBrasilia());

    const pendentes = await listar('coordenacao', 'pendente').expect(200);
    expect(pendentes.body.map((c: ContribuicaoDoPaciente) => c.casoId)).toEqual(
      [joao.id],
    );
    const efetivadas = await listar('coordenacao', 'efetivada').expect(200);
    expect(
      efetivadas.body.map((c: ContribuicaoDoPaciente) => c.casoId),
    ).toEqual([mariana.id]);

    // Depois do registro (RF41), o paciente passa a efetivada.
    await pagar(joao.id, hojeEmBrasilia());
    await listar('secretaria', 'pendente').expect(200).expect([]);
    await listar('secretaria', 'outra').expect(400);
  });

  it('só a secretaria e a coordenação consultam; o supervisor e o estagiário recebem 403 (RF42)', async () => {
    await criarCaso('Mariana Alves Toledo');
    await listar('carla').expect(403);
    await listar('ana').expect(403);
    await request(app.getHttpServer()).get('/contribuicoes').expect(401);
  });

  it('a indicação vai só para a 1ª sessão do ciclo de quem não pagou, e some com o pagamento (RF42)', async () => {
    const mariana = await criarCaso('Mariana Alves Toledo');
    const joao = await criarCaso('João Pedro Lima');
    await sessao(mariana.id, 1, 'cancelada');
    const primeira = await sessao(mariana.id, 2, 'agendada');
    await sessao(mariana.id, 9, 'agendada');
    await sessao(joao.id, 4, 'agendada');
    await pagar(joao.id, hojeEmBrasilia());

    const ids = [mariana.id, joao.id];
    expect(await primeirasSessoesComContribuicaoPendente(db, ids)).toEqual(
      new Set([primeira.id]),
    );
    expect(await casosComContribuicaoPendente(db, ids)).toEqual(
      new Set([mariana.id]),
    );

    await pagar(mariana.id, hojeEmBrasilia());
    expect(await primeirasSessoesComContribuicaoPendente(db, ids)).toEqual(
      new Set(),
    );
    expect(await casosComContribuicaoPendente(db, ids)).toEqual(new Set());
    expect(await casosComContribuicaoPendente(db, [])).toEqual(new Set());
  });
});
