import path from "node:path";
import type { NextConfig } from "next";

// Cabeçalhos de segurança de todas as páginas, como os da API (helmet):
// - frame-ancestors e X-Frame-Options: nenhuma outra página embute o sistema,
//   para ninguém induzir cliques na área interna;
// - HSTS: depois da primeira visita, o navegador só usa HTTPS (RNF51);
// - Referrer-Policy: os endereços com token (/confirmacao, /ativacao) não vão
//   para outros sites (RNF59).
const cabecalhosDeSeguranca = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:caminho*", headers: cabecalhosDeSeguranca }];
  },
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
