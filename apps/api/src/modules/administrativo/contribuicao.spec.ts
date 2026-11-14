import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Global, INestApplication, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { PGlite } from '@electric-sql/pglite';
import { and, eq } from 'drizzle-orm';
import request from 'supertest';
import {
  alteracoesParametro,
  atribuicoesSupervisor,
  auditoria,
  casos,
  inscricoes,
  pagamentosContribuicao,
  parametros,
  usuarios,
  vinculosEstagiario,
  type Db,
} from '@clinica/database';
import {
  hojeEmBrasilia,
  type SituacaoContribuicao,
  type ValorContribuicao,
} from '@clinica/shared';
import { AuditoriaModule } from '../../auditoria/auditoria.module';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { DB } from '../../database/database.module';
import {
  CHAVE_TESTE,
  criarBancoDeTeste,
} from '../../test-utils/banco-de-teste';
import { AdministrativoModule } from './administrativo.module';

// RF41: registro do pagamento da contribuição social, correção versionada e valor
// pela coordenação. O usuário da sessão (RF50) é simulado pelo cabeçalho
// x-usuario-teste.
const DIA = 24 * 60 * 60 * 1000;
const diasAtras = (dias: number) => new Date(Date.now() - dias * DIA);
// Dia do calendário de Brasília daqui a `dias` dias (negativo = passado).
const dia = (dias: number) => hojeEmBrasilia(new Date(Date.now() + dias * DIA));

