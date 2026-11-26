import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { ComplementoEvolucao, VersaoEvolucao } from "@clinica/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
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

function prontuarioCom(
  versoes: VersaoEvolucao[],
  complementosIniciais: ComplementoEvolucao[],
  complemento: { permitido: boolean; aviso: string | null },
  enviar: (corpo: { texto: string }) => ComplementoEvolucao = () => {
    throw new Error("Envio inesperado");
  },
) {
  const complementos = [...complementosIniciais];
  vi.mocked(api).mockImplementation(
    async (path: string, opcoes?: RequestInit) => {
      if (path === "/auth/sessao")
        return { id: "u1", nome: "Ana Costa", perfil: "estagiario" } as never;
      if (path === "/prontuarios/p1/evolucoes/e1/complementos") {
        const novo = enviar(JSON.parse(String(opcoes?.body)));
        complementos.push(novo);
        return novo as never;
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
                complementos: [...complementos],
                complemento,
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

const ligacao: ComplementoEvolucao = {
  tipo: "complemento",
  id: "k1",
  texto: "Paciente ligou para avisar.",
  autor: "Ana Costa",
  em: "2026-10-31T12:05:00Z",
};
const orientacao: ComplementoEvolucao = {
  ...ligacao,
  id: "k2",
  texto: "O supervisor orientou retomar o registro.",
  em: "2026-11-06T13:20:00Z",
};
const pode = { permitido: true, aviso: null };
const naoPode = { permitido: false, aviso: null };

const abrirFormulario = async () =>
  fireEvent.click(
    await screen.findByRole("button", {
      name: "Adicionar complemento à evolução da sessão 3",
      hidden: true,
    }),
  );
const campo = () => screen.getByLabelText("Novo complemento");
const salvar = () => fireEvent.click(screen.getByText("Salvar complemento"));

describe("complemento de evolução no prontuário (RF30)", () => {
  it("a linha do tempo junta o original, a correção e os complementos em ordem, com o tipo escrito (RF30, RNF56)", async () => {
    prontuarioCom([corrigida, original], [ligacao, orientacao], naoPode);
    const lista = await screen.findByRole("list", {
      name: "Histórico desta evolução",
      hidden: true,
    });
    const itens = within(lista)
      .getAllByRole("listitem", { hidden: true })
      .map((item) => item.textContent ?? "");
    expect(itens.map((texto) => texto.split(" ")[0])).toEqual([
      "Registro",
      "Complemento",
      "Correção",
      "Complemento",
    ]);
    expect(itens[0]).toContain("Registro original");
    expect(itens[1]).toContain("Paciente ligou para avisar.");
    expect(itens[2]).toContain(
      "de “Escuta qualificada.” para “Escuta qualificada e registro de pensamentos.”",
    );
    expect(itens[2]).toContain(
      "Motivo: A técnica registrada estava incompleta.",
    );
    expect(itens[3]).toContain("O supervisor orientou retomar o registro.");
    expect(itens[3]).toContain("Registrado por Ana Costa em 06/11/2026, 10:20");
  });

  it("o estagiário responsável salva o complemento, com o aviso em foco e o novo item na linha do tempo (RF30)", async () => {
    const enviar = vi.fn((corpo: { texto: string }) => ({
      ...orientacao,
      texto: corpo.texto,
    }));
    prontuarioCom([original], [], pode, enviar);
    await abrirFormulario();
    fireEvent.change(campo(), { target: { value: "  Nova informação.  " } });
    salvar();
    const aviso = (await screen.findByText("Complemento salvo.")).closest(
      "[role='status']",
    );
    await waitFor(() => expect(document.activeElement).toBe(aviso));
    expect(enviar).toHaveBeenCalledWith({ texto: "Nova informação." });
    expect(await screen.findByText("Nova informação.")).toBeTruthy();
    expect(screen.queryByLabelText("Novo complemento")).toBeNull();
  });

  it("o complemento vazio ou acima do limite não é enviado: o aviso recebe o foco e leva ao campo (RF30, RNF56 a RNF58)", async () => {
    const enviar = vi.fn(() => orientacao);
    prontuarioCom([original], [], pode, enviar);
    await abrirFormulario();
    salvar();
    const alerta = (
      await screen.findByText("O complemento não foi salvo.")
    ).closest<HTMLElement>("[role='alert']")!;
    await waitFor(() => expect(document.activeElement).toBe(alerta));
    expect(
      within(alerta).getByText("novo complemento").getAttribute("href"),
    ).toBe(`#${campo().id}`);
    expect(screen.getByText("Escreva o complemento.")).toBeTruthy();
    expect(campo().getAttribute("aria-invalid")).toBe("true");

    fireEvent.change(campo(), { target: { value: "x".repeat(1032) } });
    salvar();
    expect(
      await screen.findByText("Use até 1.000 caracteres (agora são 1.032)."),
    ).toBeTruthy();
    expect(screen.getByText(/1\.032 de 1\.000 caracteres/)).toBeTruthy();
    expect(enviar).not.toHaveBeenCalled();
  });

  it("a recusa da API mantém o texto escrito (RF30)", async () => {
    prontuarioCom([original], [], pode, () => {
      throw new ErroApi(500, "Erro interno.");
    });
    await abrirFormulario();
    fireEvent.change(campo(), { target: { value: "Meu texto." } });
    salvar();
    expect(
      await screen.findByText("O complemento não foi salvo."),
    ).toBeTruthy();
    expect((campo() as HTMLTextAreaElement).value).toBe("Meu texto.");
  });

  it("quem só consulta vê os complementos, sem a ação (RF30)", async () => {
    prontuarioCom([original], [ligacao], naoPode);
    expect(await screen.findByText("Paciente ligou para avisar.")).toBeTruthy();
    expect(screen.queryByText("Adicionar complemento")).toBeNull();
  });

  it("no caso encerrado, mostra o aviso, sem o campo (RF30, RF37)", async () => {
    const aviso =
      "O paciente foi desligado por faltas em 20/11/2026. A evolução não aceita novos complementos.";
    prontuarioCom([original], [], { permitido: false, aviso });
    expect(await screen.findByText(aviso)).toBeTruthy();
    expect(screen.queryByText("Adicionar complemento")).toBeNull();
  });
});
