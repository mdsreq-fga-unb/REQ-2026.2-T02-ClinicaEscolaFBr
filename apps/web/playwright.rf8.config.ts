import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({
  ...base,
  workers: 1,
  testMatch: ["rf8.spec.ts", "verificacao.spec.ts"],
});
