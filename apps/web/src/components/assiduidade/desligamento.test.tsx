import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { AlertasFaltas, DesligamentoDoCaso } from "@clinica/shared";
import { DialogoDesligar, DialogoReverter, FaixaAlertas } from "./desligamento";
import type { SessaoDoCiclo } from "./faltas";

const falta = (id: string, inicio: string): SessaoDoCiclo => ({
  id: `s-${id}`,
  inicio,
  termino: inicio,
  estagiario: "Ana Beatriz Costa",
  status: "falta_paciente",
  falta: {
    id,
    origem: "falta",
    registradaPor: "Juliana Rocha",
    registradaPeloPaciente: false,
    registradaEm: inicio,
    justificada: false,
    motivo: null,
    justificadaPor: null,
    justificadaEm: null,
    retiradaDaContagem: false,
    retiradaPor: null,
    retiradaEm: null,
  },
});
const sessoes = [
  falta("7c0e6a52-1f43-4d6b-9a55-0c4b1f0a0001", "2026-10-29T17:00:00.000Z"),
  falta("7c0e6a52-1f43-4d6b-9a55-0c4b1f0a0002", "2026-11-03T17:00:00.000Z"),
];
const desligamento: DesligamentoDoCaso = {
  id: "d1",
  decididoPor: "Juliana Rocha",
  decididoEm: "2026-11-06T13:12:00.000Z",
  dataDecisao: "2026-11-06",
  faltas: sessoes.map((s) => s.inicio),
  revertidoPor: null,
  revertidoEm: null,
  motivoReversao: null,
  pendenteDeVaga: false,
};

function simularApi(resposta: unknown = {}) {
  const chamadas: { url: string; corpo: unknown }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      chamadas.push({
        url,
        corpo: init?.body ? JSON.parse(init.body as string) : null,
      });
      return new Response(JSON.stringify(resposta), {
        status: 200,
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

describe("Alerta, desligamento e reversão (RF36, RF37, RF38)", () => {
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

  const alertas: AlertasFaltas = {
    limite: [
      {
        casoId: "c1",
        nome: "Mariana Alves Toledo",
        faltas: 2,
        ultimaFalta: "2026-11-03T17:00:00.000Z",
        prontuarioId: "p1",
      },
    ],
    primeiraFalta: [],
  };

  it("a faixa mostra o paciente no limite e leva a secretaria a avaliar o desligamento (RF36)", async () => {
    simularApi(alertas);
    comConsultas(<FaixaAlertas perfil="secretaria" />);
    expect(
      await screen.findByText(
        "Limite de faltas atingido: Mariana Alves Toledo",
      ),
    ).toBeTruthy();
    const link = screen.getByRole("link", {
      name: "Avaliar desligamento: Mariana Alves Toledo",
    });
    expect(link.getAttribute("href")).toBe("/pacientes/c1");
  });

  it("para o estagiário, a faixa leva ao prontuário e diz quem avalia (RF36)", async () => {
    simularApi(alertas);
    comConsultas(<FaixaAlertas perfil="estagiario" />);
    expect(
      await screen.findByText(
        /A secretaria ou a coordenação vai avaliar o desligamento/,
      ),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Ver paciente: Mariana Alves Toledo" })
        .getAttribute("href"),
    ).toBe("/prontuarios/p1");
  });

  it("o supervisor não consulta o alerta (RF36)", () => {
    const chamadas = simularApi(alertas);
    comConsultas(<FaixaAlertas perfil="supervisor" />);
    expect(chamadas).toHaveLength(0);
  });

  it("o desligamento lista as faltas e confirma pela rota do caso (RF37)", async () => {
    const chamadas = simularApi({
      desligamentoId: "d1",
      estagiario: "Ana Beatriz Costa",
      sessoesCanceladas: 0,
    });
    const concluido = vi.fn();
    comConsultas(
      <DialogoDesligar
        casoId="c1"
        nome="Mariana Alves Toledo"
        numero="2026-00398"
        ciclo={1}
        desde="2026-10-05"
        sessoes={sessoes}
        estagiario="Ana Beatriz Costa"
        responsavel={{ nome: "Juliana Rocha", perfil: "secretaria" }}
        chave={["paciente", "c1"]}
        aoFechar={() => {}}
        aoConcluir={concluido}
      />,
    );
    expect(screen.getByText("Faltas no ciclo (2 de 2)")).toBeTruthy();
    expect(screen.getByText("Juliana Rocha (Secretaria)")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmar desligamento" }),
    );
    await vi.waitFor(() => expect(concluido).toHaveBeenCalled());
    expect(chamadas[0].url).toContain("/casos/c1/desligamento");
  });

  it("a reversão sem motivo e sem confirmar o limite não é enviada (RF38)", async () => {
    const chamadas = simularApi();
    comConsultas(
      <DialogoReverter
        nome="Mariana Alves Toledo"
        numero="2026-00398"
        desligamento={desligamento}
        sessoes={sessoes}
        vaga={{ estagiario: "Ana Beatriz Costa", livre: true }}
        chave={["paciente", "c1"]}
        aoFechar={() => {}}
        aoConcluir={() => {}}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Reverter desligamento" }),
    );
    expect(
      await screen.findByText("Informe o motivo da reversão."),
    ).toBeTruthy();
    expect(
      screen.getByText(/Confirme que o paciente volta com o limite atingido/),
    ).toBeTruthy();
    expect(chamadas).toHaveLength(0);
  });

  it("desconsiderar uma falta tira a confirmação do limite e envia as faltas retiradas (RF38)", async () => {
    const chamadas = simularApi({
      situacao: "em_atendimento",
      estagiario: "Ana Beatriz Costa",
      sessoesAReagendar: 0,
    });
    const concluido = vi.fn();
    comConsultas(
      <DialogoReverter
        nome="Mariana Alves Toledo"
        numero="2026-00398"
        desligamento={desligamento}
        sessoes={sessoes}
        vaga={{ estagiario: "Ana Beatriz Costa", livre: true }}
        chave={["paciente", "c1"]}
        aoFechar={() => {}}
        aoConcluir={concluido}
      />,
    );
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "Desconsiderar a falta de 03/11/2026 na contagem",
      }),
    );
    expect(
      screen.queryByText("O paciente volta com o limite de faltas atingido"),
    ).toBeNull();
    fireEvent.change(
      screen.getByLabelText("Motivo da reversão (obrigatório)"),
      { target: { value: "Cancelamento pedido para remarcar." } },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Reverter desligamento" }),
    );
    await vi.waitFor(() => expect(concluido).toHaveBeenCalled());
    expect(chamadas[0]).toEqual({
      url: expect.stringContaining("/desligamentos/d1/reversao"),
      corpo: {
        motivo: "Cancelamento pedido para remarcar.",
        faltasRetiradas: ["7c0e6a52-1f43-4d6b-9a55-0c4b1f0a0002"],
        manterContagem: false,
      },
    });
  });
});
