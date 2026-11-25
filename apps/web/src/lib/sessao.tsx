"use client";
import { useQuery } from "@tanstack/react-query";
import type { Perfil } from "@clinica/shared";
import { api, ErroApi } from "./api";

export type UsuarioDaSessao = { id: string; nome: string; perfil: Perfil };

// Usuário logado. A rota GET /auth/sessao faz parte do RF50 (#45): devolve
// { id, nome, perfil } com sessão válida e 401 sem sessão.
//
// O 401 vira `null`, e não erro: com erro, o React Query mantém o usuário da
// consulta anterior em `data`, e a sessão expirada por inatividade (RNF50)
// parecia ativa e encerrada ao mesmo tempo. A área interna mandava para
// /entrar, que via o usuário antigo e mandava de volta, sem parar.
export function useSessao() {
  return useQuery({
    queryKey: ["sessao"],
    queryFn: async (): Promise<UsuarioDaSessao | null> => {
      try {
        return await api<UsuarioDaSessao>("/auth/sessao");
      } catch (erro) {
        if (erro instanceof ErroApi && erro.status === 401) return null;
        throw erro;
      }
    },
    retry: false,
    staleTime: 60_000,
  });
}

export const NOMES_PERFIL: Record<Perfil, string> = {
  secretaria: "Secretaria",
  estagiario: "Estagiário",
  supervisor: "Supervisor",
  coordenacao: "Coordenação",
};
