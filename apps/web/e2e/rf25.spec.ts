import {
  expect,
  test,
  type Page,
  type PlaywrightWorkerArgs,
} from "@playwright/test";
import { atribuicoesSupervisor, createDb } from "@clinica/database";
import { API, entrar, fecharContextos, semViolacoes } from "./apoio";
import { criarPacienteComSessoes } from "./apoio-confirmacao";
import { EQUIPE, SENHA_EQUIPE } from "./equipe";

// Transferência de caso (RF25), de ponta a ponta, com a API e o banco reais: o
// supervisor passa o caso a outro estagiário dele, e a coordenação devolve o caso
// ao estagiário da semente, mantendo o supervisor. Em cada passo, o acesso ao
// prontuário segue o responsável vigente (RNF16), e o diálogo passa pelo axe
// (RNF56) e cabe de 320 a 1920 px (RNF58).

let paciente = "";
let casoId = "";
let prontuarioId = "";
let outroEstagiario = "";

const url = () =>
  process.env.DATABASE_URL ??
  "postgresql://clinica:clinica@localhost:5432/clinica";

test.beforeAll(async ({ playwright }) => {
  // O caso da equipe, com o estagiário e o supervisor da semente e uma sessão
  // futura, que a transferência cancela.
  const criado = await criarPacienteComSessoes(playwright, [{ horas: 72 }], {
    daEquipe: true,
  });
  paciente = criado.paciente;
  casoId = criado.casoId;
  prontuarioId = criado.prontuarioId!;

  // Outro estagiário do supervisor da semente: o que tem um caso vigente sob a
  // supervisão dele (definição do RF11, RF25 e RF37).
  const outro = await criarPacienteComSessoes(playwright, []);
  const db = createDb(url());
  try {
    const supervisor = await db.query.usuarios.findFirst({
      columns: { id: true },
      where: (u, { eq }) => eq(u.email, EQUIPE.supervisor.email),
    });
    const coordenacao = await db.query.usuarios.findFirst({
      columns: { id: true },
      where: (u, { eq }) => eq(u.email, EQUIPE.coordenacao.email),
    });
    await db.insert(atribuicoesSupervisor).values({
      casoId: outro.casoId,
      supervisorId: supervisor!.id,
      atribuidoPor: coordenacao!.id,
    });
    const vinculo = await db.query.vinculosEstagiario.findFirst({
      where: (v, { eq }) => eq(v.casoId, outro.casoId),
    });
    const conta = await db.query.usuarios.findFirst({
      columns: { nome: true },
      where: (u, { eq }) => eq(u.id, vinculo!.estagiarioId),
    });
    outroEstagiario = conta!.nome;
  } finally {
    await db.$client.end();
  }
});

test.afterEach(fecharContextos);

// Estado do prontuário para a conta do perfil, pela API (RF55, RNF16).
async function acessoAoProntuario(
  playwright: PlaywrightWorkerArgs["playwright"],
  email: string,
) {
  const api = await playwright.request.newContext({ baseURL: API });
  await api.post("/auth/login", { data: { email, senha: SENHA_EQUIPE } });
  const status = (await api.get(`/prontuarios/${prontuarioId}`)).status();
  await api.dispose();
  return status;
}

const semRolagemLateral = (page: Page) =>
  page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );

