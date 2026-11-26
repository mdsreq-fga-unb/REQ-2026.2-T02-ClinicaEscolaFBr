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
  ciclosAnteriores: [],
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
// Caso no ciclo 3, ainda sem pagamento, com os ciclos 2 e 1 pagos; o ciclo 1 foi
// registrado há mais de 24 meses e corrigido (RNF36).
const COM_CICLOS_ANTERIORES: SituacaoContribuicao = {
  ...PENDENTE,
  cicloAtendimento: 3,
  ciclosAnteriores: [
    {
      cicloAtendimento: 2,
      vigente: {
        ...REGISTRO,
        pagoEm: "2026-03-10",
        registradoEm: "2026-03-10T14:00:00.000Z",
      },
      anteriores: [],
    },
    {
      cicloAtendimento: 1,
      vigente: {
        ...CORRECAO,
        valorCentavos: 3000,
        pagoEm: "2024-02-05",
        registradoEm: "2024-02-06T12:30:00.000Z",
      },
      anteriores: [
        {
          ...REGISTRO,
          valorCentavos: 3000,
          pagoEm: "2024-02-05",
          registradoEm: "2024-02-05T12:00:00.000Z",
        },
      ],
    },
  ],
};

type Resposta = [number, unknown];

// A consulta devolve `situacao`; cada envio devolve a resposta seguinte de `envio`
// (a última se repete).
function simularApi(
  situacao: SituacaoContribuicao,
  envio?: Resposta | Resposta[],
) {
  const fila: Resposta[] = Array.isArray(envio?.[0])
    ? [...(envio as Resposta[])]
    : envio
      ? [envio as Resposta]
      : [];
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
        metodo === "GET"
          ? [200, situacao]
          : ((fila.length > 1 ? fila.shift() : fila[0]) ?? [500, {}]);
      return new Response(JSON.stringify(corpo), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
  return chamadas;
}

const montar = (somenteLeitura = false) =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <CartaoContribuicao
        casoId="c1"
        nome="Mariana Alves Toledo"
        somenteLeitura={somenteLeitura}
      />
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
    // O pedido leva o valor que a tela mostrou, para a API conferir.
    expect(post.corpo).toEqual({
      pagoEm: hojeBr(),
      forma: "pix",
      valorEsperadoCentavos: 3500,
    });
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
    // O pedido leva a versão aberta, para a API recusar se outra pessoa corrigiu.
    expect(post.corpo).toEqual({
      versaoEsperada: 1,
      valorCentavos: 3500,
      pagoEm: "2026-11-09",
      forma: "cartao",
      motivo: "Forma de pagamento registrada errada.",
    });
    expect(
      screen.getByRole("list", { name: "Versões anteriores do pagamento" }),
    ).toBeInTheDocument();
  });

  it("a coordenação vê o pagamento e as versões só para leitura, sem registrar nem corrigir (RF41, RNF36)", async () => {
    simularApi(CORRIGIDA);
    montar(true);
    const cartao = await screen.findByRole("region", {
      name: "Contribuição social · Ciclo 1",
    });
    expect(within(cartao).getByText("Efetivada")).toBeInTheDocument();
    expect(
      within(cartao).getByRole("list", {
        name: "Versões anteriores do pagamento",
      }),
    ).toBeInTheDocument();
    expect(within(cartao).queryByRole("button")).toBeNull();
  });

  it("a coordenação não vê o botão de registrar no caso pendente (RF41)", async () => {
    simularApi(PENDENTE);
    montar(true);
    const cartao = await screen.findByRole("region", {
      name: "Contribuição social · Ciclo 1",
    });
    expect(within(cartao).getByText("Pendente")).toBeInTheDocument();
    expect(within(cartao).queryByRole("button")).toBeNull();
  });

  it.each([
    ["a secretaria", false],
    ["a coordenação", true],
  ])(
    "%s vê os pagamentos dos ciclos anteriores, do mais recente para o mais antigo, com as versões anteriores ao abrir (RF41, RNF36)",
    async (_quem, somenteLeitura) => {
      simularApi(COM_CICLOS_ANTERIORES);
      montar(somenteLeitura);
      const cartao = await screen.findByRole("region", {
        name: "Contribuição social · Ciclo 3",
      });
      const secao = within(cartao).getByRole("region", {
        name: "Ciclos anteriores",
      });
      expect(
        within(secao)
          .getAllByRole("heading", { level: 4 })
          .map((h) => h.textContent),
      ).toEqual(["Ciclo 2", "Ciclo 1"]);
      const [ciclo2, ciclo1] = within(secao)
        .getAllByRole("listitem")
        .filter((item) => item.querySelector("h4"));
      expect(ciclo2).toHaveTextContent("R$ 35,00 · 10/03/2026 · Pix");
      expect(ciclo2).toHaveTextContent(
        "Registrado por Juliana Rocha em 10/03/2026, às 11:00.",
      );
      expect(ciclo2.querySelector("details")).toBeNull();

      // O ciclo 1 mostra a versão vigente (a correção) e, ao abrir, a anterior.
      expect(ciclo1).toHaveTextContent("R$ 30,00 · 05/02/2024 · Cartão");
      expect(ciclo1).toHaveTextContent(
        "Corrigido por Juliana Rocha em 06/02/2024, às 09:30. Motivo: forma de pagamento registrada errada.",
      );
      const detalhes = ciclo1.querySelector("details")!;
      expect(detalhes).not.toHaveAttribute("open");
      fireEvent.click(within(ciclo1).getByText("Ver versões anteriores (1)"));
      const versoes = within(ciclo1).getByRole("list", {
        name: "Versões anteriores do pagamento do ciclo 1",
      });
      expect(versoes).toHaveTextContent("R$ 30,00 · 05/02/2024 · Pix");
      expect(versoes).toHaveTextContent(
        "Registrado por Juliana Rocha em 05/02/2024, às 09:00.",
      );

      // Os ciclos anteriores são só para consulta, para os dois perfis.
      expect(
        within(secao).queryByRole("button", { name: /pagamento/ }),
      ).toBeNull();
      expect(
        within(cartao).queryAllByRole("button", {
          name: "Registrar pagamento",
        }),
      ).toHaveLength(somenteLeitura ? 0 : 1);
    },
  );

  it("caso a partir do ciclo 2 sem pagamento nos ciclos anteriores: a seção diz que não há registro (RF41, RNF36)", async () => {
    simularApi({ ...PENDENTE, cicloAtendimento: 2 });
    montar(true);
    const cartao = await screen.findByRole("region", {
      name: "Contribuição social · Ciclo 2",
    });
    expect(
      within(cartao).getByRole("region", { name: "Ciclos anteriores" }),
    ).toHaveTextContent("Nenhum pagamento registrado nos ciclos anteriores.");
  });

  it("no primeiro ciclo do caso, não há seção de ciclos anteriores (RF41)", async () => {
    simularApi(CORRIGIDA);
    montar();
    const cartao = await screen.findByRole("region", {
      name: "Contribuição social · Ciclo 1",
    });
    expect(
      within(cartao).queryByRole("region", { name: "Ciclos anteriores" }),
    ).toBeNull();
  });

  it("o valor mudou com o formulário aberto: o aviso mostra o valor novo, e a secretaria confirma de novo com ele (RF41)", async () => {
    const chamadas = simularApi(PENDENTE, [
      [
        409,
        {
          codigo: "valor_alterado",
          message:
            "O valor da contribuição mudou para R$ 40,00. Confira e confirme o pagamento de novo.",
          valorAtualCentavos: 4000,
        },
      ],
      [201, EFETIVADA],
    ]);
    montar();
    fireEvent.click(
      await screen.findByRole("button", { name: "Registrar pagamento" }),
    );
    const form = screen.getByRole("region", {
      name: "Registrar pagamento de Mariana Alves Toledo",
    });
    fireEvent.click(within(form).getByRole("radio", { name: "Pix" }));
    fireEvent.click(
      within(form).getByRole("button", { name: "Confirmar pagamento" }),
    );
    const aviso = await within(form).findByRole("alert");
    expect(aviso).toHaveTextContent("Não foi possível registrar o pagamento.");
    expect(aviso).toHaveTextContent(
      "O valor da contribuição mudou para R$ 40,00. Confira e confirme o pagamento de novo.",
    );
    await waitFor(() => expect(aviso).toHaveFocus());
    expect(form.textContent?.replace(/\s/g, " ")).toContain("R$ 40,00");

    fireEvent.click(
      within(form).getByRole("button", { name: "Confirmar pagamento" }),
    );
    expect(
      await screen.findByText("Pagamento registrado."),
    ).toBeInTheDocument();
    const posts = chamadas.filter((c) => c.metodo === "POST");
    expect(
      posts.map(
        (c) =>
          (c.corpo as { valorEsperadoCentavos: number }).valorEsperadoCentavos,
      ),
    ).toEqual([3500, 4000]);
  });

  it("a correção de uma versão que outra pessoa já corrigiu mostra o aviso para conferir a versão atual (RF41, RNF36)", async () => {
    simularApi(EFETIVADA, [
      409,
      {
        codigo: "versao_desatualizada",
        message:
          "O pagamento foi corrigido por outra pessoa agora e está na versão 2. Confira a versão atual antes de corrigir de novo.",
        versaoAtual: 2,
      },
    ]);
    montar();
    fireEvent.click(
      await screen.findByRole("button", { name: "Corrigir pagamento" }),
    );
    const form = screen.getByRole("region", { name: "Corrigir pagamento" });
    fireEvent.click(within(form).getByRole("radio", { name: "Cartão" }));
    fireEvent.change(within(form).getByLabelText("Motivo da correção"), {
      target: { value: "Forma registrada errada." },
    });
    fireEvent.click(
      within(form).getByRole("button", { name: "Salvar correção" }),
    );
    const aviso = await within(form).findByRole("alert");
    expect(aviso).toHaveTextContent("Não foi possível salvar a correção.");
    expect(aviso).toHaveTextContent(
      "O pagamento foi corrigido por outra pessoa agora e está na versão 2. Confira a versão atual antes de corrigir de novo. Cancele e abra a correção de novo para ver a versão atual.",
    );
  });

  it("na correção, o valor em formato errado é recusado no campo (RF41)", async () => {
    simularApi(EFETIVADA, [201, CORRIGIDA]);
    montar();
    fireEvent.click(
      await screen.findByRole("button", { name: "Corrigir pagamento" }),
    );
    const valor = screen.getByLabelText("Valor (R$)");
    // Letras nem entram no campo; o formato errado com números é recusado.
    fireEvent.change(valor, { target: { value: "trinta" } });
    expect(valor).toHaveValue("");
    fireEvent.change(valor, { target: { value: "35,,0" } });
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
