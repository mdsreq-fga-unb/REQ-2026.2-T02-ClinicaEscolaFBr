import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  // Mesmo atalho "@/" do tsconfig, para os testes importarem os componentes.
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    // No CI (RELATORIO_TESTES=1), grava também o resultado de cada teste para o
    // relatório de RNFs (D4.5).
    reporters: process.env.RELATORIO_TESTES ? ["default", "json"] : ["default"],
    outputFile: { json: "relatorio-testes/web.json" },
  },
});
