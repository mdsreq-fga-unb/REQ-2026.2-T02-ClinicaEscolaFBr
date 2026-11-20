import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { UsuarioListado } from "@clinica/shared";
import UsuariosPage from "./page";

const usuario = (dados: Partial<UsuarioListado>): UsuarioListado => ({
  id: "u1",
  nome: "Pessoa Fictícia",
  email: "pessoa@fbr.edu.br",
  perfil: "estagiario",
  crp: null,
  situacao: "ativo",
  conviteEnviadoEm: null,
  conviteExpiraEm: null,
  conviteVencido: false,
  desativadoEm: null,
  ...dados,
});
const LISTA = [
  usuario({
    id: "s1",
    nome: "Carla Souza",
    perfil: "supervisor",
    crp: "01/12345",
  }),
  usuario({ id: "s2", nome: "Rui Prado", perfil: "supervisor" }),
];

type Chamada = { metodo: string; caminho: string; corpo?: unknown };
const clientes: QueryClient[] = [];

function simular() {
  const chamadas: Chamada[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (caminho: string, opcoes?: RequestInit) => {
      const url = new URL(caminho.replace(/^undefined/, "http://teste"));
      if (url.pathname === "/auth/sessao") {
        return Response.json({
          id: "c1",
          nome: "Coordenação",
          perfil: "coordenacao",
        });
      }
      const metodo = opcoes?.method ?? "GET";
      chamadas.push({
        metodo,
        caminho: url.pathname,
        corpo: opcoes?.body ? JSON.parse(String(opcoes.body)) : undefined,
      });
      if (metodo === "GET") return Response.json(LISTA);
      if (metodo === "PUT") return new Response(null, { status: 204 });
      return Response.json(
        { id: "novo", situacao: "pendente_ativacao", conviteEnviado: true },
        { status: 201 },
      );
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
      <UsuariosPage />
    </QueryClientProvider>,
  );
}

describe("CRP do supervisor na gestão de usuários (RF53)", () => {
  beforeAll(() => {
    // O jsdom não abre o <dialog> nativo.
    HTMLDialogElement.prototype.showModal ??= function (
      this: HTMLDialogElement,
    ) {
      this.open = true;
    };
    HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
      this.open = false;
    };
  });

  afterEach(() => {
    cleanup();
    clientes.forEach((c) => c.clear());
    clientes.length = 0;
    vi.unstubAllGlobals();
  });

  it("mostra o CRP do supervisor e avisa quando ele não foi informado", async () => {
    simular();
    abrir();
    const tabela = await screen.findByRole("table", {
      name: "Usuários cadastrados",
    });
    expect(within(tabela).getByText("CRP 01/12345")).toBeTruthy();
    expect(within(tabela).getByText("CRP não informado")).toBeTruthy();
    expect(
      within(tabela).getByRole("button", {
        name: /Corrigir CRP\s*de Carla Souza/,
      }),
    ).toBeTruthy();
    expect(
      within(tabela).getByRole("button", {
        name: /Informar CRP\s*de Rui Prado/,
      }),
    ).toBeTruthy();
  });

  it("pede o CRP só para o perfil de supervisor e recusa o cadastro sem ele", async () => {
    const chamadas = simular();
    abrir();
    await screen.findByRole("table");
    fireEvent.click(screen.getByRole("button", { name: "Cadastrar usuário" }));
    fireEvent.change(screen.getByLabelText("Nome completo"), {
      target: { value: "Ana Clara Lopes" },
    });
    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "ana@fbr.edu.br" },
    });
    fireEvent.click(screen.getByLabelText("Estagiário"));
    expect(screen.queryByLabelText(/Número do CRP/)).toBeNull();

    fireEvent.click(screen.getByLabelText("Supervisor"));
    const crp = screen.getByLabelText(/Número do CRP/);
    fireEvent.click(
      screen.getByRole("button", { name: "Salvar e enviar convite" }),
    );
    expect(
      await screen.findByText("Informe o número do CRP do supervisor."),
    ).toBeTruthy();
    expect(crp.getAttribute("aria-invalid")).toBe("true");
    expect(chamadas.filter((c) => c.metodo === "POST")).toHaveLength(0);

    fireEvent.change(crp, { target: { value: "CRP 01/23456" } });
    fireEvent.click(
      screen.getByRole("button", { name: "Salvar e enviar convite" }),
    );
    await vi.waitFor(() =>
      expect(chamadas.find((c) => c.metodo === "POST")?.corpo).toMatchObject({
        perfil: "supervisor",
        crp: "01/23456",
      }),
    );
  });

  it("a coordenação informa o CRP de um supervisor pela lista", async () => {
    const chamadas = simular();
    abrir();
    const tabela = await screen.findByRole("table", {
      name: "Usuários cadastrados",
    });
    fireEvent.click(
      within(tabela).getByRole("button", {
        name: /Informar CRP\s*de Rui Prado/,
      }),
    );
    const campo = screen.getByLabelText(/Número do CRP/);
    fireEvent.change(campo, { target: { value: "123" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar CRP" }));
    expect(
      await screen.findByText("Informe o CRP no formato 01/12345."),
    ).toBeTruthy();

    fireEvent.change(campo, { target: { value: "01/77777" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar CRP" }));
    expect(await screen.findByText("CRP de Rui Prado salvo.")).toBeTruthy();
    expect(chamadas.find((c) => c.metodo === "PUT")).toEqual({
      metodo: "PUT",
      caminho: "/usuarios/s2/crp",
      corpo: { crp: "01/77777" },
    });
  });
});
