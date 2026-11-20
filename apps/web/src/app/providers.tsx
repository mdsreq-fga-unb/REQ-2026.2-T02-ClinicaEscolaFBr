"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { quandoRecusarSessao } from "@/lib/api";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient());

  // Sessão encerrada no meio do uso (RNF50): um 401 em qualquer chamada à API,
  // por consulta, ação ou chamada direta, faz a sessão ser consultada de novo, e
  // a área interna leva à entrada. Só vale para quem tinha sessão: nas páginas
  // públicas, o 401 da verificação de identidade (RF52) não é da sessão da
  // equipe.
  useEffect(() => {
    quandoRecusarSessao(() => {
      if (client.getQueryData(["sessao"])) {
        void client.invalidateQueries({ queryKey: ["sessao"] });
      }
    });
    return () => quandoRecusarSessao(null);
  }, [client]);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
