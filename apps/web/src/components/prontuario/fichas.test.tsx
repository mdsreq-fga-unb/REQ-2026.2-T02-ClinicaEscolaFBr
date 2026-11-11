import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FormularioAnamnese,
  FormularioContrato,
  FormularioEvolucao,
  LeituraAnamnese,
  LeituraEvolucao,
} from "./fichas";
import { api, ErroApi } from "@/lib/api";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  api: vi.fn(),
}));

function abrir(elemento: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{elemento}</QueryClientProvider>,
  );
}

afterEach(cleanup);
beforeEach(() => vi.resetAllMocks());

describe("formulários e leitura do prontuário (RF27, RF28, RF69)", () => {
  it("preenche a queixa da inscrição e conta caracteres (RF69, RNF25)", () => {
    abrir(
      <FormularioAnamnese
        prontuarioId="p1"
        queixaDaInscricao="Dificuldade para dormir"
      />,
    );
    expect(
      (screen.getByLabelText("Queixa principal") as HTMLTextAreaElement).value,
    ).toBe("Dificuldade para dormir");
    expect(screen.getByText("23 de 1.000 caracteres")).toBeTruthy();
  });

  it("mostra Não informado nas seções vazias e preserva os rótulos antigos (RF27, RF28, RNF51)", () => {
    abrir(
      <LeituraAnamnese
        anamnese={{
          queixaPrincipal: "Queixa antiga",
          historiaProblemaAtual: null,
          historicoFamiliar: null,
          desenvolvimento: null,
          historicoMedico: null,
          aspectosPsicossociais: null,
          registradaEm: null,
          registradaPor: null,
        }}
      />,
    );
    expect(screen.getByText("Queixa antiga")).toBeTruthy();
    expect(screen.getAllByText("Não informado")).toHaveLength(5);
  });

  it("mostra o aviso antes dos campos, associa o erro e foca o primeiro campo inválido (RF69, RNF25)", async () => {
    abrir(<FormularioAnamnese prontuarioId="p1" queixaDaInscricao={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Salvar anamnese" }));
    const aviso = await screen.findByRole("alert");
    const campo = screen.getByLabelText("Queixa principal");
    expect(aviso.textContent).toContain("A anamnese não foi salva");
    expect(
      aviso.compareDocumentPosition(campo) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(campo.getAttribute("aria-invalid")).toBe("true");
    await waitFor(() => expect(document.activeElement).toBe(campo));
  });

  it("bloqueia o segundo clique enquanto salva e atualiza a consulta (RF69, RNF52)", async () => {
    let concluir!: (valor: unknown) => void;
    vi.mocked(api).mockReturnValueOnce(
      new Promise((resolve) => {
        concluir = resolve;
      }),
    );
    abrir(<FormularioAnamnese prontuarioId="p1" queixaDaInscricao="Insônia" />);
    fireEvent.click(screen.getByRole("button", { name: "Salvar anamnese" }));
    expect(
      (screen.getByRole("button", { name: "Salvando…" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    concluir({});
    await waitFor(() => expect(api).toHaveBeenCalledTimes(1));
  });

  it("trata o segundo envio com 409 e mantém o formulário legível (RF69, RNF25)", async () => {
    vi.mocked(api).mockRejectedValueOnce(
      new ErroApi(409, "Anamnese já registrada."),
    );
    abrir(<FormularioAnamnese prontuarioId="p1" queixaDaInscricao="Insônia" />);
    fireEvent.click(screen.getByRole("button", { name: "Salvar anamnese" }));
    expect(await screen.findByText("Anamnese já registrada.")).toBeTruthy();
    expect(
      (screen.getByLabelText("Queixa principal") as HTMLTextAreaElement).value,
    ).toBe("Insônia");
  });

  it("marca cada campo acima do limite no contador e conserva o texto (RF69, RNF25)", () => {
    abrir(<FormularioAnamnese prontuarioId="p1" queixaDaInscricao="Insônia" />);
    const campo = screen.getByLabelText(
      /História do problema atual/,
    ) as HTMLTextAreaElement;
    fireEvent.change(campo, { target: { value: "x".repeat(1032) } });
    const dica = screen.getByText("1.032 de 1.000 caracteres");
    expect(dica.className).toContain("text-destructive");
    expect(campo.value).toHaveLength(1032);
  });

  it.each([
    ["Queixa principal", "Informe a queixa principal."],
    ["História do problema atual", "Use no máximo 1.000 caracteres."],
    ["Histórico familiar", "Use no máximo 1.000 caracteres."],
    [
      "Desenvolvimento (infantil e adolescente)",
      "Use no máximo 1.000 caracteres.",
    ],
    ["Histórico médico", "Use no máximo 1.000 caracteres."],
    ["Aspectos psicossociais", "Use no máximo 1.000 caracteres."],
  ])(
    "aponta erro associado ao campo %s (RF69, RNF25, RNF56)",
    async (rotulo, mensagem) => {
      abrir(<FormularioAnamnese prontuarioId="p1" queixaDaInscricao={null} />);
      const campo = screen.getByLabelText(
        new RegExp(rotulo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      );
      if (rotulo !== "Queixa principal")
        fireEvent.change(campo, { target: { value: "x".repeat(1001) } });
      fireEvent.click(screen.getByRole("button", { name: "Salvar anamnese" }));
      expect(await screen.findByText(mensagem)).toBeTruthy();
      expect(campo.getAttribute("aria-invalid")).toBe("true");
    },
  );

  it("mostra o aviso e os erros de data e guarda no contrato (RF69, RNF25, RNF56)", async () => {
    abrir(<FormularioContrato prontuarioId="p1" />);
    fireEvent.click(screen.getByRole("button", { name: "Salvar contrato" }));
    const aviso = await screen.findByRole("alert");
    const dataAssinatura = screen.getByLabelText(
      "Data de assinatura do contrato",
    );
    expect(aviso.textContent).toContain("O contrato não foi salvo");
    expect(
      aviso.compareDocumentPosition(dataAssinatura) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(dataAssinatura.getAttribute("aria-invalid")).toBe("true");
    expect(
      screen
        .getByLabelText(/A via assinada do contrato está guardada/)
        .getAttribute("aria-invalid"),
    ).toBe("true");
    await waitFor(() => expect(document.activeElement).toBe(dataAssinatura));
  });

  it("lê evoluções antigas com os rótulos de origem (RF27, RF28, RNF25, RNF51)", () => {
    abrir(
      <LeituraEvolucao
        evolucao={{
          id: "e1",
          queixa: "Queixa antiga",
          planejamento: "Planejamento antigo",
          humorAparencia: null,
          conteudoTrabalhado: null,
          tecnicasUtilizadas: null,
          intervencoesEncaminhamentos: null,
          planoProximaSessao: null,
          registradaPor: "Ana",
          registradaEm: "2026-11-10T12:00:00Z",
        }}
        inicio="2026-11-10T11:00:00Z"
        numeroNoCiclo={3}
      />,
    );
    expect(screen.getByText("Evolução da queixa")).toBeTruthy();
    expect(screen.getByText("Planejamento")).toBeTruthy();
    expect(screen.getByText("Queixa antiga")).toBeTruthy();
  });

  it("mostra o quadro de sessão e recarrega o prontuário quando a evolução já existe (RF28, RF27, RNF25, RNF30)", async () => {
    const aoConflitar = vi.fn();
    vi.mocked(api).mockRejectedValueOnce(
      new ErroApi(409, "Esta sessão já tem uma evolução."),
    );
    abrir(
      <FormularioEvolucao
        prontuarioId="p1"
        sessaoId="s1"
        inicio="2026-11-10T11:00:00Z"
        numeroNoCiclo={4}
        paciente="Paciente"
        estagiario="Ana"
        supervisor="Carla"
        aoConflitar={aoConflitar}
      />,
    );
    expect(screen.getAllByText("Paciente").length).toBeGreaterThan(0);
    for (const campo of [
      "Humor e aparência do paciente",
      "Conteúdo trabalhado",
      "Técnicas utilizadas",
      "Plano para a próxima sessão",
    ]) {
      fireEvent.change(screen.getByLabelText(new RegExp(campo)), {
        target: { value: "Registro de teste" },
      });
    }
    fireEvent.click(screen.getByRole("button", { name: "Salvar evolução" }));
    expect(
      await screen.findByText("Esta sessão já tem uma evolução."),
    ).toBeTruthy();
    expect(aoConflitar).toHaveBeenCalledOnce();
  });
});
