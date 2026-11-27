import { describe, expect, it, vi } from "vitest";
import { consultarCep } from "./consulta-cep";

const responder = (status: number, corpo: unknown) =>
  vi.fn(async () => new Response(JSON.stringify(corpo), { status }));

describe("Consulta do CEP (RF1, DF75)", () => {
  it("devolve a rua, o bairro e a cidade/UF do ViaCEP, mandando só os números do CEP", async () => {
    const buscar = responder(200, {
      cep: "72503-305",
      logradouro: "Quadra 203 Conjunto 5",
      bairro: "Santa Maria",
      localidade: "Brasília",
      uf: "DF",
    });
    expect(await consultarCep("72503-305", buscar)).toEqual({
      tipo: "encontrado",
      logradouro: "Quadra 203 Conjunto 5",
      bairro: "Santa Maria",
      cidadeUf: "Brasília/DF",
    });
    expect(buscar).toHaveBeenCalledWith(
      "https://viacep.com.br/ws/72503305/json/",
      expect.anything(),
    );
  });
  it("CEP inexistente ou incompleto não é encontrado", async () => {
    expect(
      await consultarCep("99999999", responder(200, { erro: "true" })),
    ).toEqual({
      tipo: "nao_encontrado",
    });
    const buscar = responder(200, {});
    expect(await consultarCep("7250", buscar)).toEqual({
      tipo: "nao_encontrado",
    });
    expect(buscar).not.toHaveBeenCalled();
  });
  it("serviço fora do ar ou resposta incompleta é falha, sem quebrar o formulário", async () => {
    expect(await consultarCep("72503305", responder(500, {}))).toEqual({
      tipo: "falha",
    });
    expect(
      await consultarCep(
        "72503305",
        vi.fn(async () => Promise.reject(new Error("rede"))),
      ),
    ).toEqual({ tipo: "falha" });
    expect(
      await consultarCep("72503305", responder(200, { bairro: "X" })),
    ).toEqual({
      tipo: "falha",
    });
  });
});
