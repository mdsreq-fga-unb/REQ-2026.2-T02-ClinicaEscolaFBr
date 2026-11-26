import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import type {
  EstagiarioComFaltas,
  FaltasDoEstagiario,
  Perfil,
} from "@clinica/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MENU_POR_PERFIL } from "@/components/layout/menu";
import { FaltasDosEstagiarios } from "./faltas-dos-estagiarios";

const sessao = vi.hoisted(() => ({ perfil: "supervisor" as Perfil }));
vi.mock("@/lib/sessao", () => ({
  useSessao: () => ({ data: { id: "teste", perfil: sessao.perfil } }),
}));
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...resto
  }: {
    href: string;
    children: unknown;
  }) => (
    <a href={href} {...resto}>
      {children as never}
    </a>
  ),
}));

const ESTAGIARIOS: EstagiarioComFaltas[] = [
  { id: "6f1d2a3b-0000-4000-8000-000000000001", nome: "Ana Beatriz Costa" },
  { id: "6f1d2a3b-0000-4000-8000-000000000002", nome: "Lucas Ferreira" },
];

// A massa da prancha 7-1.
const TRES: FaltasDoEstagiario = {
  inicio: "2026-07-01",
  fim: "2026-11-16",
  faltas: [
    {
      id: "f1",
      estagiario: ESTAGIARIOS[0],
      inicio: "2026-10-29T17:00:00.000Z",
      registradaEm: "2026-10-28T12:12:00.000Z",
      reclassificada: null,
    },
    {
      id: "f2",
      estagiario: ESTAGIARIOS[0],
      inicio: "2026-09-10T13:00:00.000Z",
      registradaEm: "2026-09-09T21:40:00.000Z",
      reclassificada: null,
    },
    {
      id: "f3",
      estagiario: ESTAGIARIOS[1],
      inicio: "2026-08-21T19:00:00.000Z",
      registradaEm: "2026-08-21T11:05:00.000Z",
      reclassificada: null,
    },
  ],
};

type Resposta = { status: number; corpo: unknown };

