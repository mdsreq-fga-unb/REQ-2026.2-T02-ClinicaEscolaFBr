import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { Perfil, SinalizacaoReprovacao } from "@clinica/shared";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { SinalizacoesDeReprovacao } from "./sinalizacoes";

const sessao = vi.hoisted(() => ({ perfil: "coordenacao" as Perfil }));
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

const JUSTIFICATIVA =
  "Faltas sem justificativa acadêmica, conforme o regulamento do estágio.";

// A massa da prancha 7-3.
const ABERTA: SinalizacaoReprovacao = {
  id: "s1",
  estagiario: { id: "e1", nome: "Lucas Ferreira" },
  semestre: "2026/2",
  geradaEm: "2026-11-12T11:00:00.000Z",
  encerradaEm: null,
  motivoEncerramento: null,
  faltaReclassificada: null,
  faltas: 3,
  faltasDeOutrosSupervisores: 0,
  sessoes: [
    "2026-08-21T19:00:00.000Z",
    "2026-09-17T13:00:00.000Z",
    "2026-11-12T19:00:00.000Z",
  ],
  supervisores: ["Ricardo Menezes"],
  decisoes: [],
};
const DECIDIDA: SinalizacaoReprovacao = {
  ...ABERTA,
  id: "s2",
  estagiario: { id: "e2", nome: "Rafael Gomes" },
  encerradaEm: "2026-11-13T14:20:00.000Z",
  motivoEncerramento: "decisao",
  faltas: 2,
  decisoes: [
    {
      id: "d1",
      decisao: "confirmada",
      faltas: 3,
      justificativa: JUSTIFICATIVA,
      por: "Helena Duarte",
      em: "2026-11-13T14:20:00.000Z",
    },
    {
      id: "d2",
      decisao: "nao_aplicada",
      faltas: 2,
      justificativa:
        "A falta de 17/09 foi reclassificada: o estagiário estava em atividade da clínica, e a contagem caiu para 2.",
      por: "Helena Duarte",
      em: "2026-11-14T19:05:00.000Z",
    },
  ],
};

type Resposta = { status: number; corpo: unknown };

