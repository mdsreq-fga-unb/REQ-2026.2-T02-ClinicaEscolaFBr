import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { VersaoEvolucao } from "@clinica/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CorrigirEvolucaoPage from "./page";
import { api, ErroApi } from "@/lib/api";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "p1", evolucaoId: "e1" }),
  useRouter: () => ({ push }),
}));
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  api: vi.fn(),
}));
vi.mock("@/lib/sessao", () => ({
  useSessao: () => ({ data: { id: "u1", perfil: "estagiario" } }),
}));
afterEach(cleanup);
beforeEach(() => {
  vi.mocked(api).mockReset();
  push.mockReset();
});

const original: VersaoEvolucao = {
  versao: 1,
  humorAparencia: "Tranquila.",
  conteudoTrabalhado: "Rotina de estudos.",
  tecnicasUtilizadas: "Escuta qualificada.",
  intervencoesEncaminhamentos: null,
  planoProximaSessao: "Retomar.",
  queixa: null,
  planejamento: null,
  motivo: null,
  autor: "Ana Beatriz Costa",
  em: "2026-10-29T18:10:00Z",
};

const evolucao = (
  correcao: {
    dataLimite: string | null;
    prazoEncerrado: boolean;
    permitida: boolean;
  },
  versoes: VersaoEvolucao[] = [original],
) => ({
  id: "e1",
  ...versoes[0],
  registradaPor: "Ana Beatriz Costa",
  registradaEm: "2026-10-29T18:10:00Z",
  versaoAtual: versoes[0].versao,
  versoes,
  correcao,
});

const prontuario = (ev: ReturnType<typeof evolucao>) => ({
  id: "p1",
  nome: "Mariana Alves Toledo",
  sessoes: [
    {
      id: "s1",
      inicio: "2026-10-29T17:00:00Z",
      numeroNoCiclo: 3,
      evolucao: ev,
    },
  ],
});

function renderizar() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <CorrigirEvolucaoPage />
    </QueryClientProvider>,
  );
}

