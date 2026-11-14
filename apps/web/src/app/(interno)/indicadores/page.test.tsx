import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { Indicadores, VagasOfertadas } from "@clinica/shared";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import IndicadoresPage from "./page";

const sessao = vi.hoisted(() => ({ perfil: "coordenacao" }));
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

const montar = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <IndicadoresPage />
    </QueryClientProvider>,
  );
const responder = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const agosto: Indicadores = {
  inicio: "2026-08-01",
  fim: "2026-08-31",
  referencia: "2026-09-01T02:59:59.999Z",
  referenciaEhAgora: false,
  vagas: { ocupadas: 82, semestre: "2026/2", ofertadas: 100, percentual: 82 },
  espera: { mediaDias: 38.4, pacientes: 11 },
  evasao: { percentual: 3.5, desligamentos: 3, ativos: 86 },
  supervisores: [
    { id: "r", nome: "Ricardo Menezes", casos: 34 },
    { id: "s", nome: "Silvia Prado", casos: 0 },
  ],
};

describe("Indicadores operacionais (RF48)", () => {
  // O jsdom não implementa o <dialog> modal.
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
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("abre no mês corrente e mostra os quatro indicadores, com os textos do período e quem tem zero casos (RF48)", async () => {
    const fetch = vi.fn().mockResolvedValue(responder(agosto));
    vi.stubGlobal("fetch", fetch);
    montar();
    expect(await screen.findByText("82")).toBeInTheDocument();
    expect(fetch.mock.calls[0][0]).toMatch(
      /\/indicadores\?inicio=\d{4}-\d{2}-01&fim=/,
    );
    expect(screen.getByText(/de 100 vagas · 82,0%/)).toBeInTheDocument();
    expect(screen.getByText("38,4")).toBeInTheDocument();
    expect(
      screen.getByText(
        /para 11 pacientes atendidos pela primeira vez no período/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("3,5%")).toBeInTheDocument();
    expect(
      screen.getByText(
        /3 desligamentos por faltas, de 86 pacientes em atendimento ativo/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /situação ao fim de 31\/08\/2026\. Tempo de espera e evasão consideram de 01\/08\/2026 a 31\/08\/2026/,
      ),
    ).toBeInTheDocument();
    const tabela = screen.getByRole("table", {
      name: "Casos ativos de cada supervisor",
    });
    expect(within(tabela).getByText("Silvia Prado")).toBeInTheDocument();
    expect(within(tabela).getByText("0")).toBeInTheDocument();
  });

  it("período sem registros mostra zeros com a explicação, e não em branco (RF48)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        responder({
          ...agosto,
          vagas: { ...agosto.vagas, ocupadas: 0, percentual: 0 },
          espera: { mediaDias: 0, pacientes: 0 },
          evasao: { percentual: 0, desligamentos: 0, ativos: 0 },
        }),
      ),
    );
    montar();
    expect(await screen.findByText("0,0%")).toBeInTheDocument();
    expect(screen.getByText("0,0")).toBeInTheDocument();
    expect(
      screen.getByText("Nenhuma primeira sessão realizada no período."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Nenhum paciente em atendimento ativo no período."),
    ).toBeInTheDocument();
  });

  it("sem vagas ofertadas registradas, mostra só as ocupadas e o aviso para registrar (RF48)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        responder({
          ...agosto,
          vagas: { ...agosto.vagas, ofertadas: null, percentual: null },
        }),
      ),
    );
    montar();
    expect(
      await screen.findByText(
        "O total de vagas ofertadas no semestre 2026/2 não foi registrado.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/vagas ocupadas$/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Registrar vagas ofertadas" }),
    ).toBeInTheDocument();
  });

  it("recusa a data final no futuro com o motivo no campo e o aviso no topo, sem consultar a API (RF48)", async () => {
    const fetch = vi.fn().mockResolvedValue(responder(agosto));
    vi.stubGlobal("fetch", fetch);
    montar();
    await screen.findByText("82");
    fetch.mockClear();
    fireEvent.change(screen.getByLabelText("Data final"), {
      target: { value: "2999-12-31" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Consultar" }));
    expect(
      await screen.findByText("Não foi possível consultar este período."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Data final")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(
      screen.getByText(
        /A data final não pode ser posterior à data da consulta/,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("82")).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("registra as vagas ofertadas pelo diálogo, mostrando a última alteração (RF48)", async () => {
    const vagas: VagasOfertadas = {
      semestre: "2026/2",
      total: 90,
      ultimaAlteracao: {
        valorAnterior: null,
        valorNovo: "90",
        por: "Helena Duarte",
        em: "2026-08-03T13:12:00.000Z",
      },
    };
    const fetch = vi.fn((url: string, init?: RequestInit) => {
      if (url.includes("/vagas-ofertadas/2026-2"))
        return Promise.resolve(
          responder(init?.method === "PUT" ? { ...vagas, total: 100 } : vagas),
        );
      return Promise.resolve(responder(agosto));
    });
    vi.stubGlobal("fetch", fetch);
    montar();
    fireEvent.click(
      await screen.findByRole("button", { name: "Alterar vagas ofertadas" }),
    );
    const campo = await screen.findByLabelText("Total de vagas ofertadas");
    await waitFor(() => expect(campo).toHaveValue(90));
    expect(
      screen.getByText(/Registrado 90 vagas, por Helena Duarte/),
    ).toBeInTheDocument();
    fireEvent.change(campo, { target: { value: "100" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() =>
      expect(
        fetch.mock.calls.some(
          ([url, init]) =>
            String(url).includes("/vagas-ofertadas/2026-2") &&
            init?.method === "PUT" &&
            init.body === JSON.stringify({ total: 100 }),
        ),
      ).toBe(true),
    );
  });

  it.each(["secretaria", "supervisor", "estagiario"])(
    "%s vê o acesso negado, sem consultar os indicadores (RF48)",
    (perfil) => {
      sessao.perfil = perfil;
      const fetch = vi.fn();
      vi.stubGlobal("fetch", fetch);
      montar();
      expect(
        screen.getByRole("heading", {
          name: "Você não tem acesso aos indicadores operacionais",
        }),
      ).toBeInTheDocument();
      expect(fetch).not.toHaveBeenCalled();
    },
  );
});
