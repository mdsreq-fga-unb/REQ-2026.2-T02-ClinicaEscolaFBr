import { z } from "zod";

// Ciclo de vida da conta institucional: criada pelo convite (RF53),
// ativada quando o usuário define a senha e desativada pela coordenação (RF54).
// Só a situação "ativo" autentica (RF50).
export const SITUACOES_USUARIO = [
  "pendente_ativacao",
  "ativo",
  "desativado",
] as const;
export const situacaoUsuarioSchema = z.enum(SITUACOES_USUARIO);
export type SituacaoUsuario = z.infer<typeof situacaoUsuarioSchema>;
