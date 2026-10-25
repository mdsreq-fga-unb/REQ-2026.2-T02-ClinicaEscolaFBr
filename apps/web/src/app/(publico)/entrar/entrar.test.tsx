import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EntrarPage from "./page";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

// Respostas da API por rota: a sessão começa vazia (401) e o login varia por teste.
function simularApi(login: { status: number; corpo: unknown }) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const resposta = url.endsWith("/auth/sessao")
        ? { status: 401, corpo: { message: "Sessão encerrada." } }
        : login;
      return new Response(JSON.stringify(resposta.corpo), {
        status: resposta.status,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
}

function abrirTela() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <EntrarPage />
    </QueryClientProvider>,
  );
  fireEvent.change(screen.getByLabelText("E-mail"), {
    target: { value: "ana@fbr.edu.br" },
  });
  fireEvent.change(screen.getByLabelText("Senha"), {
    target: { value: "senha1234" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
}

describe("Entrar no sistema (RF50)", () => {
  beforeEach(() => replace.mockReset());
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("leva o usuário à página inicial do seu perfil", async () => {
    simularApi({
      status: 200,
      corpo: { id: "1", nome: "Ana Costa", perfil: "coordenacao" },
    });
    abrirTela();
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/triagem"));
  });

  it("mostra a mesma mensagem para e-mail ou senha incorretos", async () => {
    simularApi({
      status: 401,
      corpo: { message: "E-mail ou senha incorretos." },
    });
    abrirTela();
    expect(await screen.findByText("E-mail ou senha incorretos.")).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });

  it("no bloqueio, informa o horário e desativa o botão até lá", async () => {
    const ate = new Date(Date.now() + 15 * 60_000);
    simularApi({
      status: 423,
      corpo: {
        message: "Acesso bloqueado por 15 minutos.",
        bloqueadoAte: ate.toISOString(),
      },
    });
    abrirTela();
    expect(
      await screen.findByText("Acesso bloqueado por 15 minutos."),
    ).toBeTruthy();
    const horario = ate.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const botao = screen.getByRole("button", {
      name: `Entrar (disponível às ${horario})`,
    });
    expect((botao as HTMLButtonElement).disabled).toBe(true);
  });
});
