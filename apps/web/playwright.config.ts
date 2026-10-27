import { defineConfig } from "@playwright/test";

const webPort = process.env.E2E_WEB_PORT || "3000";
const apiPort = process.env.E2E_API_PORT || "3333";
const webURL = `http://localhost:${webPort}`;
const apiURL = `http://localhost:${apiPort}`;

export default defineConfig({
  testDir: "./e2e",
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
      command: "pnpm --filter @clinica/api start:prod",
      cwd: "../..",
      url: `${apiURL}/health`,
      env: { API_PORT: apiPort, WEB_URL: webURL },
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
