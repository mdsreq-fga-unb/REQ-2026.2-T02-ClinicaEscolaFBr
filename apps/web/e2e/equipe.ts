// Contas fictícias da equipe usadas pelo e2e, criadas por semente.ts. A senha só
// vale no banco de teste; o hash (bcrypt) é o que fica gravado.
export const SENHA_EQUIPE = "Equipe2026e2e";
export const HASH_SENHA_EQUIPE =
  "$2b$10$4G6Ju.YsNEsyTPeA3fWGlOJloTJZIS9sgBk/Y/oMSMgjr/WY8f6ya";

export const EQUIPE = {
  coordenacao: {
    nome: "Helena Duarte E2E",
    email: "coordenacao.e2e@fbr.edu.br",
  },
  supervisor: { nome: "Carla Mendes E2E", email: "supervisor.e2e@fbr.edu.br" },
  estagiario: { nome: "Ana Beatriz E2E", email: "estagiario.e2e@fbr.edu.br" },
  secretaria: { nome: "Juliana Rocha E2E", email: "secretaria.e2e@fbr.edu.br" },
} as const;

export type PerfilEquipe = keyof typeof EQUIPE;
