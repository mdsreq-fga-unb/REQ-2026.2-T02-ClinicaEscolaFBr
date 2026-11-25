import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ContribuicaoDoPaciente, Perfil } from "@clinica/shared";
import { SituacaoDasContribuicoes } from "./situacao-das-contribuicoes";

const LISTA: ContribuicaoDoPaciente[] = [
  {
    casoId: "c1",
    paciente: "Mariana Alves Toledo",
    situacao: "efetivada",
    primeiraSessao: "2026-11-12T17:00:00.000Z",
    pagoEm: "2026-11-12",
    prazoAte: null,
  },
  {
    casoId: "c2",
    paciente: "João Pedro Lima",
    situacao: "pendente",
    primeiraSessao: "2026-11-18T17:00:00.000Z",
    pagoEm: null,
    prazoAte: "2026-11-24",
  },
  {
    casoId: "c3",
    paciente: "Camila Souza Reis",
    situacao: "pendente",
    primeiraSessao: null,
    pagoEm: null,
    prazoAte: "2026-11-27",
  },
];

function simular(perfil: Perfil, lista = LISTA) {
  const urls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (endereco: string) => {
      const url = new URL(endereco, "http://localhost");
      if (url.pathname.endsWith("/auth/sessao"))
        return Response.json({ id: "u1", nome: "Juliana", perfil });
      urls.push(url.pathname + url.search);
      const situacao = url.searchParams.get("situacao");
      return Response.json(
        situacao ? lista.filter((c) => c.situacao === situacao) : lista,
      );
    }),
  );
  return urls;
}

const abrir = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <SituacaoDasContribuicoes />
    </QueryClientProvider>,
  );

describe("Situação da contribuição social (RF42)", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("lista os pacientes em atendimento com a situação, a 1ª sessão e o pagamento, e o nome leva à ficha", async () => {
    simular("secretaria");
    abrir();
    expect(
      await screen.findByRole("heading", {
        name: "3 pacientes em atendimento",
      }),
    ).toBeInTheDocument();
    const linhas = within(screen.getByRole("table")).getAllByRole("row");
    expect(
      linhas.map((l) => l.textContent?.replace(/\s+/g, " ").trim()),
    ).toEqual([
      "PacienteSituaçãoPrimeira sessãoPagamento",
      "Mariana Alves ToledoEfetivada12/11/202612/11/2026",
      "João Pedro LimaPendente18/11/2026—",
      "Camila Souza ReisPendenteAinda não agendada—",
    ]);
    expect(
      screen.getAllByRole("link", { name: "Mariana Alves Toledo" })[0],
    ).toHaveAttribute("href", "/pacientes/c1");
    expect(screen.getByRole("table")).toHaveAccessibleName(
      "Situação da contribuição social no ciclo atual",
    );
  });

  it("o filtro pendente pede só os pendentes e mostra o prazo para pagar", async () => {
    const urls = simular("coordenacao");
    abrir();
    await screen.findByRole("heading", { name: "3 pacientes em atendimento" });
    fireEvent.change(screen.getByLabelText("Situação"), {
      target: { value: "pendente" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));
    expect(
      await screen.findByRole("heading", {
        name: "2 pacientes com contribuição pendente",
      }),
    ).toBeInTheDocument();
    expect(urls.at(-1)).toMatch(/\/contribuicoes\?situacao=pendente$/);
    const linhas = within(screen.getByRole("table")).getAllByRole("row");
    expect(
      linhas.map((l) => l.textContent?.replace(/\s+/g, " ").trim()),
    ).toEqual([
      "PacientePrimeira sessãoPrazo para pagar",
      "João Pedro Lima18/11/2026até 24/11/2026",
      "Camila Souza ReisAinda não agendadaaté 27/11/2026",
    ]);
  });

  it("sem pendentes, mostra o estado vazio anunciado", async () => {
    simular("secretaria", [LISTA[0]]);
    abrir();
    await screen.findByRole("heading", { name: "1 paciente em atendimento" });
    fireEvent.change(screen.getByLabelText("Situação"), {
      target: { value: "pendente" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));
    const titulo = await screen.findByRole("heading", {
      name: "Nenhum paciente com contribuição pendente",
    });
    // Anunciado pelo leitor de tela.
    expect(titulo.closest("[role=status]")).not.toBeNull();
  });

  it("o supervisor e o estagiário veem o acesso negado, sem consultar a lista", async () => {
    for (const perfil of ["supervisor", "estagiario"] as const) {
      const urls = simular(perfil);
      abrir();
      expect(
        await screen.findByRole("heading", {
          name: "Você não tem acesso à contribuição social",
        }),
      ).toBeInTheDocument();
      expect(urls).toEqual([]);
      cleanup();
      vi.unstubAllGlobals();
    }
  });
});
