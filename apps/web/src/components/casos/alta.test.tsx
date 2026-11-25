import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { RegistroAlta, SituacaoAlta } from "@clinica/shared";
import { AltaDoCaso } from "./alta";

const registro = (dados: Partial<RegistroAlta> = {}): RegistroAlta => ({
  id: "a1",
  dataAlta: "2026-12-01",
  motivo: "Objetivos terapêuticos do ciclo alcançados.",
  pedidaPor: "Ana Beatriz Costa",
  pedidaEm: "2026-12-01T18:30:00Z",
  confirmadaPor: null,
  confirmadaEm: null,
  cancelamento: null,
  reabertura: null,
  ...dados,
});
const situacao = (dados: Partial<SituacaoAlta> = {}): SituacaoAlta => ({
  situacao: "em_atendimento",
  pedidoAberto: null,
  historico: [],
  cancelados: [],
  dataMinimaAlta: null,
  acoes: {
    pedir: false,
    confirmar: false,
    cancelar: false,
    recusar: false,
    reabrir: false,
  },
  supervisor: "Ricardo Menezes",
  sessoesSemEvolucao: 0,
  bloqueioReabertura: null,
  relatorioPendente: false,
  pedidoPorOpcoes: [],
  ciclo: 1,
  sessoesRealizadas: 9,
  ...dados,
});

type Chamada = { metodo: string; caminho: string; corpo?: unknown };
function simular(
  resposta: SituacaoAlta | [number, unknown],
  aposAcao: unknown = { sessoesCanceladas: 0 },
) {
  const chamadas: Chamada[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const metodo = init?.method ?? "GET";
      chamadas.push({
        metodo,
        caminho: new URL(url.replace(/^undefined/, "http://t")).pathname,
        corpo: init?.body ? JSON.parse(String(init.body)) : undefined,
      });
      const [status, corpo] =
        metodo === "GET"
          ? Array.isArray(resposta)
            ? resposta
            : [200, resposta]
          : [200, aposAcao];
      return new Response(JSON.stringify(corpo), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
  return chamadas;
}
function abrir() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <AltaDoCaso casoId="c1" nome="Mariana Alves Toledo" />
    </QueryClientProvider>,
  );
}

