import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProntuarioPage from "./page";
import { api } from "@/lib/api";

vi.mock("next/navigation", () => ({ useParams: () => ({ id: "p1" }) }));
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  api: vi.fn(),
}));
vi.mock("@/components/assiduidade/faltas", () => ({
  AcoesFaltaDaSessao: () => null,
  DetalheFalta: () => null,
  HistoricoFaltas: () => null,
  ResumoFaltas: () => null,
  SeloSessao: () => null,
}));
vi.mock("@/components/assiduidade/desligamento", () => ({
  SessoesAReagendar: () => null,
}));

afterEach(cleanup);

describe("elementos mínimos do prontuário (RF27, RNF25, RNF51, RNF52)", () => {
  it("mostra as seções e as ausências no ciclo sem inventar registros (RF27, RNF25, RNF51, RNF52)", async () => {
    vi.mocked(api).mockImplementation(async (path: string) => {
      if (path === "/auth/sessao")
        return {
          id: "u1",
          nome: "Coordenação",
          perfil: "coordenacao",
        } as never;
      if (path === "/prontuarios/p1")
        return {
          casoId: "c1",
          id: "p1",
          cicloAtendimento: 2,
          criadoEm: "2026-10-01T12:00:00Z",
          numeroInscricao: "2026-00431",
          nome: "Paciente de teste",
          dataNascimento: "1990-05-10",
          situacao: "em_atendimento",
          estagiario: "Ana Costa",
          supervisor: "Carla Mendes",
          vinculadoEm: "2026-10-01T12:00:00Z",
          dadosIniciais: {
            anamnese: null,
            contrato: null,
            queixaDaInscricao: null,
          },
          historicoResponsaveis: { estagiarios: [], supervisores: [] },
          sessoes: [],
          alta: null,
          relatorioFinal: null,
          sessoesRealizadas: 0,
          fechamentoAvaliativoPendente: false,
          faltasNoCiclo: { faltas: 0, limite: 2, aviso: null },
          sessoesAReagendar: [],
          acoesFalta: { registrar: false, justificar: false },
          acoesCancelamento: { cancelar: false, reverter: false },
        } as never;
      throw new Error(`Rota inesperada: ${path}`);
    });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <ProntuarioPage />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Prontuário · Paciente de teste",
      }),
    ).toBeTruthy();
    const irPara = screen.getByRole("navigation", { name: "Ir para" });
    for (const nome of [
      "Identificação",
      "Dados iniciais",
      "Responsáveis",
      "Sessões do ciclo",
      "Evoluções",
      "Encerramento por alta",
      "Relatório final",
    ]) {
      expect(screen.getByRole("link", { name: nome })).toBeTruthy();
    }
    expect(irPara.querySelectorAll("a")).toHaveLength(7);
    expect(
      screen.getByText("Não há sessões registradas neste ciclo."),
    ).toBeTruthy();
    expect(screen.getAllByText("Sem registro neste ciclo.")).toHaveLength(3);
    expect(screen.getByText("Ver histórico de responsáveis (0)")).toBeTruthy();
    await waitFor(() => expect(api).toHaveBeenCalledWith("/prontuarios/p1"));
  });

  it("mostra o resumo inicial, a situação da evolução na linha da sessão e deixa a seção de evolução recolhida (RF27, RNF25, RNF51, RNF52)", async () => {
    vi.mocked(api).mockImplementation(async (path: string) => {
      if (path === "/auth/sessao")
        return {
          id: "u1",
          nome: "Coordenação",
          perfil: "coordenacao",
        } as never;
      if (path === "/prontuarios/p1")
        return {
          casoId: "c1",
          id: "p1",
          cicloAtendimento: 2,
          criadoEm: "2026-10-01T12:00:00Z",
          numeroInscricao: "2026-00431",
          nome: "Paciente de teste",
          dataNascimento: "1990-05-10",
          situacao: "em_atendimento",
          estagiario: "Ana Costa",
          supervisor: "Carla Mendes",
          vinculadoEm: "2026-10-01T12:00:00Z",
          dadosIniciais: {
            anamnese: {
              queixaPrincipal: "Insônia",
              historiaProblemaAtual: "Há um ano.",
              historicoFamiliar: null,
              desenvolvimento: null,
              historicoMedico: null,
              aspectosPsicossociais: null,
              registradaEm: "2026-10-02T12:00:00Z",
              registradaPor: "Ana Costa",
            },
            contrato: null,
            queixaDaInscricao: null,
          },
          historicoResponsaveis: {
            estagiarios: [
              {
                nome: "Ana Costa",
                desde: "2026-10-01T12:00:00Z",
                vigente: true,
              },
            ],
            supervisores: [],
          },
          sessoes: [
            {
              id: "s1",
              inicio: "2026-10-22T13:00:00Z",
              termino: "2026-10-22T13:50:00Z",
              estagiarioId: "u1",
              estagiario: "Ana Costa",
              status: "realizada",
              falta: null,
              cancelamento: null,
              canceladaPorDesligamento: false,
              numeroNoCiclo: 3,
              evolucao: {
                id: "e1",
                queixa: null,
                planejamento: null,
                humorAparencia: "Tranquilo",
                conteudoTrabalhado: "Rotina",
                tecnicasUtilizadas: "Escuta",
                intervencoesEncaminhamentos: null,
                planoProximaSessao: "Retomar",
                registradaPor: "Ana Costa",
                registradaEm: "2026-10-22T14:00:00Z",
              },
            },
          ],
          alta: null,
          relatorioFinal: null,
          sessoesRealizadas: 1,
          fechamentoAvaliativoPendente: false,
          faltasNoCiclo: { faltas: 0, limite: 2, aviso: null },
          sessoesAReagendar: [],
          acoesFalta: { registrar: false, justificar: false },
          acoesCancelamento: { cancelar: false, reverter: false },
        } as never;
      throw new Error(`Rota inesperada: ${path}`);
    });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <ProntuarioPage />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Insônia")).toBeTruthy();
    expect(screen.getByText("2 de 6 seções preenchidas")).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Ver dados iniciais completos" })
        .getAttribute("href"),
    ).toBe("/prontuarios/p1/dados-iniciais");
    expect(screen.getByText("Sessão nº 3 · registrada")).toBeTruthy();
    const summary = screen.getByText(/Ver evolução/);
    expect(summary.closest("details")?.open).toBe(false);
    expect(screen.getByText("Ver histórico de responsáveis (1)")).toBeTruthy();
  });
});
