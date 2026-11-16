import { expect, test } from "@playwright/test";
import {
  continuar,
  enviar,
  preencherDados,
  preencherTriagem,
} from "./apoio-inscricao";
import { focoVisivel, semViolacoes, tabAte } from "./apoio";

for (const largura of [320, 360, 768, 1024, 1366, 1920]) {
  test(`RF57: termo provisório, aceite destacado e comprovante em ${largura}px (RNF56, RNF57, RNF58)`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width: largura, height: 900 });
    await page.goto("/inscricao");
    await preencherDados(page);
    await continuar(page);
    await preencherTriagem(page);
    await continuar(page);
    await expect(
      page.getByText("Versão 0.1 (provisória)", { exact: true }),
    ).toBeVisible();
    await expect(page.locator("#aceiteTermo")).toBeEnabled();
    await expect(page.locator("#confirmado")).not.toBeChecked();
    await expect(page.locator("#aceiteTermo")).not.toBeChecked();
    const envios: unknown[] = [];
    page.on("request", (req) => {
      if (req.method() === "POST" && req.url().endsWith("/inscricoes"))
        envios.push(req.postDataJSON());
    });
    await page.locator("#confirmado").check();
    await enviar(page);
    await expect(page.locator("#aceiteTermo")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(envios).toHaveLength(0);
    for (const nome of [
      /1\. O que coletamos/,
      /2\. Para que usamos/,
      /3\. Quem pode ver/,
      /4\. Por quanto tempo/,
      /5\. Seus direitos/,
    ]) {
      const botao = page.getByRole("button", { name: nome });
      await tabAte(page, botao);
      await focoVisivel(botao);
      await page.keyboard.press("Enter");
      await expect(botao).toHaveAttribute("aria-expanded", "true");
      await botao.click();
    }
    await semViolacoes(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`termo-${largura}.png`),
      fullPage: true,
    });
    await tabAte(page, page.locator("#aceiteTermo"));
    await focoVisivel(page.locator("#aceiteTermo"));
    await page.keyboard.press("Space");
    const resposta = page.waitForResponse(
      (r) => r.url().endsWith("/inscricoes") && r.request().method() === "POST",
    );
    await enviar(page);
    expect((await resposta).status()).toBe(201);
    expect(envios).toHaveLength(1);
    expect(envios[0]).toMatchObject({
      confirmado: true,
      aceiteTermo: true,
      versaoTermo: "0.1",
    });
    await expect(
      page.getByRole("heading", { name: "Inscrição recebida" }),
    ).toBeVisible();
    await semViolacoes(page);
  });
}

for (const largura of [320, 1366]) {
  test(`RF57: identificação e concordância do responsável legal em ${largura}px (RNF56, RNF57, RNF58)`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width: largura, height: 900 });
    await page.goto("/inscricao");
    await preencherDados(page, true);
    await page.locator("#responsavelLegal").fill("Responsável Fictício E2E");
    await continuar(page);
    await expect(page.locator("#cpfResponsavel")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await page.locator("#cpfResponsavel").fill("52998224725");
    await continuar(page);
    await preencherTriagem(page);
    await continuar(page);
    const identificacao = page.getByRole("region", {
      name: "Identificação e concordância do responsável legal",
    });
    await expect(
      identificacao.getByText("Responsável Fictício E2E", { exact: true }),
    ).toBeVisible();
    await expect(
      identificacao.getByText("52998224725", { exact: true }),
    ).toBeVisible();
    await expect(identificacao.getByRole("textbox")).toHaveCount(0);
    const termo = page.getByRole("region", {
      name: "Termo de consentimento para tratamento de dados",
    });
    await expect(
      termo.getByText("Inscrição de menor de idade", { exact: true }),
    ).toBeVisible();
    await expect(
      termo.getByText(/O aceite on-line não substitui a autorização/),
    ).toBeVisible();
    const caixa = page.getByRole("checkbox", {
      name: /Sou o responsável legal de Pessoa Fictícia E2E/,
    });
    await expect(caixa).not.toBeChecked();
    await expect(caixa).toBeEnabled();
    await page.locator("#confirmado").check();
    await tabAte(page, caixa);
    await focoVisivel(caixa);
    await page.keyboard.press("Space");
    await semViolacoes(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`termo-menor-${largura}.png`),
      fullPage: true,
    });
    const resposta = page.waitForResponse(
      (r) => r.url().endsWith("/inscricoes") && r.request().method() === "POST",
    );
    await enviar(page);
    expect((await resposta).status()).toBe(201);
    await expect(
      page.getByRole("heading", { name: "Inscrição recebida" }),
    ).toBeVisible();
  });
}
