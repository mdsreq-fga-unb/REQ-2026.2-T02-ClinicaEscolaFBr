import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VerificacaoIdentidade } from "./verificacao-identidade";

type Resposta = { status: number; corpo?: unknown };

// Respostas da API por rota, na ordem em que cada rota é chamada.
function simularApi(rotas: Record<string, Resposta[]>) {
  // A rota mais longa primeiro: "/verificacao/codigo" antes de "/verificacao".
  const nomes = Object.keys(rotas).sort((a, b) => b.length - a.length);
  const fetch = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
    async (url) => {
      const rota = nomes.find((r) => url.endsWith(r));
      const resposta = (rota ? rotas[rota].shift() : undefined) ?? {
        status: 401,
        corpo: {
          message: "Confirme sua identidade para consultar a inscrição.",
        },
      };
      return new Response(
        resposta.status === 204 ? null : JSON.stringify(resposta.corpo ?? {}),
        {
          status: resposta.status,
          headers: { "Content-Type": "application/json" },
        },
      );
    },
  );
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

const corpoDe = (fetch: ReturnType<typeof simularApi>, rota: string) =>
  fetch.mock.calls
    .filter(([url]) => String(url).endsWith(rota))
    .map(([, init]) => JSON.parse(String(init?.body)));

async function abrir(conteudo?: (numero: string) => string) {
  render(
    <VerificacaoIdentidade>
      {conteudo ? (v) => <p>{conteudo(v.numero)}</p> : undefined}
    </VerificacaoIdentidade>,
  );
  return screen.findByLabelText("CPF ou número da inscrição");
}

async function pedirCodigo(identificador: string) {
  fireEvent.change(await abrir(), { target: { value: identificador } });
  fireEvent.click(screen.getByRole("button", { name: "Enviar código" }));
}

