import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type {
  Perfil,
  SinalizacaoReprovacao,
  Sinalizacoes,
} from "@clinica/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MENU_POR_PERFIL } from "@/components/layout/menu";
import {
  FaixaSinalizacoes,
  listaDeSessoes,
  SinalizacoesDeReprovacao,
} from "./sinalizacoes";

const sessao = vi.hoisted(() => ({ perfil: "supervisor" as Perfil }));
vi.mock("@/lib/sessao", () => ({
  useSessao: () => ({ data: { id: "teste", perfil: sessao.perfil } }),
}));
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...resto
  }: {
    href: string;
    children: unknown;
  }) => (
    <a href={href} {...resto}>
      {children as never}
    </a>
  ),
}));

// A massa da prancha 7-2.
const LUCAS: SinalizacaoReprovacao = {
  id: "s1",
  estagiario: { id: "e1", nome: "Lucas Ferreira" },
  semestre: "2026/2",
  geradaEm: "2026-11-12T11:00:00.000Z",
  encerradaEm: null,
  motivoEncerramento: null,
  faltaReclassificada: null,
  faltas: 3,
  faltasDeOutrosSupervisores: 0,
  sessoes: [
    "2026-08-21T19:00:00.000Z",
    "2026-09-17T13:00:00.000Z",
    "2026-11-12T19:00:00.000Z",
  ],
  supervisores: ["Ricardo Menezes"],
  decisoes: [],
};
const RAFAEL: SinalizacaoReprovacao = {
  ...LUCAS,
  id: "s2",
  estagiario: { id: "e2", nome: "Rafael Gomes" },
  geradaEm: "2026-11-14T12:00:00.000Z",
  supervisores: ["Patrícia Nogueira", "Ricardo Menezes"],
};
const ENCERRADA: SinalizacaoReprovacao = {
  ...LUCAS,
  id: "s0",
  estagiario: { id: "e3", nome: "Ana Beatriz Costa" },
  encerradaEm: "2026-11-14T13:00:00.000Z",
  motivoEncerramento: "contagem_abaixo_do_limite",
  faltaReclassificada: {
    inicio: "2026-09-17T13:00:00.000Z",
    em: "2026-11-14T13:00:00.000Z",
  },
  faltas: 2,
};

function simularApi(resposta: { status: number; corpo: unknown }) {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(JSON.stringify(resposta.corpo), {
          status: resposta.status,
          headers: { "Content-Type": "application/json" },
        }),
    ),
  );
}
const ok = (sinalizacoes: SinalizacaoReprovacao[]) =>
  simularApi({ status: 200, corpo: { sinalizacoes } satisfies Sinalizacoes });

const comCliente = (filho: React.ReactNode) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {filho}
  </QueryClientProvider>
);

