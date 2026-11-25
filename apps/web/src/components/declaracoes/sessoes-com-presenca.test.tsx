import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DeclaracoesDoPaciente,
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
});

// Sessões das 14h de Brasília (17h UTC), como na prancha 8-2.
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
  {
    id: "00000000-0000-4000-8000-000000001022",
    inicio: "2026-10-22T17:00:00.000Z",
    estagiario: "Pedro Henrique Lima",
  },
];

function abrir(conteudo: ReactNode) {
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

const verificacao = (
  expiraEm = new Date(Date.now() + 60_000).toISOString(),
) => ({
  numero: "2026-00398",
  expiraEm,
});

describe("RF44: sessões do paciente ou do responsável", () => {
  it("mostra a tabela com legenda e cabeçalhos, com data e horário de Brasília e o estagiário (RF44, RNF56)", async () => {
    vi.mocked(api).mockResolvedValue(SESSOES);
    abrir(<MinhasSessoes verificacao={verificacao()} />);
    const tabela = await screen.findByRole("table", {
      name: "Sessões com presença registrada da inscrição 2026-00398",
    });
    expect(api).toHaveBeenCalledWith("/declaracoes/minhas-sessoes", {
      cache: "no-store",
    });
    expect(
      screen.getAllByRole("columnheader").map((c) => c.textContent),
    ).toEqual(["Data", "Horário", "Estagiário", "Declaração"]);
    const linhas = tabela.querySelectorAll("tbody tr");
    expect(linhas).toHaveLength(3);
    expect(linhas[0]).toHaveTextContent(
      "05/11/202614:00Ana Beatriz CostaEmitir declaração",
    );
    expect(linhas[2]).toHaveTextContent(
      "22/10/202614:00Pedro Henrique LimaEmitir declaração",
    );
    // Os mesmos dados em cartões, para o celular (RNF58).
    expect(
      screen.getByRole("list", {
        name: "Sessões com presença registrada da inscrição 2026-00398",
      }),
    ).toHaveTextContent("05/11/2026, 14:00");
    // O aviso de que a emissão não estava disponível saiu com o RF45.
    expect(
      screen.queryByText(/emissão da declaração pelo sistema/),
    ).not.toBeInTheDocument();
    // Uma ação por sessão, na tabela e nos cartões, com a sessão no nome (RF45).
    expect(
      screen.getAllByRole("button", {
        name: "Emitir declaração da sessão de 05/11/2026",
      }),
    ).toHaveLength(2);
    expect(screen.getAllByRole("button")).toHaveLength(6);
  });

  it("sem sessão realizada, mostra o título do estado vazio, sem erro técnico (RF44)", async () => {
    vi.mocked(api).mockResolvedValue([]);
    abrir(<MinhasSessoes verificacao={verificacao()} />);
    expect(
      await screen.findByRole("heading", {
        name: "Não há sessões disponíveis para declaração",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Ainda não há sessão com presença registrada nesta inscrição.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/erro|404|500/i);
  });

  it("401 recebe foco e pede a verificação de novo, sem nenhuma sessão (RNF38, RNF6)", async () => {
    vi.mocked(api).mockRejectedValue(new ErroApi(401, "Confirme"));
    abrir(<MinhasSessoes verificacao={verificacao()} />);
    const aviso = await screen.findByRole("alert", {
      name: /Confirme sua identidade para ver as sessões/,
    });
    await waitFor(() => expect(aviso).toHaveFocus());
    expect(
      screen.getByRole("button", { name: "Confirmar identidade" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("a verificação vencida esconde a lista sem chamar a API", async () => {
    abrir(
      <MinhasSessoes
        verificacao={verificacao(new Date(Date.now() - 1000).toISOString())}
      />,
    );
    expect(
      await screen.findByRole("alert", {
        name: /Confirme sua identidade para ver as sessões/,
      }),
    ).toBeInTheDocument();
    expect(api).not.toHaveBeenCalledWith(
      "/declaracoes/minhas-sessoes",
      expect.anything(),
    );
  });

  it("outro erro oferece tentar de novo", async () => {
    vi.mocked(api).mockRejectedValue(new ErroApi(500, "falha"));
    abrir(<MinhasSessoes verificacao={verificacao()} />);
    expect(
      await screen.findByRole("alert", {
        name: /Não foi possível carregar as sessões/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Tentar novamente" }),
    ).toBeInTheDocument();
  });

  it("a página /declaracoes usa o título da prancha depois da verificação (RF52)", async () => {
    vi.mocked(api).mockImplementation(async (caminho: string) =>
      caminho === "/verificacao" ? verificacao() : SESSOES,
    );
    abrir(<DeclaracoesDoPaciente />);
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Sessões com presença registrada",
      }),
    ).toBeInTheDocument();
    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Encerrar consulta" }),
    ).toBeInTheDocument();
  });

  it("antes da verificação, a página /declaracoes mostra o passo de identificação com o título da prancha", async () => {
    vi.mocked(api).mockRejectedValue(new ErroApi(401, "sem verificação"));
    abrir(<DeclaracoesDoPaciente />);
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Sessões com presença registrada",
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("CPF ou número da inscrição")).toBeVisible();
    expect(api).not.toHaveBeenCalledWith(
      "/declaracoes/minhas-sessoes",
      expect.anything(),
    );
  });
});

describe("RF44: seção da ficha do paciente", () => {
  it("lista para a secretaria as sessões do caso", async () => {
    vi.mocked(api).mockResolvedValue(SESSOES);
    abrir(<SessoesComPresencaDaFicha casoId="c1" />);
    const secao = await screen.findByRole("region", {
      name: "Sessões com presença registrada",
    });
    expect(api).toHaveBeenCalledWith("/pacientes/c1/sessoes-realizadas");
    await waitFor(() =>
      expect(secao.querySelectorAll("tbody tr")).toHaveLength(3),
    );
  });

  it("caso sem sessão realizada mostra o aviso, sem erro", async () => {
    vi.mocked(api).mockResolvedValue([]);
    abrir(<SessoesComPresencaDaFicha casoId="c1" />);
    expect(
      await screen.findByText(
        "Ainda não há sessão com presença registrada para este paciente.",
      ),
    ).toBeInTheDocument();
  });

  it("403 mostra que a lista não é do perfil, sem nenhuma sessão (RNF38)", async () => {
    vi.mocked(api).mockRejectedValue(new ErroApi(403, "Forbidden"));
    abrir(<SessoesComPresencaDaFicha casoId="c1" />);
    expect(
      await screen.findByRole("region", {
        name: "Você não tem acesso a esta lista",
      }),
    ).toHaveTextContent(
      "A lista de sessões é da secretaria e do próprio paciente ou responsável.",
    );
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
