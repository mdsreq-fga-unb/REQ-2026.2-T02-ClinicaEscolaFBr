import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type {
  AutorizacaoMenor,
  DeclaracaoComparecimento,
} from "@clinica/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AutorizacaoMenorDaFicha } from "./autorizacao-menor";
import {
  MinhasSessoes,
  SessoesComPresencaDaFicha,
} from "./sessoes-com-presenca";
import { api, ErroApi } from "@/lib/api";

vi.mock("@/lib/api", async (original) => ({
  ...(await original<typeof import("@/lib/api")>()),
  api: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

// Sessões das 14h de Brasília (17h UTC), como na prancha 8-3.
const SESSOES = [
  {
    id: "00000000-0000-4000-8000-000000001105",
    inicio: "2026-11-05T17:00:00.000Z",
    estagiario: "Ana Beatriz Costa",
  },
  {
    id: "00000000-0000-4000-8000-000000001029",
    inicio: "2026-10-29T17:00:00.000Z",
    estagiario: "Ana Beatriz Costa",
  },
];

const DECLARACAO: DeclaracaoComparecimento = {
  emissaoId: "00000000-0000-4000-8000-0000000000e1",
  // 12h30 em Brasília: o dia é o mesmo em qualquer fuso do navegador.
  emitidaEm: "2026-11-20T15:30:00.000Z",
  paciente: "Mariana Alves Toledo",
  sessao: {
    id: SESSOES[0].id,
    inicio: SESSOES[0].inicio,
    termino: "2026-11-05T17:50:00.000Z",
  },
};

const verificacao = () => ({
  numero: "2026-00398",
  expiraEm: new Date(Date.now() + 60_000).toISOString(),
});

function abrir(conteudo: React.ReactNode) {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      {conteudo}
    </QueryClientProvider>,
  );
}

// A lista responde; a emissão responde o que o teste definir.
function simular(emissao: () => Promise<unknown>) {
  vi.mocked(api).mockImplementation(async (caminho: string) =>
    caminho.endsWith("/emissao") ? emissao() : SESSOES,
  );
}

const emitirDaSessao = async (data = "05/11/2026") => {
  const [botao] = await screen.findAllByRole("button", {
    name: `Emitir declaração da sessão de ${data}`,
  });
  fireEvent.click(botao);
};

describe("RF45: emissão pelo paciente ou responsável", () => {
  it("emite pela rota do paciente verificado e mostra a pré-visualização com o texto da prancha 8-3", async () => {
    simular(async () => DECLARACAO);
    abrir(<MinhasSessoes verificacao={verificacao()} />);
    await emitirDaSessao();

    const folha = await screen.findByRole("article", {
      name: "Declaração de comparecimento",
    });
    expect(api).toHaveBeenCalledWith(
      `/declaracoes/minhas-sessoes/${SESSOES[0].id}/emissao`,
      { method: "POST", cache: "no-store" },
    );
    expect(folha).toHaveTextContent("Faculdade Brasília");
    // Texto do modelo da Clínica Escola (DF70), sem o estagiário.
    expect(folha).toHaveTextContent(
      "Declaro para os devidos fins que Mariana Alves Toledo compareceu à Clínica-Escola de Psicologia da Faculdade Brasília – FBr no dia 05/11/2026 das 14:00 às 14:50.",
    );
    expect(folha.textContent).not.toMatch(/Ana Beatriz|estagiári/i);
    // Assinatura, carimbo e CRP à mão: o carimbo já traz o CRP (DF71).
    expect(folha).toHaveTextContent(
      "Assinatura e Carimbo do Psicólogo Responsável",
    );
    expect(folha).toHaveTextContent(/CRP: _+/);
    // Sem dado clínico (RNF6) e só para imprimir: nada de download nem e-mail.
    expect(folha.textContent).not.toMatch(/queixa|prioridade|diagnóstico/i);
    expect(
      screen.queryByRole("button", { name: /baixar|download|e-?mail/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /baixar|download/i })).toBeNull();
    // A lista não aparece junto da pré-visualização.
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    // O leitor de tela começa pelo título do documento.
    expect(
      within(folha).getByRole("heading", {
        name: "Declaração de comparecimento",
      }),
    ).toHaveFocus();
  });

  it("'Imprimir' abre a impressão, e 'Voltar' volta à lista com o foco no botão da sessão", async () => {
    simular(async () => DECLARACAO);
    const imprimir = vi.spyOn(window, "print").mockImplementation(() => {});
    abrir(<MinhasSessoes verificacao={verificacao()} />);
    await emitirDaSessao();
    await screen.findByRole("article");

    fireEvent.click(screen.getByRole("button", { name: "Imprimir" }));
    expect(imprimir).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getAllByRole("button", {
          name: "Emitir declaração da sessão de 05/11/2026",
        })[0],
      ).toHaveFocus(),
    );
  });

  it("422 de sessão sem presença mostra o aviso amarelo com a mensagem pronta, e a lista continua", async () => {
    const message =
      "A sessão de 12/11/2026 foi registrada como falta. A declaração de comparecimento só é emitida para sessão com presença registrada.";
    simular(async () => {
      throw new ErroApi(422, message, { message, motivo: "sem_presenca" });
    });
    abrir(<MinhasSessoes verificacao={verificacao()} />);
    await emitirDaSessao();
    const aviso = await screen.findByRole("status", { name: message });
    await waitFor(() => expect(aviso).toHaveFocus());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it("422 de menor sem autorização mostra o aviso vermelho com a mensagem pronta", async () => {
    const message =
      "A Autorização para Acompanhamento Psicoterapêutico de Crianças e Adolescentes ainda não foi registrada. Procure a secretaria da clínica.";
    simular(async () => {
      throw new ErroApi(422, message, {
        message,
        motivo: "autorizacao_pendente",
      });
    });
    abrir(<MinhasSessoes verificacao={verificacao()} />);
    await emitirDaSessao();
    const aviso = await screen.findByRole("alert", {
      name: /A declaração não pode ser emitida para o responsável\./,
    });
    expect(aviso).toHaveTextContent(message);
    await waitFor(() => expect(aviso).toHaveFocus());
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it("403 mostra 'Você não pode emitir esta declaração', com o horário da tentativa, e 'Voltar' devolve a lista", async () => {
    simular(async () => {
      throw new ErroApi(403, "Você não pode emitir esta declaração.");
    });
    abrir(<MinhasSessoes verificacao={verificacao()} />);
    await emitirDaSessao();
    const tela = await screen.findByRole("region", {
      name: "Você não pode emitir esta declaração",
    });
    expect(tela).toHaveTextContent(
      "A declaração é emitida só para as sessões da própria inscrição, pelo paciente ou responsável com identidade confirmada, ou pela secretaria.",
    );
    expect(tela).toHaveTextContent(
      /Tentativa registrada em \d{2}\/\d{2}\/\d{4}/,
    );
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();

    fireEvent.click(within(tela).getByRole("button", { name: "Voltar" }));
    expect(await screen.findByRole("table")).toBeInTheDocument();
  });

  it("401 pede a verificação de novo, sem nenhuma sessão na tela (RNF38)", async () => {
    simular(async () => {
      throw new ErroApi(401, "Confirme sua identidade.");
    });
    abrir(<MinhasSessoes verificacao={verificacao()} />);
    await emitirDaSessao();
    const aviso = await screen.findByRole("alert", {
      name: /Confirme sua identidade para ver as sessões/,
    });
    await waitFor(() => expect(aviso).toHaveFocus());
    expect(
      screen.getByRole("button", { name: "Confirmar identidade" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("outro erro avisa que não foi possível emitir e deixa tentar de novo", async () => {
    simular(async () => {
      throw new ErroApi(500, "falha");
    });
    abrir(<MinhasSessoes verificacao={verificacao()} />);
    await emitirDaSessao();
    expect(
      await screen.findByRole("alert", {
        name: /Não foi possível emitir a declaração/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", {
        name: "Emitir declaração da sessão de 05/11/2026",
      })[0],
    ).toBeEnabled();
  });

  it("enquanto emite, os botões ficam desabilitados e um segundo clique não cria outra emissão (RNF39)", async () => {
    let concluir: (d: DeclaracaoComparecimento) => void = () => {};
    simular(() => new Promise((resolve) => (concluir = resolve)));
    abrir(<MinhasSessoes verificacao={verificacao()} />);
    await emitirDaSessao();
    const emitindo = await screen.findAllByRole("button", {
      name: "Emitindo…",
    });
    expect(emitindo[0]).toBeDisabled();
    for (const botao of screen.getAllByRole("button"))
      expect(botao).toBeDisabled();
    fireEvent.click(emitindo[0]);
    concluir(DECLARACAO);
    await screen.findByRole("article");
    expect(
      vi.mocked(api).mock.calls.filter(([c]) => c.endsWith("/emissao")),
    ).toHaveLength(1);
  });
});

describe("RF45: emissão pela secretaria, na ficha do paciente", () => {
  it("emite pela rota da secretaria e mostra a pré-visualização no lugar da seção", async () => {
    simular(async () => DECLARACAO);
    abrir(<SessoesComPresencaDaFicha casoId="c1" />);
    await emitirDaSessao();
    expect(await screen.findByRole("article")).toHaveTextContent(
      "Mariana Alves Toledo",
    );
    expect(api).toHaveBeenCalledWith(
      `/declaracoes/sessoes/${SESSOES[0].id}/emissao`,
      { method: "POST", cache: "no-store" },
    );
    expect(
      screen.queryByRole("region", { name: "Sessões com presença registrada" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(
      await screen.findByRole("region", {
        name: "Sessões com presença registrada",
      }),
    ).toBeInTheDocument();
  });

  it("422 de menor sem autorização avisa na seção, com a mensagem da secretaria", async () => {
    const message =
      "A Autorização para Acompanhamento Psicoterapêutico de Crianças e Adolescentes ainda não foi registrada. Registre a entrega na ficha do paciente antes de emitir a declaração.";
    simular(async () => {
      throw new ErroApi(422, message, {
        message,
        motivo: "autorizacao_pendente",
      });
    });
    abrir(<SessoesComPresencaDaFicha casoId="c1" />);
    await emitirDaSessao();
    const secao = screen.getByRole("region", {
      name: "Sessões com presença registrada",
    });
    expect(await within(secao).findByRole("alert")).toHaveTextContent(message);
  });

  it("403 de perfil sem permissão mostra a tela de acesso negado", async () => {
    simular(async () => {
      throw new ErroApi(403, "Você não pode emitir esta declaração.");
    });
    abrir(<SessoesComPresencaDaFicha casoId="c1" />);
    await emitirDaSessao();
    expect(
      await screen.findByRole("region", {
        name: "Você não pode emitir esta declaração",
      }),
    ).toBeInTheDocument();
  });

  it("401 pede para entrar de novo, com o link para o login", async () => {
    simular(async () => {
      throw new ErroApi(401, "Não autenticado");
    });
    abrir(<SessoesComPresencaDaFicha casoId="c1" />);
    await emitirDaSessao();
    const aviso = await screen.findByRole("alert", {
      name: /Entre de novo para emitir a declaração/,
    });
    expect(within(aviso).getByRole("link", { name: "Entrar" })).toHaveAttribute(
      "href",
      "/entrar",
    );
  });

  it("registrar a autorização na mesma ficha tira o aviso de autorização pendente, e os outros avisos ficam", async () => {
    const message =
      "A Autorização para Acompanhamento Psicoterapêutico de Crianças e Adolescentes ainda não foi registrada. Registre a entrega na ficha do paciente antes de emitir a declaração.";
    const autorizacao: AutorizacaoMenor = {
      menor: true,
      responsavelLegal: "Fernanda Lima",
      autorizacao: {
        entregueEm: "2026-11-03",
        registradoPor: "Juliana Rocha",
        registradoEm: "2026-11-03T13:15:00.000Z",
      },
    };
    vi.mocked(api).mockImplementation(async (caminho, init) => {
      if (caminho.endsWith("/emissao"))
        throw new ErroApi(422, message, {
          message,
          motivo: "autorizacao_pendente",
        });
      if (caminho.endsWith("/autorizacao-menor"))
        return init?.method === "PUT"
          ? autorizacao
          : { ...autorizacao, autorizacao: null };
      return SESSOES;
    });
    abrir(
      <>
        <AutorizacaoMenorDaFicha
          casoId="c1"
          nome="João Pedro Lima"
          dataNascimento="2014-01-01"
        />
        <SessoesComPresencaDaFicha casoId="c1" />
      </>,
    );
    await emitirDaSessao();
    const secao = screen.getByRole("region", {
      name: "Sessões com presença registrada",
    });
    expect(await within(secao).findByRole("alert")).toHaveTextContent(message);

    fireEvent.click(
      screen.getByLabelText(
        "A autorização assinada presencialmente foi entregue à clínica",
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Registrar" }));
    await screen.findByRole("status", { name: /Autorização registrada\./ });
    await waitFor(() =>
      expect(within(secao).queryByRole("alert")).not.toBeInTheDocument(),
    );
    // A lista continua, pronta para uma nova tentativa.
    expect(within(secao).getByRole("table")).toBeInTheDocument();
  });

  it("registrar a autorização não tira o aviso de sessão sem presença", async () => {
    const message = "A sessão de 05/11/2026 foi registrada como falta.";
    vi.mocked(api).mockImplementation(async (caminho, init) => {
      if (caminho.endsWith("/emissao"))
        throw new ErroApi(422, message, { message, motivo: "sem_presenca" });
      if (caminho.endsWith("/autorizacao-menor"))
        return init?.method === "PUT"
          ? {
              menor: true,
              responsavelLegal: null,
              autorizacao: {
                entregueEm: "2026-11-03",
                registradoPor: "Juliana Rocha",
                registradoEm: "2026-11-03T13:15:00.000Z",
              },
            }
          : { menor: true, responsavelLegal: null, autorizacao: null };
      return SESSOES;
    });
    abrir(
      <>
        <AutorizacaoMenorDaFicha
          casoId="c1"
          nome="João Pedro Lima"
          dataNascimento="2014-01-01"
        />
        <SessoesComPresencaDaFicha casoId="c1" />
      </>,
    );
    await emitirDaSessao();
    expect(await screen.findByRole("status", { name: message })).toBeVisible();
    fireEvent.click(
      screen.getByLabelText(
        "A autorização assinada presencialmente foi entregue à clínica",
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Registrar" }));
    await screen.findByRole("status", { name: /Autorização registrada\./ });
    expect(screen.getByRole("status", { name: message })).toBeVisible();
  });
});
