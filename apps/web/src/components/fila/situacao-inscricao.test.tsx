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
    ["aguardando_triagem", "Aguardando triagem"],
    ["na_fila", "Na fila de espera"],
    ["em_atendimento", "Em atendimento"],
    ["procure_secretaria", "Procure a secretaria"],
  ])("anuncia %s com texto e horário de Brasília", async (situacao, titulo) => {
    vi.mocked(api).mockResolvedValue({
      numero: "2026-00001",
      situacao,
      posicao: situacao === "na_fila" ? 3 : null,
      consultadaEm: "2026-11-08T17:30:00Z",
    });
    abrir();
    await screen.findByRole("heading", { name: titulo });
    expect(screen.getByRole("status")).toHaveTextContent("14:30");
    if (situacao === "na_fila") {
      expect(screen.getByRole("status")).toHaveTextContent("3ª");
      expect(screen.getByRole("status")).toHaveTextContent(
        "não garante uma data",
      );
    }
    expect(document.body.textContent).not.toMatch(/Prioridade|Vermelha|CPF/);
  });
  it("401 recebe foco e pede nova confirmação, sem mostrar resultado anterior", async () => {
    vi.mocked(api).mockRejectedValue(new ErroApi(401, "Expirou"));
    abrir();
    await waitFor(() => expect(screen.getByRole("alert")).toHaveFocus());
    expect(
      screen.getByRole("button", { name: "Confirmar identidade" }),
    ).toBeVisible();
    expect(screen.queryByText("2026-00001")).not.toBeInTheDocument();
  });
  it("erro de rede permite tentar de novo", async () => {
    vi.mocked(api)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue({
        numero: "2026-00001",
        situacao: "em_atendimento",
        posicao: null,
        consultadaEm: "2026-11-08T17:30:00Z",
      });
    abrir();
    fireEvent.click(
      await screen.findByRole("button", { name: "Tentar novamente" }),
    );
    await screen.findByRole("heading", { name: "Em atendimento" });
  });
  it("remove o resultado quando a verificação expira, mesmo sem outra navegação", async () => {
    vi.mocked(api).mockResolvedValue({
      numero: "2026-00001",
      situacao: "na_fila",
      posicao: 1,
      consultadaEm: "2026-11-08T17:30:00Z",
    });
    abrir(new Date(Date.now() + 200).toISOString());
    await screen.findByRole("heading", { name: "Na fila de espera" });
    await screen.findByRole("button", { name: "Confirmar identidade" });
    expect(
      screen.queryByRole("heading", { name: "Na fila de espera" }),
    ).not.toBeInTheDocument();
  });
});