function simularApi(faltas: Resposta[]) {
  const consultas: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      let resposta: Resposta | undefined;
      if (url.endsWith("/faltas-estagiarios/estagiarios")) {
        resposta = { status: 200, corpo: ESTAGIARIOS };
      } else {
        consultas.push(url);
        resposta = faltas.length > 1 ? faltas.shift() : faltas[0];
      }
      return new Response(JSON.stringify(resposta?.corpo), {
        status: resposta?.status ?? 500,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
  return consultas;
}

const ok = (corpo: FaltasDoEstagiario): Resposta => ({ status: 200, corpo });

const abrir = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <FaltasDosEstagiarios />
    </QueryClientProvider>,
  );

describe("Faltas dos estagiários (RF39, prancha 7-1)", () => {
  beforeEach(() => {
    sessao.perfil = "supervisor";
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

  it("supervisor: abre com o semestre até hoje e todos os estagiários dele, e mostra a contagem e a tabela sem o paciente nem o motivo", async () => {
    const consultas = simularApi([ok(TRES)]);
    abrir();

    const resultado = await screen.findByRole("region", {
      name: "3 faltas no período",
    });
    // A contagem é anunciada pelo leitor de tela (RNF24).
    expect(
      screen
        .getByRole("heading", { name: "3 faltas no período" })
        .closest('[role="status"]'),
    ).toBeTruthy();
    expect(consultas).toHaveLength(1);
    expect(consultas[0]).toContain(
      "/faltas-estagiarios?inicio=2026-07-01&fim=2026-11-16",
    );
    expect(consultas[0]).not.toContain("estagiarioId");
    const estagiario = screen.getByLabelText("Estagiário") as HTMLSelectElement;
    expect(estagiario.value).toBe("");
    expect(
      within(estagiario)
        .getAllByRole("option")
        .map((o) => o.textContent),
    ).toEqual([
      "Todos os meus estagiários",
      "Ana Beatriz Costa",
      "Lucas Ferreira",
    ]);
    expect(
      (screen.getByLabelText("Data inicial") as HTMLInputElement).value,
    ).toBe("2026-07-01");

    const tabela = within(resultado).getByRole("table", { hidden: true });
    expect(tabela.querySelector("caption")?.textContent).toMatch(
      /ausência real do estagiário, de 01\/07\/2026 a 16\/11\/2026/,
    );
    expect(
      within(tabela)
        .getAllByRole("columnheader", { hidden: true })
        .map((c) => c.textContent),
    ).toEqual(["Estagiário", "Data da sessão", "Horário", "Registrado em"]);
    const [primeira] = within(tabela)
      .getAllByRole("row", { hidden: true })
      .slice(1);
    expect(
      within(primeira)
        .getAllByRole("cell", { hidden: true })
        .map((c) => c.textContent),
    ).toEqual([
      "Ana Beatriz Costa",
      "29/10/2026",
      "14:00",
      "28/10/2026, 09:12",
    ]);
    expect(resultado.textContent).not.toMatch(/paciente|motivo/i);
  });

  it("coordenação: escolhe o estagiário e o período, e o período sem faltas mostra as datas", async () => {
    sessao.perfil = "coordenacao";
    const consultas = simularApi([
      ok(TRES),
      ok({ inicio: "2026-08-01", fim: "2026-10-31", faltas: [] }),
    ]);
    abrir();
    await screen.findByRole("region", { name: "3 faltas no período" });
    expect(
      screen.getByRole("option", { name: "Todos os estagiários" }),
    ).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Estagiário"), {
      target: { value: ESTAGIARIOS[1].id },
    });
    fireEvent.change(screen.getByLabelText("Data inicial"), {
      target: { value: "2026-08-01" },
    });
    fireEvent.change(screen.getByLabelText("Data final"), {
      target: { value: "2026-10-31" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Consultar" }));

    expect(
      await screen.findByRole("heading", { name: "Nenhuma falta no período" }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Não há sessões canceladas por ausência real do estagiário entre 01/08/2026 e 31/10/2026.",
      ),
    ).toBeTruthy();
    expect(consultas[1]).toContain(
      `/faltas-estagiarios?estagiarioId=${ESTAGIARIOS[1].id}&inicio=2026-08-01&fim=2026-10-31`,
    );
  });

  it("consultar de novo com os mesmos filtros busca as faltas outra vez", async () => {
    const quatro: FaltasDoEstagiario = {
      ...TRES,
      faltas: [
        {
          id: "f4",
          estagiario: ESTAGIARIOS[1],
          inicio: "2026-11-13T17:00:00.000Z",
          registradaEm: "2026-11-12T12:00:00.000Z",
          reclassificada: null,
        },
        ...TRES.faltas,
      ],
    };
    const consultas = simularApi([ok(TRES), ok(quatro)]);
    abrir();
    await screen.findByRole("region", { name: "3 faltas no período" });

    fireEvent.click(screen.getByRole("button", { name: "Consultar" }));

    expect(
      await screen.findByRole("region", { name: "4 faltas no período" }),
    ).toBeTruthy();
    expect(consultas).toHaveLength(2);
    expect(consultas[1]).toBe(consultas[0]);
  });

  it("período inválido: indica o campo e não consulta", async () => {
    const consultas = simularApi([ok(TRES)]);
    abrir();
    await screen.findByRole("region", { name: "3 faltas no período" });

    fireEvent.change(screen.getByLabelText("Data inicial"), {
      target: { value: "2026-11-20" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Consultar" }));

    expect(
      await screen.findByText(
        "A data inicial não pode ser posterior à data final.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText("Não foi possível consultar este período."),
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Data inicial").getAttribute("aria-invalid"),
    ).toBe("true");
    expect(consultas).toHaveLength(1);
  });

  it("falha na consulta: avisa e oferece tentar de novo", async () => {
    simularApi([{ status: 500, corpo: {} }]);
    abrir();

    expect(
      await screen.findByText("Não foi possível consultar as faltas."),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Tentar novamente" }),
    ).toBeTruthy();
  });

  it("acesso negado pela API (403): mostra o motivo, sem tentar de novo", async () => {
    simularApi([
      {
        status: 403,
        corpo: {
          message:
            "Você não tem acesso à relação de faltas deste estagiário. Esta consulta é do supervisor responsável pelo estagiário e da coordenação.",
        },
      },
    ]);
    abrir();

    expect(
      await screen.findByText(
        /não tem acesso à relação de faltas deste estagiário/,
      ),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Tentar novamente" }),
    ).toBeNull();
  });

  it.each(["estagiario", "secretaria"] as const)(
    "%s: vê o acesso negado e nada é consultado (RNF35)",
    (perfil) => {
      sessao.perfil = perfil;
      simularApi([ok(TRES)]);
      abrir();

      expect(
        screen.getByRole("heading", {
          name: "Você não tem acesso à relação de faltas",
        }),
      ).toBeTruthy();
      expect(
        screen.getByText(
          "Esta consulta é do supervisor responsável pelo estagiário e da coordenação.",
        ),
      ).toBeTruthy();
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it("a falta reclassificada pela coordenação (RF40) aparece riscada, com o texto, e sai da contagem", async () => {
    simularApi([
      ok({
        ...TRES,
        faltas: [
          {
            ...TRES.faltas[0],
            reclassificada: {
              por: "Helena Duarte",
              em: "2026-10-30T13:00:00.000Z",
              motivo: null,
            },
          },
          ...TRES.faltas.slice(1),
        ],
      }),
    ]);
    abrir();

    const resultado = await screen.findByRole("region", {
      name: "2 faltas no período",
    });
    const tabela = within(resultado).getByRole("table", { hidden: true });
    expect(
      within(tabela).getByText(
        "Reclassificada como cancelamento administrativo por Helena Duarte em 30/10/2026.",
      ),
    ).toBeTruthy();
    expect(within(tabela).getByText("29/10/2026").className).toContain(
      "line-through",
    );
  });

  it("o menu leva às faltas só o supervisor e a coordenação", () => {
    const comFaltas = (perfil: Perfil) =>
      MENU_POR_PERFIL[perfil].some((i) => i.href === "/faltas-estagiarios");
    expect(comFaltas("supervisor")).toBe(true);
    expect(comFaltas("coordenacao")).toBe(true);
    expect(comFaltas("estagiario")).toBe(false);
    expect(comFaltas("secretaria")).toBe(false);
  });
});
