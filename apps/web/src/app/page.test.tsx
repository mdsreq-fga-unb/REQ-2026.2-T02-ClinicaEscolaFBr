import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "./page";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

// A sessão responde com a coordenação ou com 401, sem sessão.
function simularSessao(comSessao: boolean) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      comSessao
        ? new Response(
            JSON.stringify({
              id: "1",
              nome: "Ana Costa",
              perfil: "coordenacao",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          )
        : new Response(JSON.stringify({ message: "Sem sessão" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }),
    ),
  );
}

function abrirRaiz() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <Home />
    </QueryClientProvider>,
  );
}

describe("Raiz do sistema", () => {
  beforeEach(() => replace.mockReset());
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("sem sessão, leva à inscrição (RF1)", async () => {
    simularSessao(false);
    abrirRaiz();
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/inscricao"));
  });

  it("com sessão da equipe, leva à página inicial do perfil (RF50)", async () => {
    simularSessao(true);
    abrirRaiz();
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/triagem"));
  });
});
