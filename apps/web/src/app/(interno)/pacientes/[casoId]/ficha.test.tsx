import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PacientePage from "./page";

vi.mock("next/navigation", () => ({ useParams: () => ({ casoId: "c1" }) }));

type Resposta = [number, unknown];

function simularApi(
  perfil: string,
  responsaveis: Resposta,
  dados: Resposta = [404, {}],
) {
  const chamadas: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      chamadas.push(url);
      const [status, corpo]: Resposta = url.endsWith("/auth/sessao")
        ? [200, { id: "u1", nome: "Pessoa", perfil }]
        : url.endsWith("/casos/c1/responsaveis")
          ? responsaveis
          : url.endsWith("/dados-administrativos")
            ? dados
            : [404, {}];
      return new Response(JSON.stringify(corpo), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
  return chamadas;
}

function abrir() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <PacientePage />
    </QueryClientProvider>,
  );
}

const ROBERTO = {
  casoId: "c1",
  nome: "Roberto Carvalho",
  numero: "2026-00377",
  situacao: "aguardando_vinculo",
  supervisor: "Patrícia Nogueira",
  estagiario: null,
};

describe("Ficha do paciente com os responsáveis (RF22)", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("o supervisor responsável abre a ficha pelo 'Meus casos' e vê o quadro e a identificação, sem os dados administrativos (RF22, RNF17)", async () => {
    const chamadas = simularApi("supervisor", [200, ROBERTO]);
    abrir();
    const quadro = await screen.findByRole("region", {
      name: "Responsáveis pelo caso",
    });
    expect(
      screen.getByRole("link", { name: "Meus casos" }).getAttribute("href"),
    ).toBe("/meus-casos");
    expect(
      within(quadro).getByRole("button", { name: "Vincular estagiário" }),
    ).toBeTruthy();
    const identificacao = screen.getByRole("region", {
      name: "Identificação",
    });
    expect(identificacao.textContent).toContain("2026-00377");
    expect(identificacao.textContent).toContain(
      "Aguardando vínculo de estagiário",
    );
    // A ficha do supervisor não pede os dados administrativos, que são da
    // secretaria e da coordenação.
    expect(chamadas.some((u) => u.includes("dados-administrativos"))).toBe(
      false,
    );
    expect(screen.queryByText("Dados cadastrais")).toBeNull();
  });

  it('no caso desligado por faltas, o supervisor não recebe o "Vincular estagiário", porque o caso volta pela reversão (RF22, RF21, RF38, RNF16)', async () => {
    simularApi("supervisor", [
      200,
      { ...ROBERTO, situacao: "desligado_por_faltas" },
    ]);
    abrir();
    const quadro = await screen.findByRole("region", {
      name: "Responsáveis pelo caso",
    });
    expect(
      within(quadro).queryByRole("button", { name: "Vincular estagiário" }),
    ).toBeNull();
    expect(quadro.textContent).not.toContain(
      "O caso fica aguardando o vínculo",
    );
  });

  it("o estagiário responsável vê os dois nomes (RF22, RNF17)", async () => {
    simularApi("estagiario", [
      200,
      {
        ...ROBERTO,
        situacao: "em_atendimento",
        estagiario: "Ana Beatriz Costa",
      },
    ]);
    abrir();
    const quadro = await screen.findByRole("region", {
      name: "Responsáveis pelo caso",
    });
    expect(quadro.textContent).toContain("Ana Beatriz Costa");
    expect(quadro.textContent).toContain("Patrícia Nogueira");
    expect(within(quadro).queryByRole("button")).toBeNull();
  });

  it("o estagiário de outro caso vê o acesso negado, sem nome nenhum (RF22, RNF16, RNF17)", async () => {
    simularApi("estagiario", [
      403,
      { statusCode: 403, message: "Você não tem acesso a este caso." },
    ]);
    abrir();
    expect(
      await screen.findByText("Você não tem acesso a este caso."),
    ).toBeTruthy();
    expect(
      screen.queryByRole("region", { name: "Responsáveis pelo caso" }),
    ).toBeNull();
    expect(document.body.textContent).not.toMatch(/Roberto|Patrícia/);
    expect(
      screen
        .getByRole("link", { name: "Voltar para Meus pacientes" })
        .getAttribute("href"),
    ).toBe("/meus-pacientes");
  });

  it("caso sem supervisor abre para a coordenação, com o quadro e a identificação (RF22)", async () => {
    const chamadas = simularApi("coordenacao", [
      200,
      {
        casoId: "c1",
        nome: "Luana Martins",
        numero: "2026-00455",
        situacao: "aguardando_distribuicao",
        supervisor: null,
        estagiario: null,
      },
    ]);
    abrir();
    const quadro = await screen.findByRole("region", {
      name: "Responsáveis pelo caso",
    });
    expect(
      within(quadro).getByRole("link", {
        name: "Ir para Distribuição de casos",
      }),
    ).toBeTruthy();
    expect(screen.getByRole("region", { name: "Identificação" })).toBeTruthy();
    expect(chamadas.some((u) => u.includes("dados-administrativos"))).toBe(
      false,
    );
  });

  it("para a secretaria, o quadro fica no topo, depois do aviso do conteúdo clínico e antes dos dados cadastrais (RF22, RNF17)", async () => {
    simularApi(
      "secretaria",
      [
        200,
        {
          casoId: "c1",
          nome: "Mariana Alves Toledo",
          situacao: "em_atendimento",
          supervisor: "Ricardo Menezes",
          estagiario: "Ana Beatriz Costa",
        },
      ],
      [
        200,
        {
          casoId: "c1",
          numeroInscricao: "2026-00398",
          nome: "Mariana Alves Toledo",
          dataNascimento: "1994-08-22",
          celular: "61998765432",
          email: null,
          canalPreferencial: "whatsapp",
          responsavelLegal: null,
          situacao: "em_atendimento",
          vinculadoEm: null,
          cicloDesde: null,
          proximaSessao: null,
          estagiario: "Ana Beatriz Costa",
          ultimoEstagiario: null,
          supervisor: "Ricardo Menezes",
          faltasNoCiclo: { faltas: 0, limite: 2, justificadas: 0 },
          cicloAtendimento: 1,
          sessoes: [],
          acoesCancelamento: {},
          podeDesligar: false,
          desligamentos: [],
          vagaDoDesligamento: null,
          sessoesAReagendar: [],
        },
      ],
    );
    abrir();
    const quadro = await screen.findByRole("region", {
      name: "Responsáveis pelo caso",
    });
    const aviso = screen.getByText(
      "O conteúdo clínico não aparece para o seu perfil.",
    );
    const cadastrais = screen.getByRole("region", { name: "Dados cadastrais" });
    const antes = (a: Node, b: Node) =>
      Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(antes(aviso, quadro)).toBe(true);
    expect(antes(quadro, cadastrais)).toBe(true);
  });
});
