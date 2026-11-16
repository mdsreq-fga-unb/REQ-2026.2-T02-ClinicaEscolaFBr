import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { OpcoesTransferencia } from "@clinica/shared";
import { AvisoTransferencia, DialogoTransferir } from "./transferir";

const OPCOES_SUPERVISOR: OpcoesTransferencia = {
  casoId: "c1",
  numero: "2026-00398",
  paciente: "Mariana Alves Toledo",
  supervisorAtual: { id: "s1", nome: "Ricardo Lima" },
  estagiarioAtual: { id: "e1", nome: "Ana Beatriz Costa" },
  estagiarios: [
    { id: "e2", nome: "Camila Rocha", pacientesEmAtendimento: 3 },
    { id: "e3", nome: "Lucas Ferreira", pacientesEmAtendimento: 0 },
  ],
  supervisores: [],
};
const OPCOES_COORDENACAO: OpcoesTransferencia = {
  ...OPCOES_SUPERVISOR,
  supervisores: [
    {
      id: "s2",
      nome: "Patrícia Nogueira",
      casosAtivos: 12,
      limite: 50,
      noLimite: false,
    },
    {
      id: "s3",
      nome: "Otávio Mendes",
      casosAtivos: 50,
      limite: 50,
      noLimite: true,
    },
  ],
};

function simularApi({
  opcoes = OPCOES_SUPERVISOR as OpcoesTransferencia | null,
  statusOpcoes = 200,
  erroPost = null as { status: number; message: string } | null,
} = {}) {
  const chamadas: { url: string; metodo: string; corpo: unknown }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const metodo = init?.method ?? "GET";
      chamadas.push({
        url,
        metodo,
        corpo: init?.body ? JSON.parse(init.body as string) : null,
      });
      let corpo: unknown = {};
      let status = 404;
      if (url.endsWith("/transferencia") && metodo === "GET") {
        [status, corpo] =
          statusOpcoes === 200
            ? [200, opcoes]
            : [
                statusOpcoes,
                { message: "Você não é o supervisor deste caso." },
              ];
      } else if (url.endsWith("/transferencia") && metodo === "POST") {
        [status, corpo] = erroPost
          ? [erroPost.status, { message: erroPost.message }]
          : [
              201,
              {
                casoId: "c1",
                numero: "2026-00398",
                paciente: "Mariana Alves Toledo",
                supervisor: "Ricardo Lima",
                estagiario: "Camila Rocha",
                sessoesCanceladas: 2,
                sessoesAReagendar: [
                  "2026-11-12T13:00:00.000Z",
                  "2026-11-19T13:00:00.000Z",
                ],
              },
            ];
      }
      return new Response(JSON.stringify(corpo), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
  return chamadas;
}

function abrir(coordenacao = false) {
  const aoConcluir = vi.fn();
  const aoFechar = vi.fn();
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <DialogoTransferir
        casoId="c1"
        coordenacao={coordenacao}
        aoConcluir={aoConcluir}
        aoFechar={aoFechar}
      />
    </QueryClientProvider>,
  );
  return { aoConcluir, aoFechar };
}

const motivo = () => screen.getByLabelText("Motivo da transferência");
const transferir = () =>
  fireEvent.click(screen.getByRole("button", { name: "Transferir caso" }));

