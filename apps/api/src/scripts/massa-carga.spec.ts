import { and, eq, like } from 'drizzle-orm';
import {
  casos,
  decisoesPrioridade,
  inscricoes,
  usuarios,
  type Db,
} from '@clinica/database';
import { CHAVE_TESTE, criarBancoDeTeste } from '../test-utils/banco-de-teste';
import {
  AGUARDANDO_DISTRIBUICAO,
  CONTAS_DA_CARGA,
  DOMINIO,
  inscricaoDaCarga,
  reporPendentes,
} from './massa-carga';

// Reposição dos casos aguardando distribuição da massa de carga (RNF12, RNF21):
// as gravações da carga consomem os pendentes, e o REPOR_PENDENTES=sim volta aos
// 160 sem mexer no que já existe.
describe('Massa de carga: reposição dos pendentes (RNF12, RNF21)', () => {
  let db: Db;
  let limpar: () => Promise<unknown>;
  let fechar: () => Promise<void>;
  let coordenacao: string;

  beforeAll(async () => {
    ({ db, limpar, fechar } = await criarBancoDeTeste());
  }, 60_000);

  afterAll(async () => {
    await fechar();
  });

  beforeEach(async () => {
    await limpar();
    const [u] = await db
      .insert(usuarios)
      .values({
        nome: 'Coordenação Carga 1',
        email: CONTAS_DA_CARGA.coordenacao(1),
        perfil: 'coordenacao',
        situacao: 'ativo',
      })
      .returning();
    coordenacao = u.id;
  });

  // `n` inscrições da massa, a partir do número `de`, com o caso na situação dada.
  async function criarDaMassa(
    de: number,
    n: number,
    situacao: 'aguardando_distribuicao' | 'em_atendimento',
  ) {
    const novas = await db
      .insert(inscricoes)
      .values(
        Array.from({ length: n }, (_, k) =>
          inscricaoDaCarga(
            de + k,
            CHAVE_TESTE,
            new Date('2026-03-01T12:00:00Z'),
          ),
        ),
      )
      .returning({ id: inscricoes.id, criadaEm: inscricoes.criadaEm });
    await db.insert(casos).values(
      novas.map((i) => ({
        inscricaoId: i.id,
        entradaNaFilaEm: i.criadaEm,
        situacao,
      })),
    );
  }

  const pendentesDaMassa = async () =>
    (
      await db
        .select({ id: casos.id })
        .from(casos)
        .innerJoin(inscricoes, eq(inscricoes.id, casos.inscricaoId))
        .where(
          and(
            eq(casos.situacao, 'aguardando_distribuicao'),
            like(inscricoes.email, `%@${DOMINIO}`),
          ),
        )
    ).length;

  it('repõe só o que falta para voltar aos 160, com prioridade e caso, e não mexe no que já existe', async () => {
    await criarDaMassa(0, 5, 'em_atendimento');
    await criarDaMassa(5, 2, 'aguardando_distribuicao');
    const antes = await db.select().from(casos);

    await reporPendentes(db, CHAVE_TESTE);

    expect(await pendentesDaMassa()).toBe(AGUARDANDO_DISTRIBUICAO);
    const depois = await db.select().from(casos);
    expect(depois).toHaveLength(antes.length + AGUARDANDO_DISTRIBUICAO - 2);
    // Os casos que já existiam continuam iguais.
    for (const c of antes) {
      expect(depois.find((d) => d.id === c.id)).toEqual(c);
    }
    // Cada inscrição nova tem a decisão de prioridade da coordenação da carga e
    // um e-mail diferente das que já existiam.
    const decisoes = await db.select().from(decisoesPrioridade);
    expect(decisoes).toHaveLength(AGUARDANDO_DISTRIBUICAO - 2);
    expect(decisoes.every((d) => d.decididaPor === coordenacao)).toBe(true);
    const emails = (
      await db.select({ e: inscricoes.email }).from(inscricoes)
    ).map((i) => i.e);
    expect(new Set(emails).size).toBe(emails.length);
    // Os repostos entram na fila agora, depois dos que já esperavam.
    const novos = depois.filter((d) => !antes.some((a) => a.id === d.id));
    expect(
      novos.every(
        (n) =>
          n.entradaNaFilaEm > new Date('2026-03-01T12:00:00Z') &&
          n.entradaNaFilaEm <= new Date(),
      ),
    ).toBe(true);
  });

  it('com os 160 pendentes, não cria nada', async () => {
    await criarDaMassa(0, AGUARDANDO_DISTRIBUICAO, 'aguardando_distribuicao');
    await reporPendentes(db, CHAVE_TESTE);
    expect(await db.select().from(inscricoes)).toHaveLength(
      AGUARDANDO_DISTRIBUICAO,
    );
  });

  it('casos fora da massa não contam como pendentes da carga', async () => {
    await db.insert(inscricoes).values({
      ...inscricaoDaCarga(0, CHAVE_TESTE, new Date()),
      email: 'paciente.real@exemplo.com',
      cpf: '12345678901',
    });
    const [real] = await db.select().from(inscricoes);
    await db.insert(casos).values({
      inscricaoId: real.id,
      entradaNaFilaEm: real.criadaEm,
      situacao: 'aguardando_distribuicao',
    });
    await reporPendentes(db, CHAVE_TESTE);
    expect(await pendentesDaMassa()).toBe(AGUARDANDO_DISTRIBUICAO);
  });
});
