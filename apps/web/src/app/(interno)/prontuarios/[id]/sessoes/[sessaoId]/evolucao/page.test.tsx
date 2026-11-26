import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import RegistrarEvolucaoPage from "./page";
import { api, ErroApi } from "@/lib/api";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "p1", sessaoId: "s1" }),
}));
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  api: vi.fn(),
}));
const perfil = vi.hoisted(() => ({ atual: "estagiario" }));
vi.mock("@/lib/sessao", () => ({
  useSessao: () => ({ data: { id: "u1", perfil: perfil.atual } }),
}));
afterEach(() => {
  cleanup();
  perfil.atual = "estagiario";
});

const ROTA = "/prontuarios/p1/sessoes/s1/evolucao";

// Resposta do RF31 para a sessão s1, com ou sem evolução.
const resposta = (
  evolucao: unknown,
  acoes: Partial<Record<string, boolean>> = {},
) => ({
  prontuarioId: "p1",
  casoId: "c1",
  paciente: "Paciente",
  supervisor: "Carla",
  sessao: {
    id: "s1",
    inicio: "2026-11-10T11:00:00Z",
    status: "realizada",
    numeroNoCiclo: 4,
    estagiarioId: "u1",
    estagiario: "Ana",
  },
  evolucao,
  acoes: {
    registrar: evolucao === null,
    corrigir: false,
    complementar: false,
    validar: false,
    ...acoes,
  },
});

