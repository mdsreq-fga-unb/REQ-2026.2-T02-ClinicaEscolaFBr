import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Verificação automática de WCAG 2.2 AA (RNF56). Acrescente cada página nova à lista.
for (const pagina of [
  "/inscricao",
  "/painel",
  "/entrar",
  "/agendar-sessao",
  "/triagem",
  "/distribuicao",
  "/meus-casos",
]) {
  test(`sem violações WCAG AA em ${pagina}`, async ({ page }) => {
    await page.goto(pagina);
    // Sem login, as páginas internas levam à entrada: mede depois que a página assenta.
    await page.waitForLoadState("networkidle");
    const resultado = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(resultado.violations).toEqual([]);
  });
}
