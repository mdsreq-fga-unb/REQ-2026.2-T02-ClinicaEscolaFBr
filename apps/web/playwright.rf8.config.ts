import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({
  ...base,
  workers: 1,
  testMatch: ["rf8.spec.ts", "verificacao.spec.ts"],
  webServer: [
    {
      command: "node e2e/smtp-local.mjs",
      url: "http://127.0.0.1:8026",
      reuseExistingServer: false,
    },
    ...(Array.isArray(base.webServer) ? base.webServer : []),
  ],
});
