import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type {
  AcoesDaSessaoNaAgenda,
  AgendaDoEstagiario,
  SessaoDaAgenda,
} from "@clinica/shared";
import { AgendaDeSessoes } from "./agenda-de-sessoes";

// Quarta-feira, 04/11/2026, 13:00 em Brasília: a semana vai de 02/11 a 08/11.
const AGORA = new Date("2026-11-04T16:00:00.000Z");
const ANA = "6f1d2c3b-4a5e-4f60-8b7c-9d0e1f2a3b4c";
const DO_ESTAGIARIO: AcoesDaSessaoNaAgenda = {
  pedidoPaciente: false,
  administrativo: true,
  ausenciaEstagiario: true,
  registrarFalta: true,
};
const DO_SUPERVISOR: AcoesDaSessaoNaAgenda = {
  pedidoPaciente: false,
  administrativo: false,
  ausenciaEstagiario: true,
  registrarFalta: false,
};

const sessao = (
  id: string,
  inicio: string,
  dados: Partial<SessaoDaAgenda> = {},
): SessaoDaAgenda => ({
  id,
  casoId: `caso-${id}`,
  paciente: "Beatriz Oliveira Santos",
  inicio,
  termino: new Date(Date.parse(inicio) + 50 * 60_000).toISOString(),
  status: "agendada",
  cancelamento: null,
  prontuarioId: null,
  acoes: DO_ESTAGIARIO,
  ...dados,
});

const SEMANA: SessaoDaAgenda[] = [
  sessao("s1", "2026-11-03T13:00:00.000Z", {
    paciente: "Gustavo Henrique Dias",
    status: "realizada",
    prontuarioId: "p1",
  }),
  sessao("s2", "2026-11-04T12:00:00.000Z", { status: "confirmada" }),
  sessao("s3", "2026-11-05T17:00:00.000Z", {
    paciente: "Mariana Alves Toledo",
    status: "confirmada",
  }),
  sessao("s4", "2026-11-05T18:00:00.000Z"),
];

const agenda = (
  sessoes: SessaoDaAgenda[],
  de = "2026-11-02",
  ate = "2026-11-08",
): AgendaDoEstagiario => ({
  estagiario: { id: "e1", nome: "Ana Beatriz Costa" },
  de,
  ate,
  antecedenciaMinimaMinutos: 60,
  sessoes,
});

