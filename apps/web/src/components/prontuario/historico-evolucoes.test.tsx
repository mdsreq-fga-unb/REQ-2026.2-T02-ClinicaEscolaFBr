import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HistoricoEvolucoes } from "@clinica/shared";
import { HistoricoEvolucoesDoPaciente } from "./historico-evolucoes";
import { api, ErroApi } from "@/lib/api";
vi.mock("@/lib/api", async (original) => ({
  ...(await original<typeof import("@/lib/api")>()),
  api: vi.fn(),
}));
const dados: HistoricoEvolucoes = {
  prontuarioId: "p2",
  ciclo: 2,
  ciclos: [
    { numero: 1, atual: false },
    { numero: 2, atual: true },
  ],
  sessoes: [],
  transferencias: [],
};
const anterior: HistoricoEvolucoes = {
  ...dados,
  prontuarioId: "p1",
  ciclo: 1,
  sessoes: [
    {
      id: "s1",
      evolucaoId: "e1",
      numero: 1,
      inicio: "2026-02-10T13:00:00Z",
      autor: "Ana",
      validacao: {
        situacao: "validada",
        ultima: { por: "Supervisor", em: "2026-02-13T14:00:00Z" },
        mudanca: null,
      },
      registros: [
        {
          tipo: "original",
          id: "e1:versao:1",
          versao: 1,
          autor: "Ana",
          em: "2026-02-10T14:00:00Z",
          motivo: null,
          campos: [{ rotulo: "Queixa", texto: "Original preservado" }],
        },
        {
          tipo: "correcao",
          id: "e1:versao:2",
          versao: 2,
          autor: "Supervisor",
          em: "2026-02-11T14:00:00Z",
          motivo: "Ajustar registro",
          campos: [{ rotulo: "Queixa", texto: "Correção registrada" }],
        },
      ],
    },
  ],
  transferencias: [
    {
      id: "t1",
      em: "2026-03-01T13:00:00Z",
      estagiarioAnterior: "Ana",
      estagiarioNovo: "João",
      supervisorAnterior: null,
      supervisorNovo: null,
    },
  ],
};
function abrir(
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  return render(
    <QueryClientProvider client={client}>
      <HistoricoEvolucoesDoPaciente prontuarioId="p2" />
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  vi.mocked(api)
    .mockReset()
    .mockImplementation(async (caminho) => {
      if (caminho === "/auth/sessao")
        return {
          id: "u1",
          nome: "Coordenação",
          perfil: "coordenacao",
        } as never;
      return (caminho.endsWith("?ciclo=1") ? anterior : dados) as never;
    });
});
afterEach(cleanup);
describe("RF32 — histórico por ciclo", () => {
  it("ciclo atual vazio não mostra registros antigos", async () => {
    abrir();
    await screen.findByRole("heading", { name: "Evoluções do ciclo 2" });
    expect(
      screen.getByText("Ainda não há evoluções registradas neste ciclo."),
    ).toBeTruthy();
    expect(screen.queryByText("Original preservado")).toBeNull();
  });
  it("troca de ciclo carrega versões e autoria, sem inventar validação", async () => {
    abrir();
    const seletor = await screen.findByLabelText("Ciclo de atendimento");
    fireEvent.change(seletor, { target: { value: "1" } });
    await screen.findByRole("heading", { name: "Evoluções do ciclo 1" });
    expect(screen.getByRole("table").querySelectorAll("th")).toHaveLength(5);
    expect(screen.getByText("Estagiário: Ana → João.")).toBeTruthy();
    expect(screen.getAllByText("Validada")).toHaveLength(2);
    expect(screen.getAllByText("Original preservado")).toHaveLength(2);
    expect(screen.getAllByText("Correção registrada")).toHaveLength(2);
    fireEvent.change(screen.getByLabelText("Ciclo de atendimento"), {
      target: { value: "2" },
    });
    await screen.findByText("Ainda não há evoluções registradas neste ciclo.");
    expect(screen.queryByText("Original preservado")).toBeNull();
  });
  it("invalidação do prontuário atualiza complementos e situação da validação no histórico", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    abrir(client);
    fireEvent.change(await screen.findByLabelText("Ciclo de atendimento"), {
      target: { value: "1" },
    });
    await screen.findAllByText("Validada");
    const atualizado = structuredClone(anterior);
    atualizado.sessoes[0].registros.push({
      id: "c1",
      tipo: "complemento",
      versao: null,
      autor: "João",
      em: "2026-02-14T14:00:00Z",
      motivo: null,
      campos: [{ rotulo: "Complemento", texto: "Informação nova" }],
    });
    atualizado.sessoes[0].validacao = {
      situacao: "pendente",
      ultima: anterior.sessoes[0].validacao.ultima,
      mudanca: { tipo: "complemento", em: "2026-02-14T14:00:00Z" },
    };
    vi.mocked(api).mockResolvedValue(atualizado);
    await client.invalidateQueries({ queryKey: ["prontuario", "p2"] });
    expect(await screen.findAllByText("Pendente de validação")).toHaveLength(2);
    expect(screen.getAllByText("Informação nova")).toHaveLength(2);
    expect(screen.getAllByText(/Aguarda nova validação/)).toHaveLength(2);
    expect(screen.getAllByText(/Última validação: Supervisor/)).toHaveLength(2);
    expect(screen.getAllByText("Original preservado")).toHaveLength(2);
  });
  it("403 não mantém histórico clínico na tela", async () => {
    vi.mocked(api).mockImplementation(async (path) => {
      if (path === "/auth/sessao")
        return { id: "u1", perfil: "estagiario" } as never;
      throw new ErroApi(403, "Negado");
    });
    abrir();
    await screen.findByText("Você não tem acesso a este prontuário.");
    expect(screen.queryByRole("table")).toBeNull();
  });
  it("atualizar consulta novamente e preserva o ciclo escolhido", async () => {
    abrir();
    fireEvent.change(await screen.findByLabelText("Ciclo de atendimento"), {
      target: { value: "1" },
    });
    await screen.findByRole("heading", { name: "Evoluções do ciclo 1" });
    const antes = vi.mocked(api).mock.calls.length;
    fireEvent.click(
      screen.getByRole("button", { name: "Atualizar histórico" }),
    );
    await waitFor(() =>
      expect(vi.mocked(api).mock.calls.length).toBeGreaterThan(antes),
    );
    expect(api).toHaveBeenLastCalledWith("/prontuarios/p2/evolucoes?ciclo=1", {
      cache: "no-store",
    });
  });
});
