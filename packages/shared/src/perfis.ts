import { z } from "zod";

// Perfis com conta no sistema. O paciente não tem conta:
// ele acessa pela verificação de identidade (RF52).
export const PERFIS = [
  "secretaria",
  "estagiario",
  "supervisor",
  "coordenacao",
] as const;
export const perfilSchema = z.enum(PERFIS);
export type Perfil = z.infer<typeof perfilSchema>;