describe('Contribuição social do paciente (RF41, RNF36)', () => {
  let app: INestApplication;
  let db: Db;
  let limpar: () => Promise<unknown>;
  let fechar: () => Promise<void>;
  let valorDaMigration: string | undefined;
  const pessoas: Record<string, UsuarioAutenticado> = {};
  let numero = 0;

  beforeAll(async () => {
    ({ db, limpar, fechar } = await criarBancoDeTeste());
    // Antes de limpar o banco, que também esvazia os parâmetros.
    [{ valor: valorDaMigration }] = await db
      .select({ valor: parametros.valor })
      .from(parametros)
      .where(eq(parametros.chave, 'valor_contribuicao_centavos'));

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
      ['pedro', 'Pedro Henrique Lima', 'estagiario'],
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

  // Caso que entrou na fila há 30 dias. Com `vinculadoHa`, a Ana foi vinculada
  // há esse número de dias.
  async function criarCaso(vinculadoHa: number | null = 3) {
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
        estadoCivil: 'solteira',
        canalPreferencial: 'email',
        email: 'mariana@exemplo.com',
        queixaCifrada: 'x',
        percepcaoUrgenciaCifrada: 'x',
        historicoRelevanteCifrado: 'x',
      })
      .returning();
    const [caso] = await db
      .insert(casos)
      .values({
        inscricaoId: inscricao.id,
        entradaNaFilaEm: diasAtras(30),
        situacao:
          vinculadoHa === null ? 'aguardando_vinculo' : 'em_atendimento',
      })
      .returning();
    await db.insert(atribuicoesSupervisor).values({
      casoId: caso.id,
      supervisorId: pessoas.carla.id,
      atribuidoPor: pessoas.coordenacao.id,
      atribuidoEm: diasAtras(29),
    });
    if (vinculadoHa !== null) {
      await db.insert(vinculosEstagiario).values({
        casoId: caso.id,
        estagiarioId: pessoas.ana.id,
        vinculadoPor: pessoas.carla.id,
        vinculadoEm: diasAtras(vinculadoHa),
      });
    }
    return caso.id;
  }

  const como = (quem: string) => ({
    'x-usuario-teste': JSON.stringify(pessoas[quem]),
  });
  const http = () => request(app.getHttpServer());
  const consultar = (quem: string, casoId: string) =>
    http().get(`/casos/${casoId}/contribuicao`).set(como(quem));
  const registrar = (quem: string, casoId: string, corpo: object) =>
    http().post(`/casos/${casoId}/contribuicao`).set(como(quem)).send(corpo);
  const corrigir = (quem: string, casoId: string, corpo: object) =>
    http()
      .post(`/casos/${casoId}/contribuicao/correcao`)
      .set(como(quem))
      .send(corpo);
  const alterarValor = (quem: string, valorCentavos: unknown) =>
    http()
      .put('/parametros/valor-contribuicao')
      .set(como(quem))
      .send({ valorCentavos });
  const pagamentos = (casoId: string) =>
    db
      .select()
      .from(pagamentosContribuicao)
      .where(eq(pagamentosContribuicao.casoId, casoId))
      .orderBy(pagamentosContribuicao.versao);
  const eventos = (operacao: string) =>
    db.select().from(auditoria).where(eq(auditoria.operacao, operacao));

  it('sem sessão, as rotas respondem 401 (RF41)', async () => {
    const caso = await criarCaso();
    await http().get(`/casos/${caso}/contribuicao`).expect(401);
    await http()
      .post(`/casos/${caso}/contribuicao`)
      .send({ pagoEm: dia(0), forma: 'pix' })
      .expect(401);
    await http().get('/parametros/valor-contribuicao').expect(401);
  });

  it('o valor começa em R$ 35,00, em centavos, pela migration (RF41)', () => {
    expect(valorDaMigration).toBe('3500');
  });

  it('caso vinculado há 3 dias: pendente, com o prazo em 7 dias, contado do vínculo (RF41)', async () => {
    const caso = await criarCaso(3);
    const { body } = await consultar('secretaria', caso).expect(200);
    expect(body).toMatchObject({
      casoId: caso,
      cicloAtendimento: 1,
      situacao: 'pendente',
      prazo: { ate: dia(7) },
      valorAtualCentavos: 3500,
      vigente: null,
      anteriores: [],
    });
    expect(hojeEmBrasilia(new Date(body.prazo.vinculadoEm))).toBe(dia(-3));
  });

  it('a secretaria registra o pagamento em Pix: fica efetivada com o valor do parâmetro, a data, a forma, quem registrou e quando, e a operação é auditada (RF41, RNF36, RNF10)', async () => {
    const caso = await criarCaso();
    const antes = Date.now();
    const { body } = await registrar('secretaria', caso, {
      pagoEm: dia(-1),
      forma: 'pix',
    }).expect(201);
    const situacao = body as SituacaoContribuicao;
    expect(situacao).toMatchObject({
      situacao: 'efetivada',
      vigente: {
        versao: 1,
        valorCentavos: 3500,
        pagoEm: dia(-1),
        forma: 'pix',
        motivoCorrecao: null,
        registradoPor: 'Juliana Rocha',
      },
      anteriores: [],
    });
    expect(
      new Date(situacao.vigente!.registradoEm).getTime(),
    ).toBeGreaterThanOrEqual(antes - 1000);

    const [linha] = await pagamentos(caso);
    expect(linha).toMatchObject({
      cicloAtendimento: 1,
      versao: 1,
      valorCentavos: 3500,
      pagoEm: dia(-1),
      forma: 'pix',
      registradoPor: pessoas.secretaria.id,
    });
    const [evento] = await eventos('registrar_contribuicao');
    expect(evento).toMatchObject({
      usuarioId: pessoas.secretaria.id,
      entidade: 'pagamentos_contribuicao',
      entidadeId: linha.id,
      dadosNovos: {
        casoId: caso,
        cicloAtendimento: 1,
        versao: 1,
        valorCentavos: 3500,
        pagoEm: dia(-1),
        forma: 'pix',
      },
    });

    // A consulta seguinte mostra o mesmo registro.
    const consulta = await consultar('secretaria', caso).expect(200);
    expect(consulta.body.situacao).toBe('efetivada');
  });

  it('o segundo pagamento no mesmo ciclo é bloqueado com 409, informando a data do já registrado (RF41)', async () => {
    const caso = await criarCaso();
    await registrar('secretaria', caso, {
      pagoEm: dia(-2),
      forma: 'dinheiro',
    }).expect(201);
    const { body } = await registrar('secretaria', caso, {
      pagoEm: dia(0),
      forma: 'cartao',
    }).expect(409);
    expect(body).toMatchObject({
      message: 'Este ciclo já tem pagamento registrado.',
      pagoEm: dia(-2),
    });
    expect(await pagamentos(caso)).toHaveLength(1);
  });

  it('dois registros ao mesmo tempo: um passa e o outro recebe 409 com a data do primeiro (RF41, RNF36)', async () => {
    const caso = await criarCaso();
    const respostas = await Promise.all([
      registrar('secretaria', caso, { pagoEm: dia(0), forma: 'pix' }),
      registrar('secretaria', caso, { pagoEm: dia(0), forma: 'dinheiro' }),
    ]);
    expect(respostas.map((r) => r.status).sort((a, b) => a - b)).toEqual([
      201, 409,
    ]);
    expect(respostas.find((r) => r.status === 409)!.body.pagoEm).toBe(dia(0));
    expect(await pagamentos(caso)).toHaveLength(1);
    expect(await eventos('registrar_contribuicao')).toHaveLength(1);
  });

  it('recusa com 400 a data futura, a data inválida e a forma fora da lista, indicando o campo, sem gravar nada (RF41)', async () => {
    const caso = await criarCaso();
    for (const [corpo, campo] of [
      [{ pagoEm: dia(1), forma: 'pix' }, 'pagoEm'],
      [{ pagoEm: '2026-02-30', forma: 'pix' }, 'pagoEm'],
      [{ forma: 'pix' }, 'pagoEm'],
      [{ pagoEm: dia(0), forma: 'boleto' }, 'forma'],
      [{ pagoEm: dia(0) }, 'forma'],
    ] as const) {
      const { body } = await registrar('secretaria', caso, corpo).expect(400);
      expect(
        (body.message as { path: string[] }[]).map((i) => i.path[0]),
      ).toContain(campo);
    }
    expect(await pagamentos(caso)).toHaveLength(0);
  });

  it('recusa com 422 o caso sem vínculo com estagiário depois da entrada na fila, porque a contribuição ainda não é devida (RF41)', async () => {
    const caso = await criarCaso(null);
    const consulta = await consultar('secretaria', caso).expect(200);
    expect(consulta.body).toMatchObject({ situacao: 'pendente', prazo: null });
    const { body } = await registrar('secretaria', caso, {
      pagoEm: dia(0),
      forma: 'pix',
    }).expect(422);
    expect(body.message).toContain('depois do vínculo');
    expect(await pagamentos(caso)).toHaveLength(0);
  });

  it('caso inexistente: 404 (RF41)', async () => {
    const id = '00000000-0000-4000-8000-000000000000';
    await consultar('secretaria', id).expect(404);
    await registrar('secretaria', id, { pagoEm: dia(0), forma: 'pix' }).expect(
      404,
    );
  });

  it('a correção sem motivo é recusada (400); com motivo, gera a versão 2 com autor e data/hora e mantém a versão 1 consultável (RF41, RNF36)', async () => {
    const caso = await criarCaso();
    await registrar('secretaria', caso, {
      pagoEm: dia(-1),
      forma: 'pix',
    }).expect(201);

    for (const motivo of [undefined, '', '   ']) {
      const { body } = await corrigir('secretaria', caso, {
        valorCentavos: 3500,
        pagoEm: dia(-1),
        forma: 'cartao',
        motivo,
      }).expect(400);
      expect(
        (body.message as { path: string[] }[]).map((i) => i.path[0]),
      ).toContain('motivo');
    }
    expect(await pagamentos(caso)).toHaveLength(1);

    const { body } = await corrigir('secretaria', caso, {
      valorCentavos: 3500,
      pagoEm: dia(-1),
      forma: 'cartao',
      motivo: 'Forma de pagamento registrada errada.',
    }).expect(201);
    expect(body).toMatchObject({
      situacao: 'efetivada',
      vigente: {
        versao: 2,
        forma: 'cartao',
        motivoCorrecao: 'Forma de pagamento registrada errada.',
        registradoPor: 'Juliana Rocha',
      },
      anteriores: [
        {
          versao: 1,
          forma: 'pix',
          motivoCorrecao: null,
          registradoPor: 'Juliana Rocha',
        },
      ],
    });

    // As duas versões continuam no banco, a 1 sem mudança nenhuma.
    const linhas = await pagamentos(caso);
    expect(linhas.map((l) => [l.versao, l.forma])).toEqual([
      [1, 'pix'],
      [2, 'cartao'],
    ]);
    const [evento] = await eventos('corrigir_contribuicao');
    expect(evento).toMatchObject({
      usuarioId: pessoas.secretaria.id,
      entidadeId: linhas[1].id,
      dadosAnteriores: { versao: 1, forma: 'pix', valorCentavos: 3500 },
      dadosNovos: {
        versao: 2,
        forma: 'cartao',
        motivo: 'Forma de pagamento registrada errada.',
      },
    });

    // A correção pode mudar o valor, porque o erro pode estar nele.
    const terceira = await corrigir('secretaria', caso, {
      valorCentavos: 3000,
      pagoEm: dia(-1),
      forma: 'cartao',
      motivo: 'Valor recebido era o do semestre anterior.',
    }).expect(201);
    expect(terceira.body.vigente).toMatchObject({
      versao: 3,
      valorCentavos: 3000,
    });
    expect(
      (terceira.body as SituacaoContribuicao).anteriores.map((v) => v.versao),
    ).toEqual([2, 1]);
  });

  it('a correção sem pagamento no ciclo e a correção que não muda nada são recusadas com 422 (RF41)', async () => {
    const caso = await criarCaso();
    await corrigir('secretaria', caso, {
      valorCentavos: 3500,
      pagoEm: dia(0),
      forma: 'pix',
      motivo: 'Teste',
    }).expect(422);
    await registrar('secretaria', caso, {
      pagoEm: dia(0),
      forma: 'pix',
    }).expect(201);
    await corrigir('secretaria', caso, {
      valorCentavos: 3500,
      pagoEm: dia(0),
      forma: 'pix',
      motivo: 'Sem mudança',
    }).expect(422);
    expect(await pagamentos(caso)).toHaveLength(1);
  });

  it.each(['ana', 'carla', 'coordenacao'])(
    '%s não consulta, não registra e não corrige o pagamento (403) (RF41)',
    async (quem) => {
      const caso = await criarCaso();
      await consultar(quem, caso).expect(403);
      await registrar(quem, caso, { pagoEm: dia(0), forma: 'pix' }).expect(403);
      await corrigir(quem, caso, {
        valorCentavos: 3500,
        pagoEm: dia(0),
        forma: 'pix',
        motivo: 'Teste',
      }).expect(403);
      expect(await pagamentos(caso)).toHaveLength(0);
    },
  );

  it.each(['secretaria', 'ana', 'carla'])(
    '%s não consulta nem altera o valor da contribuição (403) (RF41)',
    async (quem) => {
      await http()
        .get('/parametros/valor-contribuicao')
        .set(como(quem))
        .expect(403);
      await alterarValor(quem, 4000).expect(403);
      expect(await db.select().from(alteracoesParametro)).toHaveLength(0);
    },
  );

  it('a coordenação muda o valor de R$ 35,00 para R$ 40,00: guarda o anterior, o novo, o autor e a data/hora, e só o registro seguinte usa R$ 40,00 (RF41, RNF36)', async () => {
    const pago = await criarCaso();
    await registrar('secretaria', pago, {
      pagoEm: dia(-1),
      forma: 'pix',
    }).expect(201);

    const inicial = await http()
      .get('/parametros/valor-contribuicao')
      .set(como('coordenacao'))
      .expect(200);
    expect(inicial.body).toEqual({
      valorCentavos: 3500,
      ultimaAlteracao: null,
    });

    const { body } = await alterarValor('coordenacao', 4000).expect(200);
    expect(body as ValorContribuicao).toMatchObject({
      valorCentavos: 4000,
      ultimaAlteracao: {
        valorAnterior: '3500',
        valorNovo: '4000',
        por: 'Helena Duarte',
      },
    });

    const [alteracao] = await db
      .select()
      .from(alteracoesParametro)
      .where(eq(alteracoesParametro.chave, 'valor_contribuicao_centavos'));
    expect(alteracao).toMatchObject({
      valorAnterior: '3500',
      valorNovo: '4000',
      alteradoPor: pessoas.coordenacao.id,
    });
    expect(alteracao.alteradoEm).toBeInstanceOf(Date);
    const [linha] = await db
      .select()
      .from(parametros)
      .where(
        and(
          eq(parametros.chave, 'valor_contribuicao_centavos'),
          eq(parametros.valor, '4000'),
        ),
      );
    expect(linha.alteradoPor).toBe(pessoas.coordenacao.id);
    const [evento] = await eventos('alterar_valor_contribuicao');
    expect(evento).toMatchObject({
      usuarioId: pessoas.coordenacao.id,
      entidade: 'parametros',
      dadosAnteriores: { valorCentavos: 3500 },
      dadosNovos: { valorCentavos: 4000 },
    });

    // O registro seguinte usa o valor novo; o anterior continua com R$ 35,00.
    const novo = await criarCaso();
    const registro = await registrar('secretaria', novo, {
      pagoEm: dia(0),
      forma: 'dinheiro',
    }).expect(201);
    expect(registro.body.vigente.valorCentavos).toBe(4000);
    expect((await pagamentos(pago))[0].valorCentavos).toBe(3500);
    const consulta = await consultar('secretaria', pago).expect(200);
    expect(consulta.body.vigente.valorCentavos).toBe(3500);
    expect(consulta.body.valorAtualCentavos).toBe(4000);

    // Salvar o mesmo valor não gera outra alteração.
    await alterarValor('coordenacao', 4000).expect(200);
    expect(await db.select().from(alteracoesParametro)).toHaveLength(1);
  });

  it('recusa com 400 o valor zero, negativo, fracionado ou acima do limite (RF41)', async () => {
    for (const valor of [0, -100, 35.5, '3500', 100_001, undefined]) {
      await alterarValor('coordenacao', valor).expect(400);
    }
    expect(await db.select().from(alteracoesParametro)).toHaveLength(0);
  });

  it('o caso transferido para outro estagiário continua com o prazo contado do primeiro vínculo (RF41, RF25)', async () => {
    const caso = await criarCaso(5);
    await db
      .update(vinculosEstagiario)
      .set({ vigente: false, encerradoEm: diasAtras(2) })
      .where(eq(vinculosEstagiario.casoId, caso));
    await db.insert(vinculosEstagiario).values({
      casoId: caso,
      estagiarioId: pessoas.pedro.id,
      vinculadoPor: pessoas.carla.id,
      vinculadoEm: diasAtras(2),
    });
    const { body } = await consultar('secretaria', caso).expect(200);
    expect(body.prazo.ate).toBe(dia(5));
    expect(hojeEmBrasilia(new Date(body.prazo.vinculadoEm))).toBe(dia(-5));
  });

  it('o caso que voltou à fila e foi vinculado de novo tem o prazo recomeçado no vínculo novo (RF41, RF43)', async () => {
    const caso = await criarCaso(12);
    // Perdeu a vaga e voltou à fila há 4 dias, ainda sem vínculo novo.
    await db
      .update(vinculosEstagiario)
      .set({ vigente: false, encerradoEm: diasAtras(4) })
      .where(eq(vinculosEstagiario.casoId, caso));
    await db
      .update(casos)
      .set({ entradaNaFilaEm: diasAtras(4), situacao: 'aguardando_vinculo' })
      .where(eq(casos.id, caso));
    const semVinculo = await consultar('secretaria', caso).expect(200);
    expect(semVinculo.body.prazo).toBeNull();
    await registrar('secretaria', caso, {
      pagoEm: dia(0),
      forma: 'pix',
    }).expect(422);

    await db.insert(vinculosEstagiario).values({
      casoId: caso,
      estagiarioId: pessoas.pedro.id,
      vinculadoPor: pessoas.carla.id,
      vinculadoEm: diasAtras(1),
    });
    const { body } = await consultar('secretaria', caso).expect(200);
    expect(body.prazo.ate).toBe(dia(9));
  });

  it('um ciclo de atendimento novo pede uma contribuição nova, sem mostrar a do ciclo anterior (RF41)', async () => {
    const caso = await criarCaso();
    await registrar('secretaria', caso, {
      pagoEm: dia(-1),
      forma: 'pix',
    }).expect(201);
    await db
      .update(casos)
      .set({ cicloAtendimento: 2 })
      .where(eq(casos.id, caso));
    const pendente = await consultar('secretaria', caso).expect(200);
    expect(pendente.body).toMatchObject({
      cicloAtendimento: 2,
      situacao: 'pendente',
      vigente: null,
    });
    await registrar('secretaria', caso, {
      pagoEm: dia(0),
      forma: 'dinheiro',
    }).expect(201);
    const linhas = await pagamentos(caso);
    expect(linhas.map((l) => [l.cicloAtendimento, l.versao])).toEqual([
      [1, 1],
      [2, 1],
    ]);
  });

  it('o clinica_app não consegue apagar nem alterar uma versão do pagamento: o banco recusa (RF41, RNF36)', async () => {
    const caso = await criarCaso();
    await registrar('secretaria', caso, {
      pagoEm: dia(0),
      forma: 'pix',
    }).expect(201);
    const cliente = (db as unknown as { $client: PGlite }).$client;
    await cliente.exec(
      readFileSync(
        join(
          __dirname,
          '../../../../../packages/database/sql/usuario-da-aplicacao.sql',
        ),
        'utf8',
      ),
    );
    await cliente.exec('set role clinica_app');
    try {
      await expect(
        cliente.exec('delete from pagamentos_contribuicao'),
      ).rejects.toThrow(/permission denied/);
      await expect(
        cliente.exec('update pagamentos_contribuicao set valor_centavos = 1'),
      ).rejects.toThrow(/permission denied/);
      await expect(
        cliente.exec('truncate pagamentos_contribuicao'),
      ).rejects.toThrow(/permission denied/);
    } finally {
      await cliente.exec('reset role');
    }
    // Mesmo o dono do banco esbarra no gatilho.
    await expect(
      db.update(pagamentosContribuicao).set({ valorCentavos: 1 }),
    ).rejects.toThrow();
    await expect(db.delete(pagamentosContribuicao)).rejects.toThrow();
    expect(await pagamentos(caso)).toHaveLength(1);
  });
});
