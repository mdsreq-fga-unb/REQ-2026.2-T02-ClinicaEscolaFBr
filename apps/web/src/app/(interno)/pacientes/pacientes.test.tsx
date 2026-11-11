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
        [status, corpo] = [200, pacientes];
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

  it("mostra o estagiário e o supervisor de cada caso, e o que falta como pendente de distribuição, sem nome (RF22)", async () => {
    simularApi();
    abrirTela();
    const tabela = await screen.findByRole("table", {
      name: "Pacientes e responsáveis",
    });
    const linhas = Array.from(tabela.querySelectorAll("tbody tr")).map((l) =>
      Array.from(l.querySelectorAll("td")).map((c) => c.textContent),
    );
    expect(linhas).toEqual([
      [
        "Mariana Alves Toledo",
        "Ana Beatriz Costa",
        "Carla Mendes Souza",
        "Em atendimento",
        "Abrir ficha",
      ],
      [
        "Rafael Gomes Ribeiro",
        "Pendente de distribuição",
        "Carla Mendes Souza",
        "Aguardando vínculo",
        "Abrir ficha",
      ],
      [
        "Paulo Nunes",
        "Pendente de distribuição",
        "Pendente de distribuição",
        "Aguardando distribuição",
        "Abrir ficha",
      ],
    ]);
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
    expect(await screen.findByText("Nº da inscrição")).toBeTruthy();
    expect(screen.getAllByText("2026-00398").length).toBeGreaterThan(0);
  });

  it("não mostra dado clínico: nem prioridade, nem queixa (RF22, RNF17)", async () => {
    simularApi({ perfil: "coordenacao" });
    abrirTela();
    await screen.findByRole("table", { name: "Pacientes e responsáveis" });
    expect(screen.queryByText(/Prioridade/i)).toBeNull();
    expect(screen.queryByText(/queixa/i)).toBeNull();
  });

  it("cada paciente leva à própria ficha (RF22)", async () => {
    simularApi();
    abrirTela();
    const [link] = await screen.findAllByRole("link", {
      name: "Abrir ficha de Mariana Alves Toledo",
    });
    expect(link.getAttribute("href")).toBe("/pacientes/c1");
  });

  it("a busca pede à API só os nomes que combinam com o texto (RF22)", async () => {
    const chamadas = simularApi();
    abrirTela();
    await screen.findByRole("table", { name: "Pacientes e responsáveis" });
    fireEvent.change(screen.getByLabelText("Buscar paciente"), {
      target: { value: "mar" },
    });
    await vi.waitFor(() =>
      expect(chamadas.some((u) => u.includes("/pacientes?busca=mar"))).toBe(
        true,
      ),
    );
  });

  it("sem resultado, explica que nenhum paciente foi encontrado (RF22)", async () => {
    simularApi({ pacientes: [] });
    abrirTela();
    expect(await screen.findByText("Ainda não há pacientes.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Buscar paciente"), {
      target: { value: "zzz" },
    });
    expect(await screen.findByText("Nenhum paciente encontrado.")).toBeTruthy();
  });

  it("estagiário e supervisor veem o acesso restrito, sem pedir a lista (RF22, RNF16)", async () => {
    const chamadas = simularApi({ perfil: "supervisor" });
    abrirTela();
    expect(
      await screen.findByText("Acesso restrito à secretaria e à coordenação."),
    ).toBeTruthy();
    expect(chamadas.some((u) => u.includes("/pacientes"))).toBe(false);
  });
});
