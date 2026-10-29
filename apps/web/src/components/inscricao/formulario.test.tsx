import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FormularioInscricao } from "./formulario";

const recibo = { numero: "2026-00042", criadaEm: "2026-10-25T18:00:00.000Z" };
const preencher = (id: string, value: string) =>
  fireEvent.change(document.getElementById(id)!, { target: { value } });
const continuar = () =>
  fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
function dados(menor = false) {
  preencher("nomeCompleto", "Pessoa Fictícia");
  preencher("dataNascimento", menor ? "2020-01-01" : "1994-08-22");
  preencher("cpf", "11144477735");
  preencher("rg", "MG-12.345 SSP/MG");
  preencher("endereco", "Rua Fictícia, 10");
  preencher("estadoCivil", "Solteiro(a)");
  preencher("email", "teste@example.com");
  preencher("canalPreferencial", "email");
}
function triagem() {
  preencher("queixa", "Queixa fictícia privada");
  preencher("percepcaoUrgencia", "Urgência fictícia privada");
  preencher("historicoRelevante", "Histórico fictício privado");
}
function revisao() {
  render(<FormularioInscricao />);
  dados();
  continuar();
  triagem();
  continuar();
}
const enviar = () =>
  fireEvent.click(
    screen.getByRole("button", { name: "Confirmar e enviar inscrição" }),
  );
const confirmar = () => fireEvent.click(screen.getByRole("checkbox"));
const response = (body: unknown = recibo, status = 201) =>
  new Response(JSON.stringify(body), { status });