describe("Verificação de identidade na consulta da inscrição (RF52)", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("pede o código pelo CPF e mostra a mesma mensagem, com o reenvio só depois de 60 segundos (RF52, RNF6)", async () => {
    const fetch = simularApi({ "/verificacao/codigo": [{ status: 202 }] });
    await pedirCodigo("529.982.247-25");
    expect(
      await screen.findByRole("heading", { name: "Informe o código" }),
    ).toBeVisible();
    expect(screen.getByText("Pedido recebido.")).toBeVisible();
    expect(
      screen.getByText(/Se a inscrição tiver e-mail cadastrado/),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: /Reenviar código \(em 1:00\)/ }),
    ).toBeDisabled();
    expect(screen.getByLabelText("Código de 6 dígitos")).toHaveFocus();
    expect(corpoDe(fetch, "/verificacao/codigo")).toEqual([
      { identificador: "529.982.247-25" },
    ]);
  });

  it("recusa CPF ou número em formato inválido sem chamar a API (RF52)", async () => {
    const fetch = simularApi({});
    await pedirCodigo("123");
    expect(
      await screen.findByText(/Digite o CPF com 11 números/),
    ).toBeVisible();
    expect(screen.getByLabelText("CPF ou número da inscrição")).toHaveFocus();
    expect(screen.getByLabelText("CPF ou número da inscrição")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(corpoDe(fetch, "/verificacao/codigo")).toEqual([]);
  });

  it("com o código certo, libera o conteúdo da inscrição verificada (RF52)", async () => {
    const fetch = simularApi({
      "/verificacao/codigo": [{ status: 202 }],
      "/verificacao/conferir": [
        {
          status: 200,
          corpo: { numero: "2026-00487", expiraEm: "2099-11-05T18:20:00Z" },
        },
      ],
    });
    render(
      <VerificacaoIdentidade>
        {(v) => <p>Posição da inscrição {v.numero}</p>}
      </VerificacaoIdentidade>,
    );
    fireEvent.change(
      await screen.findByLabelText("CPF ou número da inscrição"),
      { target: { value: "2026-00487" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Enviar código" }));
    fireEvent.change(await screen.findByLabelText("Código de 6 dígitos"), {
      target: { value: "48 21-90" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(await screen.findByText("Identidade confirmada.")).toBeVisible();
    expect(screen.getByText("Posição da inscrição 2026-00487")).toBeVisible();
    expect(screen.getByText(/até as 15:20/)).toBeVisible();
    expect(corpoDe(fetch, "/verificacao/conferir")).toEqual([
      { identificador: "2026-00487", codigo: "482190" },
    ]);
  });

  it("código incorreto ou expirado mostra uma mensagem única, que recebe o foco (RF52, RNF6)", async () => {
    simularApi({
      "/verificacao/codigo": [{ status: 202 }],
      "/verificacao/conferir": [
        {
          status: 400,
          corpo: {
            message:
              "Código inválido ou expirado. Confira o código no e-mail ou peça um novo.",
          },
        },
      ],
    });
    await pedirCodigo("2026-00487");
    fireEvent.change(await screen.findByLabelText("Código de 6 dígitos"), {
      target: { value: "000000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent("Código inválido ou expirado.");
    await waitFor(() => expect(alerta).toHaveFocus());
    expect(screen.getByLabelText("Código de 6 dígitos")).toHaveValue("");
    expect(screen.queryByText(/2026-00487/)).toBeNull();
  });

  it("código com menos de 6 números é recusado na tela, sem gastar tentativa (RF52)", async () => {
    const fetch = simularApi({ "/verificacao/codigo": [{ status: 202 }] });
    await pedirCodigo("2026-00487");
    fireEvent.change(await screen.findByLabelText("Código de 6 dígitos"), {
      target: { value: "123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(
      await screen.findByText("Digite os 6 números do código mais recente."),
    ).toBeVisible();
    expect(corpoDe(fetch, "/verificacao/conferir")).toEqual([]);
  });

  it("depois de 3 códigos em 60 minutos, mostra o horário de liberação e desativa o envio (RF52, RNF6)", async () => {
    simularApi({
      "/verificacao/codigo": [
        {
          status: 429,
          corpo: {
            message: "Muitos pedidos de código.",
            bloqueadoAte: "2099-11-05T18:20:00Z",
          },
        },
      ],
    });
    await pedirCodigo("2026-00487");
    expect(await screen.findByText("Muitos pedidos de código.")).toBeVisible();
    expect(screen.getByText(/suspensos até as 15:20/)).toBeVisible();
    expect(
      screen.getByRole("button", {
        name: "Enviar código (disponível às 15:20)",
      }),
    ).toBeDisabled();
  });

  it("o reenvio fica liberado quando terminam os 60 segundos (RF52, RNF6)", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fetch = simularApi({
      "/verificacao/codigo": [{ status: 202 }, { status: 202 }],
    });
    await pedirCodigo("2026-00487");
    await screen.findByRole("heading", { name: "Informe o código" });
    // Segundo a segundo, como o relógio da tela.
    for (let i = 0; i < 61; i++) {
      await act(async () => {
        vi.advanceTimersByTime(1_000);
      });
    }
    const reenviar = await screen.findByRole("button", {
      name: "Reenviar código",
    });
    expect(reenviar).toBeEnabled();
    fireEvent.click(reenviar);
    await waitFor(() =>
      expect(corpoDe(fetch, "/verificacao/codigo")).toHaveLength(2),
    );
  });

  it("quem informou só o celular é orientado a procurar a secretaria (RF52, DF24)", async () => {
    simularApi({});
    await abrir();
    expect(
      screen.getByText(/Informou só o celular na inscrição\?/),
    ).toBeVisible();
    expect(screen.getByText(/procure a secretaria da clínica/)).toBeVisible();
  });

  it("encerrar a consulta volta à identificação sem nenhum dado da inscrição (RF52)", async () => {
    const fetch = simularApi({
      "/verificacao": [
        {
          status: 200,
          corpo: { numero: "2026-00512", expiraEm: "2099-11-05T18:20:00Z" },
        },
      ],
      "/verificacao/encerrar": [{ status: 204 }],
    });
    render(<VerificacaoIdentidade />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Encerrar consulta" }),
    );
    expect(await screen.findByText("Consulta encerrada.")).toBeVisible();
    expect(screen.queryByText(/2026-00512/)).toBeNull();
    expect(
      fetch.mock.calls.some(([url]) =>
        String(url).endsWith("/verificacao/encerrar"),
      ),
    ).toBe(true);
  });

  it("se o servidor não encerrar a consulta, a tela avisa e não diz que encerrou (RF52, RNF6)", async () => {
    simularApi({
      "/verificacao": [
        {
          status: 200,
          corpo: { numero: "2026-00512", expiraEm: "2099-11-05T18:20:00Z" },
        },
      ],
      "/verificacao/encerrar": [
        { status: 500, corpo: { message: "Erro interno" } },
        { status: 204 },
      ],
    });
    render(<VerificacaoIdentidade />);
    const encerrar = await screen.findByRole("button", {
      name: "Encerrar consulta",
    });
    fireEvent.click(encerrar);
    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent("Não foi possível encerrar a consulta.");
    expect(alerta).toHaveTextContent(/continua liberada .* até as 15:20/);
    await waitFor(() => expect(alerta).toHaveFocus());
    expect(screen.queryByText("Consulta encerrada.")).toBeNull();
    expect(screen.getByText("Identidade confirmada.")).toBeVisible();

    // Na segunda tentativa, o servidor encerra.
    await waitFor(() => expect(encerrar).toBeEnabled());
    fireEvent.click(encerrar);
    expect(await screen.findByText("Consulta encerrada.")).toBeVisible();
    expect(screen.queryByText(/2026-00512/)).toBeNull();
  });

  it("quando a verificação vence, a tela encerra a consulta e retira os dados (RF52, RNF6)", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-11-05T18:05:00Z"));
    simularApi({
      "/verificacao": [
        {
          status: 200,
          corpo: { numero: "2026-00512", expiraEm: "2026-11-05T18:20:00Z" },
        },
      ],
    });
    render(
      <VerificacaoIdentidade>
        {(v) => <p>Posição da inscrição {v.numero}</p>}
      </VerificacaoIdentidade>,
    );
    expect(
      await screen.findByText("Posição da inscrição 2026-00512"),
    ).toBeVisible();

    // Um minuto antes do fim, a consulta continua liberada.
    await act(async () => {
      vi.advanceTimersByTime(14 * 60_000);
    });
    expect(screen.getByText("Posição da inscrição 2026-00512")).toBeVisible();

    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    expect(await screen.findByText("A consulta expirou.")).toBeVisible();
    expect(screen.queryByText(/2026-00512/)).toBeNull();
    expect(screen.queryByText("Identidade confirmada.")).toBeNull();
    expect(screen.getByLabelText("CPF ou número da inscrição")).toHaveValue("");
  });

  it("verificação que já venceu ao abrir a página é encerrada na hora (RF52, RNF6)", async () => {
    simularApi({
      "/verificacao": [
        {
          status: 200,
          corpo: { numero: "2026-00512", expiraEm: "2020-01-01T00:00:00Z" },
        },
      ],
    });
    render(
      <VerificacaoIdentidade>
        {(v) => <p>Posição da inscrição {v.numero}</p>}
      </VerificacaoIdentidade>,
    );
    expect(await screen.findByText("A consulta expirou.")).toBeVisible();
    expect(screen.queryByText(/2026-00512/)).toBeNull();
  });
});
