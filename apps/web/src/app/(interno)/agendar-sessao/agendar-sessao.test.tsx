import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AgendarSessaoPage from "./page";

const PACIENTES = [
  {
    casoId: "c1",
    nome: "Sérgio Antunes Freitas",
    estagiario: { id: "e1", nome: "Pedro Henrique Lima" },
  },
  {
    casoId: "c2",
    nome: "Mariana Alves Toledo",
    estagiario: { id: "e2", nome: "Ana Beatriz Costa" },
  },
  { casoId: "c3", nome: "Rafael Gomes Ribeiro", estagiario: null },
];

const RESULTADO = {
  id: "s1",
  estagiario: "Pedro Henrique Lima",
  inicio: "2026-12-03T13:00:00.000Z",
  termino: "2026-12-03T13:50:00.000Z",
  fimIntervaloAnotacoes: "2026-12-03T14:00:00.000Z",
  linkEnviadoPorEmail: false,
  whatsapp: null,
};

type Resposta = { status: number; corpo: unknown };
type Chamada = { url: string; metodo: string; corpo: unknown };

// Respostas da API por rota; o agendamento e o registro do WhatsApp variam por teste.
function simularApi({
  perfil = "secretaria",
  agendamento = { status: 201, corpo: RESULTADO },
}: { perfil?: string; agendamento?: Resposta } = {}) {
  const chamadas: Chamada[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const metodo = init?.method ?? "GET";
      chamadas.push({
        url,
        metodo,
        corpo: init?.body ? JSON.parse(init.body as string) : null,
      });
      let resposta: Resposta = { status: 404, corpo: {} };
      if (url.endsWith("/auth/sessao")) {
        resposta = {
          status: 200,
          corpo: { id: "u1", nome: "Juliana Rocha", perfil },
        };
      } else if (url.includes("/sessoes/pacientes")) {
        resposta = { status: 200, corpo: PACIENTES };
      } else if (url.includes("/sessoes/agenda")) {
        resposta = {
          status: 200,
          corpo: [
            {
              inicio: "2026-12-03T17:00:00.000Z",
              termino: "2026-12-03T17:50:00.000Z",
              fimIntervaloAnotacoes: "2026-12-03T18:00:00.000Z",
            },
          ],
        };
      } else if (url.endsWith("/whatsapp")) {
        resposta = {
          status: 200,
          corpo: { mensagemWhatsappEm: "2026-11-30T18:32:00.000Z" },
        };
      } else if (url.endsWith("/sessoes") && metodo === "POST") {
        resposta = agendamento;
      }
      return new Response(JSON.stringify(resposta.corpo), {
        status: resposta.status,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
  return chamadas;
}

function abrirTela() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <AgendarSessaoPage />
    </QueryClientProvider>,
  );
}

async function escolherPaciente(nome: string) {
  fireEvent.click(
    await screen.findByRole("button", { name: new RegExp(nome) }),
  );
}

function preencherHorario(inicio: string, termino?: string) {
  fireEvent.change(screen.getByLabelText("Data"), {
    target: { value: "2026-12-03" },
  });
  fireEvent.change(screen.getByLabelText("Início"), {
    target: { value: inicio },
  });
  if (termino) {
    fireEvent.change(screen.getByLabelText("Término"), {
      target: { value: termino },
    });
  }
}

const botaoAgendar = () =>
  screen.getByRole("button", { name: "Agendar sessão" });

describe("Agendar sessão (RF10)", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("calcula o término pela duração padrão, envia só o início e confirma o envio por e-mail", async () => {
    const chamadas = simularApi({
      agendamento: {
        status: 201,
        corpo: {
          ...RESULTADO,
          paciente: "Sérgio Antunes Freitas",
          canal: "email",
          linkEnviadoPorEmail: true,
        },
      },
    });
    abrirTela();
    await escolherPaciente("Sérgio");
    expect(screen.getByText("Pedro Henrique Lima")).toBeTruthy();
    preencherHorario("10:00");
    expect((screen.getByLabelText("Término") as HTMLInputElement).value).toBe(
      "10:50",
    );
    // A agenda do dia mostra o bloco ocupado e o da nova sessão.
    expect(await screen.findByText("14:00–15:00")).toBeTruthy();
    expect(screen.getByText("10:00–11:00")).toBeTruthy();

    fireEvent.click(botaoAgendar());
    expect(
      await screen.findByText("Link de confirmação enviado por e-mail."),
    ).toBeTruthy();
    const envio = chamadas.find((c) => c.metodo === "POST");
    expect(envio?.corpo).toEqual({
      casoId: "c1",
      inicio: "2026-12-03T10:00:00-03:00",
    });
    expect(screen.getByText("10:00 às 10:50")).toBeTruthy();
  });

  it("recusa término anterior ao início sem chamar a API", async () => {
    const chamadas = simularApi();
    abrirTela();
    await escolherPaciente("Sérgio");
    preencherHorario("15:00", "14:30");
    fireEvent.click(botaoAgendar());
    expect(
      await screen.findByText(
        "O término precisa ser depois do início (15:00). Exemplo: 15:50.",
      ),
    ).toBeTruthy();
    expect(chamadas.some((c) => c.metodo === "POST")).toBe(false);
  });

  it("no conflito, mostra a sessão ocupada e o primeiro horário livre", async () => {
    simularApi({
      agendamento: {
        status: 409,
        corpo: {
          message:
            "Conflito de horário. Pedro Henrique Lima tem sessão em 03/12/2026 das 14:00 às 14:50, com anotações até 15:00. Escolha outro horário.",
          conflito: "estagiario",
          blocoOcupado: {
            inicio: "2026-12-03T17:00:00.000Z",
            fim: "2026-12-03T18:00:00.000Z",
          },
          primeiroHorarioLivre: "2026-12-03T18:00:00.000Z",
        },
      },
    });
    abrirTela();
    await escolherPaciente("Sérgio");
    preencherHorario("14:50");
    fireEvent.click(botaoAgendar());
    expect(
      await screen.findByText(
        "Pedro Henrique Lima tem sessão em 03/12/2026 das 14:00 às 14:50, com anotações até 15:00. Escolha outro horário.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "O início às 14:50 cai no bloco ocupado das 14:00 às 15:00 (sessão + anotações). Primeiro horário livre: 15:00.",
      ),
    ).toBeTruthy();
  });

  it("paciente sem estagiário vinculado: avisa e não deixa agendar", async () => {
    simularApi();
    abrirTela();
    await escolherPaciente("Rafael");
    expect(
      screen.getByText(
        "Rafael Gomes Ribeiro ainda não tem estagiário vinculado.",
      ),
    ).toBeTruthy();
    expect((botaoAgendar() as HTMLButtonElement).disabled).toBe(true);
  });

  it("canal WhatsApp: mostra a mensagem pronta e registra quando o botão foi usado", async () => {
    const mensagem =
      "Olá, Mariana! Sua sessão na Clínica Escola de Psicologia da FBr está agendada para quinta-feira, 03/12/2026, às 15:00.\nConfirme sua presença pelo link: http://localhost:3000/confirmacao/abc";
    const chamadas = simularApi({
      agendamento: {
        status: 201,
        corpo: {
          ...RESULTADO,
          paciente: "Mariana Alves Toledo",
          estagiario: "Ana Beatriz Costa",
          canal: "whatsapp",
          whatsapp: {
            celular: "(61) 99876-5432",
            mensagem,
            url: "https://wa.me/5561998765432?text=ol%C3%A1",
          },
        },
      },
    });
    abrirTela();
    await escolherPaciente("Mariana");
    preencherHorario("15:00");
    fireEvent.click(botaoAgendar());

    expect(
      await screen.findByText(/O canal preferencial de Mariana é WhatsApp/),
    ).toBeTruthy();
    expect(screen.getByText(/Confirme sua presença pelo link/)).toBeTruthy();
    const link = screen.getByRole("link", { name: /Enviar pelo WhatsApp/ });
    expect(link.getAttribute("href")).toBe(
      "https://wa.me/5561998765432?text=ol%C3%A1",
    );
    fireEvent.click(link);
    expect(
      await screen.findByText(
        "Mensagem aberta no WhatsApp em 30/11/2026 às 15:32.",
      ),
    ).toBeTruthy();
    expect(chamadas.some((c) => c.url.endsWith("/sessoes/s1/whatsapp"))).toBe(
      true,
    );
  });

  it("supervisor e coordenação não têm acesso à tela", async () => {
    simularApi({ perfil: "supervisor" });
    abrirTela();
    expect(
      await screen.findByText(
        "Acesso restrito à secretaria e aos estagiários.",
      ),
    ).toBeTruthy();
  });
});
