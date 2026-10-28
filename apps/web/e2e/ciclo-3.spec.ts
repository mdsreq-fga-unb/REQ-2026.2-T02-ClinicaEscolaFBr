import { randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { EQUIPE, SENHA_EQUIPE, type PerfilEquipe } from "./equipe";

// Integração das features do Ciclo 3, de ponta a ponta, com a API e o banco reais:
// inscrição (RF1) → triagem e prioridade (RF4, RF6) → distribuição (RF18, RF20) →
// vínculo do estagiário e criação do prontuário (RF21, RF66) → agendamento (RF10)
// → acesso ao prontuário por perfil (RF55). Cada tela interna passa também pela
// verificação de WCAG 2.2 AA com a pessoa logada (RNF56).

const API = `http://localhost:${process.env.E2E_API_PORT || "3333"}`;
const paciente = `Paciente Integração ${Date.now()}`;
let numero = "";
let prontuarioId = "";

async function semViolacoes(page: Page) {
  const resultado = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(resultado.violations).toEqual([]);
}

// Entra com a conta do perfil (RF50) e devolve a página já na área interna.
async function entrar(browser: Browser, perfil: PerfilEquipe) {
  const contexto = await browser.newContext();
  const page = await contexto.newPage();
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(EQUIPE[perfil].email);
  await page.getByLabel("Senha", { exact: true }).fill(SENHA_EQUIPE);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/entrar"));
  return page;
}

// Dia útil daqui a algumas semanas, no formato AAAA-MM-DD, para não colidir com
// sessões de execuções anteriores no mesmo banco.
function diaDaSessao() {
  const dia = new Date(Date.now() + (20 + (Date.now() % 200)) * 86_400_000);
  while (dia.getUTCDay() === 0 || dia.getUTCDay() === 6) {
    dia.setUTCDate(dia.getUTCDate() + 1);
  }
  return dia.toISOString().slice(0, 10);
}

test.describe.serial("Integração do Ciclo 3", () => {
  test("a inscrição pública entra na API com número e data (RF1, RF2)", async ({
    request,
  }) => {
    const resposta = await request.post(`${API}/inscricoes`, {
      data: {
        nomeCompleto: paciente,
        dataNascimento: "1990-05-10",
        cpf: String(Date.now()).slice(-11).padStart(11, "1"),
        rg: "1234567",
        endereco: "Rua Fictícia, 100, Santa Maria",
        estadoCivil: "Solteiro(a)",
        responsavelLegal: "",
        celular: "",
        email: "paciente.integracao@example.com",
        canalPreferencial: "email",
        queixa: "Queixa fictícia de integração",
        percepcaoUrgencia: "Urgência fictícia",
        historicoRelevante: "Histórico fictício",
        confirmado: true,
        chaveEnvio: randomUUID(),
      },
    });
    expect(resposta.status()).toBe(201);
    ({ numero } = (await resposta.json()) as { numero: string });
    expect(numero).toMatch(/^\d{4}-\d{5,}$/);
  });

  test("a coordenação registra a prioridade clínica na triagem, sem violações WCAG (RF4, RF6, RNF56)", async ({
    browser,
  }) => {
    const page = await entrar(browser, "coordenacao");
    await page.goto("/triagem");
    const inscricao = page
      .getByRole("listitem")
      .filter({ hasText: `Inscrição ${numero}` });
    await expect(inscricao).toContainText("declarado pelo interessado");
    await expect(inscricao).toContainText("Queixa fictícia de integração");
    await semViolacoes(page);
    await inscricao.getByRole("button", { name: /^Vermelha/ }).click();
    await expect(
      page.getByText("Decisão de prioridade registrada."),
    ).toBeVisible();
  });

  test("a coordenação distribui o caso ao supervisor, sem violações WCAG (RF18, RF20, RNF56)", async ({
    browser,
  }) => {
    const page = await entrar(browser, "coordenacao");
    await page.goto("/distribuicao");
    await expect(page.getByText(paciente).first()).toBeVisible();
    await semViolacoes(page);
    await page.getByRole("button", { name: `Distribuir ${paciente}` }).click();
    const dialogo = page.getByRole("dialog", { name: "Distribuir caso" });
    await dialogo.getByText(EQUIPE.supervisor.nome).click();
    const confirmar = dialogo.getByRole("button", {
      name: "Confirmar distribuição",
    });
    // Mede o contraste só depois da transição do botão habilitado.
    await expect(confirmar).toBeEnabled();
    await expect(confirmar).toHaveCSS("opacity", "1");
    await semViolacoes(page);
    await confirmar.click();
    await expect(page.getByText("Caso distribuído.")).toBeVisible();
    await expect(
      page.getByText(`${paciente} agora está com ${EQUIPE.supervisor.nome}.`),
    ).toBeVisible();
  });

  test("o supervisor vincula o estagiário e o prontuário é criado, sem violações WCAG (RF21, RF66, RNF56)", async ({
    browser,
  }) => {
    const page = await entrar(browser, "supervisor");
    await page.goto("/meus-casos");
    await semViolacoes(page);
    await page
      .getByRole("button", { name: `Vincular estagiário a ${paciente}` })
      .click();
    const dialogo = page.getByRole("dialog", { name: "Vincular estagiário" });
    await dialogo.getByText(EQUIPE.estagiario.nome).click();
    await dialogo.getByRole("button", { name: "Confirmar vínculo" }).click();
    await expect(
      page.getByText("O prontuário do caso foi criado."),
    ).toBeVisible();
    const link = page.getByRole("link", {
      name: `Abrir prontuário de ${paciente}`,
    });
    prontuarioId = (await link.getAttribute("href"))!.split("/").pop()!;
    expect(prontuarioId).toMatch(/^[0-9a-f-]{36}$/);
  });

  test("a secretaria agenda a sessão do paciente vinculado, sem violações WCAG (RF10, RNF56)", async ({
    browser,
  }) => {
    const page = await entrar(browser, "secretaria");
    await page.goto("/agendar-sessao");
    await page.getByRole("searchbox", { name: "Paciente" }).fill(paciente);
    await page.getByRole("button", { name: new RegExp(paciente) }).click();
    await expect(page.getByText(EQUIPE.estagiario.nome).first()).toBeVisible();
    await page.getByLabel("Data").fill(diaDaSessao());
    await page.getByLabel("Início").fill("10:00");
    await semViolacoes(page);
    await page.getByRole("button", { name: "Agendar sessão" }).click();
    await expect(
      page.getByRole("region", { name: "Sessão agendada" }),
    ).toBeVisible();
  });

  test("o estagiário responsável abre o prontuário com a sessão do ciclo, sem violações WCAG (RF55, RF66, RNF56)", async ({
    browser,
  }) => {
    const page = await entrar(browser, "estagiario");
    await page.goto(`/prontuarios/${prontuarioId}`);
    await expect(
      page.getByRole("heading", { name: `Prontuário · ${paciente}` }),
    ).toBeVisible();
    await expect(page.getByText("A sessão ainda não aconteceu.")).toBeVisible();
    await semViolacoes(page);
  });

  test("a coordenação consulta o prontuário só para leitura, e a secretaria tem o acesso negado sem o nome do paciente (RF55, RNF25, RNF56)", async ({
    browser,
  }) => {
    const coordenacao = await entrar(browser, "coordenacao");
    await coordenacao.goto(`/prontuarios/${prontuarioId}`);
    await expect(
      coordenacao.getByRole("heading", { name: `Prontuário · ${paciente}` }),
    ).toBeVisible();
    await expect(
      coordenacao.getByText(/Seu acesso fica registrado/),
    ).toBeVisible();
    await expect(
      coordenacao.getByRole("button", { name: "Salvar dados iniciais" }),
    ).toHaveCount(0);

    const secretaria = await entrar(browser, "secretaria");
    await secretaria.goto(`/prontuarios/${prontuarioId}`);
    await expect(
      secretaria.getByRole("heading", {
        name: "Você não tem acesso a este prontuário",
      }),
    ).toBeVisible();
    await expect(secretaria.locator("body")).not.toContainText(paciente);
    await semViolacoes(secretaria);
  });

  test("a coordenação gere os usuários da equipe, sem violações WCAG (RF53, RF54, RNF56)", async ({
    browser,
  }) => {
    const page = await entrar(browser, "coordenacao");
    await page.goto("/usuarios");
    await expect(page.getByText(EQUIPE.estagiario.email).first()).toBeVisible();
    await semViolacoes(page);
  });

  test("a saída encerra a sessão e as páginas internas pedem nova entrada (RF51)", async ({
    browser,
  }) => {
    const page = await entrar(browser, "supervisor");
    await page.getByRole("button", { name: "Sair" }).first().click();
    await page.waitForURL("**/entrar");
    await page.goto("/meus-casos");
    await page.waitForURL("**/entrar");
  });
});
