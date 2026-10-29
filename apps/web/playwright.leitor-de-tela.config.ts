import { devices } from "@playwright/test";
import { withGuidepup } from "@guidepup/playwright";

const webPort = process.env.E2E_WEB_PORT || "3000";
const webURL = `http://localhost:${webPort}`;

// Testes com o VoiceOver de verdade (RNF24), no macOS. Rodam no workflow
// "Leitor de tela", e não no e2e comum: o leitor controla o teclado da máquina.
// A API é simulada no próprio teste, então só o site precisa subir.
export default withGuidepup({
  testDir: "./e2e/leitor-de-tela",
  timeout: 5 * 60_000,
  retries: 2,
  reportSlowTests: null,
  // No CI (RELATORIO_TESTES=1), grava o resultado de cada teste para o relatório
  // de RNFs (D4.5), como o e2e comum.
  reporter: process.env.RELATORIO_TESTES
    ? [
        ["list"],
        ["json", { outputFile: "relatorio-testes/leitor-de-tela.json" }],
      ]
    : undefined,
  use: {
    baseURL: webURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "webkit", use: { ...devices["Desktop Safari"] } }],
  webServer: {
    command: `pnpm exec next start -p ${webPort}`,
    url: webURL,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
