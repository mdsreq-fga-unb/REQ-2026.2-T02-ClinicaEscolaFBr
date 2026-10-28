// Repórter do Jest que grava o nome completo e o resultado de cada teste num JSON
// (formato do Vitest), usado no relatório de RNFs do CI (.github/scripts/feature-status).
const { mkdirSync, writeFileSync } = require('node:fs');
const { dirname, relative } = require('node:path');

class RelatorioTestes {
  constructor(_config, opcoes) {
    this.arquivo = opcoes.arquivo;
  }

  onRunComplete(_contextos, resultados) {
    const testResults = resultados.testResults.map((arquivo) => ({
      name: relative(process.cwd(), arquivo.testFilePath),
      assertionResults: arquivo.testResults.map((t) => ({
        fullName: t.fullName,
        status: t.status,
      })),
    }));
    mkdirSync(dirname(this.arquivo), { recursive: true });
    writeFileSync(this.arquivo, JSON.stringify({ testResults }, null, 2));
  }
}

module.exports = RelatorioTestes;