describe("Encerrar caso por alta (RF68, prancha 6-5)", () => {
  beforeAll(() => {
    HTMLDialogElement.prototype.showModal ??= function (
      this: HTMLDialogElement,
    ) {
      this.open = true;
    };
    HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
      this.open = false;
    };
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("o estagiário responsável envia a alta para a confirmação, com o aviso das sessões sem evolução", async () => {
    const chamadas = simular(
      situacao({
        acoes: {
          pedir: true,
          confirmar: false,
          cancelar: false,
          recusar: false,
          reabrir: false,
        },
        sessoesSemEvolucao: 2,
      }),
    );
    abrir();
    fireEvent.click(
      await screen.findByRole("button", { name: "Registrar alta" }),
    );
    expect(
      screen.getByText("Há 2 sessões realizadas sem evolução neste ciclo."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Encerrar caso por alta" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Mariana Alves Toledo · ciclo 1 · 9 sessões realizadas"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/confirmação do supervisor do caso, Ricardo Menezes/),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Enviar para confirmação" }),
    );
    expect(
      await screen.findByText("Informe o motivo da alta."),
    ).toBeInTheDocument();
    expect(chamadas.filter((c) => c.metodo === "POST")).toHaveLength(0);

    fireEvent.change(screen.getByLabelText("Data da alta"), {
      target: { value: "2026-11-20" },
    });
    fireEvent.change(screen.getByLabelText("Motivo da alta"), {
      target: { value: "Objetivos alcançados." },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Enviar para confirmação" }),
    );
    expect(
      await screen.findByText(/Alta enviada para a confirmação do supervisor/),
    ).toBeInTheDocument();
    expect(chamadas.find((c) => c.metodo === "POST")).toEqual({
      metodo: "POST",
      caminho: "/casos/c1/alta",
      corpo: { dataAlta: "2026-11-20", motivo: "Objetivos alcançados." },
    });
  });

  it("o supervisor do caso vê o pedido com o motivo e confirma a alta", async () => {
    const chamadas = simular(
      situacao({
        pedidoAberto: registro(),
        acoes: {
          pedir: false,
          confirmar: true,
          cancelar: false,
          recusar: false,
          reabrir: false,
        },
      }),
      { sessoesCanceladas: 2 },
    );
    abrir();
    expect(
      await screen.findByRole("heading", {
        name: "Alta de Mariana Alves Toledo",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Objetivos terapêuticos do ciclo alcançados."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar alta" }));
    expect(
      await screen.findByText(
        /a vaga foi liberada e 2 sessões futuras foram canceladas/,
      ),
    ).toBeInTheDocument();
    expect(chamadas.find((c) => c.metodo === "POST")?.caminho).toBe(
      "/casos/c1/alta/confirmacao",
    );
  });

  it("com o relatório final do ciclo pendente, o estagiário é avisado e o supervisor não confirma a alta (RF33)", async () => {
    simular(
      situacao({
        acoes: {
          pedir: true,
          confirmar: false,
          cancelar: false,
          recusar: false,
          reabrir: false,
        },
        relatorioPendente: true,
      }),
    );
    abrir();
    fireEvent.click(
      await screen.findByRole("button", { name: "Registrar alta" }),
    );
    expect(
      screen.getByText("O relatório final do ciclo 1 ainda não foi aprovado."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Abrir o relatório final" }),
    ).toHaveAttribute("href", "/relatorio-final/c1?ciclo=1");
    cleanup();

    const chamadas = simular(
      situacao({
        pedidoAberto: registro(),
        acoes: {
          pedir: false,
          confirmar: true,
          cancelar: false,
          recusar: true,
          reabrir: false,
        },
        relatorioPendente: true,
      }),
    );
    abrir();
    const botao = await screen.findByRole("button", { name: "Confirmar alta" });
    expect(botao).toHaveAttribute("aria-disabled", "true");
    expect(botao).toHaveAccessibleDescription(
      /o estagiário perde o acesso ao caso e não consegue mais corrigir o relatório/,
    );
    expect(
      screen.getByText(
        "Aprove o relatório final do ciclo 1 antes de confirmar a alta.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Revisar o relatório final" }),
    ).toHaveAttribute("href", "/relatorio-final/c1?ciclo=1");
    fireEvent.click(botao);
    expect(chamadas.filter((c) => c.metodo === "POST")).toHaveLength(0);
    // A recusa continua disponível.
    expect(
      screen.getByRole("button", { name: "Recusar alta" }),
    ).not.toHaveAttribute("aria-disabled");
  });

  it("os outros perfis veem só a etiqueta do pedido, sem o botão de confirmar", async () => {
    simular(situacao({ pedidoAberto: registro({ motivo: null }) }));
    abrir();
    expect(
      await screen.findByText("Alta aguardando confirmação do supervisor"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirmar alta" })).toBeNull();
    expect(screen.queryByText(/Objetivos/)).toBeNull();
  });

  it("o caso encerrado mostra a alta e a vaga liberada, e a coordenação reabre com quem pediu e o motivo", async () => {
    const confirmada = registro({
      confirmadaPor: "Ricardo Menezes",
      confirmadaEm: "2026-12-01T20:02:00Z",
    });
    const chamadas = simular(
      situacao({
        situacao: "encerrado_por_alta",
        historico: [confirmada],
        acoes: {
          pedir: false,
          confirmar: false,
          cancelar: false,
          recusar: false,
          reabrir: true,
        },
        pedidoPorOpcoes: [
          {
            id: "00000000-0000-4000-8000-00000000000a",
            nome: "Ana Beatriz Costa",
            papel: "estagiario",
          },
          {
            id: "00000000-0000-4000-8000-00000000000b",
            nome: "Ricardo Menezes",
            papel: "supervisor",
          },
        ],
      }),
      {
        situacao: "em_atendimento",
        estagiario: "Ana Beatriz Costa",
        supervisor: "Ricardo Menezes",
      },
    );
    abrir();
    expect(
      await screen.findByText("Encerrado por alta em 01/12/2026"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Alta confirmada por Ricardo Menezes"),
    ).toBeInTheDocument();
    expect(screen.getByText("Vaga liberada")).toBeInTheDocument();
    // O agendamento fica indisponível, com o motivo ligado ao botão.
    expect(
      screen.getByRole("button", { name: "Agendar sessão" }),
    ).toHaveAttribute("aria-disabled", "true");
    expect(
      screen.getByRole("button", { name: "Agendar sessão" }),
    ).toHaveAccessibleDescription(
      "Caso encerrado por alta. Para um novo agendamento, a coordenação precisa reabrir o caso.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Reabrir caso" }));
    fireEvent.change(screen.getByLabelText("Pedido por"), {
      target: { value: "00000000-0000-4000-8000-00000000000b" },
    });
    fireEvent.change(screen.getByLabelText("Motivo da reabertura"), {
      target: { value: "A paciente pediu para retomar." },
    });
    fireEvent.click(
      screen.getAllByRole("button", { name: "Reabrir caso" }).at(-1)!,
    );
    expect(
      await screen.findByText(
        /Caso reaberto. Mariana Alves Toledo volta ao atendimento com Ana Beatriz Costa/,
      ),
    ).toBeInTheDocument();
    expect(chamadas.find((c) => c.metodo === "POST")).toEqual({
      metodo: "POST",
      caminho: "/casos/c1/reabertura",
      corpo: {
        pedidaPor: "00000000-0000-4000-8000-00000000000b",
        motivo: "A paciente pediu para retomar.",
      },
    });
  });

  it("a alta de semestre anterior mostra o motivo, sem o botão de reabrir", async () => {
    simular(
      situacao({
        situacao: "encerrado_por_alta",
        historico: [
          registro({
            dataAlta: "2026-03-10",
            confirmadaPor: "Ricardo Menezes",
            confirmadaEm: "2026-03-10T20:02:00Z",
          }),
        ],
        bloqueioReabertura:
          "Este caso foi encerrado por alta no semestre 2026/1 e não pode ser reaberto. Para voltar ao atendimento, o paciente precisa fazer uma nova inscrição.",
      }),
    );
    abrir();
    expect(
      await screen.findByText(/no semestre 2026\/1 e não pode ser reaberto/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reabrir caso" })).toBeNull();
  });

  it("sem acesso ao caso, ou sem nada da alta para mostrar, a seção não aparece", async () => {
    simular([403, { message: "Você não tem acesso a este caso." }]);
    abrir();
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole("heading", { name: "Alta" })).toBeNull();
    cleanup();
    simular(situacao());
    abrir();
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole("heading", { name: "Alta" })).toBeNull();
  });

  it("a data da alta não pode ser anterior à primeira data aceita pela API", async () => {
    const chamadas = simular(
      situacao({
        acoes: {
          pedir: true,
          confirmar: false,
          cancelar: false,
          recusar: false,
          reabrir: false,
        },
        dataMinimaAlta: "2026-11-20",
      }),
    );
    abrir();
    fireEvent.click(
      await screen.findByRole("button", { name: "Registrar alta" }),
    );
    const data = screen.getByLabelText("Data da alta");
    expect(data).toHaveAttribute("min", "2026-11-20");
    expect(data).toHaveAccessibleDescription("A partir de 20/11/2026.");
    fireEvent.change(data, { target: { value: "2026-11-10" } });
    fireEvent.change(screen.getByLabelText("Motivo da alta"), {
      target: { value: "Objetivos alcançados." },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Enviar para confirmação" }),
    );
    expect(
      await screen.findByText(
        "A data da alta não pode ser anterior a 20/11/2026.",
      ),
    ).toBeInTheDocument();
    expect(chamadas.filter((c) => c.metodo === "POST")).toHaveLength(0);
  });

  it("o estagiário cancela o próprio pedido, com o motivo", async () => {
    const chamadas = simular(
      situacao({
        pedidoAberto: registro(),
        acoes: {
          pedir: false,
          confirmar: false,
          cancelar: true,
          recusar: false,
          reabrir: false,
        },
      }),
      { forma: "cancelado_pelo_estagiario" },
    );
    abrir();
    fireEvent.click(
      await screen.findByRole("button", { name: "Cancelar pedido de alta" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancelar pedido" }));
    expect(
      await screen.findByText("Informe o motivo do cancelamento."),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Motivo do cancelamento"), {
      target: { value: "Data da alta errada." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancelar pedido" }));
    expect(
      await screen.findByText(/Pedido de alta cancelado/),
    ).toBeInTheDocument();
    expect(chamadas.find((c) => c.metodo === "POST")).toEqual({
      metodo: "POST",
      caminho: "/casos/c1/alta/cancelamento",
      corpo: { motivo: "Data da alta errada." },
    });
  });

  it("o supervisor recusa a alta, com o motivo", async () => {
    const chamadas = simular(
      situacao({
        pedidoAberto: registro(),
        acoes: {
          pedir: false,
          confirmar: true,
          cancelar: false,
          recusar: true,
          reabrir: false,
        },
      }),
      { forma: "recusado_pelo_supervisor" },
    );
    abrir();
    fireEvent.click(
      await screen.findByRole("button", { name: "Recusar alta" }),
    );
    fireEvent.change(screen.getByLabelText("Motivo da recusa"), {
      target: { value: "Ainda há sessões combinadas." },
    });
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Recusar alta",
      }),
    );
    expect(await screen.findByText(/Alta recusada/)).toBeInTheDocument();
    expect(chamadas.find((c) => c.metodo === "POST")).toEqual({
      metodo: "POST",
      caminho: "/casos/c1/alta/recusa",
      corpo: { motivo: "Ainda há sessões combinadas." },
    });
  });

  it("os pedidos não confirmados ficam no histórico, com quem os fechou e o motivo", async () => {
    simular(
      situacao({
        acoes: {
          pedir: true,
          confirmar: false,
          cancelar: false,
          recusar: false,
          reabrir: false,
        },
        cancelados: [
          registro({
            cancelamento: {
              forma: "recusado_pelo_supervisor",
              por: "Ricardo Menezes",
              em: "2026-12-01T20:02:00Z",
              motivo: "Ainda há sessões combinadas.",
            },
          }),
        ],
      }),
    );
    abrir();
    expect(
      await screen.findByText(
        /Pedido recusado pelo supervisor \(Ricardo Menezes, 01\/12\/2026, às 17:02\): alta de 01\/12\/2026, pedida por Ana Beatriz Costa. Motivo: Ainda há sessões combinadas\./,
      ),
    ).toBeInTheDocument();
  });
});
