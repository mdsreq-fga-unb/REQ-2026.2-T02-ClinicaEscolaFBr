import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import TriagemPage from "./page";

const PENDENTE = {
  id: "i1",
  numero: "2026-00438",
  criadaEm: "2026-10-20T15:00:00.000Z",
  diasAguardando: 7,
  declaracaoInteressado: {
    queixa: "Queixa fictícia",
    percepcaoUrgencia: null,
    historicoRelevante: "Histórico fictício",
  },
};

function simularApi({
  perfil = "supervisor",
  pendentes = [PENDENTE] as unknown[],
} = {}) {
  const chamadas: { url: string; metodo: string; corpo: unknown }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const metodo = init?.method ?? "GET";
      chamadas.push({
        url,
        metodo,
        corpo: init?.body ? JSON.parse(init.body as string) : null,
      });
      let corpo: unknown = {};
      let status = 404;
      if (url.endsWith("/auth/sessao")) {
        [status, corpo] = [200, { id: "u1", nome: "Carla", perfil }];
      } else if (url.includes("/triagem/inscricoes/classificadas")) {
        [status, corpo] = [200, []];
      } else if (url.includes("/triagem/inscricoes?")) {
        [status, corpo] = [200, pendentes];
      } else if (url.endsWith("/prioridade") && metodo === "POST") {
        [status, corpo] = [201, { id: "d1" }];
      }
      return new Response(JSON.stringify(corpo), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
  return chamadas;
}

function abrirTela() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <TriagemPage />
    </QueryClientProvider>,
  );
}

describe("Triagem (RF4 e RF6)", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("mostra as respostas como declaração do interessado, o campo ausente sem conteúdo presumido e os dias aguardando (RF4)", async () => {
    simularApi();
    abrirTela();
    expect(await screen.findByText("Inscrição 2026-00438")).toBeTruthy();
    expect(screen.getByText("Aguardando há 7 dias")).toBeTruthy();
    expect(
      screen.getByText("Queixa · declarado pelo interessado"),
    ).toBeTruthy();
    expect(screen.getByText("Não informado")).toBeTruthy();
  });

  it("registra a prioridade escolhida, com a referência da clínica só como apoio textual (RF6)", async () => {
    const chamadas = simularApi();
    abrirTela();
    await screen.findByText("Inscrição 2026-00438");
    expect(screen.getByText(/O sistema não calcula nem sugere/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^Amarela/ }));
    expect(
      await screen.findByText("Decisão de prioridade registrada."),
    ).toBeTruthy();
    expect(chamadas.find((c) => c.metodo === "POST")).toMatchObject({
      url: expect.stringContaining("/triagem/inscricoes/i1/prioridade"),
      corpo: { cor: "amarela" },
    });
  });

  it("sem inscrições aguardando, informa que não há pendentes (RF4)", async () => {
    simularApi({ pendentes: [] });
    abrirTela();
    expect(
      await screen.findByText("Não há inscrições pendentes de triagem."),
    ).toBeTruthy();
  });

  it("secretaria e estagiário não acessam a triagem nem carregam as respostas (RF4)", async () => {
    for (const perfil of ["secretaria", "estagiario"]) {
      const chamadas = simularApi({ perfil });
      abrirTela();
      expect(
        await screen.findByText(
          "Acesso restrito aos supervisores e à coordenação.",
        ),
      ).toBeTruthy();
      expect(chamadas.some((c) => c.url.includes("/triagem/"))).toBe(false);
      cleanup();
    }
  });
});
