import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FilaPage from "./page";

const sessao = vi.hoisted(() => ({ perfil: "coordenacao" }));
vi.mock("@/lib/sessao", () => ({
  useSessao: () => ({ data: { id: "teste", perfil: sessao.perfil } }),
}));
const montar = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <FilaPage />
    </QueryClientProvider>,
  );
const responder = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("Fila de espera (RF7)", () => {
  beforeEach(() => {
    sessao.perfil = "coordenacao";
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("mostra fila vazia e pendentes sem inventar posições", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        responder({
          inscritos: [],
          pendentes: [
            {
              numero: "2026-00001",
              nome: "Pessoa Fictícia",
              criadaEm: "2026-01-01T12:00:00Z",
            },
          ],
        }),
      ),
    );
    montar();
    expect(
      await screen.findByText("Não há inscritos na fila de espera."),
    ).toBeInTheDocument();
    expect(screen.getByText("Pessoa Fictícia")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it.each(["secretaria", "supervisor", "estagiario"])(
    "nega %s sem consultar dados dos inscritos",
    (perfil) => {
      sessao.perfil = perfil;
      const fetch = vi.fn();
      vi.stubGlobal("fetch", fetch);
      montar();
      expect(
        screen.getByText("Você não tem acesso à fila de espera."),
      ).toBeInTheDocument();
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it.each([401, 403])(
    "trata sessão revogada (%s) como acesso negado",
    async (status) => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(responder({ message: "Acesso negado" }, status)),
      );
      montar();
      expect(
        await screen.findByText("Você não tem acesso à fila de espera."),
      ).toBeInTheDocument();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    },
  );

  it("permite tentar novamente após falha da API", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(responder({ message: "Falha" }, 500))
      .mockResolvedValueOnce(responder({ inscritos: [], pendentes: [] }));
    vi.stubGlobal("fetch", fetch);
    montar();
    fireEvent.click(
      await screen.findByRole("button", { name: "Tentar novamente" }),
    );
    expect(
      await screen.findByText("Não há inscritos na fila de espera."),
    ).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
