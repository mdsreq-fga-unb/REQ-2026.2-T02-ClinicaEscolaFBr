import { expect, test } from "@playwright/test";
import {
  continuar,
  enviar,
  preencherDados,
  preencherTriagem,
} from "./apoio-inscricao";
import { semViolacoes } from "./apoio";

for (const largura of [320, 1366]) {
  test(`RF57: termo provisório, aceite destacado e comprovante em ${largura}px (RNF56, RNF58)`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width: largura, height: 900 });
    await page.goto("/inscricao");
    await preencherDados(page);
    await continuar(page);
    await preencherTriagem(page);
    await continuar(page);
    await expect(
      page.getByText(/Versão provisória — aguardando aprovação da FBr/),
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
      await botao.click();
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
    await page.locator("#aceiteTermo").check();
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
