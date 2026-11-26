import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type {
  EstagiarioComFaltas,
  FaltasNoSemestre as Resposta,
} from "@clinica/shared";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { FaltasNoSemestre } from "./faltas-no-semestre";

const ESTAGIARIOS: EstagiarioComFaltas[] = [
  { id: "6f1d2a3b-0000-4000-8000-000000000001", nome: "Ana Beatriz Costa" },
  { id: "6f1d2a3b-0000-4000-8000-000000000002", nome: "Lucas Ferreira" },
  { id: "6f1d2a3b-0000-4000-8000-000000000003", nome: "Bruna Martins" },
];

// A massa da prancha 7-1: Lucas no limite, Ana com 2 faltas e uma reclassificada,
// Bruna sem faltas.
const SEMESTRE: Resposta = {
  semestre: "2026/2",
  semestres: ["2026/2", "2026/1"],
  estagiarios: [
    {
      estagiario: ESTAGIARIOS[1],
      faltas: 3,
      faltasDeOutrosSupervisores: 0,
      linhas: [],
    },
    {
      estagiario: ESTAGIARIOS[0],
      faltas: 2,
      faltasDeOutrosSupervisores: 0,
      linhas: [
        {
          id: "c1",
          inicio: "2026-10-29T17:00:00.000Z",
          registradaEm: "2026-10-28T12:12:00.000Z",
          reclassificada: null,
        },
        {
          id: "c2",
          inicio: "2026-09-10T13:00:00.000Z",
          registradaEm: "2026-09-09T21:40:00.000Z",
          reclassificada: null,
        },
        {
          id: "c3",
          inicio: "2026-09-03T19:00:00.000Z",
          registradaEm: "2026-09-02T12:00:00.000Z",
          reclassificada: {
            por: "Helena Duarte",
            em: "2026-09-05T13:00:00.000Z",
            motivo: "O estagiário estava em atividade da clínica.",
          },
        },
      ],
    },
    {
      estagiario: ESTAGIARIOS[2],
      faltas: 0,
      faltasDeOutrosSupervisores: 0,
      linhas: [],
    },
  ],
};

type Resposta_ = { status: number; corpo: unknown };

