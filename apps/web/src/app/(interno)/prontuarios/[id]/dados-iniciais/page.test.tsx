import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DadosIniciaisPage from "./page";
import { api, ErroApi } from "@/lib/api";

vi.mock("next/navigation", () => ({ useParams: () => ({ id: "p1" }) }));
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  api: vi.fn(),
}));
vi.mock("@/lib/sessao", () => ({
  useSessao: () => ({ data: { perfil: "supervisor" } }),
}));
afterEach(cleanup);

describe("leitura dos dados iniciais (RF27, RF69, RNF25, RNF51, RNF52)", () => {
  it("mostra anamnese e contrato em página própria e somente para leitura (RF27, RF69, RNF25, RNF51, RNF52)", async () => {
    vi.mocked(api).mockResolvedValueOnce({
      nome: "Paciente",
      dadosIniciais: {
        anamnese: {
          queixaPrincipal: "Insônia",
          historiaProblemaAtual: null,
          historicoFamiliar: null,
          desenvolvimento: null,
          historicoMedico: null,
          aspectosPsicossociais: null,
          registradaEm: "2026-11-10T12:00:00Z",
          registradaPor: "Ana",
        },
        contrato: {
          textoLivre: null,
          dataAssinatura: "2026-11-10",
          aceiteTclePesquisa: false,
          viaGuardada: true,
          registradoEm: "2026-11-10T12:00:00Z",
          registradoPor: "Ana",
        },
      },
    } as never);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <DadosIniciaisPage />
      </QueryClientProvider>,
    );
    expect(
      await screen.findByRole("heading", { name: "Dados iniciais · Paciente" }),
    ).toBeTruthy();
    expect(
      screen.getByText("Só leitura · conteúdo clínico restrito"),
    ).toBeTruthy();
    expect(screen.getByText("Insônia")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Salvar anamnese" }),
    ).toBeNull();
    expect(
      screen
        .getByRole("link", { name: "Voltar ao prontuário" })
        .getAttribute("href"),
    ).toContain("/prontuarios/p1");
  });

  it("quem não tem acesso vê a tela de acesso negado da prancha, sem o nome do paciente nem indicação dos dados iniciais (RF27, RF69, RNF25)", async () => {
    vi.mocked(api).mockRejectedValueOnce(
      new ErroApi(403, "Você não tem acesso a este prontuário."),
    );
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <DadosIniciaisPage />
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
        .getByRole("link", { name: "Voltar para meus casos" })
        .getAttribute("href"),
    ).toBe("/meus-casos");
    expect(screen.queryByText(/Paciente|Anamnese|Contrato/)).toBeNull();
  });
});
