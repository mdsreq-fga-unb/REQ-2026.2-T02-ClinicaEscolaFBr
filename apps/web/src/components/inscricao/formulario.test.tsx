import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buscarTermoVigente } from "./termo";
vi.mock("./termo", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./termo")>()),
  buscarTermoVigente: vi.fn(),
}));
const termoTeste = {
  versao: "0.1",
  titulo: "Termo de consentimento",
  introducao: "Texto para teste",
  provisoria: true,
  vigenteDesde: "2026-11-06T03:00:00.000Z",
  topicos: [
    { titulo: "Seus direitos", corpo: "Procure a secretaria para revogar." },
  ],
};
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
  preencher("celular", "(61) 99999-9999");
  preencher("email", "teste@example.com");
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
const confirmar = async () => {
  await waitFor(() =>
    expect(document.getElementById("aceiteTermo")).not.toBeDisabled(),
  );
  fireEvent.click(document.getElementById("confirmado")!);
  fireEvent.click(document.getElementById("aceiteTermo")!);
};
const response = (body: unknown = recibo, status = 201) =>
  new Response(JSON.stringify(body), { status });

describe("Formulário RF1/RF2", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:3333");
    vi.mocked(buscarTermoVigente).mockResolvedValue(termoTeste);
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
  it("associa erros aos campos, foca resumo e preserva valores válidos (RF1, RNF1)", () => {
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
    // O CPF do responsável também é obrigatório (DF47).
    expect(document.getElementById("cpfResponsavel")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    preencher("cpfResponsavel", "52998224725");
    continuar();
    expect(
      screen.getByRole("heading", {
        name: "Sobre o atendimento que você procura",
      }),
    ).toHaveFocus();
  });
  it("mostra os dados do responsável só para menor e revisa a ficha de identificação (DF43)", () => {
    render(<FormularioInscricao />);
    dados();
    expect(document.getElementById("cpfResponsavel")).toBeNull();
    expect(document.getElementById("sexo")).not.toBeRequired();
    preencher("dataNascimento", "2020-01-01");
    preencher("responsavelLegal", "Responsável Fictício");
    preencher("cpfResponsavel", "52998224725");
    preencher("documentoResponsavel", "Certidão de nascimento");
    preencher("profissao", "Estudante");
    preencher("cep", "72500-000");
    continuar();
    triagem();
    continuar();
    expect(screen.getAllByText("52998224725")).toHaveLength(2);
    expect(screen.getByText("Certidão de nascimento")).toBeInTheDocument();
    expect(screen.getByText("Estudante")).toBeInTheDocument();
    expect(screen.getByText("72500-000")).toBeInTheDocument();
    expect(screen.getByText("Sexo").nextSibling).toHaveTextContent(
      "Não informado",
    );
  });
  it("ignora o CPF do responsável incompleto quando a data é corrigida para a de um adulto (DF43)", () => {
    render(<FormularioInscricao />);
    dados(true);
    preencher("responsavelLegal", "Responsável Fictício");
    preencher("cpfResponsavel", "5299822");
    preencher("dataNascimento", "1990-01-01");
    continuar();
    expect(
      screen.getByRole("heading", {
        name: "Sobre o atendimento que você procura",
      }),
    ).toHaveFocus();
  });
  it("não envia os dados do responsável quando a data é corrigida para a de um adulto (DF43, LGPD)", async () => {
    const fetch = vi.fn().mockResolvedValue(response());
    vi.stubGlobal("fetch", fetch);
    render(<FormularioInscricao />);
    dados(true);
    preencher("responsavelLegal", "Responsável Fictício");
    preencher("cpfResponsavel", "52998224725");
    preencher("documentoResponsavel", "Certidão de nascimento");
    preencher("dataNascimento", "1990-01-01");
    continuar();
    triagem();
    continuar();
    expect(screen.queryByText("52998224725")).toBeNull();
    await confirmar();
    enviar();
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({
      responsavelLegal: "",
      cpfResponsavel: "",
      documentoResponsavel: "",
    });
  });
  it("recusa CEP incompleto da ficha de identificação (DF43)", () => {
    render(<FormularioInscricao />);
    dados();
    preencher("cep", "7250");
    continuar();
    expect(document.getElementById("cep")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });
  it.each(["celular", "email"])(
    "exige o %s e avisa que os contatos são por e-mail (DF48)",
    (contato) => {
      render(<FormularioInscricao />);
      dados();
      expect(
        screen.getByText("Os contatos da clínica são feitos por e-mail."),
      ).toBeVisible();
      expect(screen.queryByText(/canal/i)).toBeNull();
      preencher(contato, "");
      continuar();
      expect(document.getElementById(contato)).toHaveAttribute(
        "aria-invalid",
        "true",
      );
    },
  );
  it("revisa, corrige dados e triagem sem perder valores; alteração exige nova confirmação", async () => {
    revisao();
    await confirmar();
    fireEvent.click(screen.getByRole("button", { name: "Editar dados" }));
    expect(document.getElementById("email")).toHaveValue("teste@example.com");
    preencher("nomeCompleto", "Nome corrigido");
    continuar();
    expect(document.getElementById("queixa")).toHaveValue(
      "Queixa fictícia privada",
    );
    continuar();
    expect(
      screen.getByRole("checkbox", { name: /Revisei os dados/ }),
    ).not.toBeChecked();
    expect(screen.getByText("Nome corrigido")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Editar triagem" }));
    preencher("queixa", "Declaração corrigida");
    continuar();
    expect(screen.getByText("Declaração corrigida")).toBeInTheDocument();
  });
  it("não envia sem confirmação e consentimento independentes", () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    revisao();
    enviar();
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
    expect(
      screen.getByRole("checkbox", { name: /Revisei os dados/ }),
    ).toHaveAttribute("aria-describedby", "confirmado-erro");
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
    await confirmar();
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
    // Sem escolha de canal: o contato é sempre pelo e-mail (DF48).
    expect(document.body).toHaveTextContent(
      "a clínica entrará em contato pelo e-mail informado na inscrição.",
    );
    expect(document.body).not.toHaveTextContent("canal que você escolheu");
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
      await confirmar();
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
    await confirmar();
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
  it("RF57 identifica responsável somente para leitura, mantém aceite no quadro e permite corrigir dados (RNF56)", async () => {
    render(<FormularioInscricao />);
    dados(true);
    preencher("responsavelLegal", "Responsável Fictício");
    preencher("cpfResponsavel", "52998224725");
    continuar();
    triagem();
    continuar();
    const termo = screen.getByRole("region", {
      name: "Termo de consentimento para tratamento de dados",
    });
    const identificacao = within(termo).getByRole("region", {
      name: "Identificação e concordância do responsável legal",
    });
    expect(
      within(identificacao).getByText("Responsável Fictício"),
    ).toBeInTheDocument();
    expect(within(identificacao).getByText("52998224725")).toBeInTheDocument();
    expect(
      within(identificacao).queryByRole("textbox"),
    ).not.toBeInTheDocument();
    expect(
      within(termo).getByText("Inscrição de menor de idade"),
    ).toBeInTheDocument();
    expect(
      within(termo).getByText(/O aceite on-line não substitui/),
    ).toBeInTheDocument();
    expect(
      within(termo).getByRole("checkbox", { name: /Sou o responsável legal/ }),
    ).not.toBeChecked();
    await confirmar();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Voltar e corrigir dados",
      }),
    );
    expect(document.getElementById("cpfResponsavel")).toHaveFocus();
    preencher("cpfResponsavel", "11144477735");
    continuar();
    continuar();
    expect(document.getElementById("aceiteTermo")).not.toBeChecked();
  });
  it("RF57 liga erro do CPF do responsável à correção na etapa 1 (RNF56)", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          response({ message: [{ path: ["cpfResponsavel"] }] }, 400),
        ),
    );
    render(<FormularioInscricao />);
    dados(true);
    preencher("responsavelLegal", "Responsável Fictício");
    preencher("cpfResponsavel", "52998224725");
    continuar();
    triagem();
    continuar();
    await confirmar();
    enviar();
    const link = await screen.findByRole("link", {
      name: /CPF do responsável: Informe o CPF do responsável legal na etapa 1/,
    });
    expect(link).toHaveAttribute("href", "#cpfResponsavel");
    fireEvent.click(link);
    expect(document.getElementById("cpfResponsavel")).toHaveFocus();
    expect(document.getElementById("nomeCompleto")).toHaveValue(
      "Pessoa Fictícia",
    );
  });
  it("recarrega termo atualizado, desmarca aceite, mantém dados e permite nova tentativa", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        response({ codigo: "termo_desatualizado", versaoVigente: "0.2" }, 409),
      )
      .mockResolvedValue(response());
    vi.stubGlobal("fetch", fetch);
    revisao();
    await confirmar();
    vi.mocked(buscarTermoVigente).mockResolvedValue({
      ...termoTeste,
      versao: "0.2",
    });
    enviar();
    await waitFor(() => expect(screen.getByRole("alert")).toHaveFocus());
    expect(document.getElementById("aceiteTermo")).not.toBeChecked();
    expect(screen.getByText("Pessoa Fictícia")).toBeInTheDocument();
    await waitFor(() =>
      expect(document.getElementById("aceiteTermo")).not.toBeDisabled(),
    );
    fireEvent.click(document.getElementById("aceiteTermo")!);
    enviar();
    await screen.findByText("2026-00042");
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toMatchObject({
      versaoTermo: "0.2",
      aceiteTermo: true,
    });
    expect(JSON.parse(fetch.mock.calls[1][1].body).chaveEnvio).toBe(
      JSON.parse(fetch.mock.calls[0][1].body).chaveEnvio,
    );
  });
  it("mostra falha do termo, mantém aceite bloqueado e permite recarregar", async () => {
    vi.mocked(buscarTermoVigente).mockRejectedValueOnce(new Error("offline"));
    revisao();
    await screen.findByText(/Não foi possível carregar o termo/);
    expect(document.getElementById("aceiteTermo")).toBeDisabled();
    fireEvent.click(
      screen.getByRole("button", { name: "Tentar carregar novamente" }),
    );
    await waitFor(() =>
      expect(document.getElementById("aceiteTermo")).not.toBeDisabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: /Seus direitos/ }));
    expect(
      screen.getByRole("button", { name: /Seus direitos/ }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByText("Procure a secretaria para revogar."),
    ).toBeVisible();
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
