import { createDb } from '@clinica/database';
import { trocarChaveDados } from '../common/troca-de-chave';

// Troca da chave dos dados de saúde (RNF51). Roda com o dono do banco e com a API
// parada; depois, configure a nova chave em CHAVE_DADOS e faça o redeploy.
// Procedimento completo, com o roteiro no Coolify:
// documentacao/docs/unidade-3/seguranca-da-implantacao.md
//
// Uso (na imagem da API, ou de apps/api depois do build):
//   DATABASE_URL=<dono do banco> CHAVE_DADOS_ANTIGA=... CHAVE_DADOS_NOVA=... \
//   RESPONSAVEL="Nome de quem troca" node dist/scripts/trocar-chave-dados.js
async function principal() {
  const faltando = [
    'DATABASE_URL',
    'CHAVE_DADOS_ANTIGA',
    'CHAVE_DADOS_NOVA',
    'RESPONSAVEL',
  ].filter((nome) => !process.env[nome]);
  if (faltando.length) {
    throw new Error(`Informe ${faltando.join(', ')}.`);
  }
  const db = createDb(process.env.DATABASE_URL!);
  try {
    const resumo = await trocarChaveDados(
      db,
      process.env.CHAVE_DADOS_ANTIGA!,
      process.env.CHAVE_DADOS_NOVA!,
      process.env.RESPONSAVEL!,
    );
    console.log(
      `Chave trocada: ${resumo.registros} valores em ${resumo.colunas.length} colunas. Configure a nova CHAVE_DADOS e faça o redeploy.`,
    );
  } finally {
    await db.$client.end();
  }
}

principal().catch((erro: unknown) => {
  console.error(erro instanceof Error ? erro.message : erro);
  // O erro do banco (por exemplo, "must be owner") vem na causa.
  if (erro instanceof Error && erro.cause) {
    console.error(
      erro.cause instanceof Error ? erro.cause.message : erro.cause,
    );
  }
  process.exit(1);
});
