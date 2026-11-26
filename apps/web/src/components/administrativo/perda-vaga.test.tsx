import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { AvisoPrazoVencidoSemAcao, PerdaVaga, VagaPerdida } from "./perda-vaga";

const PREVIA = {
  previa: {
    estagiario: "Ana Beatriz Costa",
    vinculadoEm: "2026-11-17T13:00:00.000Z",
    ate: "2026-11-27",
    sessoesFuturas: ["2026-12-01T13:00:00.000Z"],
  },
  confirmada: null,
  naFilaDesde: "2026-10-20T13:00:00.000Z",
};

const CONFIRMADA = {
  previa: null,
  confirmada: {
    confirmadaPor: "Juliana Rocha",
    confirmadaEm: "2026-11-28T12:40:00.000Z",
    sessoesCanceladas: 1,
    estagiario: "Ana Beatriz Costa",
  },
  naFilaDesde: "2026-11-28T12:40:00.000Z",
};

type Chamada = { url: string; metodo: string };

function simularApi(
  consulta: unknown,
  confirmacao: { status: number; corpo: unknown } = {
    status: 200,
    corpo: {
      estagiario: "Ana Beatriz Costa",
      sessoesCanceladas: 1,
      naFilaDesde: "2026-11-28T12:40:00.000Z",
    },
  },
) {
  const chamadas: Chamada[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const metodo = init?.method ?? "GET";
      chamadas.push({ url, metodo });
      const resposta =
        metodo === "POST" ? confirmacao : { status: 200, corpo: consulta };
      return new Response(JSON.stringify(resposta.corpo), {
        status: resposta.status,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
  return chamadas;
}

function abrir(conteudo: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(<QueryClientProvider client={client}>{conteudo}</QueryClientProvider>);
}

describe("Perda da vaga pela contribuição pendente (RF43)", () => {
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

  it("mostra o prazo vencido e, no diálogo, as consequências antes de confirmar", async () => {
    const chamadas = simularApi(PREVIA);
    const aoConfirmar = vi.fn();
    abrir(
      <PerdaVaga
        casoId="c1"
        nome="Camila Souza Reis"
        podeRegistrarPagamento
        aoConfirmar={aoConfirmar}
      />,
    );
    expect(
      await screen.findByText("Prazo da contribuição vencido."),
    ).toBeTruthy();
    expect(
      screen.getByText(/vinculado\(a\) a Ana Beatriz Costa em 17\/11\/2026/),
    ).toBeTruthy();
    expect(screen.getByText(/terminou em 27\/11\/2026/)).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Registrar pagamento" })
        .getAttribute("href"),
    ).toBe("#contribuicao");

    fireEvent.click(
      screen.getByRole("button", { name: "Confirmar perda da vaga" }),
    );
    const dialogo = await screen.findByRole("alertdialog");
    expect(
      within(dialogo).getByText(
        "Confirmar a perda da vaga de Camila Souza Reis?",
      ),
    ).toBeTruthy();
    expect(
      within(dialogo).getByText(
        "O vínculo com Ana Beatriz Costa é encerrado e a vaga é liberada.",
      ),
    ).toBeTruthy();
    expect(
      within(dialogo).getByText(
        "A sessão futura de 01/12/2026, às 10:00, é cancelada.",
      ),
    ).toBeTruthy();
    expect(
      within(dialogo).getByText(
        /volta à fila de espera com a mesma prioridade/,
      ),
    ).toBeTruthy();

    fireEvent.click(
      within(dialogo).getByRole("button", { name: "Confirmar perda da vaga" }),
    );
    await vi.waitFor(() => expect(aoConfirmar).toHaveBeenCalledOnce());
    expect(aoConfirmar.mock.calls[0][0]).toMatchObject({
      sessoesCanceladas: 1,
    });
    expect(chamadas.find((c) => c.metodo === "POST")?.url).toContain(
      "/casos/c1/perda-vaga",
    );
  });

  it("a coordenação confirma, mas não registra o pagamento", async () => {
    simularApi(PREVIA);
    abrir(
      <PerdaVaga
        casoId="c1"
        nome="Camila Souza Reis"
        podeRegistrarPagamento={false}
        aoConfirmar={() => {}}
      />,
    );
    expect(
      await screen.findByRole("button", { name: "Confirmar perda da vaga" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("link", { name: "Registrar pagamento" }),
    ).toBeNull();
  });

  it("se a confirmação for recusada, mostra o motivo no diálogo", async () => {
    simularApi(PREVIA, {
      status: 409,
      corpo: {
        statusCode: 409,
        codigo: "ja_pago",
        message:
          "A contribuição deste ciclo já foi paga: o paciente não perde a vaga.",
      },
    });
    const aoConfirmar = vi.fn();
    abrir(
      <PerdaVaga
        casoId="c1"
        nome="Camila Souza Reis"
        podeRegistrarPagamento
        aoConfirmar={aoConfirmar}
      />,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Confirmar perda da vaga" }),
    );
    const dialogo = await screen.findByRole("alertdialog");
    fireEvent.click(
      within(dialogo).getByRole("button", { name: "Confirmar perda da vaga" }),
    );
    expect(
      await within(dialogo).findByText(
        "A contribuição deste ciclo já foi paga: o paciente não perde a vaga.",
      ),
    ).toBeTruthy();
    expect(aoConfirmar).not.toHaveBeenCalled();
  });

  it("sem prazo vencido, não mostra nada", async () => {
    const chamadas = simularApi({ ...PREVIA, previa: null });
    abrir(
      <PerdaVaga
        casoId="c1"
        nome="Camila Souza Reis"
        podeRegistrarPagamento
        aoConfirmar={() => {}}
      />,
    );
    await vi.waitFor(() => expect(chamadas).toHaveLength(1));
    expect(screen.queryByText("Prazo da contribuição vencido.")).toBeNull();
  });

  it("o estagiário e o supervisor veem o aviso sem a confirmação", () => {
    abrir(<AvisoPrazoVencidoSemAcao nome="Camila Souza Reis" />);
    expect(
      screen.getByText("O prazo da contribuição de Camila Souza Reis venceu."),
    ).toBeTruthy();
    expect(
      screen.getByText(/feita pela secretaria ou pela coordenação/),
    ).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("depois da confirmação, a ficha mostra a volta à fila e quem confirmou", async () => {
    simularApi(CONFIRMADA);
    abrir(<VagaPerdida casoId="c1" />);
    expect(
      await screen.findByText("Na fila de espera desde 28/11/2026"),
    ).toBeTruthy();
    expect(
      screen.getByText(
        /confirmada por Juliana Rocha em 28\/11\/2026, às 09:40\. 1 sessão futura cancelada\./,
      ),
    ).toBeTruthy();
  });
});
