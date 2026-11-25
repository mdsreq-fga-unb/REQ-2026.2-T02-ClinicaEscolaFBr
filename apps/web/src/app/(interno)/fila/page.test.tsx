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
              inscricaoId: "i-1",
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
    // Sem a tabela da fila ordenada; as pendentes ficam na tabela à parte, com
    // o selo "Pendente de triagem" (prancha 6-1).
    expect(
      screen.queryByRole("region", { name: "Tabela da fila de espera" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("region", {
        name: "Tabela das inscrições com prioridade pendente",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Pendente de triagem")).toBeInTheDocument();
    // A inscrição sem prioridade abre direto na triagem.
    expect(
      screen.getByRole("link", {
        name: "Abrir triagem da inscrição 2026-00001",
      }),
    ).toHaveAttribute("href", "/triagem/i-1");
  });

  it("cada inscrito da fila abre a ficha do paciente", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        responder({
          inscritos: [
            {
              inscricaoId: "i-2",
              casoId: "c-2",
              numero: "2026-00002",
              nome: "Paciente Fictício",
              prioridade: "vermelha",
              entradaEm: "2026-01-02T12:00:00Z",
              posicao: 1,
            },
          ],
          pendentes: [],
        }),
      ),
    );
    montar();
    expect(
      await screen.findByRole("link", {
        name: "Ver ficha de Paciente Fictício",
      }),
    ).toHaveAttribute("href", "/pacientes/c-2");
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
