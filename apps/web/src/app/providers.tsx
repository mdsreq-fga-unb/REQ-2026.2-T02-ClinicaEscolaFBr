"use client";
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ErroApi } from "@/lib/api";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => {
    // Sessão encerrada no meio do uso (RNF50): um 401 em qualquer chamada faz a
    // sessão ser consultada de novo, e a área interna leva à entrada.
    const aoFalhar = (erro: unknown, chave?: readonly unknown[]) => {
      if (
        erro instanceof ErroApi &&
        erro.status === 401 &&
        chave?.[0] !== "sessao"
      ) {
        void client.invalidateQueries({ queryKey: ["sessao"] });
      }
    };
    const client: QueryClient = new QueryClient({
      queryCache: new QueryCache({
        onError: (erro, consulta) => aoFalhar(erro, consulta.queryKey),
      }),
      mutationCache: new MutationCache({ onError: (erro) => aoFalhar(erro) }),
    });
    return client;
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