describe("corrigir evolução registrada (RF29)", () => {
  it("abre a ficha já preenchida, com o prazo e o motivo da correção (RF29)", async () => {
    vi.mocked(api).mockResolvedValue(
      prontuario(
        evolucao({
          dataLimite: "2026-12-14",
          prazoEncerrado: false,
          permitida: true,
        }),
      ) as never,
    );
    renderizar();
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Corrigir evolução da sessão 3",
      }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "A correção é permitida até 14/12/2026. A versão original continua guardada no histórico.",
      ),
    ).toBeTruthy();
    expect(
      (screen.getByLabelText(/Humor e aparência/) as HTMLTextAreaElement).value,
    ).toBe("Tranquila.");
    expect(
      (screen.getByLabelText("Motivo da correção") as HTMLTextAreaElement)
        .value,
    ).toBe("");
    expect(
      screen.getByRole("button", { name: "Salvar correção" }),
    ).toBeTruthy();
  });

  it("sem motivo, não envia nada e o aviso do topo leva ao campo do motivo (RF29, RNF56)", async () => {
    vi.mocked(api).mockResolvedValue(
      prontuario(
        evolucao({ dataLimite: null, prazoEncerrado: false, permitida: true }),
      ) as never,
    );
    renderizar();
    fireEvent.click(
      await screen.findByRole("button", { name: "Salvar correção" }),
    );
    const aviso = await screen.findByRole("alert");
    expect(aviso.textContent).toContain("A correção não foi salva.");
    const link = screen.getByRole("link", { name: "motivo da correção" });
    expect(link.getAttribute("href")).toBe("#motivo-correcao");
    expect(
      screen.getByLabelText("Motivo da correção").getAttribute("aria-invalid"),
    ).toBe("true");
    expect(screen.getByText("Informe o motivo da correção.")).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(aviso));
    // Só a consulta do prontuário: nenhuma correção foi enviada.
    expect(vi.mocked(api)).toHaveBeenCalledTimes(1);
  });

  it("com o motivo, envia a ficha inteira e confirma a versão nova (RF29)", async () => {
    let corrigida = false;
    vi.mocked(api).mockImplementation(async (caminho: string, init) => {
      if (caminho === "/prontuarios/p1")
        return prontuario(
          corrigida
            ? evolucao(
                { dataLimite: null, prazoEncerrado: false, permitida: true },
                [
                  {
                    ...original,
                    versao: 2,
                    tecnicasUtilizadas: "Escuta e registro de pensamentos.",
                    motivo: "A técnica estava incompleta.",
                    em: "2026-11-05T19:20:00Z",
                  },
                  original,
                ],
              )
            : evolucao({
                dataLimite: null,
                prazoEncerrado: false,
                permitida: true,
              }),
        ) as never;
      if (caminho === "/prontuarios/p1/evolucoes/e1/correcoes") {
        expect(JSON.parse(init!.body as string)).toEqual({
          humorAparencia: "Tranquila.",
          conteudoTrabalhado: "Rotina de estudos.",
          tecnicasUtilizadas: "Escuta e registro de pensamentos.",
          intervencoesEncaminhamentos: null,
          planoProximaSessao: "Retomar.",
          motivo: "A técnica estava incompleta.",
        });
        corrigida = true;
        return { versao: 2 } as never;
      }
      throw new Error(`Rota inesperada: ${caminho}`);
    });
    renderizar();
    fireEvent.change(await screen.findByLabelText(/Técnicas utilizadas/), {
      target: { value: "Escuta e registro de pensamentos." },
    });
    fireEvent.change(screen.getByLabelText("Motivo da correção"), {
      target: { value: "A técnica estava incompleta." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar correção" }));
    expect(
      await screen.findByText(
        "Correção salva. A versão 2 da evolução da sessão 3 já está no prontuário.",
      ),
    ).toBeTruthy();
    expect(
      await screen.findByRole("heading", { name: "Versão 2 · atual" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Versão 1 · original" }),
    ).toBeTruthy();
    expect(
      screen.getByText(/Motivo: A técnica estava incompleta\./),
    ).toBeTruthy();
  });

  it("depois da data-limite, mostra o prazo encerrado e não mostra o formulário (RF29)", async () => {
    vi.mocked(api).mockResolvedValue(
      prontuario(
        evolucao({
          dataLimite: "2026-12-14",
          prazoEncerrado: true,
          permitida: false,
        }),
      ) as never,
    );
    renderizar();
    expect(
      await screen.findByText(
        "O prazo para corrigir evoluções deste semestre terminou em 14/12/2026.",
      ),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Salvar correção" }),
    ).toBeNull();
  });

  it("a recusa da API pelo prazo aparece com a mensagem dela (RF29)", async () => {
    vi.mocked(api).mockImplementation(async (caminho: string) => {
      if (caminho === "/prontuarios/p1")
        return prontuario(
          evolucao({
            dataLimite: "2026-11-15",
            prazoEncerrado: false,
            permitida: true,
          }),
        ) as never;
      throw new ErroApi(
        422,
        "O prazo para corrigir evoluções deste semestre terminou em 15/11/2026.",
      );
    });
    renderizar();
    fireEvent.change(await screen.findByLabelText("Motivo da correção"), {
      target: { value: "Ajuste." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar correção" }));
    expect(
      await screen.findByText(
        "O prazo para corrigir evoluções deste semestre terminou em 15/11/2026.",
      ),
    ).toBeTruthy();
  });

  it("sem permissão para a evolução, não mostra o formulário (RF29)", async () => {
    vi.mocked(api).mockResolvedValue(
      prontuario(
        evolucao({ dataLimite: null, prazoEncerrado: false, permitida: false }),
      ) as never,
    );
    renderizar();
    expect(
      await screen.findByText("Você não pode corrigir esta evolução."),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Salvar correção" }),
    ).toBeNull();
  });

  it("Cancelar volta para as evoluções do prontuário (RF29)", async () => {
    vi.mocked(api).mockResolvedValue(
      prontuario(
        evolucao({ dataLimite: null, prazoEncerrado: false, permitida: true }),
      ) as never,
    );
    renderizar();
    fireEvent.click(await screen.findByRole("button", { name: "Cancelar" }));
    expect(push).toHaveBeenCalledWith("/prontuarios/p1#evolucoes");
  });
});
