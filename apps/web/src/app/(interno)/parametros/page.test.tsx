import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ValorContribuicao } from "@clinica/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MENU_POR_PERFIL } from "@/components/layout/menu";
import ParametrosPage from "./page";

const sessao = vi.hoisted(() => ({ perfil: "coordenacao" }));
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

const montar = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <ParametrosPage />
    </QueryClientProvider>,
  );

const ATUAL: ValorContribuicao = {
  valorCentavos: 3500,
  ultimaAlteracao: {
    valorAnterior: "3000",
    valorNovo: "3500",
    por: "Helena Duarte",
    em: "2026-08-03T13:12:00.000Z",
  },
};

function simularApi(atual: ValorContribuicao, depois?: ValorContribuicao) {
  const chamadas: { metodo: string; corpo: unknown }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init?: RequestInit) => {
      const metodo = init?.method ?? "GET";
      chamadas.push({
        metodo,
        corpo: init?.body ? JSON.parse(init.body as string) : null,
      });
      return new Response(
        JSON.stringify(metodo === "PUT" ? (depois ?? atual) : atual),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }),
  );
  return chamadas;
}

describe("Parâmetros da coordenação: valor da contribuição social (RF41)", () => {
  beforeEach(() => {
    sessao.perfil = "coordenacao";
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("a página fica no menu só da coordenação (RF41)", () => {
    expect(MENU_POR_PERFIL.coordenacao.map((i) => i.href)).toContain(
      "/parametros",
    );
    for (const perfil of ["secretaria", "estagiario", "supervisor"] as const) {
      expect(MENU_POR_PERFIL[perfil].map((i) => i.href)).not.toContain(
        "/parametros",
      );
    }
  });

  it("mostra o valor vigente e a última alteração, com o valor anterior, o novo, o autor e a data/hora (RF41, RNF36)", async () => {
    simularApi(ATUAL);
    montar();
    const campo = await screen.findByLabelText("Valor (R$)");
    expect(campo).toHaveValue("35,00");
    expect(campo).toHaveAccessibleDescription(
      "Vale só para os pagamentos registrados depois da alteração.",
    );
    expect(
      screen.getByText(
        /Última alteração: de R\$\s30,00 para R\$\s35,00, por Helena Duarte, em 03\/08\/2026, às 10:12\./,
      ),
    ).toBeInTheDocument();
  });

  it("sem alterações, diz que o valor é o padrão (RF41)", async () => {
    simularApi({ valorCentavos: 3500, ultimaAlteracao: null });
    montar();
    expect(
      await screen.findByText("Valor padrão, ainda sem alterações."),
    ).toBeInTheDocument();
  });

  it("muda o valor de R$ 35,00 para R$ 40,00, enviando em centavos, e o aviso de sucesso recebe o foco (RF41, RNF58)", async () => {
    const chamadas = simularApi(ATUAL, {
      valorCentavos: 4000,
      ultimaAlteracao: {
        valorAnterior: "3500",
        valorNovo: "4000",
        por: "Helena Duarte",
        em: "2026-11-14T13:00:00.000Z",
      },
    });
    montar();
    fireEvent.change(await screen.findByLabelText("Valor (R$)"), {
      target: { value: "40,00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar valor" }));

    const aviso = await screen.findByRole("status", {
      name: /Valor da contribuição salvo\./,
    });
    await waitFor(() => expect(aviso).toHaveFocus());
    expect(aviso).toHaveTextContent(
      "vale para os pagamentos registrados a partir de agora",
    );
    expect(chamadas.find((c) => c.metodo === "PUT")?.corpo).toEqual({
      valorCentavos: 4000,
    });
    expect(screen.getByLabelText("Valor (R$)")).toHaveValue("40,00");
    expect(
      screen.getByText(/de R\$\s35,00 para R\$\s40,00/),
    ).toBeInTheDocument();
  });

  it("recusa o valor vazio, zero ou em formato errado no próprio campo, sem enviar (RF41, RNF57)", async () => {
    const chamadas = simularApi(ATUAL);
    montar();
    const campo = await screen.findByLabelText("Valor (R$)");
    for (const [texto, erro] of [
      ["", "Informe o valor."],
      ["0", "Informe um valor maior que zero."],
      ["trinta", "Informe o valor em reais, como 35,00."],
      ["2000,00", "Informe no máximo R$ 1.000,00."],
    ]) {
      fireEvent.change(campo, { target: { value: texto } });
      fireEvent.click(screen.getByRole("button", { name: "Salvar valor" }));
      expect(campo).toHaveAccessibleDescription(expect.stringContaining(erro));
      expect(campo).toHaveAttribute("aria-invalid", "true");
      expect(campo).toHaveFocus();
    }
    expect(chamadas.some((c) => c.metodo === "PUT")).toBe(false);
  });

  it("o mesmo valor não gera alteração (RF41)", async () => {
    const chamadas = simularApi(ATUAL);
    montar();
    fireEvent.change(await screen.findByLabelText("Valor (R$)"), {
      target: { value: "35" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar valor" }));
    expect(
      await screen.findByText("O valor informado é igual ao atual."),
    ).toBeInTheDocument();
    expect(chamadas.some((c) => c.metodo === "PUT")).toBe(false);
  });

  it.each(["secretaria", "estagiario", "supervisor"])(
    "%s vê o acesso negado, sem consultar o valor (RF41)",
    async (perfil) => {
      sessao.perfil = perfil;
      const chamadas = simularApi(ATUAL);
      montar();
      expect(
        screen.getByRole("heading", {
          name: "Você não tem acesso aos parâmetros",
        }),
      ).toBeInTheDocument();
      expect(screen.queryByLabelText("Valor (R$)")).toBeNull();
      expect(chamadas).toHaveLength(0);
    },
  );
});
