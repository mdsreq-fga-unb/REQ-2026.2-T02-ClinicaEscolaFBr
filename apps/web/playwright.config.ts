import { defineConfig } from "@playwright/test";

const webPort = process.env.E2E_WEB_PORT || "3000";
const apiPort = process.env.E2E_API_PORT || "3333";
const webURL = `http://localhost:${webPort}`;
const apiURL = `http://localhost:${apiPort}`;

export default defineConfig({
  testDir: "./e2e",
  // Os testes com leitor de tela têm configuração e workflow próprios.
  testIgnore: "leitor-de-tela/**",
  // Contas da equipe usadas pelo fluxo integrado (e2e/ciclo-3.spec.ts).
  globalSetup: "./e2e/semente.ts",
  timeout: 90_000,
  workers: 2,
  // No CI (RELATORIO_TESTES=1), grava também o resultado de cada teste para o
  // relatório de RNFs (D4.5).
  reporter: process.env.RELATORIO_TESTES
    ? [["list"], ["json", { outputFile: "relatorio-testes/e2e.json" }]]
    : undefined,
  use: {
    baseURL: webURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      // Roda de apps/api, onde a API acha o .env da raiz (../../.env).
      command: "pnpm start:prod",
      cwd: "../api",
      url: `${apiURL}/health`,
      // Os testes mandam muitas inscrições da mesma origem (localhost).
      env: {
        API_PORT: apiPort,
        WEB_URL: webURL,
        LIMITE_INSCRICOES_POR_ORIGEM: "1000",
      },
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `pnpm exec next start -p ${webPort}`,
      url: webURL,
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
