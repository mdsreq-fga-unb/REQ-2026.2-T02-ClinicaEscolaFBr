import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AutorizacaoMenor } from "@clinica/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AutorizacaoMenorDaFicha } from "./autorizacao-menor";
import { api, ErroApi } from "@/lib/api";
import { hojeBr } from "@/lib/formato";

vi.mock("@/lib/api", async (original) => ({
  ...(await original<typeof import("@/lib/api")>()),
  api: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

// Nasceu há 12 anos e 1 mês: tem 12 anos hoje, em qualquer dia do mês.
const NASCIMENTO = (() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 12);
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
})();

const SEM_AUTORIZACAO: AutorizacaoMenor = {
  menor: true,
  responsavelLegal: "Fernanda Lima",
  autorizacao: null,
};

const COM_AUTORIZACAO: AutorizacaoMenor = {
  menor: true,
  responsavelLegal: "Fernanda Lima",
  autorizacao: {
    entregueEm: "2026-11-03",
    registradoPor: "Juliana Rocha",
    // 10h15 em Brasília.
    registradoEm: "2026-11-03T13:15:00.000Z",
  },
};

function abrir() {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <AutorizacaoMenorDaFicha
        casoId="c1"
        nome="João Pedro Lima"
        dataNascimento={NASCIMENTO}
      />
    </QueryClientProvider>,
  );
}

const TITULO = "Autorização para acompanhamento de criança ou adolescente";