describe("Transferir caso para outro estagiário ou supervisor (RF25)", () => {
  beforeAll(() => {
    HTMLDialogElement.prototype.showModal = function () {
      this.open = true;
    };
    HTMLDialogElement.prototype.close = function () {
      this.open = false;
    };
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("o supervisor vê o resumo do caso, só os estagiários dele e a orientação de pedir à coordenação (RF25, RNF16)", async () => {
    simularApi();
    abrir();
    expect(await screen.findByText("Mariana Alves Toledo")).toBeTruthy();
    expect(screen.getByText("2026-00398")).toBeTruthy();
    expect(screen.getByText("Ana Beatriz Costa")).toBeTruthy();
    expect(screen.getByText("Todos os campos são obrigatórios.")).toBeTruthy();
    const grupo = screen.getByRole("group", {
      name: "Novo estagiário responsável",
    });
    expect(within(grupo).getAllByRole("radio")).toHaveLength(2);
    expect(within(grupo).getByText("3 pacientes em atendimento")).toBeTruthy();
    expect(
      within(grupo).getByText("Nenhum paciente em atendimento"),
    ).toBeTruthy();
    expect(
      screen.getByText(/peça a\s+transferência à coordenação/),
    ).toBeTruthy();
    expect(
      screen.queryByRole("group", { name: "Novo supervisor responsável" }),
    ).toBeNull();
  });

  it("sem escolha nem motivo, lista os erros com links para os campos e não envia (RF25, RNF16)", async () => {
    const chamadas = simularApi();
    abrir();
    await screen.findByText("Mariana Alves Toledo");
    transferir();
    expect(
      await screen.findByText("Corrija 2 itens para transferir o caso"),
    ).toBeTruthy();
    const links = screen.getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual([
      "Escolha o novo estagiário responsável.",
      "Informe o motivo da transferência.",
    ]);
    // Cada link leva ao controle do campo.
    expect(
      document.getElementById(links[1].getAttribute("href")!.slice(1)),
    ).toBe(motivo());
    expect(motivo().getAttribute("aria-invalid")).toBe("true");
    expect(chamadas.some((c) => c.metodo === "POST")).toBe(false);
  });

  it("o erro de cada campo some quando ele é corrigido, e o resumo acompanha (RF25, RNF16)", async () => {
    simularApi();
    abrir();
    await screen.findByText("Mariana Alves Toledo");
    transferir();
    await screen.findByText("Corrija 2 itens para transferir o caso");
    fireEvent.click(screen.getByLabelText(/Camila Rocha/));
    expect(
      screen.getByText("Corrija 1 item para transferir o caso"),
    ).toBeTruthy();
    fireEvent.change(motivo(), { target: { value: "Licença." } });
    expect(screen.queryByText(/Corrija/)).toBeNull();
    expect(motivo().getAttribute("aria-invalid")).toBeNull();
  });

  it("mostra quem perde o acesso, confirma com De, Para e Motivo, e só então transfere (RF25, RNF16, RNF18, RNF20)", async () => {
    const chamadas = simularApi();
    const { aoConcluir } = abrir();
    await screen.findByText("Mariana Alves Toledo");
    fireEvent.click(screen.getByLabelText(/Camila Rocha/));
    fireEvent.change(motivo(), {
      target: { value: "Ana Beatriz entrou de licença." },
    });
    expect(
      screen.getByText(
        /Ana Beatriz Costa perde o acesso ao caso, e Camila Rocha passa a ver todo o histórico/,
      ),
    ).toBeTruthy();
    transferir();

    expect(
      await screen.findByRole("heading", {
        name: "Confirmar a transferência?",
      }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Ricardo Lima (supervisor) e Ana Beatriz Costa (estagiário).",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Ricardo Lima (supervisor) e Camila Rocha (estagiário).",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Ana Beatriz entrou de licença.")).toBeTruthy();
    expect(chamadas.some((c) => c.metodo === "POST")).toBe(false);

    fireEvent.click(
      screen.getByRole("button", { name: "Confirmar transferência" }),
    );
    await vi.waitFor(() => expect(aoConcluir).toHaveBeenCalled());
    expect(chamadas.find((c) => c.metodo === "POST")).toMatchObject({
      url: expect.stringContaining("/casos/c1/transferencia"),
      corpo: { estagiarioId: "e2", motivo: "Ana Beatriz entrou de licença." },
    });
  });

  it("“Voltar” na confirmação mantém o que foi preenchido (RF25, RNF16)", async () => {
    simularApi();
    abrir();
    await screen.findByText("Mariana Alves Toledo");
    fireEvent.click(screen.getByLabelText(/Lucas Ferreira/));
    fireEvent.change(motivo(), { target: { value: "Redistribuição." } });
    transferir();
    fireEvent.click(await screen.findByRole("button", { name: "Voltar" }));
    expect(
      (screen.getByLabelText(/Lucas Ferreira/) as HTMLInputElement).checked,
    ).toBe(true);
    expect((motivo() as HTMLTextAreaElement).value).toBe("Redistribuição.");
  });

  it("o 403 da API volta ao formulário com a orientação de pedir à coordenação (RF25, RNF16)", async () => {
    const mensagem =
      "Esse estagiário não está sob a sua supervisão. Para passar o caso a outro supervisor, ou a um estagiário de outro supervisor, peça a transferência à coordenação.";
    simularApi({ erroPost: { status: 403, message: mensagem } });
    const { aoConcluir } = abrir();
    await screen.findByText("Mariana Alves Toledo");
    fireEvent.click(screen.getByLabelText(/Camila Rocha/));
    fireEvent.change(motivo(), { target: { value: "Licença." } });
    transferir();
    fireEvent.click(
      await screen.findByRole("button", { name: "Confirmar transferência" }),
    );
    expect(
      await screen.findByText("Não foi possível transferir o caso."),
    ).toBeTruthy();
    expect(screen.getByText(mensagem)).toBeTruthy();
    expect(aoConcluir).not.toHaveBeenCalled();
  });

  it("quem não é o supervisor do caso vê a recusa ao abrir (RF25, RNF16)", async () => {
    simularApi({ statusOpcoes: 403 });
    abrir();
    expect(
      await screen.findByText("Não foi possível abrir a transferência."),
    ).toBeTruthy();
    expect(
      screen.getByText("Você não é o supervisor deste caso."),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Transferir caso" }),
    ).toBeNull();
  });

  it("a coordenação escolhe o supervisor, com a contagem de casos e o aviso no que está no limite, e o estagiário é opcional (RF25, RNF16, RNF20)", async () => {
    const chamadas = simularApi({ opcoes: OPCOES_COORDENACAO });
    const { aoConcluir } = abrir(true);
    await screen.findByText("Mariana Alves Toledo");
    const grupo = screen.getByRole("group", {
      name: "Novo supervisor responsável",
    });
    expect(within(grupo).getByText(/12 de 50/)).toBeTruthy();
    expect(
      (within(grupo).getByLabelText(/Otávio Mendes/) as HTMLInputElement)
        .disabled,
    ).toBe(false);
    expect(
      within(grupo).getByText(
        "Já está no limite de 50 casos: a transferência passa do limite",
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole("group", { name: /Novo estagiário responsável/ })
        .textContent,
    ).toContain("(opcional)");

    fireEvent.click(within(grupo).getByLabelText(/Patrícia Nogueira/));
    fireEvent.change(motivo(), { target: { value: "Reorganização." } });
    expect(
      screen.getByText(
        /Ricardo Lima e Ana Beatriz Costa perdem o acesso ao caso, e Patrícia Nogueira passa/,
      ),
    ).toBeTruthy();
    transferir();
    expect(
      await screen.findByText(
        "Patrícia Nogueira (supervisor), sem estagiário: o caso aguarda o vínculo.",
      ),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmar transferência" }),
    );
    await vi.waitFor(() => expect(aoConcluir).toHaveBeenCalled());
    expect(chamadas.find((c) => c.metodo === "POST")?.corpo).toEqual({
      supervisorId: "s2",
      motivo: "Reorganização.",
    });
  });

  it("a coordenação transfere para um supervisor no limite, com o aviso na confirmação (RF25, DF50, RNF16)", async () => {
    const chamadas = simularApi({ opcoes: OPCOES_COORDENACAO });
    const { aoConcluir } = abrir(true);
    await screen.findByText("Mariana Alves Toledo");
    const grupo = screen.getByRole("group", {
      name: "Novo supervisor responsável",
    });
    fireEvent.click(within(grupo).getByLabelText(/Otávio Mendes/));
    fireEvent.change(motivo(), { target: { value: "Reorganização." } });
    transferir();
    expect(
      await screen.findByText(
        "Otávio Mendes passa a ter 51 casos, acima do limite de 50 casos.",
      ),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmar transferência" }),
    );
    await vi.waitFor(() => expect(aoConcluir).toHaveBeenCalled());
    expect(chamadas.find((c) => c.metodo === "POST")?.corpo).toEqual({
      supervisorId: "s3",
      motivo: "Reorganização.",
    });
  });

  it("a coordenação mantém o supervisor e troca só o estagiário, que passa a ser obrigatório (RF25, RNF16)", async () => {
    const chamadas = simularApi({ opcoes: OPCOES_COORDENACAO });
    const { aoConcluir } = abrir(true);
    await screen.findByText("Mariana Alves Toledo");
    fireEvent.click(screen.getByLabelText(/Manter Ricardo Lima/));
    fireEvent.change(motivo(), { target: { value: "Troca de estagiário." } });
    transferir();
    expect(
      await screen.findByText("Corrija 1 item para transferir o caso"),
    ).toBeTruthy();
    fireEvent.click(screen.getByLabelText(/Lucas Ferreira/));
    transferir();
    fireEvent.click(
      await screen.findByRole("button", { name: "Confirmar transferência" }),
    );
    await vi.waitFor(() => expect(aoConcluir).toHaveBeenCalled());
    expect(chamadas.find((c) => c.metodo === "POST")?.corpo).toEqual({
      estagiarioId: "e3",
      motivo: "Troca de estagiário.",
    });
  });

  it("a coordenação sem escolher o supervisor recebe o erro do campo (RF25, RNF16)", async () => {
    simularApi({ opcoes: OPCOES_COORDENACAO });
    abrir(true);
    await screen.findByText("Mariana Alves Toledo");
    fireEvent.change(motivo(), { target: { value: "Reorganização." } });
    transferir();
    expect(
      await screen.findByRole("link", {
        name: "Escolha o novo supervisor responsável.",
      }),
    ).toBeTruthy();
  });

  it("o aviso de sucesso traz os novos responsáveis, as sessões a remarcar e o limite ultrapassado (RF25, DF50, RNF20)", () => {
    render(
      <AvisoTransferencia
        resultado={{
          casoId: "c1",
          numero: "2026-00398",
          paciente: "Mariana Alves Toledo",
          supervisor: "Patrícia Nogueira",
          estagiario: null,
          sessoesCanceladas: 2,
          sessoesAReagendar: [
            "2026-11-12T13:00:00.000Z",
            "2026-11-19T13:00:00.000Z",
          ],
          acimaDoLimite: true,
        }}
      />,
    );
    expect(screen.getByText("Caso transferido.")).toBeTruthy();
    const texto = screen.getByRole("status").textContent;
    expect(texto).toContain(
      "Patrícia Nogueira agora é o responsável pelo caso de Mariana Alves Toledo (2026-00398).",
    );
    expect(texto).toContain("aguarda o vínculo de um estagiário");
    expect(texto).toContain("O supervisor ficou acima do limite de casos");
    expect(texto).toContain(
      "As 2 sessões futuras do estagiário anterior foram canceladas",
    );
    expect(screen.getAllByRole("listitem").map((l) => l.textContent)).toEqual([
      "12/11/2026, 10:00",
      "19/11/2026, 10:00",
    ]);
  });
});
