import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import RegistrarEvolucaoPage from "./page";
import { api, ErroApi } from "@/lib/api";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "p1", sessaoId: "s1" }),
}));
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  api: vi.fn(),
}));
vi.mock("@/lib/sessao", () => ({
  useSessao: () => ({ data: { id: "u1", perfil: "estagiario" } }),
}));
afterEach(cleanup);

describe("registro de evolução em tela própria (RF28, RNF25, RNF27, RNF30)", () => {
  it("mostra os seis dados de origem e o formulário para o estagiário responsável (RF28, RNF25, RNF27, RNF30)", async () => {
    vi.mocked(api).mockResolvedValueOnce({
      id: "p1",
      nome: "Paciente",
      supervisor: "Carla",
      sessoes: [
        {
          id: "s1",
          inicio: "2026-11-10T11:00:00Z",
          status: "realizada",
          estagiarioId: "u1",
          estagiario: "Ana",
          numeroNoCiclo: 4,
          evolucao: null,
        },
      ],
    } as never);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <RegistrarEvolucaoPage />
      </QueryClientProvider>,
    );
    expect(
      await screen.findByRole("heading", { name: "Registro de evolução" }),
    ).toBeTruthy();
    for (const rotulo of [
      "Paciente",
      "Sessão no ciclo",
      "Data e horário",
      "Comparecimento",
      "Estagiário",
      "Supervisor",
    ])
      expect(screen.getAllByText(rotulo).length).toBeGreaterThan(0);
    expect(
      screen.getByRole("link", { name: "Cancelar" }).getAttribute("href"),
    ).toContain("#sessoes-ciclo");
    expect(
      screen.getByRole("button", { name: "Salvar evolução" }),
    ).toBeTruthy();
  });

  it("após 409 recarrega e mostra a evolução que já havia sido gravada (RF28, RNF25, RNF27, RNF30)", async () => {
    const registro = {
      id: "e1",
      queixa: null,
      planejamento: null,
      humorAparencia: "Tranquilo",
      conteudoTrabalhado: "Rotina",
      tecnicasUtilizadas: "Escuta",
      intervencoesEncaminhamentos: null,
      planoProximaSessao: "Retomar",
      registradaPor: "Ana",
      registradaEm: "2026-11-10T12:00:00Z",
    };
    let consultas = 0;
    vi.mocked(api).mockImplementation(async (path: string) => {
      if (path === "/prontuarios/p1") {
        consultas += 1;
        return {
          id: "p1",
          nome: "Paciente",
          supervisor: "Carla",
          sessoes: [
            {
              id: "s1",
              inicio: "2026-11-10T11:00:00Z",
              status: "realizada",
              estagiarioId: "u1",
              estagiario: "Ana",
              numeroNoCiclo: 4,
              evolucao: consultas > 1 ? registro : null,
            },
          ],
        } as never;
      }
      if (path.endsWith("/evolucoes"))
        throw new ErroApi(409, "A evolução já foi registrada.");
      throw new Error(`Rota inesperada: ${path}`);
    });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <RegistrarEvolucaoPage />
      </QueryClientProvider>,
    );
    for (const campo of [
      "Humor e aparência do paciente",
      "Conteúdo trabalhado",
      "Técnicas utilizadas",
      "Plano para a próxima sessão",
    ]) {
      fireEvent.change(await screen.findByLabelText(new RegExp(campo)), {
        target: { value: "Registro válido" },
      });
    }
    fireEvent.click(screen.getByRole("button", { name: "Salvar evolução" }));
    expect(
      await screen.findByText(/registro existente foi carregado/i),
    ).toBeTruthy();
    expect(await screen.findByText("Tranquilo")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Salvar evolução" }),
    ).toBeNull();
  });

  it("quem não tem acesso vê a tela de acesso negado da prancha, sem o nome do paciente nem indicação da sessão (RF28, RNF25)", async () => {
    vi.mocked(api).mockRejectedValueOnce(
      new ErroApi(403, "Você não tem acesso a este prontuário."),
    );
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <RegistrarEvolucaoPage />
      </QueryClientProvider>,
    );
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Você não tem acesso a este prontuário",
      }),
    ).toBeTruthy();
    expect(screen.getByText(/fale com o supervisor do caso/)).toBeTruthy();
    expect(screen.getByText(/Tentativa registrada em/)).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Voltar para meus pacientes" })
        .getAttribute("href"),
    ).toBe("/meus-pacientes");
    // Só o título da tela negada: nem os dados da sessão nem o formulário.
    expect(screen.getAllByRole("heading").map((h) => h.textContent)).toEqual([
      "Você não tem acesso a este prontuário",
    ]);
    expect(screen.queryByRole("button", { name: /Salvar/ })).toBeNull();
  });
});
