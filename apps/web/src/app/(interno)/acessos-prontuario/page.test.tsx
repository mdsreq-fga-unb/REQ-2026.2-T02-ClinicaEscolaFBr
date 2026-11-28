import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  NOMES_OPERACAO_ACESSO,
  periodoInicialAcessos,
  type OperacaoAcesso,
} from "@clinica/shared";
import { MENU_POR_PERFIL } from "@/components/layout/menu";
import AcessosProntuarioPage from "./page";

const acesso = {
  id: "a1",
  usuario: "Pessoa Fictícia",
  paciente: "Paciente Fictício",
  perfil: "estagiario",
  dataHora: "2026-11-14T13:42:00Z",
  operacao: "visualizacao",
  descricao: "Abertura do prontuário",
};
const resposta = (
  acessos: unknown[] = [acesso],
  pagina = 1,
  total = acessos.length,
) => ({ acessos, total, pagina, tamanhoPagina: 50 });
const clientes: QueryClient[] = [];
function simular(
  perfil = "coordenacao",
  consultar: (url: URL) => [number, unknown] = () => [200, resposta()],
) {
  const chamadas: URL[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (caminho: string) => {
      const url = new URL(caminho.replace(/^undefined/, "http://teste"));
      const [status, body] =
        url.pathname === "/auth/sessao"
          ? [200, { id: "c1", nome: "Coordenação", perfil }]
          : (chamadas.push(url), consultar(url));
      return new Response(JSON.stringify(body), {
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
  clientes.push(client);
  render(
    <QueryClientProvider client={client}>
      <AcessosProntuarioPage />
    </QueryClientProvider>,
  );
}
describe("Registro de acessos (RF56)", () => {
  afterEach(() => {
    cleanup();
    clientes.forEach((c) => c.clear());
    clientes.length = 0;
    vi.unstubAllGlobals();
  });

  it.each(Object.entries(NOMES_OPERACAO_ACESSO))(
    "apresenta %s como %s, com data de Brasília e metadados (RNF17)",
    async (operacao, rotulo) => {
      simular("coordenacao", () => [
        200,
        resposta([{ ...acesso, operacao: operacao as OperacaoAcesso }]),
      ]);
      abrir();
      const tabela = await screen.findByRole("table", {
        name: "Registro de acessos ao prontuário",
      });
      expect(within(tabela).getByText(rotulo)).toBeTruthy();
      expect(within(tabela).getByText("14/11/2026, 10:42")).toBeTruthy();
      expect(
        within(tabela)
          .getAllByRole("columnheader")
          .map((c) => c.textContent),
      ).toEqual([
        "Data e hora",
        "Usuário",
        "Perfil",
        "Paciente",
        "Operação",
        "O que foi acessado ou feito",
      ]);
      expect(
        screen.queryByRole("button", { name: /excluir|editar|apagar/i }),
      ).toBeNull();
    },
  );
  it.each(["secretaria", "estagiario", "supervisor"] as const)(
    "não consulta a API nem mostra menu para %s",
    async (perfil) => {
      const chamadas = simular(perfil);
      abrir();
      expect(
        await screen.findByRole("heading", {
          name: "Você não tem acesso ao registro de acessos",
        }),
      ).toBeTruthy();
      expect(chamadas).toHaveLength(0);
      expect(
        MENU_POR_PERFIL[perfil].some((i) => i.href === "/acessos-prontuario"),
      ).toBe(false);
    },
  );
  it("mostra o que foi acessado ou feito em cada linha, na tabela e na lista do celular (DF77)", async () => {
    simular();
    abrir();
    expect(
      await screen.findByRole("columnheader", {
        name: "O que foi acessado ou feito",
      }),
    ).toBeTruthy();
    expect(screen.getAllByText("Abertura do prontuário")).toHaveLength(2);
  });
  it("abre com os últimos 30 dias e permite acesso pelo menu da coordenação", async () => {
    const chamadas = simular();
    abrir();
    await screen.findByRole("table");
    const periodo = periodoInicialAcessos();
    expect(chamadas[0].searchParams.get("inicio")).toBe(periodo.inicio);
    expect(chamadas[0].searchParams.get("fim")).toBe(periodo.fim);
    expect(
      MENU_POR_PERFIL.coordenacao.some((i) => i.href === "/acessos-prontuario"),
    ).toBe(true);
  });
  it("só aplica os nomes/período ao filtrar e anuncia o resultado", async () => {
    const chamadas = simular();
    abrir();
    await screen.findByRole("table");
    fireEvent.change(screen.getByLabelText("Paciente"), {
      target: { value: "Ana" },
    });
    fireEvent.change(screen.getByLabelText("Usuário"), {
      target: { value: "Costa" },
    });
    fireEvent.change(screen.getByLabelText("Data inicial"), {
      target: { value: "2026-10-01" },
    });
    fireEvent.change(screen.getByLabelText("Data final"), {
      target: { value: "2026-10-02" },
    });
    expect(chamadas).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));
    await vi.waitFor(() => expect(chamadas).toHaveLength(2));
    expect(Object.fromEntries(chamadas[1].searchParams)).toEqual({
      paciente: "Ana",
      usuario: "Costa",
      inicio: "2026-10-01",
      fim: "2026-10-02",
      pagina: "1",
    });
    await vi.waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain(
        "1 acesso encontrado",
      ),
    );
  });
  it("recusa período invertido, aponta o campo e preserva os filtros", async () => {
    const chamadas = simular();
    abrir();
    await screen.findByRole("table");
    fireEvent.change(screen.getByLabelText("Data inicial"), {
      target: { value: "2026-11-15" },
    });
    fireEvent.change(screen.getByLabelText("Data final"), {
      target: { value: "2026-11-14" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));
    expect(
      screen.getByText("A data final deve ser igual ou posterior à inicial."),
    ).toBeTruthy();
    expect(screen.getByLabelText("Data final")).toBe(document.activeElement);
    expect(chamadas).toHaveLength(1);
  });
  it("pagina e volta à primeira página ao aplicar outro filtro", async () => {
    const chamadas = simular("coordenacao", (url) => [
      200,
      resposta([acesso], Number(url.searchParams.get("pagina")), 51),
    ]);
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Próxima" }));
    await vi.waitFor(() =>
      expect(chamadas.at(-1)?.searchParams.get("pagina")).toBe("2"),
    );
    await screen.findByRole("table");
    expect(screen.getByRole("status").textContent).toContain(
      "51 acessos encontrados. Página 2 de 2.",
    );
    fireEvent.change(screen.getByLabelText("Paciente"), {
      target: { value: "Outra pessoa" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));
    await vi.waitFor(() =>
      expect(chamadas.at(-1)?.searchParams.get("pagina")).toBe("1"),
    );
    expect(chamadas.at(-1)?.searchParams.get("paciente")).toBe("Outra pessoa");
  });
  it("mostra o estado vazio e permite pesquisar novamente", async () => {
    simular("coordenacao", () => [200, resposta([])]);
    abrir();
    expect(
      await screen.findByRole("heading", { name: "Nenhum acesso encontrado" }),
    ).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByRole("button", { name: "Filtrar" })).toBeTruthy();
  });
  it("mantém os filtros na falha e permite tentar novamente", async () => {
    let falhou = true;
    simular("coordenacao", () => (falhou ? [503, {}] : [200, resposta()]));
    abrir();
    const tentar = await screen.findByRole("button", {
      name: "Tentar novamente",
    });
    falhou = false;
    fireEvent.click(tentar);
    expect(await screen.findByRole("table")).toBeTruthy();
    expect(
      (screen.getByLabelText("Data final") as HTMLInputElement).value,
    ).toBe(periodoInicialAcessos().fim);
  });
  it("oculta resultados anteriores se a permissão for revogada", async () => {
    let negado = false;
    simular("coordenacao", () => (negado ? [403, {}] : [200, resposta()]));
    abrir();
    await screen.findByRole("table");
    negado = true;
    fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));
    expect(
      await screen.findByRole("heading", {
        name: "Você não tem acesso ao registro de acessos",
      }),
    ).toBeTruthy();
    expect(screen.queryByText("Paciente Fictício")).toBeNull();
  });
  it("informa sessão encerrada sem apresentar registros", async () => {
    simular("coordenacao", () => [401, {}]);
    abrir();
    expect(
      await screen.findByText(
        "Sessão encerrada. Entre novamente para consultar.",
      ),
    ).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });
  it("explica o filtro e mostra travessão quando a tentativa não identifica paciente", async () => {
    simular("coordenacao", () => [
      200,
      resposta([{ ...acesso, paciente: null, operacao: "acesso_negado" }]),
    ]);
    abrir();
    expect(
      within(await screen.findByRole("table")).getByText("—"),
    ).toBeTruthy();
    expect(
      screen.getByText(
        /Tentativas sem paciente identificado aparecem somente quando o filtro de paciente está vazio/,
      ),
    ).toBeTruthy();
  });
});
