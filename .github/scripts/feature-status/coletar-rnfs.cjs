// Junta os resultados dos testes do CI num relatório dos RNFs verificados, usado
// pelo Feature Status para avaliar o D4.5 das features.
// Uso: node coletar-rnfs.cjs <pasta com os JSONs dos testes> <arquivo de saída>

const {
  appendFileSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} = require("node:fs");
const { basename, join } = require("node:path");
const R = require("./rnfs.cjs");

const [pasta, saida] = process.argv.slice(2);
if (!pasta || !saida) {
  console.error("Uso: node coletar-rnfs.cjs <pasta> <arquivo de saída>");
  process.exit(1);
}

const arquivos = readdirSync(pasta, { recursive: true })
  .map(String)
  .filter((f) => f.endsWith(".json"));
const testes = arquivos.flatMap((f) =>
  R.lerRelatorio(
    JSON.parse(readFileSync(join(pasta, f), "utf8")),
    basename(f, ".json"),
  ),
);
const verificados = R.resumirTestes(testes);

writeFileSync(
  saida,
  `${JSON.stringify({ arquivos, testes: verificados }, null, 2)}\n`,
);
console.log(
  `${testes.length} testes lidos de ${arquivos.length} arquivos; ${verificados.length} passaram citando um RNF.`,
);
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `${R.resumoMarkdown(verificados)}\n`,
  );
}
