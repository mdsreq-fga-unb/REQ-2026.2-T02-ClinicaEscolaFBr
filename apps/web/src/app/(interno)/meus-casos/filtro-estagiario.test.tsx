import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import MeusCasosPage from "./page";

const caso = (nome: string, extra: Record<string, unknown> = {}) => ({
  casoId: nome,
  numero: "2026-00001",
  nome,
  prioridade: "verde",
  estagiario: "Ana Beatriz Costa",
  estagiarioId: "e1",
  estagiarioAnterior: null,
  estagiarioAnteriorId: null,
  supervisor: "Ricardo Menezes",
  prontuarioId: `p-${nome}`,
  situacao: "em_atendimento",
  vinculoEncerradoEm: null,
  ...extra,
});
const CASOS = [
  caso("Rafael Gomes Ribeiro", {
    estagiario: null,
    estagiarioId: null,
    prontuarioId: null,
    situacao: "aguardando_vinculo",
  }),
  caso("Mariana Alves Toledo"),
  caso("Gustavo Henrique Dias", {
    estagiario: "Camila Souza",
    estagiarioId: "e2",
  }),
  caso("Sérgio Antunes Freitas", {
    estagiario: null,
    estagiarioId: null,
    estagiarioAnterior: "Ana Beatriz Costa",
    estagiarioAnteriorId: "e1",
    situacao: "desligado_por_faltas",
    vinculoEncerradoEm: "2026-10-28T13:00:00.000Z",
  }),
];

function simularApi(casos: unknown[] = CASOS) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const [status, corpo] = url.endsWith("/auth/sessao")
        ? [200, { id: "u1", nome: "Ricardo", perfil: "supervisor" }]
        : url.endsWith("/casos/meus")
          ? [200, casos]
          : url.endsWith("/vagas/liberadas")
            ? [200, []]
            : [404, {}];
      return new Response(JSON.stringify(corpo), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
}

function abrir() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MeusCasosPage />
    </QueryClientProvider>,
  );
}

const pacientes = () =>
  Array.from(
    screen
      .getByRole("table", {
        name: "Casos sob a sua responsabilidade e os dos seus estagiários",
      })
      .querySelectorAll("tbody tr td:first-child"),
  ).map((c) => c.textContent);

describe("Meus casos do supervisor com o filtro por estagiário (RF23)", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("mostra as colunas da prancha 4-1, sem o número da inscrição (RF23, RNF17)", async () => {
    simularApi();
    abrir();
    const tabela = await screen.findByRole("table", {
      name: "Casos sob a sua responsabilidade e os dos seus estagiários",
    });
    expect(
      Array.from(tabela.querySelectorAll("thead th")).map((c) => c.textContent),
    ).toEqual([
      "Paciente",
      "Prioridade clínica",
      "Situação do caso",
      "Estagiário responsável",
      "Ações",
    ]);
    expect(tabela.textContent).not.toContain("2026-00001");
  });

  it("o caso desligado mostra o último estagiário e a data do desligamento (RF23, RF37)", async () => {
    simularApi();
    abrir();
    const linha = (
      await screen.findByRole("row", { name: /Sérgio Antunes Freitas/ })
    ).textContent;
    expect(linha).toContain("Desligado por faltas");
    expect(linha).toContain("Em 28/10/2026");
    expect(linha).toContain("Ana Beatriz Costa");
  });

  it("filtra os casos pelo estagiário e pelos que estão sem estagiário (RF23, RNF24)", async () => {
    simularApi();
    abrir();
    const grupo = await screen.findByRole("group", { name: "Estagiário" });
    expect(
      Array.from(grupo.querySelectorAll("label")).map((l) => l.textContent),
    ).toEqual(["Todos", "Ana Beatriz Costa", "Camila Souza", "Sem estagiário"]);
    expect(pacientes()).toHaveLength(4);

    fireEvent.click(screen.getByRole("radio", { name: "Ana Beatriz Costa" }));
    expect(pacientes()).toEqual([
      "Mariana Alves Toledo",
      "Sérgio Antunes Freitas",
    ]);
    // A contagem é anunciada logo depois da opção marcada.
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toBe("2 casos."),
    );

    fireEvent.click(screen.getByRole("radio", { name: "Sem estagiário" }));
    expect(pacientes()).toEqual(["Rafael Gomes Ribeiro"]);

    fireEvent.click(screen.getByRole("radio", { name: "Todos" }));
    expect(pacientes()).toHaveLength(4);
  });

  it("dois estagiários com o mesmo nome são duas opções, e cada uma filtra só os casos do seu id (RF23)", async () => {
    simularApi([
      caso("Mariana Alves Toledo"),
      caso("Gustavo Henrique Dias", {
        estagiario: "Ana Beatriz Costa",
        estagiarioId: "e9",
      }),
      caso("Sérgio Antunes Freitas", {
        estagiario: null,
        estagiarioId: null,
        estagiarioAnterior: "Ana Beatriz Costa",
        estagiarioAnteriorId: "e9",
        situacao: "desligado_por_faltas",
        vinculoEncerradoEm: "2026-10-28T13:00:00.000Z",
      }),
    ]);
    abrir();
    const grupo = await screen.findByRole("group", { name: "Estagiário" });
    expect(
      Array.from(grupo.querySelectorAll("label")).map((l) => l.textContent),
    ).toEqual(["Todos", "Ana Beatriz Costa", "Ana Beatriz Costa"]);
    const [primeira, segunda] = screen.getAllByRole("radio", {
      name: "Ana Beatriz Costa",
    });

    fireEvent.click(primeira!);
    expect(pacientes()).toEqual(["Mariana Alves Toledo"]);
    fireEvent.click(segunda!);
    expect(pacientes()).toEqual([
      "Gustavo Henrique Dias",
      "Sérgio Antunes Freitas",
    ]);
  });
});
