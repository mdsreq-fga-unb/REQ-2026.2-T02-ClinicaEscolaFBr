import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Imagem da implantação (apps/web/Dockerfile): só o servidor e as dependências
  // usadas, a partir da raiz do monorepo.
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    // Só o globals.css passa pelo Tailwind: aplicado aos CSS modules, o loader
    // tira o hash das classes e os estilos deixam de valer.
    rules: {
      "globals.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
