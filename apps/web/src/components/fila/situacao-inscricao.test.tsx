import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MinhaSituacao } from "./situacao-inscricao";
import { api, ErroApi } from "@/lib/api";
vi.mock("@/lib/api", async (original) => ({
  ...(await original<typeof import("@/lib/api")>()),
  api: vi.fn(),
}));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
function abrir(expiraEm = new Date(Date.now() + 60000).toISOString()) {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MinhaSituacao verificacao={{ numero: "2026-00001", expiraEm }} />
    </QueryClientProvider>,
  );
}
describe("RF8: resultado público", () => {
  it.each([
    ["em_triagem", "Em triagem"],
    ["em_atendimento", "Em atendimento"],
    ["procure_secretaria", "Procure a secretaria"],
  ])(
    "anuncia %s sem posição e com horário de Brasília (RF8, DF55, RNF6, RNF56)",
    async (situacao, titulo) => {
      vi.mocked(api).mockResolvedValue({
        numero: "2026-00001",
        situacao,
        consultadaEm: "2026-11-08T17:30:00Z",
      });
      abrir();
      await screen.findByText(titulo, { exact: true });
      expect(
        screen.getByRole("status", { name: "Situação da inscrição" }),
      ).toHaveTextContent("14:30");
      if (situacao === "em_triagem") {
        expect(
          screen.getByRole("status", { name: "Situação da inscrição" }),
        ).toHaveTextContent("não garante prazo nem data de atendimento");
      }
      expect(document.body.textContent).not.toMatch(
        /Prioridade|Vermelha|CPF|posição|\d+ª/,
      );
    },
  );
  it("401 recebe foco e pede nova confirmação, sem mostrar resultado anterior (RF8, RNF6, RNF56)", async () => {
    vi.mocked(api).mockRejectedValue(new ErroApi(401, "Expirou"));
    abrir();
    await waitFor(() => expect(screen.getByRole("alert")).toHaveFocus());
    expect(
      screen.getByRole("button", { name: "Confirmar identidade" }),
    ).toBeVisible();
    expect(screen.queryByText("2026-00001")).not.toBeInTheDocument();
  });
  it("erro de rede permite tentar de novo (RF8, RNF56)", async () => {
    vi.mocked(api)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue({
        numero: "2026-00001",
        situacao: "em_atendimento",
        consultadaEm: "2026-11-08T17:30:00Z",
      });
    abrir();
    fireEvent.click(
      await screen.findByRole("button", { name: "Tentar novamente" }),
    );
    await screen.findByText("Em atendimento", { exact: true });
  });
  it("remove o resultado quando a verificação expira, mesmo sem outra navegação (RF8, RNF6)", async () => {
    vi.mocked(api).mockResolvedValue({
      numero: "2026-00001",
      situacao: "em_triagem",
      consultadaEm: "2026-11-08T17:30:00Z",
    });
    abrir(new Date(Date.now() + 1000).toISOString());
    await screen.findByText("Em triagem", { exact: true });
    await screen.findByRole("button", { name: "Confirmar identidade" });
    expect(
      screen.queryByText("Em triagem", { exact: true }),
    ).not.toBeInTheDocument();
  });
  it("mostra o aviso semestral junto à situação, sem interação adicional (RF8, RNF7)", async () => {
    vi.mocked(api).mockResolvedValue({
      numero: "2026-00001",
      situacao: "em_triagem",
      consultadaEm: "2026-11-08T17:30:00Z",
    });
    abrir();
    expect(
      await screen.findByText(
        "Estar em triagem não garante prazo nem data de atendimento.",
      ),
    ).toBeVisible();
    expect(
      screen.getByText("A captação de pacientes é semestral."),
    ).toBeVisible();
  });
  it("atualiza a situação após a chamada, sem mostrar posição legada (RF8, DF55, RNF6)", async () => {
    vi.mocked(api)
      .mockResolvedValueOnce({
        numero: "2026-00001",
        situacao: "em_triagem",
        posicao: 42,
        consultadaEm: "2026-11-08T17:30:00Z",
      })
      .mockResolvedValueOnce({
        numero: "2026-00001",
        situacao: "em_atendimento",
        consultadaEm: "2026-11-08T17:31:00Z",
      });
    abrir();
    await screen.findByText("Em triagem", { exact: true });
    expect(document.body.textContent).not.toMatch(/42|posição/);
    fireEvent.click(screen.getByRole("button", { name: "Atualizar situação" }));
    await screen.findByText("Em atendimento", { exact: true });
    expect(
      screen.getByRole("status", { name: "Situação da inscrição" }),
    ).toHaveTextContent("14:31");
  });
});