function simularApi(
  lista: SinalizacaoReprovacao[],
  decisao: Resposta = {
    status: 201,
    corpo: {
      id: "d9",
      decisao: "confirmada",
      faltas: 3,
      justificativa: JUSTIFICATIVA,
      por: "Helena Duarte",
      em: "2026-11-16T15:00:00.000Z",
    },
  },
) {
  const pedidos: { url: string; metodo: string; corpo?: string }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const metodo = init?.method ?? "GET";
      pedidos.push({ url, metodo, corpo: init?.body as string | undefined });
      const resposta =
        metodo === "POST"
          ? decisao
          : { status: 200, corpo: { sinalizacoes: lista } };
      return new Response(JSON.stringify(resposta.corpo), {
        status: resposta.status,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
  return pedidos;
}

const abrir = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <SinalizacoesDeReprovacao />
    </QueryClientProvider>,
  );

const abrirDialogo = async () => {
  fireEvent.click(
    (
      await screen.findAllByRole("button", {
        name: "Registrar decisão sobre a reprovação de Lucas Ferreira",
        hidden: true,
      })
    )[0],
  );
  return screen.getByRole("dialog", {
    name: "Decisão sobre a reprovação de Lucas Ferreira",
    hidden: true,
  });
};

const enviar = (dialogo: HTMLElement) =>
  fireEvent.click(
    within(dialogo).getByRole("button", {
      name: "Registrar decisão",
      hidden: true,
    }),
  );

describe("Decisão sobre a reprovação (RF64, prancha 7-3)", () => {
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
    sessao.perfil = "coordenacao";
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

  it("o diálogo mostra o resumo das faltas, as duas opções num grupo e o aviso de que a contagem não muda", async () => {
    simularApi([ABERTA]);
    abrir();

    const dialogo = await abrirDialogo();

    expect(
      within(dialogo).getByText(
        "3 faltas no semestre 2026/2: 21/08, às 16:00; 17/09, às 10:00 e 12/11/2026, às 16:00. Supervisor: Ricardo Menezes.",
      ),
    ).toBeTruthy();
    const grupo = within(dialogo).getByRole("group", {
      name: "Decisão",
      hidden: true,
    });
    expect(
      within(grupo)
        .getAllByRole("radio", { hidden: true })
        .map((r) => r.closest("label")?.textContent),
    ).toEqual(["Reprovação confirmada", "Reprovação não aplicada"]);
    expect(
      within(dialogo).getByText(
        "A decisão não muda a contagem de faltas. Os efeitos acadêmicos e a eventual desativação do acesso do estagiário (RF54) são tratados fora desta tela.",
      ),
    ).toBeTruthy();
  });

  it("sem justificativa, a decisão não é registrada, e o resumo do erro leva ao campo", async () => {
    const pedidos = simularApi([ABERTA]);
    abrir();
    const dialogo = await abrirDialogo();
    fireEvent.click(
      within(dialogo).getByRole("radio", {
        name: "Reprovação confirmada",
        hidden: true,
      }),
    );

    enviar(dialogo);

    expect(
      within(dialogo).getByText("A decisão não foi registrada."),
    ).toBeTruthy();
    expect(
      within(dialogo)
        .getByRole("link", { name: "justificativa", hidden: true })
        .getAttribute("href"),
    ).toBe("#decisao-s1-justificativa");
    const campo = within(dialogo).getByRole("textbox", {
      name: "Justificativa",
      hidden: true,
    });
    expect(campo.getAttribute("aria-invalid")).toBe("true");
    expect(
      within(dialogo).getByText("Informe a justificativa da decisão."),
    ).toBeTruthy();
    expect(pedidos.some((p) => p.metodo === "POST")).toBe(false);
  });

  it("sem escolher a decisão, o erro pede a escolha", async () => {
    simularApi([ABERTA]);
    abrir();
    const dialogo = await abrirDialogo();
    fireEvent.change(within(dialogo).getByRole("textbox", { hidden: true }), {
      target: { value: JUSTIFICATIVA },
    });

    enviar(dialogo);

    expect(within(dialogo).getByText("Escolha a decisão.")).toBeTruthy();
    expect(
      within(dialogo).getByRole("link", { name: "decisão", hidden: true }),
    ).toBeTruthy();
  });

  it("com a decisão e a justificativa, envia o pedido, avisa e consulta de novo", async () => {
    const pedidos = simularApi([ABERTA]);
    abrir();
    const dialogo = await abrirDialogo();
    fireEvent.click(
      within(dialogo).getByRole("radio", {
        name: "Reprovação confirmada",
        hidden: true,
      }),
    );
    fireEvent.change(within(dialogo).getByRole("textbox", { hidden: true }), {
      target: { value: JUSTIFICATIVA },
    });

    enviar(dialogo);

    expect(
      await screen.findByText(
        "Decisão registrada: reprovação confirmada para Lucas Ferreira.",
      ),
    ).toBeTruthy();
    const post = pedidos.find((p) => p.metodo === "POST")!;
    expect(post.url).toContain("/sinalizacoes-reprovacao/s1/decisoes");
    expect(JSON.parse(post.corpo!)).toEqual({
      decisao: "confirmada",
      justificativa: JUSTIFICATIVA,
    });
    await waitFor(() =>
      expect(pedidos.filter((p) => p.metodo === "GET").length).toBeGreaterThan(
        1,
      ),
    );
  });

  it("a recusa da API aparece no diálogo", async () => {
    simularApi([ABERTA], {
      status: 409,
      corpo: {
        message:
          "Esta sinalização foi encerrada sem decisão, porque a contagem ficou abaixo do limite.",
      },
    });
    abrir();
    const dialogo = await abrirDialogo();
    fireEvent.click(
      within(dialogo).getByRole("radio", {
        name: "Reprovação não aplicada",
        hidden: true,
      }),
    );
    fireEvent.change(within(dialogo).getByRole("textbox", { hidden: true }), {
      target: { value: JUSTIFICATIVA },
    });

    enviar(dialogo);

    expect(
      await within(dialogo).findByText(/encerrada sem decisão/),
    ).toBeTruthy();
  });

  it("coordenação: o histórico mostra a sinalização e as decisões em ordem, com as justificativas e a contagem de cada uma; sem mudança desde a última, não oferece nova decisão", async () => {
    simularApi([DECIDIDA]);
    abrir();

    const historico = await screen.findByRole("region", { name: "Histórico" });
    expect(
      within(historico).getByRole("heading", {
        name: "Histórico de Rafael Gomes · 2026/2",
      }),
    ).toBeTruthy();
    expect(within(historico).getByText(JUSTIFICATIVA)).toBeTruthy();
    expect(
      within(historico).getByText(
        "Registrada por Helena Duarte em 13/11/2026, às 11:20, com 3 faltas.",
      ),
    ).toBeTruthy();
    expect(
      within(historico).getByText(
        "Registrada por Helena Duarte em 14/11/2026, às 16:05, com 2 faltas. A decisão anterior continua no histórico.",
      ),
    ).toBeTruthy();
    expect(
      within(historico).getByText(
        "Uma nova decisão pode ser registrada se a contagem mudar.",
      ),
    ).toBeTruthy();
    expect(
      within(historico).queryByRole("button", {
        name: /Registrar nova decisão/,
      }),
    ).toBeNull();
  });

  it("coordenação: com a contagem diferente da última decisão, oferece registrar nova decisão", async () => {
    simularApi([{ ...DECIDIDA, decisoes: DECIDIDA.decisoes.slice(0, 1) }]);
    abrir();

    const historico = await screen.findByRole("region", { name: "Histórico" });
    expect(
      within(historico).getByText(
        "A contagem mudou desde a última decisão. A decisão registrada continua valendo; se for o caso, registre uma nova decisão.",
      ),
    ).toBeTruthy();
    expect(
      within(historico).getByRole("button", {
        name: "Registrar nova decisão sobre a reprovação de Rafael Gomes",
      }),
    ).toBeTruthy();
  });

  it("supervisor: vê a decisão, quem registrou e quando, sem a justificativa e sem os botões", async () => {
    sessao.perfil = "supervisor";
    simularApi([
      ABERTA,
      {
        ...DECIDIDA,
        decisoes: DECIDIDA.decisoes.map((d) => ({ ...d, justificativa: null })),
      },
    ]);
    abrir();

    const historico = await screen.findByRole("region", { name: "Histórico" });
    expect(within(historico).getByText("Reprovação confirmada")).toBeTruthy();
    expect(within(historico).queryByText(JUSTIFICATIVA)).toBeNull();
    expect(
      within(historico).getByText(
        "O registro da decisão é exclusivo da coordenação.",
      ),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: /Registrar/, hidden: true }),
    ).toBeNull();
  });
});
