import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type {
  ComplementoEvolucao,
  ValidacaoEvolucao,
  VersaoEvolucao,
} from "@clinica/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProntuarioPage from "./page";
import { api, ErroApi } from "@/lib/api";

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

type Validacao = ValidacaoEvolucao & { permitida: boolean };
// O jsdom não abre o <dialog> nativo.
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});

function prontuarioCom(
  inicial: Validacao,
  versoes: VersaoEvolucao[] = [original],
  complementos: ComplementoEvolucao[] = [],
  enviar: () => Validacao = () => {
    throw new Error("Envio inesperado");
  },
) {
  let validacao = inicial;
  vi.mocked(api).mockImplementation(
    async (path: string, opcoes?: RequestInit) => {
      if (path === "/auth/sessao")
        return { id: "u1", nome: "Ana Costa", perfil: "estagiario" } as never;
      if (path === "/prontuarios/p1/evolucoes/e1/validacao") {
        expect(opcoes?.method).toBe("POST");
        validacao = enviar();
        return {} as never;
      }
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
                complementos,
                complemento: { permitido: false, aviso: null },
                validacao,
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
    },
  );
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <ProntuarioPage />
    </QueryClientProvider>,
  );
}

const complemento: ComplementoEvolucao = {
  tipo: "complemento",
  id: "k1",
  texto: "Paciente ligou para avisar.",
  autor: "Ana Costa",
  em: "2026-11-08T14:40:00Z",
};
const pendente: Validacao = {
  situacao: "pendente",
  ultima: null,
  mudanca: null,
  permitida: false,
};
const validada: Validacao = {
  ...pendente,
  situacao: "validada",
  ultima: { por: "Carla Mendes", em: "2026-11-06T21:05:00Z" },
};
const abrirDialogo = async (nome = "Validar evolução da sessão 3") =>
  fireEvent.click(
    await screen.findByRole("button", { name: nome, hidden: true }),
  );
const confirmar = () =>
  fireEvent.click(
    screen.getByRole("button", { name: "Validar", hidden: true }),
  );

describe("validação da evolução no prontuário (RF67)", () => {
  it("quem só consulta vê a situação pendente e quem valida, sem a ação (RF67)", async () => {
    prontuarioCom(pendente);
    expect(await screen.findByText("Pendente de validação")).toBeTruthy();
    expect(
      screen.getByText(
        "A validação é feita pelo supervisor do caso, Carla Mendes.",
      ),
    ).toBeTruthy();
    expect(screen.queryByText("Validar evolução")).toBeNull();
  });

  it("a evolução validada mostra o supervisor e a data/hora (RF67)", async () => {
    prontuarioCom(validada);
    expect(await screen.findByText("Validada")).toBeTruthy();
    expect(
      screen.getByText("Validada por Carla Mendes em 06/11/2026, 18:05."),
    ).toBeTruthy();
  });

  it("o supervisor confirma no diálogo, com o que a evolução já tem, e o resultado é anunciado (RF67, RNF56 a RNF58)", async () => {
    const enviar = vi.fn(() => validada);
    prontuarioCom(
      { ...pendente, permitida: true },
      [corrigida, original],
      [complemento],
      enviar,
    );
    await abrirDialogo();
    expect(
      screen.getByRole("heading", { name: "Validar a evolução da sessão 3?" }),
    ).toBeTruthy();
    expect(
      screen.getByText(/com a correção e o complemento já registrados\./),
    ).toBeTruthy();
    expect(enviar).not.toHaveBeenCalled();
    confirmar();
    const aviso = (await screen.findByText("Evolução validada.")).closest(
      "[role='status']",
    );
    await waitFor(() => expect(document.activeElement).toBe(aviso));
    expect(enviar).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Validada")).toBeTruthy();
    expect(screen.queryByText("Validar evolução")).toBeNull();
  });

  it("cancelar o diálogo não valida (RF67)", async () => {
    const enviar = vi.fn(() => validada);
    prontuarioCom({ ...pendente, permitida: true }, [original], [], enviar);
    await abrirDialogo();
    fireEvent.click(screen.getByText("Cancelar"));
    expect(enviar).not.toHaveBeenCalled();
    expect(screen.getByText("Pendente de validação")).toBeTruthy();
  });

  it("de volta a pendente, mostra a validação anterior, o motivo e a ação de validar de novo (RF67)", async () => {
    prontuarioCom(
      {
        ...validada,
        situacao: "pendente",
        mudanca: { tipo: "complemento", em: complemento.em },
        permitida: true,
      },
      [original],
      [complemento],
    );
    expect(
      await screen.findByText(
        "Validada por Carla Mendes em 06/11/2026. Voltou a ficar pendente porque recebeu um complemento em 08/11/2026, 11:40.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Validar de novo")).toBeTruthy();
  });

  it.each([
    [403, "Você não pode validar esta evolução"],
    [409, "A evolução não foi validada."],
  ])(
    "a recusa %i da API aparece como aviso em foco (RF67)",
    async (status, titulo) => {
      prontuarioCom({ ...pendente, permitida: true }, [original], [], () => {
        throw new ErroApi(status, "Recusado.");
      });
      await abrirDialogo();
      confirmar();
      const alerta = (await screen.findByText(titulo)).closest(
        "[role='alert']",
      );
      await waitFor(() => expect(document.activeElement).toBe(alerta));
    },
  );
});
