import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PaginaNaoEncontrada } from "./pagina-nao-encontrada";

vi.mock("next/navigation", () => ({
  usePathname: () => "/agenda",
  useRouter: () => ({ replace: vi.fn() }),
}));

// A sessão responde com a secretaria ou com 401, sem sessão.
function simularSessao(comSessao: boolean) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      comSessao
        ? new Response(
            JSON.stringify({
              id: "1",
              nome: "Rita Lopes",
              perfil: "secretaria",
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

function abrirPagina() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <PaginaNaoEncontrada />
    </QueryClientProvider>,
  );
}

describe("Página não encontrada", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("com sessão, avisa em português dentro da área interna, com o menu do perfil", async () => {
    simularSessao(true);
    abrirPagina();

    expect(
      await screen.findByRole("heading", { name: "Página não encontrada" }),
    ).toBeTruthy();
    expect(
      screen.getAllByRole("navigation", { name: "Menu principal" }).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("Rita Lopes").length).toBeGreaterThan(0);
  });

  it("sem sessão, leva à inscrição e à entrada", async () => {
    simularSessao(false);
    abrirPagina();

    expect(
      await screen.findByRole("heading", { name: "Página não encontrada" }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Fazer a inscrição" })
        .getAttribute("href"),
    ).toBe("/inscricao");
    expect(
      screen
        .getByRole("link", { name: "Entrar no sistema" })
        .getAttribute("href"),
    ).toBe("/entrar");
    expect(
      screen.queryByRole("navigation", { name: "Menu principal" }),
    ).toBeNull();
  });
});
