import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import {
  entrar,
  fecharContextos,
  focoVisivel,
  semViolacoes,
  tabAte,
} from "./apoio";
import { abrirEvolucao, criarProntuarioComEvolucao } from "./apoio-prontuario";
import { EQUIPE } from "./equipe";

// RF67: o supervisor do caso valida a evolução, sem mudar o conteúdo. Um
// complemento (RF30) ou uma correção (RF29) depois da validação a deixa pendente
// de novo. O caso e a evolução vêm do banco e das rotas reais, não de mocks.

const paciente = `Paciente RF67 ${randomUUID()}`;
const ORIGINAL = "Conteudo original da evolucao RF67";
const SUPERVISOR = EQUIPE.supervisor.nome;
let prontuarioId: string;
test.afterEach(fecharContextos);
test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ playwright }) => {
  prontuarioId = await criarProntuarioComEvolucao(
    playwright,
    paciente,
    ORIGINAL,
  );
});

async function validar(page: Page, botao: RegExp) {
  const abrir = page.getByRole("button", { name: botao });
  await abrir.click();
  const dialogo = page.getByRole("dialog", {
    name: "Validar a evolução da sessão 1?",
  });
  await expect(dialogo).toBeVisible();
  await expect(dialogo).toContainText("Ela não altera o conteúdo.");
  const confirmar = dialogo.getByRole("button", {
    name: "Validar",
    exact: true,
  });
  // Só pelo teclado, com o indicador de foco visível (RNF57).
  await tabAte(page, confirmar, 10);
  await focoVisivel(confirmar);
  await page.keyboard.press("Enter");
  await expect(page.getByText("Evolução validada.")).toBeVisible();
  await expect(
    page.getByText(new RegExp(`Validada por ${SUPERVISOR} em`)),
  ).toBeVisible();
}

test("o supervisor valida a evolução em 360px (RF67, RNF56, RNF57)", async ({
  browser,
}, info) => {
  const page = await entrar(browser, "supervisor");
  await page.setViewportSize({ width: 360, height: 900 });
  await abrirEvolucao(page, prontuarioId);
  await validar(page, /^Validar evolução da sessão 1$/);
  // O conteúdo continua o mesmo.
  await expect(page.getByRole("main")).toContainText(ORIGINAL);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await semViolacoes(page);
  await page.screenshot({
    path: info.outputPath("validacao-360.png"),
    fullPage: true,
  });
});

test("o estagiário vê a validação, sem validar (RF67)", async ({ browser }) => {
  const page = await entrar(browser, "estagiario");
  await abrirEvolucao(page, prontuarioId);
  await expect(
    page.getByText(new RegExp(`Validada por ${SUPERVISOR} em`)),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Validar/ })).toHaveCount(0);
  // O complemento depois da validação a deixa pendente de novo (RF30).
  await page
    .getByRole("button", {
      name: /Adicionar complemento à evolução da sessão/,
    })
    .click();
  await page
    .getByLabel("Novo complemento", { exact: true })
    .fill(`Complemento depois da validação ${randomUUID()}`);
  await page.getByRole("button", { name: "Salvar complemento" }).click();
  await expect(page.getByText("Complemento salvo.")).toBeVisible();
  await expect(
    page.getByText(/Voltou a ficar pendente porque recebeu um complemento/),
  ).toBeVisible();
});

test("depois do complemento, o supervisor valida de novo em 1366px (RF67, RF30)", async ({
  browser,
}, info) => {
  const page = await entrar(browser, "supervisor");
  await page.setViewportSize({ width: 1366, height: 900 });
  await abrirEvolucao(page, prontuarioId);
  await expect(
    page.getByText(/Voltou a ficar pendente porque recebeu um complemento/),
  ).toBeVisible();
  await semViolacoes(page);
  await validar(page, /^Validar de novo a evolução da sessão 1$/);
  await expect(page.getByText(/Voltou a ficar pendente/)).toHaveCount(0);
  await semViolacoes(page);
  await page.screenshot({
    path: info.outputPath("validacao-1366.png"),
    fullPage: true,
  });
});

test("a coordenação consulta a validação, sem validar (RF67, RF27)", async ({
  browser,
}) => {
  const page = await entrar(browser, "coordenacao");
  await abrirEvolucao(page, prontuarioId);
  await expect(
    page.getByText(new RegExp(`Validada por ${SUPERVISOR} em`)),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Validar/ })).toHaveCount(0);
});
