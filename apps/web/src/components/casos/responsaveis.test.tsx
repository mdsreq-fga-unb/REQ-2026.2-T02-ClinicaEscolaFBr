import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuadroResponsaveis } from "./responsaveis";

function simularApi(status: number, corpo: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(JSON.stringify(corpo), {
          status,
          headers: { "Content-Type": "application/json" },
        }),
    ),
  );
}

function abrir() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <QuadroResponsaveis casoId="c1" />
    </QueryClientProvider>,
  );
}

describe("Quadro de responsáveis da ficha (RF22)", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("mostra o supervisor e o estagiário responsáveis (RF22)", async () => {
    simularApi(200, {
      casoId: "c1",
      situacao: "em_atendimento",
      supervisor: "Carla Mendes Souza",
      estagiario: "Ana Beatriz Costa",
    });
    abrir();
    expect(await screen.findByText("Carla Mendes Souza")).toBeTruthy();
    expect(screen.getByText("Ana Beatriz Costa")).toBeTruthy();
    expect(screen.queryByText("Pendente de distribuição")).toBeNull();
  });

  it("caso sem estagiário mostra só esse campo como pendente de distribuição (RF22)", async () => {
    simularApi(200, {
      casoId: "c1",
      situacao: "aguardando_vinculo",
      supervisor: "Carla Mendes Souza",
      estagiario: null,
    });
    abrir();
    expect(await screen.findByText("Carla Mendes Souza")).toBeTruthy();
    expect(screen.getAllByText("Pendente de distribuição")).toHaveLength(1);
  });

  it("caso sem supervisor nem estagiário mostra os dois como pendentes de distribuição (RF22)", async () => {
    simularApi(200, {
      casoId: "c1",
      situacao: "aguardando_distribuicao",
      supervisor: null,
      estagiario: null,
    });
    abrir();
    expect(await screen.findAllByText("Pendente de distribuição")).toHaveLength(
      2,
    );
  });

  it("quando a API nega o acesso, mostra o erro e nenhum nome (RF22)", async () => {
    simularApi(403, { message: "Você não tem acesso a este caso." });
    abrir();
    expect(
      await screen.findByText("Não foi possível carregar os responsáveis."),
    ).toBeTruthy();
    expect(screen.queryByText("Supervisor")).toBeNull();
  });
});
