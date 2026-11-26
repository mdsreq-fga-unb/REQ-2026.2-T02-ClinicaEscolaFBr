import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PacientesPage from "./page";

const PACIENTES = [
  {
    casoId: "c1",
    nome: "Mariana Alves Toledo",
    numero: "2026-00398",
    situacao: "em_atendimento",
    supervisor: "Carla Mendes Souza",
    estagiario: "Ana Beatriz Costa",
  },
  {
    casoId: "c2",
    nome: "Rafael Gomes Ribeiro",
    numero: "2026-00431",
    situacao: "aguardando_vinculo",
    supervisor: "Carla Mendes Souza",
    estagiario: null,
  },
  {
    casoId: "c3",
    nome: "Paulo Nunes",
    numero: "2026-00502",
    situacao: "aguardando_distribuicao",
    supervisor: null,
    estagiario: null,
  },
];

function simularApi({
  perfil = "secretaria",
  pacientes = PACIENTES as unknown,
  total = undefined as number | undefined,
} = {}) {
  const chamadas: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      chamadas.push(url);
      let corpo: unknown = {};
      let status = 404;
      if (url.endsWith("/auth/sessao")) {
        [status, corpo] = [200, { id: "u1", nome: "Juliana", perfil }];
      } else if (url.includes("/pacientes")) {
        const pagina = Number(
          new URL(url, "http://x").searchParams.get("pagina") ?? 1,
        );
        [status, corpo] = [
          200,
          {
            pacientes,
            total: total ?? (pacientes as unknown[]).length,
            pagina,
            tamanhoPagina: 50,
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
      <PacientesPage />
    </QueryClientProvider>,
  );
}

describe("Lista de Pacientes com os responsáveis (RF22)", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("mostra o estagiário e o supervisor de cada caso, com '—' no que falta e o selo da situação de distribuição (RF22, RNF17)", async () => {
    simularApi();
    abrirTela();
    const tabela = await screen.findByRole("table", {
      name: "Pacientes e responsáveis",
    });
    const cabecalhos = Array.from(tabela.querySelectorAll("thead th")).map(
      (c) => c.textContent,
    );
    expect(cabecalhos).toEqual([
      "Paciente",
      "Estagiário responsável",
      "Supervisor responsável",
      "Situação de distribuição",
      "Ações",
    ]);
    const linhas = Array.from(tabela.querySelectorAll("tbody tr")).map((l) =>
      Array.from(l.querySelectorAll("td")).map((c) => c.textContent),
    );
    expect(linhas).toEqual([
      [
        "Mariana Alves Toledo",
        "Ana Beatriz Costa",
        "Carla Mendes Souza",
        "Distribuído",
        "Ver ficha",
      ],
      [
        "Rafael Gomes Ribeiro",
        "—",
        "Carla Mendes Souza",
        "Aguardando vínculo de estagiário",
        "Ver ficha",
      ],
      ["Paulo Nunes", "—", "—", "Pendente de distribuição", "Ver ficha"],
    ]);
  });

  it("mostra a busca e os filtros acima da tabela, com o placeholder e a dica, e a contagem abaixo dela (RF22, RNF24)", async () => {
    simularApi();
    abrirTela();
    expect(
      await screen.findByText(
        "Consulte quem é o estagiário e o supervisor responsáveis por cada caso.",
      ),
    ).toBeTruthy();
    const campo = screen.getByLabelText("Paciente");
    expect(campo.getAttribute("placeholder")).toBe("Digite o nome do paciente");
    expect(campo.getAttribute("aria-describedby")).toBeTruthy();
    expect(screen.getByText("Busca pelo nome do paciente.")).toBeTruthy();
    for (const filtro of [
      "Estagiário responsável",
      "Supervisor responsável",
      "Situação de distribuição",
    ])
      expect(
        screen.getByRole("region", { name: "Buscar e filtrar" }).textContent,
      ).toContain(filtro);
    const tabela = await screen.findByRole("table", {
      name: "Pacientes e responsáveis",
    });
    // Os filtros vêm antes da tabela.
    expect(
      campo.compareDocumentPosition(tabela) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    const status = await screen.findByText("Mostrando 3 pacientes.");
    expect(status.getAttribute("role")).toBe("status");
  });

  it("pagina a lista de 50 em 50, com o total e os botões de página (RF22, RNF21)", async () => {
    const chamadas = simularApi({ total: 250 });
    abrirTela();
    expect(
      await screen.findByText("Mostrando 1 a 3 de 250 pacientes."),
    ).toBeTruthy();
    const paginas = screen.getByRole("navigation", {
      name: "Páginas da lista de pacientes",
    });
    expect(paginas.textContent).toContain("Página 1 de 5");
    expect(
      screen.getByRole("button", { name: "Anterior" }).hasAttribute("disabled"),
    ).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Próxima" }));
    await vi.waitFor(() =>
      expect(chamadas.some((u) => u.includes("pagina=2"))).toBe(true),
    );
    expect(await screen.findByText("Página 2 de 5")).toBeTruthy();
  });

  it("filtra pela situação de distribuição e volta à primeira página (RF22)", async () => {
    const chamadas = simularApi({ total: 250 });
    abrirTela();
    await screen.findByText("Mostrando 1 a 3 de 250 pacientes.");
    fireEvent.click(screen.getByRole("button", { name: "Próxima" }));
    fireEvent.change(screen.getByLabelText("Situação de distribuição"), {
      target: { value: "pendente" },
    });
    await vi.waitFor(() =>
      expect(
        chamadas.some((u) => u.endsWith("/pacientes?situacao=pendente")),
      ).toBe(true),
    );
    fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(
      (screen.getByLabelText("Situação de distribuição") as HTMLSelectElement)
        .value,
    ).toBe("");
  });

  it("a secretaria consulta a situação da inscrição pelo número junto da busca (RF8, RF22)", async () => {
    simularApi();
    abrirTela();
    const consulta = await screen.findByRole("region", {
      name: "Consultar situação da inscrição",
    });
    const tabela = await screen.findByRole("table", {
      name: "Pacientes e responsáveis",
    });
    expect(
      consulta.compareDocumentPosition(tabela) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("a secretaria não vê o número da inscrição, e a coordenação vê (RF22, RNF17)", async () => {
    simularApi({
      pacientes: PACIENTES.map((p) => {
        const semNumero: Record<string, unknown> = { ...p };
        delete semNumero.numero;
        return semNumero;
      }),
    });
    abrirTela();
    await screen.findByRole("table", { name: "Pacientes e responsáveis" });
    expect(screen.queryByText("Nº da inscrição")).toBeNull();
    expect(screen.queryByText("2026-00398")).toBeNull();
    cleanup();

    simularApi({ perfil: "coordenacao" });
    abrirTela();
    expect(await screen.findAllByText("2026-00398")).not.toHaveLength(0);
    // A coordenação também filtra pelo número.
    expect(screen.getByLabelText("Nº da inscrição")).toBeTruthy();
  });

  it("não mostra dado clínico: nem prioridade, nem queixa (RF22, RNF17)", async () => {
    simularApi({ perfil: "coordenacao" });
    abrirTela();
    await screen.findByRole("table", { name: "Pacientes e responsáveis" });
    expect(screen.queryByText(/Prioridade/i)).toBeNull();
    expect(screen.queryByText(/queixa/i)).toBeNull();
  });

  it('cada paciente leva à própria ficha pelo "Ver ficha" (RF22, RNF24)', async () => {
    simularApi();
    abrirTela();
    const [link] = await screen.findAllByRole("link", {
      name: "Ver ficha de Mariana Alves Toledo",
    });
    expect(link.getAttribute("href")).toBe("/pacientes/c1");
  });

  it("a busca espera a pessoa parar de digitar e pede à API uma vez só (RF22, RNF21)", async () => {
    const chamadas = simularApi();
    abrirTela();
    await screen.findByRole("table", { name: "Pacientes e responsáveis" });
    const campo = screen.getByLabelText("Paciente");
    for (const valor of ["m", "ma", "mar"]) {
      fireEvent.change(campo, { target: { value: valor } });
    }
    await vi.waitFor(() =>
      expect(chamadas.some((u) => u.includes("/pacientes?busca=mar"))).toBe(
        true,
      ),
    );
    const buscas = chamadas.filter((u) => u.includes("/pacientes?busca="));
    expect(buscas).toEqual([expect.stringContaining("?busca=mar")]);
  });

  it("sem resultado, explica que nenhum paciente foi encontrado, sem título como região viva (RF22, RNF24)", async () => {
    simularApi({ pacientes: [] });
    abrirTela();
    expect(await screen.findByText("Ainda não há pacientes.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Paciente"), {
      target: { value: "zzz" },
    });
    const titulo = await screen.findByRole("heading", {
      name: "Nenhum paciente encontrado.",
    });
    expect(titulo.getAttribute("role")).toBeNull();
    // O anúncio vem de um parágrafo separado.
    expect(screen.getByRole("status").textContent).toBe(
      "Nenhum paciente encontrado.",
    );
  });

  it("estagiário e supervisor veem o acesso restrito, sem pedir a lista (RF22, RNF16, RNF17)", async () => {
    const chamadas = simularApi({ perfil: "supervisor" });
    abrirTela();
    expect(
      await screen.findByText("Acesso restrito à secretaria e à coordenação."),
    ).toBeTruthy();
    expect(chamadas.some((u) => u.includes("/pacientes"))).toBe(false);
  });
});
