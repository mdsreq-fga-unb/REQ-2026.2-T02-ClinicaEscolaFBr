import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import type { VersaoEvolucao } from "@clinica/shared";
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

const original: VersaoEvolucao = {
  versao: 1,
  queixa: null,
  planejamento: null,
  humorAparencia: "Tranquila.",
  conteudoTrabalhado: "Rotina.",
  tecnicasUtilizadas: "Escuta qualificada.",
  intervencoesEncaminhamentos: null,
  planoProximaSessao: "Retomar.",
  motivo: null,
  autor: "Ana Costa",
  em: "2026-10-22T14:00:00Z",
};
const corrigida = {
  ...original,
  versao: 2,
  tecnicasUtilizadas: "Escuta qualificada e registro de pensamentos.",
  motivo: "A técnica registrada estava incompleta.",
  em: "2026-11-05T19:20:00Z",
};

function prontuarioCom(
  versoes: VersaoEvolucao[],
  correcao: {
    dataLimite: string | null;
    prazoEncerrado: boolean;
    permitida: boolean;
  },
) {
  vi.mocked(api).mockImplementation(async (path: string) => {
    if (path === "/auth/sessao")
      return { id: "u1", nome: "Ana Costa", perfil: "estagiario" } as never;
    if (path === "/prontuarios/p1")
      return {
        casoId: "c1",
        id: "p1",
        cicloAtendimento: 1,
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
              ...versoes[0],
              registradaPor: "Ana Costa",
              registradaEm: "2026-10-22T14:00:00Z",
              versaoAtual: versoes[0].versao,
              versoes,
              correcao,
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
}

describe("correção de evolução no prontuário (RF29)", () => {
  it("dentro do prazo, a evolução tem o link para corrigir (RF29)", async () => {
    prontuarioCom([original], {
      dataLimite: "2026-12-14",
      prazoEncerrado: false,
      permitida: true,
    });
    const link = await screen.findByRole("link", {
      name: "Corrigir evolução da sessão 3",
    });
    expect(link.getAttribute("href")).toBe(
      "/prontuarios/p1/evolucoes/e1/corrigir",
    );
  });

  it("depois da correção, mostra a versão atual e a original, com autor, data e motivo (RF29, RNF28)", async () => {
    prontuarioCom([corrigida, original], {
      dataLimite: null,
      prazoEncerrado: false,
      permitida: true,
    });
    expect(await screen.findByText(/versão 2 · atual/)).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Versão 2 · atual", hidden: true }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", {
        name: "Versão 1 · original",
        hidden: true,
      }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        /Corrigida por Ana Costa em .*Motivo: A técnica registrada estava incompleta\./,
      ),
    ).toBeTruthy();
    expect(screen.getByText(/Registrada por Ana Costa em .*\.$/)).toBeTruthy();
  });

  it("depois da data-limite, mostra o prazo encerrado, sem o link (RF29)", async () => {
    prontuarioCom([original], {
      dataLimite: "2026-12-14",
      prazoEncerrado: true,
      permitida: false,
    });
    expect(
      await screen.findByText(
        /O prazo para corrigir evoluções deste semestre terminou em\s+14\/12\/2026\./,
      ),
    ).toBeTruthy();
    expect(
      screen.queryByRole("link", { name: /Corrigir evolução/ }),
    ).toBeNull();
  });

  it("sem permissão, como na evolução de outro estagiário, não aparece o link (RF29)", async () => {
    prontuarioCom([original], {
      dataLimite: null,
      prazoEncerrado: false,
      permitida: false,
    });
    expect(await screen.findByText(/Ver evolução/)).toBeTruthy();
    expect(
      screen.queryByRole("link", { name: /Corrigir evolução/ }),
    ).toBeNull();
  });
});
