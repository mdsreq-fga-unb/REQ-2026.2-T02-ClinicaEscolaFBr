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
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SituacaoContribuicao, VersaoContribuicao } from "@clinica/shared";
import { hojeBr } from "@/lib/formato";
import { CartaoContribuicao } from "./contribuicao";

const PENDENTE: SituacaoContribuicao = {
  casoId: "c1",
  cicloAtendimento: 1,
  situacao: "pendente",
  prazo: { vinculadoEm: "2026-11-05T13:00:00.000Z", ate: "2099-11-15" },
  valorAtualCentavos: 3500,
  vigente: null,
  anteriores: [],
};
const REGISTRO: VersaoContribuicao = {
  versao: 1,
  valorCentavos: 3500,
  pagoEm: "2026-11-09",
  forma: "pix",
  motivoCorrecao: null,
  registradoPor: "Juliana Rocha",
  registradoEm: "2026-11-09T18:31:00.000Z",
};
const CORRECAO: VersaoContribuicao = {
  versao: 2,
  valorCentavos: 3500,
  pagoEm: "2026-11-09",
  forma: "cartao",
  motivoCorrecao: "forma de pagamento registrada errada.",
  registradoPor: "Juliana Rocha",
  registradoEm: "2026-11-09T19:02:00.000Z",
};
const EFETIVADA: SituacaoContribuicao = {
  ...PENDENTE,
  situacao: "efetivada",
  vigente: REGISTRO,
};
const CORRIGIDA: SituacaoContribuicao = {
  ...EFETIVADA,
  vigente: CORRECAO,
  anteriores: [REGISTRO],
};

type Resposta = [number, unknown];

// A consulta devolve `situacao`; o envio devolve `envio`.
function simularApi(situacao: SituacaoContribuicao, envio?: Resposta) {
  const chamadas: { url: string; metodo: string; corpo: unknown }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const metodo = init?.method ?? "GET";
      chamadas.push({
        url,
        metodo,
        corpo: init?.body ? JSON.parse(init.body as string) : null,
      });
      const [status, corpo]: Resposta =
        metodo === "GET" ? [200, situacao] : (envio ?? [500, {}]);
      return new Response(JSON.stringify(corpo), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
  return chamadas;
}

const montar = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <CartaoContribuicao casoId="c1" nome="Mariana Alves Toledo" />
    </QueryClientProvider>,
  );

