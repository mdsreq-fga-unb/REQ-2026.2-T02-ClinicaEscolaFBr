import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type {
  AcoesCancelamento,
  Perfil,
  ResultadoCancelamento,
} from "@clinica/shared";
import {
  SessoesComFaltas,
  type SessaoDoCiclo,
} from "@/components/assiduidade/faltas";

const AGORA = new Date("2026-11-05T14:45:00.000Z"); // 11:45 em Brasília
const MINUTO = 60_000;
const sessao = (id: string, minutos: number): SessaoDoCiclo => {
  const inicio = new Date(AGORA.getTime() + minutos * MINUTO);
  return {
    id,
    inicio: inicio.toISOString(),
    termino: new Date(inicio.getTime() + 50 * MINUTO).toISOString(),
    estagiario: "Ana Beatriz Costa",
    status: "agendada",
    falta: null,
  };
};
const as14 = sessao("s1", 135); // 14:00, com 2 h 15 min de antecedência
const passada = sessao("s0", -120);

const TODAS: AcoesCancelamento = {
  pedidoPaciente: true,
  administrativo: true,
  ausenciaEstagiario: true,
  antecedenciaMinimaMinutos: 60,
};
const DO_ESTAGIARIO = { ...TODAS, pedidoPaciente: false };
const DO_SUPERVISOR = { ...DO_ESTAGIARIO, administrativo: false };

const resultado = (
  dados: Partial<ResultadoCancelamento>,
): ResultadoCancelamento => ({
  classificacao: "no_prazo",
  antecedenciaMinutos: 135,
  inicio: as14.inicio,
  avisoAoPaciente: null,
  ...dados,
});

type Post = { url: string; corpo: unknown };
function simularApi(
  perfil: Perfil,
  resposta: { status: number; corpo: unknown },
) {
  const posts: Post[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        posts.push({ url, corpo: JSON.parse(String(init.body)) });
        return new Response(JSON.stringify(resposta.corpo), {
          status: resposta.status,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify(
          url.endsWith("/auth/sessao")
            ? { id: "u1", nome: "Pessoa", perfil }
            : {},
        ),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }),
  );
  return posts;
}

const lista = (acoes: AcoesCancelamento, sessoes = [as14, passada]) =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <SessoesComFaltas
        nome="Mariana Alves Toledo"
        sessoes={sessoes}
        limite={2}
        agora={AGORA.getTime()}
        podeRegistrar
        podeJustificar
        chave={["paciente", "c1"]}
        acoesCancelamento={acoes}
        casoId="c1"
      />
    </QueryClientProvider>,
  );

const abrirDialogo = () => {
  fireEvent.click(
    screen.getAllByRole("button", { name: "Cancelar sessão" })[0],
  );
  return screen.getByRole("dialog");
};
const justificar = (dialogo: HTMLElement, texto: string) =>
  fireEvent.change(within(dialogo).getByLabelText(/Justificativa/), {
    target: { value: texto },
  });
const enviar = (dialogo: HTMLElement) =>
  fireEvent.click(
    within(dialogo).getByRole("button", { name: "Cancelar sessão" }),
  );