describe("Formulário RF1/RF2", () => {
  beforeEach(() => vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:3333"));
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
  it("associa erros aos campos, foca resumo e preserva valores válidos", () => {
    render(<FormularioInscricao />);
    preencher("nomeCompleto", "Nome preservado");
    continuar();
    expect(screen.getByRole("alert")).toHaveFocus();
    expect(document.getElementById("cpf")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(document.getElementById("cpf")).toHaveAttribute(
      "aria-describedby",
      expect.stringContaining("cpf-erro"),
    );
    expect(document.getElementById("nomeCompleto")).toHaveValue(
      "Nome preservado",
    );
    expect(screen.getByRole("link", { name: /CPF:/ })).toHaveAttribute(
      "href",
      "#cpf",
    );
  });
  it("exige responsável para menor, mantendo os outros campos", () => {
    render(<FormularioInscricao />);
    dados(true);
    continuar();
    expect(document.getElementById("responsavelLegal")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    preencher("responsavelLegal", "Responsável Fictício");
    continuar();
    expect(screen.getByRole("heading", { name: "Triagem" })).toHaveFocus();
  });
  it.each(["whatsapp", "ligacao"])(
    "exige celular para %s, mas aceita e-mail como único contato",
    (canal) => {
      render(<FormularioInscricao />);
      dados();
      preencher("canalPreferencial", canal);
      continuar();
      expect(document.getElementById("celular")).toHaveAttribute(
        "aria-invalid",
        "true",
      );
      preencher("canalPreferencial", "email");
      continuar();
      expect(
        screen.getByRole("heading", { name: "Triagem" }),
      ).toBeInTheDocument();
    },
  );
  it("revisa, corrige dados e triagem sem perder valores; alteração exige nova confirmação", () => {
    revisao();
    confirmar();
    fireEvent.click(screen.getByRole("button", { name: "Editar dados" }));
    expect(document.getElementById("email")).toHaveValue("teste@example.com");
    preencher("nomeCompleto", "Nome corrigido");
    continuar();
    expect(document.getElementById("queixa")).toHaveValue(
      "Queixa fictícia privada",
    );
    continuar();
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(screen.getByText("Nome corrigido")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Editar triagem" }));
    preencher("queixa", "Declaração corrigida");
    continuar();
    expect(screen.getByText("Declaração corrigida")).toBeInTheDocument();
  });
  it("não envia sem confirmação; reserva RF57 sem inventar aceite", () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    revisao();
    enviar();
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getAllByRole("checkbox")).toHaveLength(1);
    expect(
      screen.getByRole("complementary", { name: "Consentimento futuro" }),
    ).toHaveTextContent("aprovação da FBr");
    expect(screen.getByRole("checkbox")).toHaveAttribute(
      "aria-describedby",
      "confirmado-erro",
    );
  });
  it("aguarda resposta confirmada e bloqueia envio duplo", async () => {
    let resolver!: (valor: Response) => void;
    const fetch = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolver = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetch);
    revisao();
    confirmar();
    enviar();
    expect(screen.queryByText("2026-00042")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviando…" })).toBeDisabled();
    expect(fetch).toHaveBeenCalledTimes(1);
    resolver(response());
    await screen.findByText("2026-00042");
    expect(screen.getByText(/15:00/)).toBeInTheDocument();
    for (const privado of [
      "Pessoa Fictícia",
      "11144477735",
      "MG-12.345 SSP/MG",
      "teste@example.com",
      "Queixa fictícia privada",
      "Urgência fictícia privada",
      "Histórico fictício privado",
    ])
      expect(document.body).not.toHaveTextContent(privado);
    expect(
      screen.getByText("A inscrição não garante vaga nem agendamento."),
    ).toBeInTheDocument();
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    fireEvent.click(
      screen.getByRole("button", { name: "Imprimir ou salvar em PDF" }),
    );
    expect(print).toHaveBeenCalledOnce();
  });
  it.each(["HTTP", "timeout", "rede", "resposta inválida"])(
    "preserva dados e a chave após %s, e tenta novamente",
    async (falha) => {
      const fetch = vi.fn().mockResolvedValue(response());
      if (falha === "HTTP")
        fetch.mockResolvedValueOnce(
          response({ message: "SQL: dado clínico privado" }, 503),
        );
      if (falha === "timeout")
        fetch.mockRejectedValueOnce(
          new DOMException("Tempo esgotado", "TimeoutError"),
        );
      if (falha === "rede")
        fetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));
      if (falha === "resposta inválida")
        fetch.mockResolvedValueOnce(response({ numero: "erro" }));
      vi.stubGlobal("fetch", fetch);
      revisao();
      confirmar();
      enviar();
      await screen.findByRole("alert");
      expect(document.body).not.toHaveTextContent("SQL: dado clínico privado");
      expect(screen.queryByText("2026-00042")).not.toBeInTheDocument();
      expect(screen.getByText("Pessoa Fictícia")).toBeInTheDocument();
      enviar();
      await screen.findByText("2026-00042");
      const primeiro = JSON.parse(fetch.mock.calls[0][1].body);
      const repetido = JSON.parse(fetch.mock.calls[1][1].body);
      expect(repetido).toEqual(primeiro);
      expect(fetch.mock.calls[0][1].credentials).toBe("omit");
      expect(fetch.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
    },
  );
  it("identifica campo rejeitado pelo servidor sem renderizar texto arbitrário", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          response(
            { message: [{ path: ["email"], message: "SQL segredo" }] },
            400,
          ),
        ),
    );
    revisao();
    confirmar();
    enviar();
    await waitFor(() =>
      expect(
        screen.getByRole("link", { name: /E-mail: Confira/ }),
      ).toBeInTheDocument(),
    );
    expect(document.body).not.toHaveTextContent("SQL segredo");
    fireEvent.click(screen.getByRole("link", { name: /E-mail: Confira/ }));
    expect(document.getElementById("email")).toHaveFocus();
    expect(document.getElementById("email")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });
  it("mantém CVV e SAMU em todas as etapas", () => {
    render(<FormularioInscricao />);
    dados();
    for (let etapa = 0; etapa < 3; etapa++) {
      expect(screen.getByRole("link", { name: /CVV/ })).toHaveAttribute(
        "href",
        "tel:188",
      );
      expect(screen.getByRole("link", { name: /SAMU/ })).toHaveAttribute(
        "href",
        "tel:192",
      );
      if (etapa === 1) triagem();
      if (etapa < 2) continuar();
    }
  });
});

describe("Inscrição fechada até o termo de consentimento (RF1, RF57)", () => {
  afterEach(cleanup);

  it("mantém os contatos de emergência e não mostra o formulário", () => {
    render(<FormularioInscricao aberta={false} />);
    expect(screen.getByText(/ainda não estão abertas/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "CVV (188)" })).toBeInTheDocument();
    expect(document.querySelector("form")).toBeNull();
    expect(screen.queryByRole("button", { name: "Continuar" })).toBeNull();
  });
});
