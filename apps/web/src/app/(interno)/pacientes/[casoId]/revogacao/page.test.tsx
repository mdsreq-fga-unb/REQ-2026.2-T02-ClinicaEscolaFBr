import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ConsentimentoDaInscricao } from "@clinica/shared";
import Page from "./page";
import { api } from "@/lib/api";
vi.mock("next/navigation", () => ({ useParams: () => ({ casoId: "c1" }) }));
vi.mock("@/lib/api", async (original) => ({
  ...(await original<typeof import("@/lib/api")>()),
  api: vi.fn(),
}));
let perfil = "secretaria";
const dados: ConsentimentoDaInscricao = {
  inscricaoId: "i1",
  casoId: "c1",
  numero: "2026-001",
  paciente: "Paciente de teste",
  menor: false,
  responsavelLegal: null,
  situacao: "em_atendimento",
  aceite: { versao: "0.1", em: "2026-11-01T13:00:00Z", peloResponsavel: false },
  revogacao: null,
};
function abrir() {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <Page />
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  perfil = "secretaria";
  vi.mocked(api)
    .mockReset()
    .mockImplementation(async (caminho) => {
      if (caminho === "/auth/sessao")
        return { id: "u1", nome: "Secretaria", perfil } as never;
      if (caminho === "/casos/c1/consentimento") return dados as never;
      if (caminho === "/inscricoes/i1/revogacao")
        return {
          ...dados,
          revogacao: {
            id: "r1",
            versao: "0.1",
            em: "2026-11-22T13:00:00Z",
            por: "Secretaria",
            solicitante: "titular",
            formaVerificacao: "documento",
          },
        } as never;
      throw new Error(`Rota inesperada: ${caminho}`);
    });
});
afterEach(cleanup);
describe("RF65 — formulário de revogação", () => {
  it("mostra efeitos antes do envio, exige verificação e foca o primeiro campo inválido", async () => {
    abrir();
    await screen.findByRole("heading", { name: "Revogação do consentimento" });
    expect(
      screen.getByText(/Novos agendamentos ficam bloqueados/),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Registrar revogação" }),
    );
    await screen.findByText("Escolha como a identidade foi confirmada.");
    expect(
      screen.getByLabelText("Documento com foto, apresentado na clínica"),
    ).toBe(document.activeElement);
    expect(
      vi.mocked(api).mock.calls.some(([, init]) => init?.method === "POST"),
    ).toBe(false);
  });
  it("documento vazio não envia; válido conserva o aceite no histórico da confirmação", async () => {
    abrir();
    fireEvent.click(
      await screen.findByLabelText(
        "Documento com foto, apresentado na clínica",
      ),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Registrar revogação" }),
    );
    await screen.findByText("Informe o documento apresentado.");
    fireEvent.change(screen.getByLabelText("Documento apresentado"), {
      target: { value: "Carteira de identidade" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Registrar revogação" }),
    );
    await screen.findByText("Revogação registrada.");
    expect(screen.getByText("Aceite")).toBeTruthy();
    expect(screen.getByText("Revogação")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Registrar revogação" }),
    ).toBeNull();
    expect(api).toHaveBeenCalledWith(
      "/inscricoes/i1/revogacao",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          solicitante: "titular",
          formaVerificacao: "documento",
          documento: "Carteira de identidade",
        }),
      }),
    );
  });
  it.each(["coordenacao", "supervisor", "estagiario"])(
    "%s não abre o formulário nem consulta dados",
    async (p) => {
      perfil = p;
      abrir();
      await screen.findByText("Você não pode registrar a revogação");
      await waitFor(() =>
        expect(vi.mocked(api).mock.calls.map(([path]) => path)).not.toContain(
          "/casos/c1/consentimento",
        ),
      );
    },
  );
});
