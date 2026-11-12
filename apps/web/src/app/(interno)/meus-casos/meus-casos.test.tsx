import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import MeusCasosPage from "./page";

const CASOS = [
  {
    casoId: "c1",
    numero: "2026-00431",
    nome: "Rafael Gomes Ribeiro",
    prioridade: "amarela",
    estagiario: null,
    prontuarioId: null,
    situacao: "aguardando_vinculo",
  },
  {
    casoId: "c2",
    numero: "2026-00398",
    nome: "Mariana Alves Toledo",
    prioridade: "amarela",
    estagiario: "Ana Beatriz Costa",
    prontuarioId: "p2",
    situacao: "em_atendimento",
  },
];
const ESTAGIARIOS = [
  { id: "e1", nome: "Ana Beatriz Costa", pacientesEmAtendimento: 2 },
  { id: "e2", nome: "Larissa Fontes Melo", pacientesEmAtendimento: 0 },
];

function simularApi({
  perfil = "supervisor",
  estagiarios = ESTAGIARIOS as unknown,
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
      let corpo: unknown = {};
      let status = 404;
      if (url.endsWith("/auth/sessao")) {
        [status, corpo] = [200, { id: "u1", nome: "Carla", perfil }];
      } else if (url.endsWith("/casos/meus")) {
        [status, corpo] = [200, CASOS];
      } else if (url.endsWith("/estagiarios/disponiveis")) {
        [status, corpo] = [200, estagiarios];
      } else if (url.endsWith("/vagas/liberadas")) {
        [status, corpo] = [200, []];
      } else if (url.endsWith("/casos/c2/transferencia") && metodo === "GET") {
        [status, corpo] = [
          200,
          {
            casoId: "c2",
            numero: "2026-00398",
            paciente: "Mariana Alves Toledo",
            supervisorAtual: { id: "u1", nome: "Carla" },
            estagiarioAtual: { id: "e1", nome: "Ana Beatriz Costa" },
            estagiarios: [ESTAGIARIOS[1]],
            supervisores: [],
          },
        ];
      } else if (url.endsWith("/casos/c2/transferencia")) {
        [status, corpo] = [
          201,
          {
            casoId: "c2",
            numero: "2026-00398",
            paciente: "Mariana Alves Toledo",
            supervisor: "Carla",
            estagiario: "Larissa Fontes Melo",
            sessoesCanceladas: 0,
            sessoesAReagendar: [],
          },
        ];
      } else if (url.endsWith("/estagiario") && metodo === "POST") {
        [status, corpo] = [
          201,
          {
            casoId: "c1",
            numero: "2026-00431",
            paciente: "Rafael Gomes Ribeiro",
            estagiario: "Ana Beatriz Costa",
            prontuarioId: "p1",
          },
        ];
      }
      return new Response(JSON.stringify(corpo), {
        status,
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
      <MeusCasosPage />
    </QueryClientProvider>,
  );
}

describe("Vincular paciente a estagiário responsável (RF21)", () => {
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

  it("vincula o estagiário escolhido e avisa que o prontuário foi criado (RF21, RF66)", async () => {
    const chamadas = simularApi();
    abrirTela();
    const [botao] = await screen.findAllByRole("button", {
      name: /Vincular estagiário a Rafael/,
    });
    fireEvent.click(botao);
    expect(await screen.findByText("2 pacientes em atendimento")).toBeTruthy();
    expect(screen.getByText("Nenhum paciente em atendimento")).toBeTruthy();
    fireEvent.click(
      within(screen.getByRole("dialog")).getByLabelText(/Ana Beatriz Costa/),
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirmar vínculo" }));
    expect(
      await screen.findByText(
        "Ana Beatriz Costa agora é responsável pelo caso 2026-00431.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("O prontuário do caso foi criado.")).toBeTruthy();
    expect(chamadas.find((c) => c.metodo === "POST")).toMatchObject({
      url: expect.stringContaining("/casos/c1/estagiario"),
      corpo: { estagiarioId: "e1" },
    });
  });

  it("sem estagiários com conta ativa, informa que não há estagiários disponíveis (RF21)", async () => {
    simularApi({ estagiarios: [] });
    abrirTela();
    const [botao] = await screen.findAllByRole("button", {
      name: /Vincular estagiário a Rafael/,
    });
    fireEvent.click(botao);
    expect(
      await screen.findByText("Não há estagiários disponíveis para vínculo."),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Confirmar vínculo" }),
    ).toBeNull();
  });

  it("caso com estagiário mostra o responsável e o acesso ao prontuário (RF21)", async () => {
    simularApi();
    abrirTela();
    const [link] = await screen.findAllByRole("link", {
      name: /Abrir prontuário de Mariana/,
    });
    expect(link.getAttribute("href")).toBe("/prontuarios/p2");
    expect(screen.getAllByText(/Ana Beatriz Costa/).length).toBeGreaterThan(0);
  });

  it("só o supervisor acessa a tela (RF21, RNF16)", async () => {
    simularApi({ perfil: "coordenacao" });
    abrirTela();
    expect(
      await screen.findByText("Acesso restrito aos supervisores."),
    ).toBeTruthy();
  });

  it("só o caso em atendimento com estagiário tem “Transferir caso”, e o resultado aparece na lista (RF25, RNF16)", async () => {
    const chamadas = simularApi();
    abrirTela();
    const botoes = await screen.findAllByRole("button", {
      name: /Transferir o caso de/,
    });
    // Uma vez na tabela e outra no cartão do celular, só para a Mariana.
    expect(botoes).toHaveLength(2);
    expect(
      botoes.every((b) => b.getAttribute("aria-label")?.includes("Mariana")),
    ).toBe(true);
    fireEvent.click(botoes[0]);
    fireEvent.click(await screen.findByLabelText(/Larissa Fontes Melo/));
    fireEvent.change(screen.getByLabelText("Motivo da transferência"), {
      target: { value: "Licença da estagiária." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Transferir caso" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Confirmar transferência" }),
    );
    expect(
      await screen.findByText(
        /Carla e Larissa Fontes Melo agora são os responsáveis pelo caso de Mariana/,
      ),
    ).toBeTruthy();
    expect(chamadas.find((c) => c.metodo === "POST")).toMatchObject({
      url: expect.stringContaining("/casos/c2/transferencia"),
      corpo: { estagiarioId: "e2", motivo: "Licença da estagiária." },
    });
  });
});
