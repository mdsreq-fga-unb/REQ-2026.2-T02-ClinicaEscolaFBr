import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ElaboracaoDoRelatorio,
  Perfil,
  VersaoComTexto,
} from "@clinica/shared";
import RelatorioFinalPage from "@/app/(interno)/relatorio-final/[casoId]/page";
import { api, ErroApi } from "@/lib/api";

vi.mock("next/navigation", () => ({
  useParams: () => ({ casoId: "c1" }),
  useSearchParams: () => new URLSearchParams("ciclo=1"),
}));
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  api: vi.fn(),
}));

const secoes = {
  finalidade: "Devolutiva do acompanhamento.",
  demanda: "Dificuldade na rotina de estudos.",
  procedimentos: "Nove sessões semanais.",
  analise: "Evolução na organização.",
  conclusao: "Orientações de continuidade.",
};
const sessoes = (quantas: number, semEvolucao: number[] = []) =>
  Array.from({ length: quantas }, (_, i) => ({
    id: `s${i + 1}`,
    numero: i + 1,
    data: `2026-10-${String(i + 8).padStart(2, "0")}`,
    temEvolucao: !semEvolucao.includes(i + 1),
  }));
const versao = (dados: Partial<VersaoComTexto> = {}): VersaoComTexto => ({
  versao: 1,
  estado: "em_revisao",
  autor: "Ana Beatriz Costa",
  enviadaEm: "2026-11-28T13:14:00Z",
  secoes,
  justificativaExcecao: null,
  origem: { sessoes: ["s1", "s2"], evolucoes: ["e1"] },
  observacoes: null,
  ...dados,
});
const elaboracao = (
  dados: Partial<ElaboracaoDoRelatorio> = {},
): ElaboracaoDoRelatorio => ({
  casoId: "c1",
  prontuarioId: "p1",
  ciclo: 1,
  paciente: "Mariana Alves Toledo",
  solicitante: null,
  estagiario: "Ana Beatriz Costa",
  supervisor: { nome: "Ricardo Menezes", crp: "01/12345" },
  sessoes: sessoes(9),
  semEvolucoes: false,
  exigeJustificativa: false,
  versoes: [],
  acoes: { elaborar: true, decidir: false },
  ...dados,
});
const paraDecidir = (dados: Partial<VersaoComTexto> = {}) =>
  elaboracao({
    versoes: [versao(dados)],
    acoes: { elaborar: false, decidir: true },
  });

type Envio = { caminho: string; metodo: string; corpo: unknown };
// A página com a leitura da API; cada gravação passa por `gravar`, que pode trocar o
// que a próxima leitura devolve ou recusar.
function abrir(
  inicial: ElaboracaoDoRelatorio | ErroApi,
  perfil: Perfil = "estagiario",
  gravar: (envio: Envio) => ElaboracaoDoRelatorio | void = () => {
    throw new Error("Gravação inesperada");
  },
) {
  let atual = inicial;
  vi.mocked(api).mockImplementation(
    async (caminho: string, opcoes?: RequestInit) => {
      if (caminho === "/auth/sessao")
        return { id: "u1", nome: "Pessoa", perfil } as never;
      if (opcoes?.method) {
        atual =
          gravar({
            caminho,
            metodo: opcoes.method,
            corpo: JSON.parse(String(opcoes.body)),
          }) ?? atual;
        return {} as never;
      }
      if (caminho === "/casos/c1/relatorio-final/elaboracao?ciclo=1") {
        if (atual instanceof ErroApi) throw atual;
        return atual as never;
      }
      if (caminho === "/casos/c1/relatorio-final?ciclo=1") return "" as never;
      throw new Error(`Rota inesperada: ${caminho}`);
    },
  );
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <RelatorioFinalPage />
    </QueryClientProvider>,
  );
}
const escrever = (rotulo: string, valor: string) =>
  fireEvent.change(screen.getByLabelText(rotulo), { target: { value: valor } });
const preencher = () => {
  escrever("Finalidade do relatório", secoes.finalidade);
  escrever("2. Descrição da demanda", secoes.demanda);
  escrever("3. Procedimentos", secoes.procedimentos);
  escrever("4. Análise", secoes.analise);
  escrever("5. Conclusão", secoes.conclusao);
};
const botao = (nome: string) => screen.findByRole("button", { name: nome });
const emFoco = async (texto: string, papel: "alert" | "status") => {
  const aviso = (await screen.findByText(texto)).closest<HTMLElement>(
    `[role='${papel}']`,
  )!;
  await waitFor(() => expect(document.activeElement).toBe(aviso));
  return aviso;
};

beforeEach(() => {
  vi.mocked(api).mockReset();
  // O jsdom não abre o <dialog> nativo.
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});
afterEach(cleanup);