describe("Contribuição social na ficha do paciente (RF41)", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("pendente: mostra o selo com texto e o prazo de 10 dias contado do vínculo, com o botão de registrar (RF41, RNF56)", async () => {
    simularApi({
      ...PENDENTE,
      prazo: { vinculadoEm: "2026-11-05T13:00:00.000Z", ate: "2099-11-15" },
    });
    montar();
    const cartao = await screen.findByRole("region", {
      name: "Contribuição social · Ciclo 1",
    });
    expect(within(cartao).getByText("Pendente")).toBeInTheDocument();
    expect(cartao).toHaveTextContent(
      "Prazo para pagar: até 15/11/2099 (10 dias corridos a partir do vínculo com o estagiário, em 05/11/2026).",
    );
    expect(
      within(cartao).getByRole("button", { name: "Registrar pagamento" }),
    ).toBeInTheDocument();
  });

  it("com o prazo vencido, o cartão diz que o prazo terminou, sem bloquear o registro (RF41)", async () => {
    simularApi({
      ...PENDENTE,
      prazo: { vinculadoEm: "2026-01-05T13:00:00.000Z", ate: "2026-01-15" },
    });
    montar();
    const cartao = await screen.findByRole("region", {
      name: "Contribuição social · Ciclo 1",
    });
    expect(cartao).toHaveTextContent(
      "Prazo para pagar: encerrado em 15/01/2026",
    );
    expect(
      within(cartao).getByRole("button", { name: "Registrar pagamento" }),
    ).toBeInTheDocument();
  });

  it("sem vínculo com estagiário, a contribuição ainda não é devida e não há botão de registrar (RF41)", async () => {
    simularApi({ ...PENDENTE, prazo: null });
    montar();
    const cartao = await screen.findByRole("region", {
      name: "Contribuição social · Ciclo 1",
    });
    expect(cartao).toHaveTextContent(
      "A contribuição só é devida depois do vínculo",
    );
    expect(within(cartao).queryByRole("button")).toBeNull();
  });

  it("registra o pagamento em Pix: o formulário abre no lugar do cartão, com o valor do parâmetro, e o cartão volta efetivado (RF41)", async () => {
    const chamadas = simularApi(PENDENTE, [201, EFETIVADA]);
    montar();
    fireEvent.click(
      await screen.findByRole("button", { name: "Registrar pagamento" }),
    );
    const form = screen.getByRole("region", {
      name: "Registrar pagamento de Mariana Alves Toledo",
    });
    // O título do formulário recebe o foco quando ele abre.
    await waitFor(() =>
      expect(
        within(form).getByRole("heading", {
          name: "Registrar pagamento de Mariana Alves Toledo",
        }),
      ).toHaveFocus(),
    );
    expect(form).toHaveTextContent("Valor da contribuição");
    expect(form).toHaveTextContent("R$ 35,00");
    // O valor não é editável no registro.
    expect(within(form).queryByLabelText(/Valor/)).toBeNull();
    expect(within(form).getByLabelText("Data do pagamento")).toHaveValue(
      hojeBr(),
    );
    const grupo = within(form).getByRole("group", {
      name: "Forma de pagamento",
    });
    expect(
      within(grupo)
        .getAllByRole("radio")
        .map((r) => r.closest("label")?.textContent),
    ).toEqual(["Dinheiro", "Pix", "Cartão"]);

    fireEvent.click(within(grupo).getByRole("radio", { name: "Pix" }));
    fireEvent.click(
      within(form).getByRole("button", { name: "Confirmar pagamento" }),
    );

    const sucesso = await screen.findByText("Pagamento registrado.");
    await waitFor(() => expect(sucesso.closest("[tabindex]")).toHaveFocus());
    const post = chamadas.find((c) => c.metodo === "POST")!;
    expect(post.url).toContain("/casos/c1/contribuicao");
    expect(post.corpo).toEqual({ pagoEm: hojeBr(), forma: "pix" });
    const cartao = screen.getByRole("region", {
      name: "Contribuição social · Ciclo 1",
    });
    expect(within(cartao).getByText("Efetivada")).toBeInTheDocument();
    expect(cartao).toHaveTextContent(
      "Registrado por Juliana Rocha em 09/11/2026, às 15:31.",
    );
  });

  it("sem a forma de pagamento, o erro fica ligado ao grupo de rádio e nada é enviado (RF41, RNF56, RNF57)", async () => {
    const chamadas = simularApi(PENDENTE, [201, EFETIVADA]);
    montar();
    fireEvent.click(
      await screen.findByRole("button", { name: "Registrar pagamento" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmar pagamento" }),
    );
    const grupo = screen.getByRole("group", { name: "Forma de pagamento" });
    expect(grupo).toHaveAccessibleDescription("Escolha a forma de pagamento.");
    expect(grupo).toHaveAttribute("aria-invalid", "true");
    expect(chamadas.some((c) => c.metodo === "POST")).toBe(false);
  });

  it("recusa a data futura no próprio campo, com o erro ligado por aria-describedby (RF41, RNF57)", async () => {
    const chamadas = simularApi(PENDENTE, [201, EFETIVADA]);
    montar();
    fireEvent.click(
      await screen.findByRole("button", { name: "Registrar pagamento" }),
    );
    const data = screen.getByLabelText("Data do pagamento");
    expect(data).toHaveAttribute("max", hojeBr());
    fireEvent.change(data, { target: { value: "2099-01-01" } });
    fireEvent.click(screen.getByRole("radio", { name: "Dinheiro" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmar pagamento" }),
    );
    expect(data).toHaveAccessibleDescription(
      "A data do pagamento não pode ser futura.",
    );
    expect(data).toHaveAttribute("aria-invalid", "true");
    expect(data).toHaveFocus();
    expect(chamadas.some((c) => c.metodo === "POST")).toBe(false);
  });

  it("o segundo pagamento no ciclo mostra o aviso com a data do já registrado, e o aviso recebe o foco (RF41, RNF58)", async () => {
    simularApi(PENDENTE, [
      409,
      {
        message: "Este ciclo já tem pagamento registrado.",
        pagoEm: "2026-11-09",
      },
    ]);
    montar();
    fireEvent.click(
      await screen.findByRole("button", { name: "Registrar pagamento" }),
    );
    fireEvent.click(screen.getByRole("radio", { name: "Cartão" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmar pagamento" }),
    );
    const aviso = await screen.findByRole("alert");
    expect(aviso).toHaveTextContent("Este ciclo já tem pagamento registrado.");
    expect(aviso).toHaveTextContent(
      "A contribuição foi paga em 09/11/2026. Se houver erro no registro, use “Corrigir pagamento”.",
    );
    await waitFor(() => expect(aviso).toHaveFocus());
  });

  it("efetivada e corrigida: mostra a versão vigente com o motivo e a anterior abaixo, com quem registrou e quando (RF41, RNF36)", async () => {
    simularApi(CORRIGIDA);
    montar();
    const cartao = await screen.findByRole("region", {
      name: "Contribuição social · Ciclo 1",
    });
    expect(within(cartao).getByText("Efetivada")).toBeInTheDocument();
    const dados = within(cartao).getAllByRole("definition");
    // O valor em reais vem com espaço não separável entre o "R$" e o número.
    expect(dados.map((d) => d.textContent?.replace(/\s/g, " "))).toEqual([
      "R$ 35,00",
      "09/11/2026",
      "Cartão",
    ]);
    expect(cartao).toHaveTextContent(
      "Corrigido por Juliana Rocha em 09/11/2026, às 16:02. Motivo: forma de pagamento registrada errada.",
    );
    const anteriores = within(cartao).getByRole("list", {
      name: "Versões anteriores do pagamento",
    });
    expect(within(anteriores).getByText("Versão anterior")).toBeInTheDocument();
    expect(anteriores).toHaveTextContent("R$ 35,00 · 09/11/2026 · Pix");
    expect(anteriores).toHaveTextContent(
      "Registrado por Juliana Rocha em 09/11/2026, às 15:31.",
    );
    expect(
      within(cartao).getByRole("button", { name: "Corrigir pagamento" }),
    ).toBeInTheDocument();
  });

  it("a correção abre com os dados vigentes, exige o motivo e envia a versão nova com o valor em centavos (RF41, RNF36, RNF57)", async () => {
    const chamadas = simularApi(EFETIVADA, [201, CORRIGIDA]);
    montar();
    fireEvent.click(
      await screen.findByRole("button", { name: "Corrigir pagamento" }),
    );
    const form = screen.getByRole("region", { name: "Corrigir pagamento" });
    expect(within(form).getByLabelText("Valor (R$)")).toHaveValue("35,00");
    expect(within(form).getByLabelText("Data do pagamento")).toHaveValue(
      "2026-11-09",
    );
    expect(within(form).getByRole("radio", { name: "Pix" })).toBeChecked();

    fireEvent.click(within(form).getByRole("radio", { name: "Cartão" }));
    fireEvent.click(
      within(form).getByRole("button", { name: "Salvar correção" }),
    );
    const motivo = within(form).getByLabelText("Motivo da correção");
    expect(motivo).toHaveAccessibleDescription(
      expect.stringContaining("Informe o motivo da correção."),
    );
    expect(motivo).toHaveFocus();
    expect(chamadas.some((c) => c.metodo === "POST")).toBe(false);

    fireEvent.change(motivo, {
      target: { value: "Forma de pagamento registrada errada." },
    });
    fireEvent.click(
      within(form).getByRole("button", { name: "Salvar correção" }),
    );
    expect(await screen.findByText("Correção registrada.")).toBeInTheDocument();
    const post = chamadas.find((c) => c.metodo === "POST")!;
    expect(post.url).toContain("/casos/c1/contribuicao/correcao");
    expect(post.corpo).toEqual({
      valorCentavos: 3500,
      pagoEm: "2026-11-09",
      forma: "cartao",
      motivo: "Forma de pagamento registrada errada.",
    });
    expect(
      screen.getByRole("list", { name: "Versões anteriores do pagamento" }),
    ).toBeInTheDocument();
  });

  it("na correção, o valor em formato errado é recusado no campo (RF41)", async () => {
    simularApi(EFETIVADA, [201, CORRIGIDA]);
    montar();
    fireEvent.click(
      await screen.findByRole("button", { name: "Corrigir pagamento" }),
    );
    const valor = screen.getByLabelText("Valor (R$)");
    fireEvent.change(valor, { target: { value: "trinta" } });
    fireEvent.change(screen.getByLabelText("Motivo da correção"), {
      target: { value: "Valor errado." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar correção" }));
    expect(valor).toHaveAccessibleDescription(
      "Informe o valor em reais, como 35,00.",
    );
    expect(valor).toHaveFocus();
  });

  it("cancelar fecha o formulário sem enviar e devolve o cartão (RF41)", async () => {
    const chamadas = simularApi(PENDENTE);
    montar();
    fireEvent.click(
      await screen.findByRole("button", { name: "Registrar pagamento" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(
      screen.getByRole("region", { name: "Contribuição social · Ciclo 1" }),
    ).toBeInTheDocument();
    expect(chamadas.some((c) => c.metodo === "POST")).toBe(false);
  });
});
