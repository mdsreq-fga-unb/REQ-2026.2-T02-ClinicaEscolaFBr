// Junta os relatórios de RNFs de mais de um workflow num só, para o Feature Status
// avaliar o D4.5 com todos os testes: o do CI e o do leitor de tela.
// Uso: node juntar-rnfs.cjs <saída> [<relatório> <link da execução>]...
// Relatório que não existe é ignorado (workflow sem execução na main).

const { existsSync, readFileSync, writeFileSync } = require("node:fs");
const R = require("./rnfs.cjs");

const [saida, ...pares] = process.argv.slice(2);
if (!saida || pares.length % 2 !== 0) {
  console.error(
    "Uso: node juntar-rnfs.cjs <saída> [<relatório> <link da execução>]...",
  );
  process.exit(1);
}

const fontes = [];
for (let i = 0; i < pares.length; i += 2) {
  const [arquivo, execucao] = [pares[i], pares[i + 1]];
  fontes.push({
    execucao: execucao || null,
    relatorio: existsSync(arquivo)
      ? JSON.parse(readFileSync(arquivo, "utf8"))
      : null,
  });
}
const junto = R.juntarRelatorios(fontes);
writeFileSync(saida, `${JSON.stringify(junto, null, 2)}\n`);
console.log(
  `${junto.testes.length} testes de ${fontes.filter((f) => f.relatorio).length} relatórios.`,
);
