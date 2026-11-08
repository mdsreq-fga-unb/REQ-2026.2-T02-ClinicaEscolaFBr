import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  HistoricoFaltas,
  ResumoFaltas,
  SessoesComFaltas,
  type SessaoDoCiclo,
} from "./faltas";

const AGORA = new Date("2026-11-06T18:00:00.000Z").getTime();
const passada: SessaoDoCiclo = {
  id: "s1",
  inicio: "2026-11-06T17:00:00.000Z",
  termino: "2026-11-06T17:50:00.000Z",
  estagiario: "Ana Beatriz Costa",
  status: "confirmada",
  falta: null,
};
const comFalta: SessaoDoCiclo = {
  id: "s2",
  inicio: "2026-10-29T17:00:00.000Z",
  termino: "2026-10-29T17:50:00.000Z",
  estagiario: "Ana Beatriz Costa",
  status: "falta_paciente",
  falta: {
    id: "f1",
    origem: "falta",
    registradaPor: "Juliana Rocha",
    registradaPeloPaciente: false,
    registradaEm: "2026-10-29T18:05:00.000Z",
    justificada: false,
    motivo: null,
    justificadaPor: null,
    justificadaEm: null,
    retiradaDaContagem: false,
    retiradaPor: null,
    retiradaEm: null,
  },
};

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

const sessoes = (lista: SessaoDoCiclo[]) =>
  comConsultas(
    <SessoesComFaltas
      nome="Mariana Alves Toledo"
      sessoes={lista}
      limite={2}
      agora={AGORA}
      podeRegistrar
      podeJustificar
      chave={["paciente", "c1"]}
    />,
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

  it("na 1ª falta, a contagem mostra 1 de 2 e avisa que uma nova falta leva ao desligamento (RF35)", () => {
    render(
      <ResumoFaltas
        contagem={{ faltas: 1, limite: 2, aviso: "primeira_falta" }}
        nome="Mariana Alves Toledo"
      />,
    );
    expect(screen.getByText("1 de 2")).toBeTruthy();
    expect(
      screen.getByText(
        "Mariana Alves Toledo tem 1 falta neste ciclo. Uma nova falta leva ao desligamento por faltas.",
      ),
    ).toBeTruthy();
  });

  it("no limite, a contagem mostra o selo de limite atingido (RF35, RF36)", () => {
    render(
      <ResumoFaltas
        contagem={{ faltas: 2, limite: 2, aviso: "limite_atingido" }}
        nome="Mariana Alves Toledo"
      />,
    );
    expect(screen.getByText("Limite atingido")).toBeTruthy();
  });

  it("acima do limite, mostra o total e o limite à parte, sem '3 de 2' (RF35)", () => {
    render(
      <ResumoFaltas
        contagem={{ faltas: 3, limite: 2, aviso: "limite_atingido" }}
        nome="Mariana Alves Toledo"
      />,
    );
    expect(screen.queryByText("3 de 2")).toBeNull();
    expect(screen.getByText("3 faltas")).toBeTruthy();
    expect(
      screen.getByText("Acima do limite de 2 faltas no ciclo"),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Mariana Alves Toledo tem 3 faltas neste ciclo, acima do limite de 2.",
      ),
    ).toBeTruthy();
  });

  it("o histórico marca a ordem da falta que conta (RF35)", () => {
    render(
      <HistoricoFaltas
        id="historico"
        contagem={{ faltas: 1, limite: 2, aviso: "primeira_falta" }}
        ciclo={1}
        sessoes={[comFalta]}
      />,
    );
    expect(screen.getByText("Conta · 1ª falta")).toBeTruthy();
  });

  it("falta justificada sem motivo não é enviada, e o campo é indicado (RF34)", async () => {
    const chamadas = simularApi();
    sessoes([passada]);
    fireEvent.click(
      screen.getAllByRole("button", { name: "Registrar falta do paciente" })[0],
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

  it("registra a falta justificada com o motivo e avisa que a sessão passou para falta (RF34)", async () => {
    const chamadas = simularApi();
    sessoes([passada]);
    fireEvent.click(
      screen.getAllByRole("button", { name: "Registrar falta do paciente" })[0],
    );
    fireEvent.click(
      screen.getByRole("checkbox", { name: /Falta justificada/ }),
    );
    fireEvent.change(
      screen.getByLabelText("Motivo da justificativa (obrigatório)"),
      { target: { value: "Atestado médico" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Registrar falta" }));
    expect(await screen.findByText("Falta registrada.")).toBeTruthy();
    expect(chamadas[0]).toEqual({
      url: expect.stringContaining("/sessoes/s1/falta"),
      corpo: { justificada: true, motivo: "Atestado médico" },
    });
  });

  it("justifica depois, na própria linha, e avisa que a falta continua contando (RF34)", async () => {
    const chamadas = simularApi();
    sessoes([comFalta]);
    fireEvent.click(
      screen.getAllByRole("button", { name: "Marcar como justificada" })[0],
    );
    fireEvent.change(
      screen.getAllByLabelText("Motivo da justificativa (obrigatório)")[0],
      { target: { value: "Comprovante de trabalho" } },
    );
    fireEvent.click(
      screen.getAllByRole("button", { name: "Salvar justificativa" })[0],
    );
    expect(await screen.findByText("Justificativa registrada.")).toBeTruthy();
    expect(chamadas[0].url).toContain("/faltas/f1/justificativa");
  });

  it("sessão futura não oferece o registro da falta (RF34)", () => {
    sessoes([
      {
        ...passada,
        inicio: "2026-11-09T17:00:00.000Z",
        termino: "2026-11-09T17:50:00.000Z",
      },
    ]);
    expect(
      screen.queryByRole("button", { name: "Registrar falta do paciente" }),
    ).toBeNull();
  });
});
