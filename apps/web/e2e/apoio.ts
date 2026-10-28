import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  type Browser,
  type Locator,
  type Page,
} from "@playwright/test";
import { EQUIPE, SENHA_EQUIPE, type PerfilEquipe } from "./equipe";

export const API = `http://localhost:${process.env.E2E_API_PORT || "3333"}`;

// Verificação automática de WCAG 2.2 AA com o axe (RNF56).
export async function semViolacoes(page: Page) {
  const resultado = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(resultado.violations).toEqual([]);
}

// Entra com a conta do perfil (RF50) e devolve a página já na área interna.
export async function entrar(browser: Browser, perfil: PerfilEquipe) {
  const contexto = await browser.newContext();
  const page = await contexto.newPage();
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(EQUIPE[perfil].email);
  await page.getByLabel("Senha", { exact: true }).fill(SENHA_EQUIPE);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/entrar"));
  return page;
}

// Aperta Tab até o elemento receber o foco, como faria quem usa só o teclado.
export async function tabAte(page: Page, alvo: Locator, limite = 60) {
  for (let i = 0; i < limite; i++) {
    if (await alvo.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press("Tab");
  }
  throw new Error("O elemento não recebeu o foco pelo teclado.");
}

// O elemento com foco tem indicador visível: contorno ou anel (box-shadow).
export async function focoVisivel(alvo: Locator) {
  const estilo = await alvo.evaluate((el) => {
    const css = getComputedStyle(el);
    return {
      contorno: css.outlineStyle !== "none" && parseFloat(css.outlineWidth),
      anel: css.boxShadow !== "none",
    };
  });
  expect(Boolean(estilo.contorno) || estilo.anel).toBe(true);
}