describe("Sinalização de reprovação (RF63, prancha 7-2)", () => {
  beforeEach(() => {
    sessao.perfil = "supervisor";
    sessionStorage.clear();
    vi.useFakeTimers({
      toFake: ["Date"],
      now: new Date("2026-11-16T15:00:00Z"),
    });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("lista a data e o horário de cada sessão, com o ano na última", () => {
    expect(listaDeSessoes(LUCAS.sessoes)).toBe(
      "21/08, às 16:00; 17/09, às 10:00 e 12/11/2026, às 16:00",
    );
    expect(
      listaDeSessoes(["2026-12-14T13:00:00.000Z", "2027-01-12T13:00:00.000Z"]),
    ).toBe("14/12/2026, às 10:00 e 12/01/2027, às 10:00");
  });

  describe("faixa em Meus casos", () => {
    it("mostra o estagiário, o limite, as sessões e quem decide, com o anúncio do leitor de tela", async () => {
      ok([LUCAS]);
      render(comCliente(<FaixaSinalizacoes />));

      const faixa = await screen.findByRole("alert");
      expect(faixa.textContent).toContain(
        "Lucas Ferreira atingiu 3 faltas no semestre 2026/2, o limite que reprova o campo de estágio.",
      );
      expect(faixa.textContent).toContain(
        "Sessões: 21/08, às 16:00; 17/09, às 10:00 e 12/11/2026, às 16:00. A decisão sobre o caso é da coordenação.",
      );
      expect(
        within(faixa)
          .getByRole("link", { name: "Ver as sinalizações de reprovação" })
          .getAttribute("href"),
      ).toBe("/sinalizacoes-reprovacao");
    });

    it("anuncia só na primeira vez da sessão do navegador; depois, é uma região comum", async () => {
      ok([LUCAS]);
      render(comCliente(<FaixaSinalizacoes />));
      await screen.findByRole("alert");
      cleanup();

      render(comCliente(<FaixaSinalizacoes />));

      expect(
        await screen.findByRole("region", {
          name: "Sinalização de reprovação de Lucas Ferreira",
        }),
      ).toBeTruthy();
      expect(screen.queryByRole("alert")).toBeNull();
    });

    it("com mais de 3 faltas, avisa que a sinalização é a mesma, com a contagem atualizada", async () => {
      ok([{ ...LUCAS, faltas: 4 }]);
      render(comCliente(<FaixaSinalizacoes />));

      expect(
        await screen.findByText(
          "Lucas Ferreira tem agora 4 faltas em 2026/2. A sinalização de 12/11/2026 continua a mesma, com a contagem atualizada.",
        ),
      ).toBeTruthy();
    });

    it("as faltas em casos de outros supervisores aparecem só como número", async () => {
      ok([
        {
          ...LUCAS,
          sessoes: LUCAS.sessoes.slice(0, 2),
          faltasDeOutrosSupervisores: 1,
        },
      ]);
      render(comCliente(<FaixaSinalizacoes />));

      expect((await screen.findByRole("alert")).textContent).toContain(
        "Sessões: 21/08, às 16:00 e 17/09/2026, às 10:00. Mais 1 falta em casos de outros supervisores.",
      );
    });

    it("sem sinalização, ou se a consulta falhar, a faixa não aparece", async () => {
      ok([]);
      const { container } = render(comCliente(<FaixaSinalizacoes />));
      await waitFor(() => expect(fetch).toHaveBeenCalled());
      expect(container.textContent).toBe("");
      cleanup();

      simularApi({ status: 500, corpo: {} });
      const falha = render(comCliente(<FaixaSinalizacoes />));
      await waitFor(() => expect(fetch).toHaveBeenCalled());
      expect(falha.container.textContent).toBe("");
    });
  });

  describe("página Sinalizações de reprovação", () => {
    it("coordenação: as abertas, com todos os supervisores do estagiário, e o histórico da encerrada sem decisão", async () => {
      sessao.perfil = "coordenacao";
      ok([LUCAS, RAFAEL, ENCERRADA]);
      render(comCliente(<SinalizacoesDeReprovacao />));

      const tabela = await screen.findByRole("table", {
        name: "Sinalizações de reprovação aguardando a decisão institucional",
        hidden: true,
      });
      const linhas = within(tabela).getAllByRole("row", { hidden: true });
      expect(linhas).toHaveLength(3);
      expect(linhas[2].textContent).toContain(
        "Patrícia Nogueira, Ricardo Menezes",
      );
      expect(linhas[1].textContent).toContain("3 em 2026/2");
      expect(linhas[1].textContent).toContain("12/11/2026");

      const historico = screen.getByRole("region", { name: "Histórico" });
      expect(
        within(historico).getByText("Sinalização encerrada sem decisão"),
      ).toBeTruthy();
      expect(
        within(historico).getByText(
          "Sinalizada em 12/11/2026 e encerrada em 14/11/2026: a contagem caiu para 2, abaixo do limite, porque a falta de 17/09 foi reclassificada como cancelamento administrativo.",
        ),
      ).toBeTruthy();
      expect(
        within(historico).getByText(
          "Se a contagem voltar a 3 neste semestre, a sinalização é gerada de novo.",
        ),
      ).toBeTruthy();
    });

    it("supervisor: a falta reclassificada num caso de outro supervisor aparece sem a data (RNF35)", async () => {
      ok([
        {
          ...ENCERRADA,
          faltaReclassificada: {
            inicio: null,
            em: "2026-11-14T13:00:00.000Z",
          },
        },
      ]);
      render(comCliente(<SinalizacoesDeReprovacao />));

      const historico = await screen.findByRole("region", {
        name: "Histórico",
      });
      expect(
        within(historico).getByText(
          "Sinalizada em 12/11/2026 e encerrada em 14/11/2026: a contagem caiu para 2, abaixo do limite, porque uma falta num caso de outro supervisor foi reclassificada como cancelamento administrativo.",
        ),
      ).toBeTruthy();
    });

    it("sem sinalização aberta, mostra o estado vazio", async () => {
      ok([]);
      render(comCliente(<SinalizacoesDeReprovacao />));

      expect(
        await screen.findByText("Nenhuma sinalização aguardando decisão"),
      ).toBeTruthy();
      expect(screen.queryByRole("region", { name: "Histórico" })).toBeNull();
    });

    it.each(["estagiario", "secretaria"] as const)(
      "%s: vê o acesso negado e nada é consultado (RNF35)",
      (perfil) => {
        sessao.perfil = perfil;
        ok([LUCAS]);
        render(comCliente(<SinalizacoesDeReprovacao />));

        expect(
          screen.getByRole("heading", {
            name: "Você não tem acesso a esta sinalização",
          }),
        ).toBeTruthy();
        expect(fetch).not.toHaveBeenCalled();
      },
    );

    it("o menu leva às sinalizações só o supervisor e a coordenação", () => {
      const tem = (perfil: Perfil) =>
        MENU_POR_PERFIL[perfil].some(
          (i) => i.href === "/sinalizacoes-reprovacao",
        );
      expect(tem("supervisor")).toBe(true);
      expect(tem("coordenacao")).toBe(true);
      expect(tem("estagiario")).toBe(false);
      expect(tem("secretaria")).toBe(false);
    });
  });
});
