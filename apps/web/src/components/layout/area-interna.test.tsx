import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AreaInterna } from "./area-interna";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/usuarios",
  useRouter: () => ({ replace }),
}));

// A sessão responde normalmente; a saída falha por falta de conexão ou é confirmada.
function simularApi(saida: "sem-conexao" | "confirmada") {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.endsWith("/auth/sessao")) {
        return new Response(
          JSON.stringify({ id: "1", nome: "Ana Costa", perfil: "coordenacao" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (saida === "sem-conexao") throw new TypeError("Failed to fetch");
      return new Response(null, { status: 204 });
    }),
  );
}

function abrirAreaInterna() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <AreaInterna>
        <p>Conteúdo interno</p>
      </AreaInterna>
    </QueryClientProvider>,
  );
  return client;
}

describe("Sair do sistema (RF51)", () => {
  beforeEach(() => replace.mockReset());
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("sem a confirmação da API, avisa que a sessão continua aberta e permite tentar de novo", async () => {
    simularApi("sem-conexao");
    const client = abrirAreaInterna();
    fireEvent.click(await screen.findByRole("button", { name: "Sair" }));

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Tentar sair de novo" }),
    ).toBeTruthy();
    expect(replace).not.toHaveBeenCalledWith("/entrar");
    expect(client.getQueryData(["sessao"])).toBeTruthy();
    expect(screen.getByText("Conteúdo interno")).toBeTruthy();
  });

  it("com a confirmação da API, apaga o cache da sessão e volta à entrada", async () => {
    simularApi("confirmada");
    const client = abrirAreaInterna();
    fireEvent.click(await screen.findByRole("button", { name: "Sair" }));

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/entrar"));
    expect(client.getQueryData(["sessao"])).toBeUndefined();
  });
});

describe("Sessão expirada por inatividade (RNF50)", () => {
  beforeEach(() => replace.mockReset());
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  // Antes, o usuário antigo ficava no cache junto com o 401: a área interna
  // mandava para /entrar, e /entrar, vendo o usuário, mandava de volta.
  it("leva à entrada uma vez, sem o usuário antigo no cache e sem os dados da pessoa", async () => {
    let expirou = false;
    const json = (corpo: unknown, status = 200) =>
      new Response(JSON.stringify(corpo), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.endsWith("/auth/sessao")) {
          return expirou
            ? json({ message: "Sessão encerrada." }, 401)
            : json({ id: "1", nome: "Ana Costa", perfil: "coordenacao" });
        }
        // Triagem com zero inscrições e nenhum alerta de faltas.
        return json(url.includes("/total") ? { total: 0 } : null);
      }),
    );
    const client = abrirAreaInterna();
    await screen.findByText("Conteúdo interno");
    client.setQueryData(["usuarios", ""], [{ nome: "Pessoa da equipe" }]);

    expirou = true;
    await client.invalidateQueries({ queryKey: ["sessao"] });

    await vi.waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/entrar?sessao=encerrada"),
    );
    expect(client.getQueryData(["sessao"])).toBeNull();
    expect(client.getQueryData(["usuarios", ""])).toBeUndefined();
    expect(screen.queryByText("Conteúdo interno")).toBeNull();
  });

  it("sem ter entrado nesta aba, leva à entrada sem o aviso de sessão encerrada", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ message: "Sessão encerrada." }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }),
      ),
    );
    abrirAreaInterna();
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/entrar"));
    expect(replace).not.toHaveBeenCalledWith("/entrar?sessao=encerrada");
  });
});
