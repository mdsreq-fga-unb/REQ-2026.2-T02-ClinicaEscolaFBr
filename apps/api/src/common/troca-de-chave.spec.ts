import {
  auditoria,
  decisoesPrioridade,
  inscricoes,
  usuarios,
} from '@clinica/database';
import { eq } from 'drizzle-orm';
import { CHAVE_TESTE, criarBancoDeTeste } from '../test-utils/banco-de-teste';
import { cifrar, decifrar } from './criptografia';
import { trocarChaveDados } from './troca-de-chave';

const CHAVE_NOVA = Buffer.alloc(32, 9).toString('base64');

describe('Troca da chave dos dados de saúde (RF1 e RF6)', () => {
  let banco: Awaited<ReturnType<typeof criarBancoDeTeste>>;

  beforeAll(async () => {
    banco = await criarBancoDeTeste();
  }, 60_000);
  afterAll(() => banco.fechar());

  async function dadosCifrados() {
    const { db } = banco;
    const [coordenacao] = await db
      .insert(usuarios)
      .values({
        nome: 'Helena Duarte',
        email: 'coordenacao@fbr.edu.br',
        perfil: 'coordenacao',
        situacao: 'ativo',
      })
      .returning();
    const [inscricao] = await db
      .insert(inscricoes)
      .values({
        numero: '2026-00001',
        nomeCompleto: 'Paciente Fictício',
        dataNascimento: '1990-01-01',
        cpf: '11144477735',
        rg: '1234567',
        endereco: 'Rua Fictícia, 1',
        estadoCivil: 'solteiro',
        canalPreferencial: 'email',
        email: 'paciente@exemplo.com',
        queixaCifrada: cifrar('queixa sigilosa', CHAVE_TESTE),
        percepcaoUrgenciaCifrada: cifrar('urgência sigilosa', CHAVE_TESTE),
        historicoRelevanteCifrado: cifrar('histórico sigiloso', CHAVE_TESTE),
      })
      .returning();
    // Decisões de prioridade só aceitam inserção: a troca precisa passar pelo gatilho.
    await db.insert(decisoesPrioridade).values({
      inscricaoId: inscricao.id,
      corCifrada: cifrar('vermelha', CHAVE_TESTE),
      decididaPor: coordenacao.id,
    });
    return inscricao.id;
  }

  it('recifra todos os dados de saúde com a nova chave, inclusive nas tabelas que só aceitam inserção, e registra o responsável (RF1, RF6, RNF51)', async () => {
    await banco.limpar();
    const id = await dadosCifrados();

    const resumo = await trocarChaveDados(
      banco.db,
      CHAVE_TESTE,
      CHAVE_NOVA,
      'Responsável técnico da FBr',
    );
    expect(resumo.registros).toBe(4);
    expect(resumo.colunas).toEqual(
      expect.arrayContaining([
        'inscricoes.queixa_cifrada',
        'decisoes_prioridade.cor_cifrada',
        'evolucoes.queixa_cifrada',
        'prontuarios.anamnese_cifrada',
      ]),
    );

    const [inscricao] = await banco.db
      .select()
      .from(inscricoes)
      .where(eq(inscricoes.id, id));
    expect(decifrar(inscricao.queixaCifrada!, CHAVE_NOVA)).toBe(
      'queixa sigilosa',
    );
    expect(() => decifrar(inscricao.queixaCifrada!, CHAVE_TESTE)).toThrow();
    const [decisao] = await banco.db
      .select()
      .from(decisoesPrioridade)
      .where(eq(decisoesPrioridade.inscricaoId, id));
    expect(decifrar(decisao.corCifrada, CHAVE_NOVA)).toBe('vermelha');

    // Os gatilhos voltam a valer depois da troca.
    await expect(
      banco.db
        .update(decisoesPrioridade)
        .set({ corCifrada: 'x' })
        .where(eq(decisoesPrioridade.inscricaoId, id)),
    ).rejects.toThrow();

    const [registro] = await banco.db
      .select()
      .from(auditoria)
      .where(eq(auditoria.operacao, 'trocar_chave_dados'));
    expect(registro.dadosNovos).toMatchObject({
      responsavel: 'Responsável técnico da FBr',
      registros: 4,
    });
    expect(JSON.stringify(registro)).not.toContain('sigilosa');
  });

  it('com a chave antiga errada, nada é alterado (RF1, RNF51)', async () => {
    await banco.limpar();
    const id = await dadosCifrados();
    const outra = Buffer.alloc(32, 3).toString('base64');

    await expect(
      trocarChaveDados(banco.db, outra, CHAVE_NOVA, 'Responsável'),
    ).rejects.toThrow();
    const [inscricao] = await banco.db
      .select()
      .from(inscricoes)
      .where(eq(inscricoes.id, id));
    expect(decifrar(inscricao.queixaCifrada!, CHAVE_TESTE)).toBe(
      'queixa sigilosa',
    );
  });
});