describe("Elaboração do relatório final (RF33)", () => {
  it("mostra a identificação, o resumo do ciclo e as lacunas do prontuário", async () => {
    abrir(elaboracao({ sessoes: sessoes(9, [6]) }));
    expect(
      await screen.findByRole("heading", { name: "Relatório final · ciclo 1" }),
    ).toBeTruthy();
    expect(screen.getByText("Versão 1 · rascunho")).toBeTruthy();
    expect(
      screen.getByText(
        /9 sessões realizadas, de 08\/10\/2026 a 16\/10\/2026 · 8 evoluções registradas/,
      ),
    ).toBeTruthy();
    expect(
      screen.getByText("A sessão 6 (13/10/2026) não tem evolução registrada."),
    ).toBeTruthy();
    expect(screen.getByText("Ricardo Menezes · CRP 01/12345")).toBeTruthy();
    expect(
      screen.getByText(/Início do acompanhamento: 08\/10\/2026/),
    ).toBeTruthy();
  });

  it("lista as sessões quando há mais de uma lacuna", async () => {
    abrir(elaboracao({ sessoes: sessoes(9, [2, 6]) }));
    const aviso = (
      await screen.findByText("2 sessões não têm evolução registrada.")
    ).closest<HTMLElement>("[role='status']")!;
    expect(
      within(aviso)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["Sessão 2 (09/10/2026)", "Sessão 6 (13/10/2026)"]);
  });

  it("salva o rascunho com seções em branco", async () => {
    const gravar = vi.fn();
    abrir(elaboracao(), "estagiario", gravar);
    await botao("Salvar rascunho");
    escrever("4. Análise", "Primeira redação.");
    fireEvent.click(await botao("Salvar rascunho"));
    await emFoco("Rascunho salvo.", "status");
    expect(gravar).toHaveBeenCalledWith({
      caminho: "/casos/c1/relatorio-final/rascunho?ciclo=1",
      metodo: "PUT",
      corpo: {
        finalidade: "",
        demanda: "",
        procedimentos: "",
        analise: "Primeira redação.",
        conclusao: "",
        justificativaExcecao: null,
      },
    });
    expect(
      (screen.getByLabelText("4. Análise") as HTMLTextAreaElement).value,
    ).toBe("Primeira redação.");
  });

  it("o envio com seção em branco indica os campos, com o foco no aviso, e não envia", async () => {
    const gravar = vi.fn();
    abrir(elaboracao(), "estagiario", gravar);
    await botao("Enviar para revisão");
    preencher();
    escrever("4. Análise", "  ");
    fireEvent.click(await botao("Enviar para revisão"));
    const aviso = await emFoco("O relatório não foi enviado.", "alert");
    expect(within(aviso).getByText("análise").getAttribute("href")).toBe(
      "#relatorio-analise",
    );
    expect(screen.getByText("Escreva a análise.")).toBeTruthy();
    expect(gravar).not.toHaveBeenCalled();
  });

  it("fora de 8 a 10 sessões, o envio exige a justificativa", async () => {
    const gravar = vi.fn();
    abrir(
      elaboracao({ sessoes: sessoes(6), exigeJustificativa: true }),
      "estagiario",
      gravar,
    );
    await botao("Enviar para revisão");
    preencher();
    fireEvent.click(await botao("Enviar para revisão"));
    const aviso = await emFoco("O relatório não foi enviado.", "alert");
    expect(aviso.textContent).toContain("O ciclo teve 6 sessões.");
    expect(screen.getByText("Informe a justificativa.")).toBeTruthy();
    escrever(
      "Justificativa do encerramento fora de 8 a 10 sessões",
      "Mudança de cidade.",
    );
    fireEvent.click(await botao("Enviar para revisão"));
    await waitFor(() => expect(gravar).toHaveBeenCalledTimes(1));
    expect(gravar.mock.calls[0][0]).toMatchObject({
      caminho: "/casos/c1/relatorio-final/envio?ciclo=1",
      metodo: "POST",
      corpo: { ...secoes, justificativaExcecao: "Mudança de cidade." },
    });
  });

  it("depois do envio, o texto não muda e a versão aparece em revisão", async () => {
    abrir(elaboracao(), "estagiario", () =>
      elaboracao({
        versoes: [versao()],
        acoes: { elaborar: false, decidir: false },
      }),
    );
    await botao("Enviar para revisão");
    preencher();
    fireEvent.click(await botao("Enviar para revisão"));
    expect(
      await screen.findByText(
        "A versão 1 está em revisão por Ricardo Menezes.",
      ),
    ).toBeTruthy();
    expect(screen.queryByLabelText("4. Análise")).toBeNull();
  });

  it("a recusa da API mantém o texto escrito", async () => {
    abrir(elaboracao(), "estagiario", () => {
      throw new ErroApi(500, "Erro interno.");
    });
    await botao("Salvar rascunho");
    escrever("4. Análise", "Meu texto.");
    fireEvent.click(await botao("Salvar rascunho"));
    await emFoco("O rascunho não foi salvo.", "alert");
    expect(
      (screen.getByLabelText("4. Análise") as HTMLTextAreaElement).value,
    ).toBe("Meu texto.");
  });

  it("a versão devolvida mostra as observações, e o rascunho novo começa com o texto dela", async () => {
    abrir(
      elaboracao({
        versoes: [
          versao({ estado: "devolvido", observacoes: "Detalhar a análise." }),
        ],
      }),
    );
    expect(
      await screen.findByText("A versão 1 foi devolvida para ajustes."),
    ).toBeTruthy();
    expect(screen.getByText("Observações: Detalhar a análise.")).toBeTruthy();
    expect(screen.getByText("Versão 2 · rascunho")).toBeTruthy();
    expect(
      (screen.getByLabelText("4. Análise") as HTMLTextAreaElement).value,
    ).toBe(secoes.analise);
  });

  it("o ciclo sem evoluções mostra só o aviso", async () => {
    abrir(
      elaboracao({
        sessoes: sessoes(1, [1]),
        semEvolucoes: true,
        acoes: { elaborar: false, decidir: false },
      }),
    );
    expect(
      await screen.findByText(
        "Não é possível gerar o relatório: o ciclo 1 não tem evoluções registradas.",
      ),
    ).toBeTruthy();
    expect(screen.queryByLabelText("4. Análise")).toBeNull();
  });

  it("sem acesso, mostra a negação, sem o relatório (RF55)", async () => {
    abrir(new ErroApi(403, "Negado."), "estagiario");
    expect(
      await screen.findByText("Você não tem acesso a este relatório"),
    ).toBeTruthy();
  });
});