// Responde a agenda pedida, com as datas da própria consulta.
function simularApi(
  resposta: (url: URL) => { status: number; corpo: unknown },
) {
  const consultas: URL[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (endereco: string) => {
      const url = new URL(endereco, "http://localhost");
      if (url.pathname.endsWith("/agenda")) consultas.push(url);
      const { status, corpo } = url.pathname.endsWith("/auth/sessao")
        ? {
            status: 200,
            corpo: { id: "e1", nome: "Ana", perfil: "estagiario" },
          }
        : resposta(url);
      return new Response(JSON.stringify(corpo), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
  return consultas;
}
const comAgenda = (sessoes: SessaoDaAgenda[]) => (url: URL) => ({
  status: 200,
  corpo: agenda(
    sessoes,
    url.searchParams.get("de")!,
    url.searchParams.get("ate")!,
  ),
});

const abrir = (estagiarioId?: string, titulo?: string) =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <AgendaDeSessoes estagiarioId={estagiarioId} titulo={titulo} />
    </QueryClientProvider>,
  );
const tabela = () => screen.getByRole("table");

describe("Agenda de sessões do estagiário (RF11)", () => {
  beforeAll(() => {
    HTMLDialogElement.prototype.showModal = function () {
      this.open = true;
    };
    HTMLDialogElement.prototype.close = function () {
      this.open = false;
    };
  });
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(AGORA);
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("abre na semana, com as situações padrão, os dias úteis e as sessões de cada dia", async () => {
    const consultas = simularApi(comAgenda(SEMANA));
    abrir();

    expect(await screen.findByText("4 sessões")).toBeTruthy();
    expect(screen.getByText("02/11/2026 a 08/11/2026")).toBeTruthy();
    expect(consultas[0].searchParams.get("de")).toBe("2026-11-02");
    expect(consultas[0].searchParams.get("ate")).toBe("2026-11-08");
    expect(consultas[0].searchParams.get("status")).toBe(
      "agendada,confirmada,realizada",
    );
    expect(consultas[0].searchParams.has("estagiarioId")).toBe(false);

    const linhas = within(tabela()).getAllByRole("row");
    expect(
      linhas.map((l) => l.textContent?.replace(/\s+/g, " ").trim()),
    ).toEqual([
      "HorárioPacienteSituaçãoAção",
      "Segunda-feira, 02/11/2026",
      "Nenhuma sessão neste dia.",
      "Terça-feira, 03/11/2026",
      "10:00 às 10:50Gustavo Henrique DiasRealizadaAbrir prontuário",
      "Quarta-feira, 04/11/2026Hoje",
      "09:00 às 09:50Beatriz Oliveira SantosConfirmadaHorário já passouRegistrar falta do paciente",
      "Quinta-feira, 05/11/2026",
      "14:00 às 14:50Mariana Alves ToledoConfirmadaCancelar sessão",
      "15:00 às 15:50Beatriz Oliveira SantosAgendadaCancelar sessão",
      "Sexta-feira, 06/11/2026",
      "Nenhuma sessão neste dia.",
    ]);
  });

  it("cada linha leva à ação certa: prontuário, falta e cancelamento", async () => {
    simularApi(comAgenda(SEMANA));
    abrir();
    await screen.findByText("4 sessões");

    expect(
      within(tabela())
        .getByRole("link", {
          name: "Abrir prontuário de Gustavo Henrique Dias",
        })
        .getAttribute("href"),
    ).toBe("/prontuarios/p1");

    fireEvent.click(
      within(tabela()).getByRole("button", {
        name: "Cancelar sessão: Mariana Alves Toledo, 14:00",
      }),
    );
    const dialogo = screen.getByRole("dialog");
    expect(within(dialogo).getByText("Mariana Alves Toledo")).toBeTruthy();
    expect(within(dialogo).getByText("Ana Beatriz Costa")).toBeTruthy();
    fireEvent.click(within(dialogo).getByRole("button", { name: "Voltar" }));

    fireEvent.click(
      within(tabela()).getByRole("button", {
        name: "Registrar falta do paciente Beatriz Oliveira Santos",
      }),
    );
    expect(
      within(screen.getByRole("dialog")).getByText(
        "Registrar falta do paciente",
        { selector: "h2" },
      ),
    ).toBeTruthy();
  });

  it("para o supervisor, a ação da sessão futura é registrar a ausência do estagiário (RF16)", async () => {
    const consultas = simularApi(
      comAgenda([
        sessao("s4", "2026-11-05T18:00:00.000Z", { acoes: DO_SUPERVISOR }),
      ]),
    );
    abrir(ANA, "Agenda de Ana Beatriz Costa");

    expect(
      await screen.findByRole("heading", {
        name: "Agenda de Ana Beatriz Costa",
      }),
    ).toBeTruthy();
    expect(consultas[0].searchParams.get("estagiarioId")).toBe(ANA);
    expect(
      within(await screen.findByRole("table")).getByRole("button", {
        name: /Registrar ausência do estagiário/,
      }),
    ).toBeTruthy();
    expect(
      within(tabela()).queryByRole("button", { name: /Cancelar/ }),
    ).toBeNull();
  });

  it("os filtros mudam a consulta: hoje, este mês e as canceladas", async () => {
    const consultas = simularApi(comAgenda([]));
    abrir();
    await screen.findByText("0 sessões");

    fireEvent.click(screen.getByLabelText("Hoje"));
    await waitFor(() => expect(consultas).toHaveLength(2));
    expect(consultas[1].searchParams.get("de")).toBe("2026-11-04");
    expect(consultas[1].searchParams.get("ate")).toBe("2026-11-04");

    fireEvent.click(screen.getByLabelText("Este mês"));
    await waitFor(() => expect(consultas).toHaveLength(3));
    expect(consultas[2].searchParams.get("de")).toBe("2026-11-01");
    expect(consultas[2].searchParams.get("ate")).toBe("2026-11-30");

    fireEvent.click(screen.getByLabelText("Cancelada"));
    await waitFor(() => expect(consultas).toHaveLength(4));
    expect(consultas[3].searchParams.get("status")).toBe(
      "agendada,confirmada,realizada,cancelada",
    );
  });

  it("período sem sessões: mostra o estado vazio", async () => {
    simularApi(comAgenda([]));
    abrir();

    expect(
      await screen.findByText("Nenhuma sessão neste período."),
    ).toBeTruthy();
    expect(
      screen.getByText("Escolha outro período ou marque outras situações."),
    ).toBeTruthy();
  });

  it("sem nenhuma situação marcada, não consulta e pede uma", async () => {
    const consultas = simularApi(comAgenda([]));
    abrir();
    await screen.findByText("0 sessões");

    fireEvent.click(screen.getByLabelText("Agendada"));
    fireEvent.click(screen.getByLabelText("Confirmada"));
    await waitFor(() =>
      expect(consultas.at(-1)?.searchParams.get("status")).toBe("realizada"),
    );
    const antes = consultas.length;
    fireEvent.click(screen.getByLabelText("Realizada"));

    expect(screen.getByText("Marque ao menos uma situação.")).toBeTruthy();
    expect(consultas).toHaveLength(antes);
  });

  it("outro período com a data final antes da inicial: indica o erro e não consulta", async () => {
    const consultas = simularApi(comAgenda([]));
    abrir();
    await screen.findByText("0 sessões");

    fireEvent.click(screen.getByLabelText("Outro período"));
    fireEvent.change(screen.getByLabelText("Até"), {
      target: { value: "2026-11-01" },
    });

    expect(
      screen.getByText("A data final precisa ser igual ou depois da inicial."),
    ).toBeTruthy();
    expect(consultas).toHaveLength(1);
  });

  it("agenda de um estagiário que não é do supervisor: acesso negado, sem nenhuma sessão", async () => {
    simularApi(() => ({
      status: 403,
      corpo: { message: "Você não tem acesso à agenda deste estagiário." },
    }));
    abrir("0b5c1a52-6c1e-4d0f-9a43-1d6f2b7c8e90");

    expect(
      await screen.findByRole("heading", {
        name: "Você não tem acesso à agenda deste estagiário.",
      }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Voltar para a agenda" })
        .getAttribute("href"),
    ).toBe("/agenda");
    expect(screen.queryByRole("table")).toBeNull();
  });
});