test.describe.serial("Transferir caso (RF25)", () => {
  test("o supervisor transfere o caso a outro estagiário dele, com motivo e confirmação, sem violações WCAG (RF25, RNF16, RNF18, RNF20, RNF56)", async ({
    browser,
    playwright,
  }) => {
    expect(await acessoAoProntuario(playwright, EQUIPE.estagiario.email)).toBe(
      200,
    );
    const page = await entrar(browser, "supervisor");
    await page.goto("/meus-casos");
    await page
      .getByRole("button", { name: `Transferir o caso de ${paciente}` })
      .click();
    const dialogo = page.getByRole("dialog", { name: "Transferir caso" });
    await expect(dialogo.getByText(EQUIPE.estagiario.nome)).toBeVisible();
    await expect(
      dialogo.getByText(/peça a transferência à coordenação/),
    ).toBeVisible();
    await semViolacoes(page);

    // Sem escolha nem motivo, o resumo de erros aparece e nada é enviado.
    await dialogo.getByRole("button", { name: "Transferir caso" }).click();
    await expect(
      dialogo.getByText("Corrija 2 itens para transferir o caso"),
    ).toBeVisible();
    await semViolacoes(page);

    await dialogo.getByLabel(new RegExp(outroEstagiario)).check();
    await dialogo
      .getByRole("textbox", { name: "Motivo da transferência" })
      .fill("Estagiária de licença médica.");
    await expect(
      dialogo.getByText(
        new RegExp(`${EQUIPE.estagiario.nome} perde o acesso ao caso`),
      ),
    ).toBeVisible();
    await dialogo.getByRole("button", { name: "Transferir caso" }).click();

    const confirmacao = page.getByRole("dialog", {
      name: "Confirmar a transferência?",
    });
    await expect(
      confirmacao.getByText("Estagiária de licença médica."),
    ).toBeVisible();
    await semViolacoes(page);
    await confirmacao
      .getByRole("button", { name: "Confirmar transferência" })
      .click();
    await expect(
      page.getByText(`agora são os responsáveis pelo caso de ${paciente}`, {
        exact: false,
      }),
    ).toBeVisible();
    await expect(
      page.getByText(/A sessão futura do estagiário anterior foi cancelada/),
    ).toBeVisible();

    expect(await acessoAoProntuario(playwright, EQUIPE.estagiario.email)).toBe(
      403,
    );
  });

  test("a coordenação mantém o supervisor e devolve o caso ao estagiário da semente, sem violações WCAG (RF25, RNF16, RNF20, RNF56)", async ({
    browser,
    playwright,
  }) => {
    const page = await entrar(browser, "coordenacao");
    await page.goto(`/pacientes/${casoId}`);
    await page.getByRole("button", { name: "Transferir caso" }).click();
    const dialogo = page.getByRole("dialog", { name: "Transferir caso" });
    await expect(
      dialogo.getByRole("group", { name: "Novo supervisor responsável" }),
    ).toBeVisible();
    await semViolacoes(page);
    await dialogo
      .getByLabel(new RegExp(`Manter ${EQUIPE.supervisor.nome}`))
      .check();
    await dialogo.getByLabel(new RegExp(EQUIPE.estagiario.nome)).check();
    await dialogo
      .getByRole("textbox", { name: "Motivo da transferência" })
      .fill("Retorno da estagiária.");
    await dialogo.getByRole("button", { name: "Transferir caso" }).click();
    await page
      .getByRole("dialog", { name: "Confirmar a transferência?" })
      .getByRole("button", { name: "Confirmar transferência" })
      .click();
    await expect(
      page.getByText(
        `${EQUIPE.supervisor.nome} e ${EQUIPE.estagiario.nome} agora são os responsáveis`,
        { exact: false },
      ),
    ).toBeVisible();

    // O estagiário da semente volta a ver o mesmo prontuário, com o histórico.
    expect(await acessoAoProntuario(playwright, EQUIPE.estagiario.email)).toBe(
      200,
    );
  });

  test("o diálogo de transferência cabe de 320 a 1920 px, sem rolagem lateral (RF25, RNF58)", async ({
    browser,
  }) => {
    const page = await entrar(browser, "coordenacao");
    for (const largura of [320, 375, 768, 1024, 1366, 1920]) {
      await page.setViewportSize({ width: largura, height: 900 });
      await page.goto(`/pacientes/${casoId}`);
      await page.getByRole("button", { name: "Transferir caso" }).click();
      const dialogo = page.getByRole("dialog", { name: "Transferir caso" });
      await expect(
        dialogo.getByRole("textbox", { name: "Motivo da transferência" }),
      ).toBeVisible();
      expect(await semRolagemLateral(page), `diálogo em ${largura}px`).toBe(
        true,
      );
      const caixa = await dialogo.boundingBox();
      expect(caixa!.x).toBeGreaterThanOrEqual(0);
      expect(caixa!.x + caixa!.width).toBeLessThanOrEqual(largura + 1);
    }
  });
});
