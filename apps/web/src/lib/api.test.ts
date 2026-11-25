import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ErroApi, quandoRecusarSessao } from "./api";

const resposta = (status: number) =>
  new Response(JSON.stringify({ message: "Sessão encerrada." }), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("Chamadas à API com a sessão expirada (RNF50)", () => {
  afterEach(() => {
    quandoRecusarSessao(null);
    vi.unstubAllGlobals();
  });

  it("avisa a cada 401 de uma ação, mesmo fora do React Query, e mantém o erro para a tela", async () => {
    const aviso = vi.fn();
    quandoRecusarSessao(aviso);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(401)));
    await expect(
      api("/sessoes/s1/cancelamento", { method: "POST" }),
    ).rejects.toBeInstanceOf(ErroApi);
    expect(aviso).toHaveBeenCalledTimes(1);
  });

  it.each(["/auth/sessao", "/auth/login", "/auth/logout"])(
    "não avisa no 401 da própria rota da sessão (%s), para não repetir a consulta sem parar",
    async (rota) => {
      const aviso = vi.fn();
      quandoRecusarSessao(aviso);
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(401)));
      await expect(api(rota)).rejects.toBeInstanceOf(ErroApi);
      expect(aviso).not.toHaveBeenCalled();
    },
  );

  it("não avisa em outros erros", async () => {
    const aviso = vi.fn();
    quandoRecusarSessao(aviso);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(403)));
    await expect(api("/fila")).rejects.toBeInstanceOf(ErroApi);
    expect(aviso).not.toHaveBeenCalled();
  });
});