function simularApi(
  consultas: Resposta_[],
  reclassificacao: Resposta_ = {
    status: 200,
    corpo: { estagiarioId: ESTAGIARIOS[0].id, semestre: "2026/2", faltas: 1 },
  },
) {
  const pedidos: { url: string; corpo?: string }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      let resposta: Resposta_ | undefined;
      if (url.endsWith("/faltas-estagiarios/estagiarios")) {
        resposta = { status: 200, corpo: ESTAGIARIOS };
      } else if (url.includes("/reclassificacao")) {
        pedidos.push({ url, corpo: init?.body as string });
        resposta = reclassificacao;
      } else {
        pedidos.push({ url });
        resposta = consultas.length > 1 ? consultas.shift() : consultas[0];
      }
      return new Response(JSON.stringify(resposta?.corpo), {
        status: resposta?.status ?? 500,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
  return pedidos;
}

const ok = (corpo: Resposta): Resposta_ => ({ status: 200, corpo });

const abrir = (coordenacao: boolean) =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <FaltasNoSemestre coordenacao={coordenacao} />
    </QueryClientProvider>,
  );

const abrirAna = async () => {
  fireEvent.click(
    (await screen.findAllByRole("button", { name: "Ana Beatriz Costa" }))[0],
  );
  return screen.getByRole("region", {
    name: "Ana Beatriz Costa · 2 faltas em 2026/2",
  });
};

describe("Faltas no semestre (RF40, prancha 7-1)", () => {
  // O jsdom não abre o <dialog> nativo.
  beforeAll(() => {
    HTMLDialogElement.prototype.showModal = function () {
      this.open = true;
    };
    HTMLDialogElement.prototype.close = function () {
      this.open = false;
    };
  });
  beforeEach(() => {
    // Só a data é simulada: 16/11/2026, no 2º semestre.
    vi.useFakeTimers({
      toFake: ["Date"],
      now: new Date("2026-11-16T15:00:00Z"),
    });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("abre no semestre vigente e mostra a contagem de cada estagiário, com a situação em texto", async () => {
    const pedidos = simularApi([ok(SEMESTRE)]);
    abrir(false);

    const tabela = await screen.findByRole("table", {
      name: "Faltas de cada estagiário em 2026/2",
      hidden: true,
    });
    const linhas = within(tabela).getAllByRole("row", { hidden: true });
    expect(linhas.map((l) => l.textContent)).toEqual([
      "EstagiárioFaltas em 2026/2Situação",
      "Lucas Ferreira3Limite atingido",
      "Ana Beatriz Costa22 de 3",
      "Bruna Martins0—",
    ]);
    expect(pedidos[0].url).toContain(
      "/faltas-estagiarios/semestre?semestre=2026%2F2",
    );
    expect(
      screen.getByRole("option", { name: "2026/1 (janeiro a junho)" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("option", { name: "Todos os meus estagiários" }),
    ).toBeTruthy();
  });

  it("coordenação: ao abrir um estagiário, vê as faltas, a reclassificada riscada com o motivo e o botão Reclassificar", async () => {
    simularApi([ok(SEMESTRE)]);
    abrir(true);

    const detalhe = await abrirAna();
    const tabela = within(detalhe).getByRole("table", { hidden: true });
    expect(
      within(tabela).getByText(
        "Reclassificada como cancelamento administrativo por Helena Duarte em 05/09/2026. Motivo: O estagiário estava em atividade da clínica.",
      ),
    ).toBeTruthy();
    expect(within(tabela).getByText("03/09/2026").className).toContain(
      "line-through",
    );
    expect(
      within(tabela).getAllByRole("button", {
        name: /Reclassificar a falta de/,
        hidden: true,
      }),
    ).toHaveLength(2);
  });

  it("supervisor: não vê o botão Reclassificar, e as faltas em casos de outros supervisores aparecem só como número", async () => {
    const ana = SEMESTRE.estagiarios[1];
    simularApi([
      ok({
        ...SEMESTRE,
        estagiarios: [
          {
            ...ana,
            faltas: 3,
            faltasDeOutrosSupervisores: 1,
            linhas: ana.linhas.slice(0, 2),
          },
        ],
      }),
    ]);
    abrir(false);

    fireEvent.click(
      (await screen.findAllByRole("button", { name: "Ana Beatriz Costa" }))[0],
    );
    const detalhe = screen.getByRole("region", {
      name: "Ana Beatriz Costa · 3 faltas em 2026/2",
    });
    expect(
      within(detalhe).getByText(
        "1 falta em casos de outros supervisores entra na contagem, sem a data.",
      ),
    ).toBeTruthy();
    expect(
      within(detalhe).queryByRole("button", {
        name: /Reclassificar/,
        hidden: true,
      }),
    ).toBeNull();
  });

  it("a reclassificação sem motivo mostra o erro no campo, com o foco nele, e não chama a API", async () => {
    const pedidos = simularApi([ok(SEMESTRE)]);
    abrir(true);
    const detalhe = await abrirAna();

    fireEvent.click(
      within(detalhe).getAllByRole("button", {
        name: "Reclassificar a falta de 29/10/2026, às 14:00",
        hidden: true,
      })[0],
    );
    const dialogo = screen.getByRole("dialog", {
      name: "Reclassificar a falta de 29/10/2026, às 14:00?",
      hidden: true,
    });
    expect(
      within(dialogo).getByText(
        "A ausência passa a ser um cancelamento administrativo para remarcação, e a contagem de Ana Beatriz Costa cai de 2 para 1.",
      ),
    ).toBeTruthy();
    fireEvent.click(
      within(dialogo).getByRole("button", {
        name: "Reclassificar",
        hidden: true,
      }),
    );

    const campo = within(dialogo).getByRole("textbox", {
      name: "Motivo da reclassificação",
      hidden: true,
    });
    expect(
      within(dialogo).getByText("Informe o motivo da reclassificação."),
    ).toBeTruthy();
    expect(campo.getAttribute("aria-invalid")).toBe("true");
    expect(document.activeElement).toBe(campo);
    expect(pedidos.some((p) => p.url.includes("reclassificacao"))).toBe(false);
  });

  it("a reclassificação com motivo envia o pedido, avisa a nova contagem e consulta de novo", async () => {
    const pedidos = simularApi([ok(SEMESTRE)]);
    abrir(true);
    const detalhe = await abrirAna();

    fireEvent.click(
      within(detalhe).getAllByRole("button", {
        name: "Reclassificar a falta de 29/10/2026, às 14:00",
        hidden: true,
      })[0],
    );
    const dialogo = screen.getByRole("dialog", { hidden: true });
    fireEvent.change(within(dialogo).getByRole("textbox", { hidden: true }), {
      target: { value: "Registrada por engano." },
    });
    fireEvent.click(
      within(dialogo).getByRole("button", {
        name: "Reclassificar",
        hidden: true,
      }),
    );

    expect(
      await screen.findByText(
        "Falta reclassificada. Ana Beatriz Costa tem agora 1 falta em 2026/2.",
      ),
    ).toBeTruthy();
    const pedido = pedidos.find((p) => p.url.includes("reclassificacao"))!;
    expect(pedido.url).toContain("/faltas-estagiarios/c1/reclassificacao");
    expect(JSON.parse(pedido.corpo!)).toEqual({
      motivo: "Registrada por engano.",
    });
    await waitFor(() =>
      expect(
        pedidos.filter((p) => p.url.includes("/semestre?")).length,
      ).toBeGreaterThan(1),
    );
  });

  it("a recusa da API aparece no diálogo", async () => {
    simularApi([ok(SEMESTRE)], {
      status: 409,
      corpo: {
        message:
          "Só uma ausência do estagiário ainda não reclassificada pode ser reclassificada.",
      },
    });
    abrir(true);
    const detalhe = await abrirAna();

    fireEvent.click(
      within(detalhe).getAllByRole("button", {
        name: "Reclassificar a falta de 29/10/2026, às 14:00",
        hidden: true,
      })[0],
    );
    const dialogo = screen.getByRole("dialog", { hidden: true });
    fireEvent.change(within(dialogo).getByRole("textbox", { hidden: true }), {
      target: { value: "Registrada por engano." },
    });
    fireEvent.click(
      within(dialogo).getByRole("button", {
        name: "Reclassificar",
        hidden: true,
      }),
    );

    expect(
      await within(dialogo).findByText(
        "Só uma ausência do estagiário ainda não reclassificada pode ser reclassificada.",
      ),
    ).toBeTruthy();
  });

  it("o semestre anterior mostra a contagem preservada", async () => {
    const pedidos = simularApi([
      ok(SEMESTRE),
      ok({ ...SEMESTRE, semestre: "2026/1" }),
    ]);
    abrir(false);
    await screen.findByRole("table", { hidden: true });

    fireEvent.change(screen.getByRole("combobox", { name: "Semestre" }), {
      target: { value: "2026/1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Consultar" }));

    expect(
      await screen.findByText(/Contagem do semestre 2026\/1 preservada/),
    ).toBeTruthy();
    expect(pedidos[1].url).toContain("semestre=2026%2F1");
  });

  it("o acesso negado pela API aparece sem o botão de tentar de novo", async () => {
    simularApi([
      {
        status: 403,
        corpo: {
          message:
            "Você não tem acesso à relação de faltas deste estagiário. Esta consulta é do supervisor responsável pelo estagiário e da coordenação.",
        },
      },
    ]);
    abrir(false);

    expect(
      await screen.findByText(
        /não tem acesso à relação de faltas deste estagiário/,
      ),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Tentar novamente" }),
    ).toBeNull();
  });
});
