import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Verificação automática de WCAG 2.2 AA (RNF56). Acrescente cada página nova à lista.
for (const pagina of ["/inscricao", "/painel"]) {
  test(`sem violações WCAG AA em ${pagina}`, async ({ page }) => {
    await page.goto(pagina);
    const resultado = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(resultado.violations).toEqual([]);
  });
}