describe("RF45: autorização de menor na ficha da secretaria", () => {
  it("paciente adulto: o bloco não aparece", async () => {
    vi.mocked(api).mockResolvedValue({
      menor: false,
      responsavelLegal: null,
      autorizacao: null,
    });
    const { container } = abrir();
    await waitFor(() => expect(api).toHaveBeenCalled());
    expect(api).toHaveBeenCalledWith("/pacientes/c1/autorizacao-menor");
    expect(screen.queryByText(TITULO)).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it("403 (perfil que não é da secretaria): o bloco não aparece, sem erro", async () => {
    vi.mocked(api).mockRejectedValue(new ErroApi(403, "Forbidden"));
    const { container } = abrir();
    await waitFor(() => expect(api).toHaveBeenCalled());
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it("menor sem autorização: mostra o paciente, o responsável legal e que ainda não foi registrada", async () => {
    vi.mocked(api).mockResolvedValue(SEM_AUTORIZACAO);
    abrir();
    const bloco = await screen.findByRole("region", { name: TITULO });
    expect(bloco).toHaveTextContent(
      "João Pedro Lima, 12 anos · responsável legal: Fernanda Lima",
    );
    expect(
      screen.getByLabelText(
        "A autorização assinada presencialmente foi entregue à clínica",
      ),
    ).not.toBeChecked();
    expect(screen.getByLabelText("Data da entrega")).toHaveValue(hojeBr());
    expect(bloco).toHaveTextContent(
      "Ainda não registrada. Sem o registro, o responsável legal não pode emitir a declaração.",
    );
  });

  it("registrar sem marcar a entrega avisa o campo e não chama a API", async () => {
    vi.mocked(api).mockResolvedValue(SEM_AUTORIZACAO);
    abrir();
    await screen.findByRole("region", { name: TITULO });
    fireEvent.click(screen.getByRole("button", { name: "Registrar" }));
    const caixa = screen.getByLabelText(
      "A autorização assinada presencialmente foi entregue à clínica",
    );
    expect(
      screen.getByText("Marque que a autorização foi entregue à clínica."),
    ).toBeInTheDocument();
    expect(caixa).toHaveAttribute("aria-invalid", "true");
    expect(caixa).toHaveFocus();
    expect(api).toHaveBeenCalledTimes(1);
  });

  it("data futura é recusada na tela, sem chamar a API", async () => {
    vi.mocked(api).mockResolvedValue(SEM_AUTORIZACAO);
    abrir();
    await screen.findByRole("region", { name: TITULO });
    fireEvent.click(
      screen.getByLabelText(
        "A autorização assinada presencialmente foi entregue à clínica",
      ),
    );
    const data = screen.getByLabelText("Data da entrega");
    fireEvent.change(data, { target: { value: "2999-01-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Registrar" }));
    expect(
      screen.getByText("A data da entrega não pode ser futura."),
    ).toBeInTheDocument();
    expect(data).toHaveFocus();
    expect(api).toHaveBeenCalledTimes(1);
  });

  it("registra a entrega com a data e mostra quem registrou e quando", async () => {
    vi.mocked(api).mockImplementation(async (_caminho, init) =>
      init?.method === "PUT" ? COM_AUTORIZACAO : SEM_AUTORIZACAO,
    );
    abrir();
    await screen.findByRole("region", { name: TITULO });
    fireEvent.click(
      screen.getByLabelText(
        "A autorização assinada presencialmente foi entregue à clínica",
      ),
    );
    fireEvent.change(screen.getByLabelText("Data da entrega"), {
      target: { value: "2026-11-03" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Registrar" }));

    const aviso = await screen.findByRole("status", {
      name: /Autorização registrada\./,
    });
    expect(aviso).toHaveTextContent(
      "O responsável legal já pode emitir a declaração de comparecimento.",
    );
    expect(api).toHaveBeenCalledWith("/pacientes/c1/autorizacao-menor", {
      method: "PUT",
      body: JSON.stringify({ entregueEm: "2026-11-03" }),
    });
    expect(
      screen.getByText(
        "Registrada por Juliana Rocha em 03/11/2026, às 10:15. Com o registro, o responsável legal pode emitir a declaração.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(
        "A autorização assinada presencialmente foi entregue à clínica",
      ),
    ).toBeChecked();
  });

  it("autorização já registrada: abre marcada, com a data da entrega, e deixa corrigir a data", async () => {
    vi.mocked(api).mockImplementation(async (_caminho, init) =>
      init?.method === "PUT"
        ? {
            ...COM_AUTORIZACAO,
            autorizacao: {
              ...COM_AUTORIZACAO.autorizacao!,
              entregueEm: "2026-11-02",
            },
          }
        : COM_AUTORIZACAO,
    );
    abrir();
    await screen.findByRole("region", { name: TITULO });
    const caixa = screen.getByLabelText(
      "A autorização assinada presencialmente foi entregue à clínica",
    );
    expect(caixa).toBeChecked();
    // Sem rota para desfazer o registro: só a data se corrige.
    expect(caixa).toBeDisabled();
    expect(screen.getByLabelText("Data da entrega")).toHaveValue("2026-11-03");
    fireEvent.change(screen.getByLabelText("Data da entrega"), {
      target: { value: "2026-11-02" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Registrar" }));
    await screen.findByRole("status", { name: /Autorização registrada\./ });
    expect(api).toHaveBeenCalledWith("/pacientes/c1/autorizacao-menor", {
      method: "PUT",
      body: JSON.stringify({ entregueEm: "2026-11-02" }),
    });
    expect(screen.getByLabelText("Data da entrega")).toHaveValue("2026-11-02");
  });

  it("409 (paciente adulto) e outros erros da API aparecem no topo do formulário", async () => {
    vi.mocked(api).mockImplementation(async (_caminho, init) => {
      if (init?.method === "PUT")
        throw new ErroApi(
          409,
          "O paciente não é menor de idade, e a autorização não se aplica.",
        );
      return SEM_AUTORIZACAO;
    });
    abrir();
    await screen.findByRole("region", { name: TITULO });
    fireEvent.click(
      screen.getByLabelText(
        "A autorização assinada presencialmente foi entregue à clínica",
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Registrar" }));
    const erro = await screen.findByRole("alert", {
      name: /Não foi possível registrar a autorização/,
    });
    expect(erro).toHaveTextContent(
      "O paciente não é menor de idade, e a autorização não se aplica.",
    );
  });

  it("falha ao carregar oferece tentar de novo", async () => {
    vi.mocked(api).mockRejectedValue(new ErroApi(500, "falha"));
    abrir();
    // Sem foco: o aviso aparece ao abrir a ficha e não pode tirar o foco da página.
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar a autorização de menor.",
    );
    expect(
      screen.getByRole("button", { name: "Tentar novamente" }),
    ).toBeInTheDocument();
  });
});
