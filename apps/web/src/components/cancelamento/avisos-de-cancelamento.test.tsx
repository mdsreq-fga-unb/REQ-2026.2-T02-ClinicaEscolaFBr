import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AvisoPendente } from "@clinica/shared";
import { AvisosDeCancelamento } from "./avisos-de-cancelamento";

const MENSAGEM =
  "Olá, Mariana. A sua sessão na Clínica Escola de Psicologia da FBr de quinta-feira, 12/11/2026, às 14:00, foi cancelada pela clínica. Este cancelamento não conta como falta. A secretaria vai entrar em contato para marcar outro horário.";

const mariana: AvisoPendente = {
  id: "a1",
  casoId: "c1",
  paciente: "Mariana Alves Toledo",
  inicio: "2026-11-12T17:00:00.000Z",
  motivo: "sem_email",
  mensagem: MENSAGEM,
  celular: "(61) 99876-5432",
  url: `https://wa.me/5561998765432?text=${encodeURIComponent(MENSAGEM)}`,
};
const bianca: AvisoPendente = {
  ...mariana,
  id: "a2",
  casoId: "c2",
  paciente: "Bianca Ramos",
  inicio: "2026-11-17T12:00:00.000Z",
  motivo: "email_nao_enviado",
};
const semCelular: AvisoPendente = {
  ...bianca,
  id: "a3",
  casoId: "c3",
  paciente: "Rafael Souza",
  celular: null,
  url: null,
};

type Resposta = { status: number; corpo: unknown };

function simularApi(listas: Resposta[], registro?: Resposta) {
  const posts: { url: string; corpo: unknown }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const resposta =
        init?.method === "POST"
          ? (posts.push({ url, corpo: JSON.parse(String(init.body)) }),
            registro)
          : listas.length > 1
            ? listas.shift()
            : listas[0];
      return new Response(JSON.stringify(resposta?.corpo), {
        status: resposta?.status ?? 500,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
  return posts;
}

const lista = (avisos: AvisoPendente[]): Resposta => ({
  status: 200,
  corpo: avisos,
});

const abrir = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <AvisosDeCancelamento />
    </QueryClientProvider>,
  );

describe("Avisos de cancelamento por ausência do estagiário (RF17)", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("paciente sem e-mail: o aviso, a mensagem pronta e o botão do WhatsApp com o nome do paciente", async () => {
    simularApi([lista([mariana])]);
    abrir();

    const cartao = await screen.findByRole("region", {
      name: "Avise o paciente sobre o cancelamento",
    });
    expect(
      within(cartao).getByText(
        "Mariana Alves Toledo não tem e-mail cadastrado e ainda não recebeu o aviso.",
      ),
    ).toBeTruthy();
    expect(within(cartao).getByText("Mensagem pronta")).toBeTruthy();
    expect(within(cartao).getByText(MENSAGEM)).toBeTruthy();
    const botao = within(cartao).getByRole("link", {
      name: "Enviar pelo WhatsApp para Mariana Alves Toledo (abre em nova aba)",
    });
    expect(botao.getAttribute("href")).toBe(mariana.url);
    expect(botao.getAttribute("target")).toBe("_blank");
  });

  it("falha no envio: diz que a sessão continua cancelada", async () => {
    simularApi([lista([bianca])]);
    abrir();

    expect(
      await screen.findByText(
        "Não foi possível enviar o e-mail a Bianca Ramos.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "A sessão de terça-feira, 17/11/2026, às 09:00, continua cancelada. Avise o paciente pelo WhatsApp.",
      ),
    ).toBeTruthy();
  });

  it("sem celular: no lugar do botão, o caminho para os contatos e o registro manual", async () => {
    const posts = simularApi([lista([semCelular]), lista([])], {
      status: 200,
      corpo: { avisoManualEm: "2026-11-16T15:00:00.000Z", canal: "outro" },
    });
    abrir();

    expect(
      await screen.findByText(
        "O paciente não tem celular cadastrado. Avise por outro contato da ficha.",
      ),
    ).toBeTruthy();
    expect(screen.queryByRole("link", { name: /WhatsApp/ })).toBeNull();
    expect(
      screen
        .getByRole("link", { name: "Ver contatos de Rafael Souza" })
        .getAttribute("href"),
    ).toBe("/pacientes/c3");
    fireEvent.click(
      screen.getByRole("button", {
        name: "Registrar que o paciente foi avisado: Rafael Souza",
      }),
    );

    expect(await screen.findByText("Aviso registrado.")).toBeTruthy();
    expect(posts).toEqual([
      {
        url: expect.stringContaining("/cancelamentos/a3/aviso"),
        corpo: { canal: "outro" },
      },
    ]);
  });

  it("Enviar pelo WhatsApp: registra o envio e o item sai da lista com a mensagem em role=status", async () => {
    const posts = simularApi([lista([mariana, bianca]), lista([bianca])], {
      status: 200,
      corpo: { avisoManualEm: "2026-11-16T15:00:00.000Z", canal: "whatsapp" },
    });
    abrir();

    fireEvent.click(
      await screen.findByRole("link", {
        name: "Enviar pelo WhatsApp para Mariana Alves Toledo (abre em nova aba)",
      }),
    );

    const status = await screen.findByRole("status", {
      name: /Aviso registrado\./,
    });
    expect(status.textContent).toContain(
      "A mensagem para Mariana Alves Toledo foi aberta no WhatsApp, e o aviso saiu da lista.",
    );
    expect(
      screen.queryByText(/Mariana Alves Toledo não tem e-mail/),
    ).toBeNull();
    expect(screen.getByText(/Bianca Ramos/)).toBeTruthy();
    expect(posts).toEqual([
      {
        url: expect.stringContaining("/cancelamentos/a1/aviso"),
        corpo: { canal: "whatsapp" },
      },
    ]);
  });

  it("outra pessoa da secretaria já registrou (409): explica e atualiza a lista", async () => {
    simularApi([lista([mariana]), lista([])], {
      status: 409,
      corpo: {
        message:
          "O aviso deste cancelamento já foi registrado por outra pessoa da secretaria.",
      },
    });
    abrir();

    fireEvent.click(await screen.findByRole("link", { name: /WhatsApp/ }));

    expect(
      await screen.findByText(
        "O aviso deste cancelamento já foi registrado por outra pessoa da secretaria.",
      ),
    ).toBeTruthy();
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("sem aviso pendente: o cartão não aparece", async () => {
    const chamada = simularApi([lista([])]);
    abrir();

    await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(chamada).toEqual([]);
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("falha ao carregar: avisa, sem esconder o problema", async () => {
    simularApi([{ status: 500, corpo: {} }]);
    abrir();

    expect(
      await screen.findByText(
        "Não foi possível carregar os avisos de cancelamento.",
      ),
    ).toBeTruthy();
  });
});