describe("Cancelar sessão (RF15 e RF16)", () => {
  beforeAll(() => {
    HTMLDialogElement.prototype.showModal = function () {
      this.open = true;
    };
    HTMLDialogElement.prototype.close = function () {
      this.open = false;
    };
  });
  beforeEach(() => {
    // Só o relógio do Date para; os temporizadores seguem normais.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(AGORA);
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("só a sessão que ainda não começou tem o cancelamento; a passada fica com a falta (RF34)", () => {
    simularApi("secretaria", { status: 200, corpo: {} });
    lista(TODAS);

    expect(
      screen.getAllByRole("button", { name: "Cancelar sessão" }),
    ).toHaveLength(
      2, // a tabela e o cartão do celular
    );
    expect(
      screen.getAllByRole("button", { name: "Registrar falta do paciente" }),
    ).toHaveLength(2);
  });

  it("sem nenhuma opção para o perfil, não há botão de cancelar", () => {
    simularApi("coordenacao", { status: 200, corpo: {} });
    lista({ ...DO_SUPERVISOR, ausenciaEstagiario: false });

    expect(
      screen.queryByRole("button", { name: "Cancelar sessão" }),
    ).toBeNull();
  });

  it("secretaria, pedido do paciente no prazo: mostra a antecedência calculada e cancela", async () => {
    const posts = simularApi("secretaria", {
      status: 200,
      corpo: resultado({}),
    });
    lista(TODAS);
    const dialogo = abrirDialogo();

    const opcoes = within(dialogo).getAllByRole("radio");
    expect(opcoes.map((o) => o.closest("label")?.textContent)).toEqual([
      "O paciente pediu o cancelamento",
      "Cancelamento para remarcar a sessão",
      "Ausência do estagiário",
    ]);
    expect((opcoes[0] as HTMLInputElement).checked).toBe(true);
    expect(within(dialogo).getByText("Quinta-feira, 05/11/2026")).toBeTruthy();
    expect(within(dialogo).getByText("Antecedência: 2 h 15 min.")).toBeTruthy();
    expect(
      within(dialogo).getByText(/Cancelamento no prazo: não conta como falta/),
    ).toBeTruthy();
    expect(
      within(dialogo).getByText(/registro às 11:45 para a sessão das 14:00/),
    ).toBeTruthy();

    justificar(dialogo, "Paciente ligou informando que estará viajando.");
    enviar(dialogo);

    expect(await screen.findByText("Sessão cancelada.")).toBeTruthy();
    expect(
      screen.getByText(/foi cancelada no prazo e não conta como falta/),
    ).toBeTruthy();
    expect(posts).toEqual([
      {
        url: expect.stringContaining("/sessoes/s1/cancelamento"),
        corpo: {
          tipo: "pedido_paciente",
          justificativa: "Paciente ligou informando que estará viajando.",
        },
      },
    ]);
  });

  it("pedido do paciente a 40 minutos: avisa que conta como falta", () => {
    simularApi("secretaria", { status: 200, corpo: {} });
    lista(TODAS, [sessao("s2", 40)]);
    const dialogo = abrirDialogo();

    expect(within(dialogo).getByText("Antecedência: 40 min.")).toBeTruthy();
    expect(
      within(dialogo).getByText(/fora do prazo: conta como falta do paciente/),
    ).toBeTruthy();
  });

  it("sem justificativa: não envia e indica o campo", () => {
    const posts = simularApi("secretaria", { status: 200, corpo: {} });
    lista(TODAS);
    const dialogo = abrirDialogo();

    enviar(dialogo);

    expect(
      within(dialogo).getByText("Informe o motivo do cancelamento."),
    ).toBeTruthy();
    const campo = within(dialogo).getByLabelText(/Justificativa/);
    expect(campo.getAttribute("aria-invalid")).toBe("true");
    expect(document.activeElement).toBe(campo);
    expect(posts).toHaveLength(0);
  });

  it("para remarcar: não conta falta, o paciente é avisado por e-mail e a secretaria agenda a nova sessão", async () => {
    const posts = simularApi("secretaria", {
      status: 200,
      corpo: resultado({
        classificacao: "administrativo",
        avisoAoPaciente: "email_enviado",
      }),
    });
    lista(TODAS);
    const dialogo = abrirDialogo();
    fireEvent.click(
      within(dialogo).getByLabelText("Cancelamento para remarcar a sessão"),
    );

    expect(
      within(dialogo).getByText(
        /não conta como falta do paciente nem do estagiário/,
      ),
    ).toBeTruthy();
    justificar(dialogo, "Paciente pediu para trocar o horário.");
    enviar(dialogo);

    expect(
      await screen.findByText("Sessão cancelada para remarcação."),
    ).toBeTruthy();
    expect(screen.getByText(/O paciente foi avisado por e-mail/)).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Agendar nova sessão" })
        .getAttribute("href"),
    ).toBe("/agendar-sessao?caso=c1");
    expect(posts[0].corpo).toMatchObject({ tipo: "administrativo" });
  });

  it("estagiário: começa pela ausência, sem o pedido do paciente, e registra pela rota do RF16", async () => {
    const posts = simularApi("estagiario", {
      status: 200,
      corpo: resultado({
        classificacao: "ausencia_estagiario",
        avisoAoPaciente: "sem_email",
      }),
    });
    lista(DO_ESTAGIARIO);
    const dialogo = abrirDialogo();

    expect(
      within(dialogo)
        .getAllByRole("radio")
        .map((o) => o.closest("label")?.textContent),
    ).toEqual([
      "Ausência do estagiário",
      "Cancelamento para remarcar a sessão",
    ]);
    expect(
      await within(dialogo).findByText(
        "Ausência do estagiário: conta nas suas faltas de estágio.",
      ),
    ).toBeTruthy();
    justificar(dialogo, "Prova da disciplina no mesmo horário.");
    enviar(dialogo);

    expect(await screen.findByText("Ausência registrada.")).toBeTruthy();
    expect(
      screen.getByText(
        "O paciente não tem e-mail cadastrado e ainda não foi avisado.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText("Peça à secretaria para entrar em contato com ele."),
    ).toBeTruthy();
    expect(posts).toEqual([
      {
        url: expect.stringContaining("/sessoes/s1/ausencia-estagiario"),
        corpo: { justificativa: "Prova da disciplina no mesmo horário." },
      },
    ]);
  });

  it("supervisor: só a ausência do estagiário, com o nome dele", () => {
    simularApi("supervisor", { status: 200, corpo: {} });
    lista(DO_SUPERVISOR);
    const dialogo = abrirDialogo();

    expect(within(dialogo).getAllByRole("radio")).toHaveLength(1);
    expect(
      within(dialogo).getByText(
        "Ausência do estagiário: conta nas faltas de estágio de Ana Beatriz Costa.",
      ),
    ).toBeTruthy();
  });

  it("a sessão começou com o diálogo aberto: explica, sem fechar o diálogo", async () => {
    simularApi("secretaria", {
      status: 422,
      corpo: {
        message:
          "Esta sessão já começou e não pode mais ser cancelada. Se o paciente não compareceu, registre a falta.",
      },
    });
    lista(TODAS);
    const dialogo = abrirDialogo();
    justificar(dialogo, "Viagem.");
    enviar(dialogo);

    expect(await within(dialogo).findByText(/já começou/)).toBeTruthy();
    expect(screen.queryByText("Sessão cancelada.")).toBeNull();
  });

  it("a sessão cancelada para remarcar mostra o motivo no selo", () => {
    simularApi("secretaria", { status: 200, corpo: {} });
    lista(TODAS, [
      {
        ...as14,
        status: "cancelada",
        cancelamento: { classificacao: "administrativo", origem: "secretaria" },
      },
    ]);

    expect(screen.getAllByText("Cancelada · para remarcar")).toHaveLength(2);
    expect(
      screen.queryByRole("button", { name: "Cancelar sessão" }),
    ).toBeNull();
  });
});
