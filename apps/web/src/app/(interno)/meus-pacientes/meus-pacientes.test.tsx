import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import MeusPacientesPage from "./page";

const caso = (nome: string, extra: Record<string, unknown> = {}) => ({
  casoId: nome,
  numero: "2026-00001",
  nome,
  prioridade: "verde",
  estagiario: "Ana Beatriz Costa",
  estagiarioId: "e1",
  estagiarioAnterior: null,
  supervisor: "Ricardo Menezes",
  prontuarioId: `p-${nome}`,
  situacao: "em_atendimento",
  vinculoEncerradoEm: null,
  ...extra,
});
const CASOS = [
  caso("Mariana Alves Toledo", { prioridade: "amarela" }),
  caso("Tatiane Moreira Lopes"),
  caso("Gustavo Henrique Dias", { situacao: "aguardando_vaga" }),
];

function simularApi(perfil = "estagiario", casos: unknown = CASOS) {
  const chamadas: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      chamadas.push(url);
      const [status, corpo] = url.endsWith("/auth/sessao")
        ? [200, { id: "u1", nome: "Ana", perfil }]
        : url.endsWith("/casos/meus")
          ? [200, casos]
          : [404, {}];
      return new Response(JSON.stringify(corpo), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
  return chamadas;
}

function abrir() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MeusPacientesPage />
    </QueryClientProvider>,
  );
}

describe("Meus pacientes do estagiário (RF23)", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("mostra o paciente, a prioridade, a situação e o supervisor de cada caso, sem número nem dado clínico (RF23, RNF17)", async () => {
    simularApi();
    abrir();
    const tabela = await screen.findByRole("table", {
      name: "Pacientes vinculados a você",
    });
    const cabecalhos = Array.from(tabela.querySelectorAll("thead th")).map(
      (c) => c.textContent,
    );
    expect(cabecalhos).toEqual([
      "Paciente",
      "Prioridade clínica",
      "Situação do caso",
      "Supervisor",
      "Ações",
    ]);
    const linhas = Array.from(tabela.querySelectorAll("tbody tr")).map((l) =>
      Array.from(l.querySelectorAll("td")).map((c) => c.textContent),
    );
    expect(linhas[0]).toEqual([
      "Mariana Alves Toledo",
      "Amarela",
      "Em atendimento",
      "Ricardo Menezes",
      "Abrir prontuário",
    ]);
    expect(document.body.textContent).not.toMatch(/2026-00001|queixa/i);
  });

  it("resume quantos casos há em cada situação (RF23)", async () => {
    simularApi();
    abrir();
    const resumo = await screen.findByRole("list", {
      name: "Resumo dos seus casos",
    });
    expect(
      within(resumo)
        .getAllByRole("listitem")
        .map((i) => i.textContent),
    ).toEqual(["2em atendimento", "1em atendimento · aguardando vaga"]);
  });

  it("cada paciente abre o próprio prontuário (RF23, RNF24)", async () => {
    simularApi();
    abrir();
    const [link] = await screen.findAllByRole("link", {
      name: "Abrir prontuário de Mariana Alves Toledo",
    });
    expect(link.getAttribute("href")).toBe(
      "/prontuarios/p-Mariana Alves Toledo",
    );
  });

  it("sem casos, explica que ainda não há pacientes vinculados (RF23)", async () => {
    simularApi("estagiario", []);
    abrir();
    expect(
      await screen.findByRole("heading", {
        name: "Você ainda não tem pacientes vinculados.",
      }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Os casos aparecem aqui quando o supervisor faz o vínculo.",
      ),
    ).toBeTruthy();
  });

  it("outros perfis veem o acesso restrito, sem pedir a lista (RF23, RNF16)", async () => {
    const chamadas = simularApi("secretaria");
    abrir();
    expect(
      await screen.findByText("Acesso restrito aos estagiários."),
    ).toBeTruthy();
    expect(chamadas.some((u) => u.includes("/casos/meus"))).toBe(false);
  });
});