describe("registro de evolução em tela própria (RF28, RNF25, RNF27, RNF30)", () => {
  it("mostra os seis dados de origem e o formulário para o estagiário responsável (RF28, RNF25, RNF27, RNF30)", async () => {
    vi.mocked(api).mockResolvedValueOnce(resposta(null) as never);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <RegistrarEvolucaoPage />
      </QueryClientProvider>,
    );
    expect(
      await screen.findByRole("heading", { name: "Registro de evolução" }),
    ).toBeTruthy();
    for (const rotulo of [
      "Paciente",
      "Sessão no ciclo",
      "Data e horário",
      "Comparecimento",
      "Estagiário",
      "Supervisor",
    ])
      expect(screen.getAllByText(rotulo).length).toBeGreaterThan(0);
    expect(
      screen.getByRole("link", { name: "Cancelar" }).getAttribute("href"),
    ).toContain("#sessoes-ciclo");
    expect(
      screen.getByRole("button", { name: "Salvar evolução" }),
    ).toBeTruthy();
  });

  it("após 409 recarrega e mostra a evolução que já havia sido gravada (RF28, RNF25, RNF27, RNF30)", async () => {
    const registro = {
      id: "e1",
      queixa: null,
      planejamento: null,
      humorAparencia: "Tranquilo",
      conteudoTrabalhado: "Rotina",
      tecnicasUtilizadas: "Escuta",
      intervencoesEncaminhamentos: null,
      planoProximaSessao: "Retomar",
      registradaPor: "Ana",
      registradaEm: "2026-11-10T12:00:00Z",
    };
    let consultas = 0;
    vi.mocked(api).mockImplementation(async (path: string) => {
      if (path === ROTA) {
        consultas += 1;
        return resposta(consultas > 1 ? registro : null) as never;
      }
      if (path.endsWith("/evolucoes"))
        throw new ErroApi(409, "A evolução já foi registrada.");
      throw new Error(`Rota inesperada: ${path}`);
    });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <RegistrarEvolucaoPage />
      </QueryClientProvider>,
    );
    for (const campo of [
      "Humor e aparência do paciente",
      "Conteúdo trabalhado",
      "Técnicas utilizadas",
      "Plano para a próxima sessão",
    ]) {
      fireEvent.change(await screen.findByLabelText(new RegExp(campo)), {
        target: { value: "Registro válido" },
      });
    }
    fireEvent.click(screen.getByRole("button", { name: "Salvar evolução" }));
    expect(
      await screen.findByText(/registro existente foi carregado/i),
    ).toBeTruthy();
    expect(await screen.findByText("Tranquilo")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Salvar evolução" }),
    ).toBeNull();
  });

  it("quem não tem acesso vê a tela de acesso negado da prancha, sem o nome do paciente nem indicação da sessão (RF28, RNF25)", async () => {
    vi.mocked(api).mockRejectedValueOnce(
      new ErroApi(403, "Você não tem acesso a este prontuário."),
    );
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <RegistrarEvolucaoPage />
      </QueryClientProvider>,
    );
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Você não tem acesso a este prontuário",
      }),
    ).toBeTruthy();
    expect(screen.getByText(/fale com o supervisor do caso/)).toBeTruthy();
    expect(screen.getByText(/Tentativa registrada em/)).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Voltar para meus pacientes" })
        .getAttribute("href"),
    ).toBe("/meus-pacientes");
    // Só o título da tela negada: nem os dados da sessão nem o formulário.
    expect(screen.getAllByRole("heading").map((h) => h.textContent)).toEqual([
      "Você não tem acesso a este prontuário",
    ]);
    expect(screen.queryByRole("button", { name: /Salvar/ })).toBeNull();
  });

  const EVOLUCAO = {
    id: "e1",
    queixa: null,
    planejamento: null,
    humorAparencia: "Paciente tranquila.",
    conteudoTrabalhado: "Organização da rotina de estudos.",
    tecnicasUtilizadas: "Escuta qualificada e registro de pensamentos.",
    intervencoesEncaminhamentos: null,
    planoProximaSessao: "Retomar o registro.",
    registradaPor: "Ana",
    registradaEm: "2026-10-29T18:10:00Z",
    versaoAtual: 2,
    versoes: [
      {
        versao: 2,
        humorAparencia: "Paciente tranquila.",
        conteudoTrabalhado: "Organização da rotina de estudos.",
        tecnicasUtilizadas: "Escuta qualificada e registro de pensamentos.",
        intervencoesEncaminhamentos: null,
        planoProximaSessao: "Retomar o registro.",
        queixa: null,
        planejamento: null,
        motivo: "A técnica estava incompleta.",
        autor: "Ana",
        em: "2026-11-05T19:20:00Z",
      },
      {
        versao: 1,
        humorAparencia: "Paciente tranquila.",
        conteudoTrabalhado: "Organização da rotina de estudos.",
        tecnicasUtilizadas: "Escuta qualificada.",
        intervencoesEncaminhamentos: null,
        planoProximaSessao: "Retomar o registro.",
        queixa: null,
        planejamento: null,
        motivo: null,
        autor: "Ana",
        em: "2026-10-29T18:10:00Z",
      },
    ],
    correcao: { dataLimite: null, prazoEncerrado: false, permitida: true },
    complementos: [
      {
        tipo: "complemento",
        id: "c1",
        texto: "Orientação da supervisão.",
        autor: "Ana",
        em: "2026-11-06T13:20:00Z",
      },
    ],
    complemento: { permitido: true, aviso: null },
    validacao: {
      situacao: "validada",
      ultima: { por: "Carla", em: "2026-11-06T21:05:00Z" },
      mudanca: null,
      permitida: false,
    },
  };

  const abrir = () =>
    render(
      <QueryClientProvider
        client={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
      >
        <RegistrarEvolucaoPage />
      </QueryClientProvider>,
    );

  it("com a evolução registrada, mostra o conteúdo atual validado, o histórico em ordem e as ações de quem pode (RF31)", async () => {
    vi.mocked(api).mockResolvedValue(
      resposta(EVOLUCAO, { corrigir: true, complementar: true }) as never,
    );
    abrir();
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Evolução da sessão 4",
      }),
    ).toBeTruthy();
    expect(vi.mocked(api)).toHaveBeenCalledWith(ROTA);
    expect(
      screen.getByText(
        /Paciente · .* · estagiário\(a\) Ana · supervisor\(a\) Carla/,
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Conteúdo atual" }),
    ).toBeTruthy();
    expect(screen.getByText("Validada")).toBeTruthy();
    expect(
      screen.getAllByText("Escuta qualificada e registro de pensamentos.")
        .length,
    ).toBeGreaterThan(0);
    const historico = screen.getByRole("list", {
      name: "Histórico desta evolução",
    });
    const itens = Array.from(historico.querySelectorAll(":scope > li")).map(
      (li) => li.textContent,
    );
    expect(itens).toHaveLength(3);
    expect(itens[0]).toContain("Registro original");
    expect(itens[1]).toContain("Correção · revisa o conteúdo");
    expect(itens[1]).toContain("A técnica estava incompleta.");
    expect(itens[2]).toContain("Complemento · informação adicional");
    expect(
      screen
        .getByRole("link", { name: "Corrigir evolução da sessão 4" })
        .getAttribute("href"),
    ).toBe("/prontuarios/p1/evolucoes/e1/corrigir");
    expect(
      screen.getByRole("button", {
        name: "Adicionar complemento à evolução da sessão 4",
      }),
    ).toBeTruthy();
  });

  it("a coordenação vê o aviso de consulta registrada e nenhuma ação (RF31, RF56)", async () => {
    perfil.atual = "coordenacao";
    vi.mocked(api).mockResolvedValue(
      resposta({
        ...EVOLUCAO,
        correcao: { ...EVOLUCAO.correcao, permitida: false },
        complemento: { permitido: false, aviso: null },
      }) as never,
    );
    abrir();
    expect(
      await screen.findByText("Você está consultando como coordenação."),
    ).toBeTruthy();
    expect(
      screen.queryByRole("link", { name: /Corrigir evolução/ }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: /Adicionar complemento/ }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: /Validar/ })).toBeNull();
  });

  it("a sessão realizada sem evolução, para quem não registra, mostra o aviso sem o formulário (RF31)", async () => {
    perfil.atual = "supervisor";
    vi.mocked(api).mockResolvedValue(
      resposta(null, { registrar: false }) as never,
    );
    abrir();
    expect(
      await screen.findByText(
        "Ainda não há evolução registrada para esta sessão.",
      ),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Salvar evolução" }),
    ).toBeNull();
  });
});
