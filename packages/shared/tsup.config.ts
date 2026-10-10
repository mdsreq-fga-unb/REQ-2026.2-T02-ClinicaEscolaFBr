import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  // No modo watch a dist/ não é limpa: os pacotes que dependem deste
  // continuam enxergando os tipos (.d.ts) enquanto ele recompila.
  clean: !options.watch,
  sourcemap: true,
}));
