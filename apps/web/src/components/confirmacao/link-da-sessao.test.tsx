import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SessaoDoLink } from "@clinica/shared";
import { LinkDaSessao } from "./link-da-sessao";

const agendada: SessaoDoLink = {
  primeiroNome: "Mariana",
  inicio: "2026-11-05T17:00:00.000Z",
  situacao: "agendada",
  prazoConfirmacao: "2026-11-04T17:00:00.000Z",
  podeConfirmar: true,
};
const confirmada: SessaoDoLink = {
  ...agendada,
  situacao: "confirmada",
  podeConfirmar: false,
};
const encerrada: SessaoDoLink = { ...agendada, podeConfirmar: false };

type Resposta = { status: number; corpo: unknown };
const ok = (corpo: unknown): Resposta => ({ status: 200, corpo });
const INVALIDO: Resposta = {
  status: 404,
  corpo: { message: "Este link não é mais válido." },
};

// Respostas em sequência da consulta (GET) e da confirmação (POST).
function simularApi(consultas: Resposta[], confirmacoes: Resposta[] = []) {
  const posts: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const resposta =
        init?.method === "POST"
          ? (posts.push(url), confirmacoes.shift())
          : consultas.length > 1
            ? consultas.shift()
            : consultas[0];
      return new Response(JSON.stringify(resposta?.corpo), {
        status: resposta?.status ?? 500,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
  return posts;
}

const abrir = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <LinkDaSessao token="token-da-sessao" />
    </QueryClientProvider>,
  );

describe("Página do link da sessão (RF14)", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("sessão agendada: mostra a data, o primeiro nome e o prazo, e confirma com um clique (RNF15, RNF59)", async () => {
    const posts = simularApi([ok(agendada)], [ok(confirmada)]);
    abrir();

    expect(await screen.findByText("Olá, Mariana.")).toBeTruthy();
    expect(screen.getByText("Quinta-feira, 05/11/2026, às 14:00")).toBeTruthy();
    expect(screen.getByText("quarta-feira, 04/11/2026, às 14:00")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Confirmar presença" }));

    expect(await screen.findByText("Presença confirmada")).toBeTruthy();
    expect(posts).toHaveLength(1);
    expect(posts[0]).toContain("/confirmacao/token-da-sessao/confirmar");
    expect(screen.queryByRole("button", { name: /confirmar/i })).toBeNull();
    expect(document.activeElement?.textContent).toContain(
      "Presença confirmada",
    );
  });

  it("presença já confirmada: informa, sem o botão de confirmar", async () => {
    simularApi([ok(confirmada)]);
    abrir();

    expect(await screen.findByText("Presença confirmada")).toBeTruthy();
    expect(
      screen.getByText(/Sua presença na sessão de quinta-feira, 05\/11\/2026/),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: /confirmar/i })).toBeNull();
  });

  it("prazo encerrado: orienta a procurar a secretaria, sem o botão de confirmar", async () => {
    simularApi([ok(encerrada)]);
    abrir();

    expect(
      await screen.findByText("Prazo de confirmação encerrado."),
    ).toBeTruthy();
    expect(screen.getByText(/terminou às 14:00 de 04\/11\/2026/)).toBeTruthy();
    expect(screen.getByText(/procure a secretaria/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /confirmar/i })).toBeNull();
  });

  it("link inválido: informa e orienta, sem nenhum dado da sessão (RNF59)", async () => {
    simularApi([INVALIDO]);
    abrir();

    expect(
      await screen.findByRole("heading", {
        name: "Este link não é mais válido",
      }),
    ).toBeTruthy();
    expect(screen.getByText(/procure a secretaria/)).toBeTruthy();
    expect(screen.queryByText(/Mariana/)).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("falha de conexão: não diz que o link é inválido e permite tentar de novo", async () => {
    simularApi([{ status: 500, corpo: {} }, ok(agendada)]);
    abrir();

    expect(
      await screen.findByText("Não foi possível abrir os dados da sessão."),
    ).toBeTruthy();
    expect(screen.queryByText("Este link não é mais válido")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));

    expect(await screen.findByText("Olá, Mariana.")).toBeTruthy();
  });

  it.each([
    ["409, já confirmada", 409, ok(confirmada), "Presença confirmada"],
    [
      "422, prazo encerrado",
      422,
      ok(encerrada),
      "Prazo de confirmação encerrado.",
    ],
    ["404, link inválido", 404, INVALIDO, "Este link não é mais válido"],
  ])(
    "a situação mudou com a página aberta (%s): mostra a situação atual",
    async (_caso, status, depois, esperado) => {
      simularApi([ok(agendada), depois], [{ status, corpo: { message: "x" } }]);
      abrir();

      fireEvent.click(
        await screen.findByRole("button", { name: "Confirmar presença" }),
      );

      expect(await screen.findByText(esperado)).toBeTruthy();
      await waitFor(() =>
        expect(screen.queryByRole("button", { name: /confirmar/i })).toBeNull(),
      );
    },
  );

  it("falha ao confirmar: mantém o botão e avisa, sem dizer que confirmou", async () => {
    simularApi([ok(agendada)], [{ status: 500, corpo: {} }]);
    abrir();

    fireEvent.click(
      await screen.findByRole("button", { name: "Confirmar presença" }),
    );

    expect(
      await screen.findByText(/Não foi possível confirmar a presença/),
    ).toBeTruthy();
    expect(screen.queryByText("Presença confirmada")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Confirmar presença" }),
    ).toBeTruthy();
  });
});
