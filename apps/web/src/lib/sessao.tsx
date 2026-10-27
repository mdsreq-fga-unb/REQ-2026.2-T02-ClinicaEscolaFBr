"use client";
import { useQuery } from "@tanstack/react-query";
import type { Perfil } from "@clinica/shared";
import { api } from "./api";

export type UsuarioDaSessao = { id: string; nome: string; perfil: Perfil };

// Usuário logado. A rota GET /auth/sessao faz parte do RF50 (#45): devolve
// { id, nome, perfil } com sessão válida e 401 sem sessão.
export function useSessao() {
  return useQuery({
    queryKey: ["sessao"],
    queryFn: () => api<UsuarioDaSessao>("/auth/sessao"),
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
