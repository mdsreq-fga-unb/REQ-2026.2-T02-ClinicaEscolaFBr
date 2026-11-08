import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { SessaoSemConfirmacao } from "@clinica/shared";
import { SessoesSemConfirmacao } from "./sessoes-sem-confirmacao";

const pedro: SessaoSemConfirmacao = {
  id: "s1",
  casoId: "c1",
  paciente: "Pedro Henrique Lima",
  responsavelLegal: "Cláudia Lima",
  estagiario: "Lucas Ferreira",
  inicio: "2026-11-04T19:00:00.000Z",
  termino: "2026-11-04T19:50:00.000Z",
  canalPreferencial: "ligacao",
};

type Resposta = { status: number; corpo: unknown };

function simularApi(listas: Resposta[], registro?: Resposta) {
  const posts: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const resposta =
        init?.method === "POST"
          ? (posts.push(url), registro)
          : listas.length > 1
            ? listas.shift()
            : listas[0];
      return new Response(JSON.stringify(resposta?.corpo), {
        status: resposta?.status ?? 500,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
  return posts;
}

const lista = (sessoes: SessaoSemConfirmacao[]): Resposta => ({
  status: 200,
  corpo: { prazoHoras: 24, sessoes },
});

const abrir = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <SessoesSemConfirmacao />
    </QueryClientProvider>,
  );

describe("Sessões sem confirmação (RF14)", () => {
  beforeAll(() => {
    // O jsdom não implementa o <dialog> nativo.
    HTMLDialogElement.prototype.showModal = function () {
      this.open = true;
    };
    HTMLDialogElement.prototype.close = function () {
      this.open = false;
    };
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("mostra o paciente, a sessão, o canal e o caminho para os contatos, e explica que não é falta (RF14, RNF13)", async () => {
    simularApi([lista([pedro])]);
    abrir();

    const tabela = await screen.findByRole("table", { hidden: true });
    expect(within(tabela).getByText("Pedro Henrique Lima")).toBeTruthy();
    expect(
      within(tabela).getByText("Responsável legal: Cláudia Lima"),
    ).toBeTruthy();
    expect(within(tabela).getByText("04/11/2026")).toBeTruthy();
    expect(within(tabela).getByText("16:00 às 16:50")).toBeTruthy();
    expect(within(tabela).getByText("Ligação")).toBeTruthy();
    expect(within(tabela).getByText("Sem confirmação")).toBeTruthy();
    expect(
      within(tabela)
        .getByRole("link", {
          name: "Ver contatos do paciente Pedro Henrique Lima",
          hidden: true,
        })
        .getAttribute("href"),
    ).toBe("/pacientes/c1");
    expect(screen.getByText("1 sessão")).toBeTruthy();
    expect(screen.getByText(/até 24 horas antes da sessão/)).toBeTruthy();
    expect(screen.getByText(/não é falta/)).toBeTruthy();
  });

  it("sem sessões: mostra o estado vazio", async () => {
    simularApi([lista([])]);
    abrir();

    expect(
      await screen.findByText("Nenhuma sessão sem confirmação."),
    ).toBeTruthy();
    expect(screen.getByText("0 sessões")).toBeTruthy();
    expect(screen.queryByRole("table", { hidden: true })).toBeNull();
  });

  it("falha ao carregar: avisa, sem dizer que a lista está vazia", async () => {
    simularApi([{ status: 500, corpo: {} }]);
    abrir();

    expect(
      await screen.findByText(
        "Não foi possível carregar as sessões sem confirmação.",
      ),
    ).toBeTruthy();
    expect(screen.queryByText("Nenhuma sessão sem confirmação.")).toBeNull();
  });

  const abrirDialogo = async () => {
    const tabela = await screen.findByRole("table", { hidden: true });
    fireEvent.click(
      within(tabela).getByRole("button", {
        name: "Registrar confirmação de Pedro Henrique Lima",
        hidden: true,
      }),
    );
    const dialogo = await screen.findByRole("dialog", { hidden: true });
    return within(dialogo).getByRole("button", {
      name: "Registrar confirmação",
      hidden: true,
    });
  };

  it("registra a confirmação por telefone: a sessão sai da lista, com o aviso de sucesso", async () => {
    const posts = simularApi([lista([pedro]), lista([])], {
      status: 200,
      corpo: { status: "confirmada" },
    });
    abrir();

    fireEvent.click(await abrirDialogo());

    expect(await screen.findByText("Confirmação registrada.")).toBeTruthy();
    expect(posts).toHaveLength(1);
    expect(posts[0]).toContain("/sessoes/s1/confirmacao");
    expect(
      await screen.findByText("Nenhuma sessão sem confirmação."),
    ).toBeTruthy();
  });

  it("a sessão mudou com a lista aberta: mostra o erro e atualiza a lista", async () => {
    simularApi([lista([pedro]), lista([])], {
      status: 409,
      corpo: { message: "A presença nesta sessão já foi confirmada." },
    });
    abrir();

    fireEvent.click(await abrirDialogo());

    expect(
      await screen.findByText("A presença nesta sessão já foi confirmada."),
    ).toBeTruthy();
    expect(screen.queryByText("Confirmação registrada.")).toBeNull();
    expect(
      await screen.findByText("Nenhuma sessão sem confirmação."),
    ).toBeTruthy();
  });
});
