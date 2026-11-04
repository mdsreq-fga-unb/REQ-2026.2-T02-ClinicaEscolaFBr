import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import InscricaoTriagemPage from "./[id]/page";
import RegistrarPrioridadePage from "./[id]/prioridade/page";
import TriagemPage from "./page";

vi.mock("next/navigation", () => ({ useParams: () => ({ id: "i1" }) }));

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
  historico = [] as unknown[],
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
        [status, corpo] = [
          201,
          { id: "d1", decididaEm: "2026-10-27T18:20:00.000Z" },
        ];
      } else if (url.endsWith("/triagem/inscricoes/i1")) {
        [status, corpo] = [200, { ...PENDENTE, historico }];
      }
      return new Response(JSON.stringify(corpo), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
  return chamadas;
}

function abrir(tela: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(<QueryClientProvider client={client}>{tela}</QueryClientProvider>);
}

describe("Triagem (RF4 e RF6)", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("lista as inscrições pelo número, com há quantos dias aguardam e o link para abrir cada uma (RF4)", async () => {
    simularApi();
    abrir(<TriagemPage />);
    expect((await screen.findAllByText("2026-00438")).length).toBeGreaterThan(
      0,
    );
    expect(screen.getAllByText("7 dias").length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("link", { name: "Abrir inscrição 2026-00438" })[0],
    ).toHaveProperty("href", expect.stringContaining("/triagem/i1"));
    // A lista não mostra as respostas: elas ficam na inscrição aberta.
    expect(screen.queryByText("Queixa fictícia")).toBeNull();
  });

  it("a inscrição aberta mostra as respostas como declaração do interessado, separadas da avaliação da equipe, e o campo ausente sem conteúdo presumido (RF4)", async () => {
    simularApi();
    abrir(<InscricaoTriagemPage />);
    expect(
      await screen.findByRole("heading", { name: "Inscrição 2026-00438" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Declarado pelo interessado" }),
    ).toBeTruthy();
    expect(screen.getByText("Queixa fictícia")).toBeTruthy();
    expect(screen.getByText("Não informado")).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Avaliação da equipe" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Registrar prioridade clínica" }),
    ).toHaveProperty("href", expect.stringContaining("/triagem/i1/prioridade"));
  });

  it("sem escolha, não registra a prioridade e indica o erro (RF6)", async () => {
    const chamadas = simularApi();
    abrir(<RegistrarPrioridadePage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Registrar prioridade" }),
    );
    expect(
      screen.getByText("Escolha a prioridade clínica para registrar."),
    ).toBeTruthy();
    expect(chamadas.some((c) => c.metodo === "POST")).toBe(false);
  });

  it("registra a prioridade escolhida, sem cor marcada de início e com a referência da clínica só como apoio (RF6)", async () => {
    const chamadas = simularApi();
    abrir(<RegistrarPrioridadePage />);
    const amarela = await screen.findByRole("radio", { name: "Amarela" });
    for (const radio of screen.getAllByRole("radio"))
      expect(radio).toHaveProperty("checked", false);
    expect(screen.getByText("Referência da clínica")).toBeTruthy();
    fireEvent.click(amarela);
    fireEvent.click(
      screen.getByRole("button", { name: "Registrar prioridade" }),
    );
    expect(
      await screen.findByText("Prioridade Amarela registrada."),
    ).toBeTruthy();
    expect(
      screen.getByText(/O caso foi para a lista de casos aguardando/),
    ).toBeTruthy();
    expect(chamadas.find((c) => c.metodo === "POST")).toMatchObject({
      url: expect.stringContaining("/triagem/inscricoes/i1/prioridade"),
      corpo: { cor: "amarela" },
    });
  });

  it("com decisão anterior, mostra a prioridade vigente e o histórico de decisões (RF6)", async () => {
    simularApi({
      historico: [
        {
          prioridade: "verde",
          decisor: "Helena",
          perfilDecisor: "coordenacao",
          decididaEm: "2026-10-21T12:00:00.000Z",
        },
      ],
    });
    abrir(<InscricaoTriagemPage />);
    expect(
      await screen.findByRole("link", { name: "Registrar nova decisão" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Histórico de decisões" }),
    ).toBeTruthy();
    expect(screen.getAllByText("Atual").length).toBeGreaterThan(0);
  });

  it("sem inscrições aguardando, informa que não há pendentes (RF4)", async () => {
    simularApi({ pendentes: [] });
    abrir(<TriagemPage />);
    expect(
      await screen.findByText("Não há inscrições pendentes de triagem."),
    ).toBeTruthy();
  });

  it("secretaria e estagiário não acessam a triagem nem carregam as respostas (RF4)", async () => {
    for (const tela of [
      <TriagemPage key="lista" />,
      <InscricaoTriagemPage key="aberta" />,
    ]) {
      for (const perfil of ["secretaria", "estagiario"]) {
        const chamadas = simularApi({ perfil });
        abrir(tela);
        expect(
          await screen.findByText(
            "Acesso restrito aos supervisores e à coordenação.",
          ),
        ).toBeTruthy();
        expect(chamadas.some((c) => c.url.includes("/triagem/"))).toBe(false);
        cleanup();
      }
    }
  });
});
