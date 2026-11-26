import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { UsuarioListado } from "@clinica/shared";
import UsuariosPage from "./page";

const LISTA: UsuarioListado[] = [
  {
    id: "s1",
    nome: "Carla Souza",
    email: "carla@fbr.edu.br",
    perfil: "supervisor",
    situacao: "ativo",
    conviteEnviadoEm: null,
    conviteExpiraEm: null,
    conviteVencido: false,
    desativadoEm: null,
  },
];
const clientes: QueryClient[] = [];

function abrir() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (caminho: string) => {
      const url = new URL(caminho.replace(/^undefined/, "http://teste"));
      if (url.pathname === "/auth/sessao") {
        return Response.json({
          id: "c1",
          nome: "Coordenação",
          perfil: "coordenacao",
        });
      }
      return Response.json(LISTA);
    }),
  );
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

describe("Cadastro de usuário pela coordenação (RF53)", () => {
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

  it("valida em tempo real, em português, e só libera o cadastro completo", async () => {
    abrir();
    await screen.findByRole("table");
    fireEvent.click(screen.getByRole("button", { name: "Cadastrar usuário" }));
    const salvar = screen.getByRole("button", {
      name: "Salvar e enviar convite",
    });
    expect(salvar.hasAttribute("disabled")).toBe(true);
    const nome = screen.getByLabelText("Nome completo");
    fireEvent.change(nome, { target: { value: "x" } });
    fireEvent.change(nome, { target: { value: "" } });
    expect(await screen.findByText("Informe o nome completo.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "pessoa@" },
    });
    expect(screen.getByText("Informe um e-mail válido.")).toBeTruthy();
    expect(screen.queryByText(/Invalid input/)).toBeNull();
    fireEvent.change(nome, { target: { value: "Pessoa de Teste" } });
    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "pessoa@exemplo.com" },
    });
    fireEvent.click(screen.getByLabelText("Secretaria"));
    expect(screen.queryByText("Informe o nome completo.")).toBeNull();
    expect(screen.queryByText("Informe um e-mail válido.")).toBeNull();
    expect(salvar.hasAttribute("disabled")).toBe(false);
  });

  it("não pede CRP no cadastro de supervisor: ele vem no carimbo (DF71)", async () => {
    abrir();
    await screen.findByRole("table");
    fireEvent.click(screen.getByRole("button", { name: "Cadastrar usuário" }));
    fireEvent.click(screen.getByLabelText("Supervisor"));
    expect(screen.queryByLabelText(/CRP/)).toBeNull();
    expect(screen.queryByText(/CRP/)).toBeNull();
  });
});
