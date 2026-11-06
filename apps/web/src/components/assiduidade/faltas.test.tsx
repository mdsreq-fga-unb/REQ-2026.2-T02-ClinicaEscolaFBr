import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ContadorFaltas, RegistrarFalta, ResumoFalta } from "./faltas";

function simularApi() {
  const chamadas: { url: string; corpo: unknown }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      chamadas.push({
        url,
        corpo: init?.body ? JSON.parse(init.body as string) : null,
      });
      return new Response(JSON.stringify({}), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
  return chamadas;
}

const comConsultas = (filho: ReactNode) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      {filho}
    </QueryClientProvider>,
  );

describe("Falta do paciente e contagem no ciclo (RF34, RF35)", () => {
  beforeAll(() => {
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

  it("o contador mostra as faltas do ciclo e avisa, na 1ª falta, que uma nova leva ao desligamento (RF35)", () => {
    render(
      <ContadorFaltas
        contagem={{ faltas: 1, limite: 2, aviso: "primeira_falta" }}
      />,
    );
    expect(screen.getByText(/1 de 2/)).toBeTruthy();
    expect(
      screen.getByText("Uma nova falta resulta em desligamento."),
    ).toBeTruthy();
  });

  it("na 2ª falta, o contador avisa que o limite foi atingido (RF35, RF36)", () => {
    render(
      <ContadorFaltas
        contagem={{ faltas: 2, limite: 2, aviso: "limite_atingido" }}
      />,
    );
    expect(screen.getByText("Limite de faltas atingido.")).toBeTruthy();
  });

  it("falta justificada sem motivo não é enviada, e o campo é indicado (RF34)", async () => {
    const chamadas = simularApi();
    comConsultas(<RegistrarFalta sessaoId="s1" chave={["paciente", "c1"]} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Registrar falta do paciente" }),
    );
    fireEvent.click(
      screen.getByRole("checkbox", { name: /Falta justificada/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Registrar falta" }));
    expect(
      await screen.findByText("Informe o motivo da justificativa."),
    ).toBeTruthy();
    expect(chamadas).toHaveLength(0);
  });

  it("registra a falta justificada com o motivo (RF34)", async () => {
    const chamadas = simularApi();
    comConsultas(<RegistrarFalta sessaoId="s1" chave={["paciente", "c1"]} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Registrar falta do paciente" }),
    );
    fireEvent.click(
      screen.getByRole("checkbox", { name: /Falta justificada/ }),
    );
    fireEvent.change(screen.getByLabelText("Motivo da justificativa"), {
      target: { value: "Atestado médico" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Registrar falta" }));
    await vi.waitFor(() => expect(chamadas).toHaveLength(1));
    expect(chamadas[0]).toEqual({
      url: expect.stringContaining("/sessoes/s1/falta"),
      corpo: { justificada: true, motivo: "Atestado médico" },
    });
  });

  it("a falta pelo link mostra que foi registrada pelo paciente, e a não justificada oferece a justificativa (RF34, RF35)", () => {
    comConsultas(
      <ResumoFalta
        falta={{
          id: "f1",
          origem: "cancelamento_fora_do_prazo",
          registradaPor: null,
          registradaPeloPaciente: true,
          registradaEm: "2026-11-06T17:00:00.000Z",
          justificada: false,
          motivo: null,
          justificadaPor: null,
          justificadaEm: null,
          retiradaDaContagem: false,
        }}
        podeJustificar
        chave={["paciente", "c1"]}
      />,
    );
    expect(screen.getByText(/pelo paciente, pelo link da sessão/)).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Marcar como justificada" }),
    ).toBeTruthy();
  });
});
