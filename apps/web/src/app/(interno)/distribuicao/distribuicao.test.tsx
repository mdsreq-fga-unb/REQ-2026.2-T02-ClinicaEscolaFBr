import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import DistribuicaoPage from "./page";

const CASOS = [
  {
    casoId: "c1",
    numero: "2026-00438",
    nome: "Fernanda Lopes Brandão",
    prioridade: "vermelha",
    dataInscricao: "2026-10-06T15:00:00.000Z",
  },
  {
    casoId: "c2",
    numero: "2026-00460",
    nome: "Lucas Pereira Nunes",
    prioridade: "amarela",
    dataInscricao: "2026-10-15T15:00:00.000Z",
  },
];
const SUPERVISORES = [
  {
    id: "s1",
    nome: "Carla Mendes Souza",
    casosAtivos: 12,
    limite: 50,
    noLimite: false,
  },
  {
    id: "s2",
    nome: "Paulo Sérgio Nogueira",
    casosAtivos: 50,
    limite: 50,
    noLimite: true,
  },
];

type Resposta = { status: number; corpo: unknown };

function simularApi({
  perfil = "coordenacao",
  casos = CASOS as unknown,
  supervisores = SUPERVISORES as unknown,
  distribuicao = {
    status: 201,
    corpo: {
      casoId: "c2",
      numero: "2026-00460",
      paciente: "Lucas Pereira Nunes",
      supervisor: "Carla Mendes Souza",
    },
  } as Resposta,
} = {}) {
  const chamadas: { url: string; metodo: string; corpo: unknown }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const metodo = init?.method ?? "GET";
      chamadas.push({
        url,
        metodo,
        corpo: init?.body ? JSON.parse(init.body as string) : null,
      });
      let resposta: Resposta = { status: 404, corpo: {} };
      if (url.endsWith("/auth/sessao")) {
        resposta = { status: 200, corpo: { id: "u1", nome: "Helena", perfil } };
      } else if (url.endsWith("/casos/aguardando-distribuicao")) {
        resposta = { status: 200, corpo: casos };
      } else if (url.endsWith("/supervisores/disponibilidade")) {
        resposta = { status: 200, corpo: supervisores };
      } else if (url.endsWith("/supervisor") && metodo === "POST") {
        resposta = distribuicao;
      }
      return new Response(JSON.stringify(resposta.corpo), {
        status: resposta.status,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
  return chamadas;
}

function abrirTela() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <DistribuicaoPage />
    </QueryClientProvider>,
  );
}

describe("Distribuição de casos (RF18 e RF20)", () => {
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

  it("lista os casos com número, nome, prioridade e data, sem a queixa (RF18, RNF17)", async () => {
    simularApi();
    abrirTela();
    expect(
      (await screen.findAllByText("Fernanda Lopes Brandão")).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("Vermelha").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2026-00460").length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toMatch(/queixa/i);
  });

  it("distribui o caso ao supervisor escolhido e confirma (RF20)", async () => {
    const chamadas = simularApi();
    abrirTela();
    const [botao] = await screen.findAllByRole("button", {
      name: /Distribuir Lucas Pereira Nunes/,
    });
    fireEvent.click(botao);
    fireEvent.click(await screen.findByLabelText(/Carla Mendes Souza/));
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmar distribuição" }),
    );
    expect(await screen.findByText("Caso distribuído.")).toBeTruthy();
    expect(chamadas.find((c) => c.metodo === "POST")).toMatchObject({
      url: expect.stringContaining("/casos/c2/supervisor"),
      corpo: { supervisorId: "s1" },
    });
  });

  it("supervisor no limite não pode ser escolhido, e o motivo aparece (RF20)", async () => {
    simularApi();
    abrirTela();
    const [botao] = await screen.findAllByRole("button", {
      name: /Distribuir Lucas/,
    });
    fireEvent.click(botao);
    const paulo = (await screen.findByLabelText(
      /Paulo Sérgio Nogueira/,
    )) as HTMLInputElement;
    expect(paulo.disabled).toBe(true);
    expect(screen.getByText("Limite de 50 casos atingido")).toBeTruthy();
    expect(screen.getByText("50 de 50")).toBeTruthy();
    expect(screen.getByText("12 de 50")).toBeTruthy();
  });

  it("com todos os supervisores no limite, avisa e não deixa confirmar (RF20)", async () => {
    simularApi({
      supervisores: SUPERVISORES.map((s) => ({
        ...s,
        casosAtivos: 50,
        noLimite: true,
      })),
    });
    abrirTela();
    const [botao] = await screen.findAllByRole("button", {
      name: /Distribuir Lucas/,
    });
    fireEvent.click(botao);
    expect(
      await screen.findByText(
        "Todos os supervisores estão no limite de casos.",
      ),
    ).toBeTruthy();
    expect(
      (
        screen.getByRole("button", {
          name: "Confirmar distribuição",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it("caso que já tem supervisor: mostra quem é e orienta a transferência (RF20)", async () => {
    simularApi({
      distribuicao: {
        status: 409,
        corpo: {
          message: "Este caso já tem supervisor: Ricardo Menezes.",
          supervisor: "Ricardo Menezes",
          desde: "2026-10-18T15:00:00.000Z",
        },
      },
    });
    abrirTela();
    const [botao] = await screen.findAllByRole("button", {
      name: /Distribuir Lucas/,
    });
    fireEvent.click(botao);
    fireEvent.click(await screen.findByLabelText(/Carla Mendes Souza/));
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmar distribuição" }),
    );
    expect(
      await screen.findByText("Este caso já tem supervisor: Ricardo Menezes."),
    ).toBeTruthy();
    expect(screen.getByText(/use a transferência de caso/)).toBeTruthy();
  });

  it("o supervisor só consulta: sem o botão de distribuir (RF18, RNF16)", async () => {
    simularApi({ perfil: "supervisor" });
    abrirTela();
    expect(await screen.findByText("Somente consulta.")).toBeTruthy();
    await screen.findAllByText("Fernanda Lopes Brandão");
    expect(screen.queryByRole("button", { name: /Distribuir/ })).toBeNull();
  });

  it("secretaria e estagiário não acessam a tela (RF18, RNF16)", async () => {
    for (const perfil of ["secretaria", "estagiario"]) {
      const chamadas = simularApi({ perfil });
      abrirTela();
      expect(
        await screen.findByText(
          "Acesso restrito à coordenação e aos supervisores.",
        ),
      ).toBeTruthy();
      expect(chamadas.some((c) => c.url.includes("/casos/"))).toBe(false);
      cleanup();
    }
  });

  it("sem casos pendentes, informa que não há casos aguardando distribuição (RF18)", async () => {
    simularApi({ casos: [] });
    abrirTela();
    await waitFor(() =>
      expect(
        screen.getByText("Não há casos aguardando distribuição."),
      ).toBeTruthy(),
    );
  });
});