describe("Revisão do relatório final pelo supervisor (RF33)", () => {
  it("mostra o texto e os registros de origem, e avisa o que veio depois do envio", async () => {
    abrir(paraDecidir(), "supervisor");
    expect(await screen.findByText(secoes.analise)).toBeTruthy();
    expect(
      screen.getByText("Registros de origem: 2 sessões e 1 evolução"),
    ).toBeTruthy();
    expect(
      screen
        .getByText("Conferir com as evoluções do prontuário")
        .getAttribute("href"),
    ).toBe("/prontuarios/p1#evolucoes");
    expect(screen.getByText(/mais 7 sessões realizadas/)).toBeTruthy();
  });

  it("devolver sem observações indica o campo e não envia; com elas, devolve", async () => {
    const gravar = vi.fn(() =>
      elaboracao({
        versoes: [
          versao({ estado: "devolvido", observacoes: "Detalhar a análise." }),
        ],
        acoes: { elaborar: false, decidir: false },
      }),
    );
    abrir(paraDecidir(), "supervisor", gravar);
    fireEvent.click(await botao("Devolver para ajustes"));
    expect(
      screen.getByText("Para devolver o relatório, escreva as observações."),
    ).toBeTruthy();
    expect(document.activeElement).toBe(
      screen.getByLabelText("Observações para o estagiário"),
    );
    expect(gravar).not.toHaveBeenCalled();
    escrever("Observações para o estagiário", "Detalhar a análise.");
    fireEvent.click(await botao("Devolver para ajustes"));
    await emFoco("Versão 1 devolvida para ajustes.", "status");
    expect(gravar).toHaveBeenCalledWith({
      caminho: "/casos/c1/relatorio-final/versoes/1/decisao?ciclo=1",
      metodo: "POST",
      corpo: { decisao: "devolver", observacoes: "Detalhar a análise." },
    });
  });

  it("aprovar pede a confirmação e, com observações escritas, não as descarta", async () => {
    const gravar = vi.fn(() =>
      elaboracao({
        versoes: [versao({ estado: "aprovado" })],
        acoes: { elaborar: false, decidir: false },
      }),
    );
    abrir(paraDecidir(), "supervisor", gravar);
    await botao("Aprovar relatório");
    escrever("Observações para o estagiário", "Ajustar depois.");
    fireEvent.click(await botao("Aprovar relatório"));
    expect(screen.getByText(/As observações só vão na devolução/)).toBeTruthy();
    escrever("Observações para o estagiário", "");
    fireEvent.click(await botao("Aprovar relatório"));
    expect(
      screen.getByRole("heading", {
        name: "Aprovar a versão 1 do relatório?",
      }),
    ).toBeTruthy();
    expect(gravar).not.toHaveBeenCalled();
    fireEvent.click(await botao("Aprovar"));
    await emFoco("Versão 1 aprovada.", "status");
    expect(gravar).toHaveBeenCalledWith(
      expect.objectContaining({
        corpo: { decisao: "aprovar", observacoes: null },
      }),
    );
    expect(screen.queryByText("Aprovar relatório")).toBeNull();
  });

  it("a coordenação lê a versão enviada, sem ações", async () => {
    abrir(
      elaboracao({
        versoes: [versao()],
        acoes: { elaborar: false, decidir: false },
      }),
      "coordenacao",
    );
    expect(await screen.findByText("Ler a versão 1")).toBeTruthy();
    expect(screen.getByText(secoes.analise)).toBeTruthy();
    expect(screen.queryByText("Aprovar relatório")).toBeNull();
    expect(screen.queryByText("Salvar rascunho")).toBeNull();
  });
});
