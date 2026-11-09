import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Verificação de identidade na consulta pública (RF52), com a API e o banco
// reais. O e2e não tem servidor de e-mail: o código é pedido para um CPF sem
// inscrição, que recebe a mesma resposta de qualquer pedido (RNF6), e cada
// estado da tela passa pelo axe (RNF56).

// Um CPF diferente a cada execução, para o limite de pedidos não interferir.
const cpf = String(Date.now()).slice(-11).padStart(11, "9");
const CELULAR = { width: 360, height: 800 };

const semViolacoes = async (page: Page) =>
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);

test("o pedido de código responde igual para CPF sem inscrição, e o código errado mostra a mensagem única, sem dado da inscrição (RF52, RNF6, RNF56)", async ({
  page,
}) => {
  await page.goto("/consultar");
  const campo = page.getByLabel("CPF ou número da inscrição");
  await expect(campo).toBeVisible();
  await semViolacoes(page);

  await campo.fill(cpf);
  await page.getByRole("button", { name: "Enviar código" }).click();
  await expect(
    page.getByRole("heading", { name: "Informe o código" }),
  ).toBeVisible();
  await expect(page.getByText("Pedido recebido.")).toBeVisible();
  await expect(page.getByLabel("Código de 6 dígitos")).toBeFocused();
  await expect(
    page.getByRole("button", { name: /Reenviar código \(em (0:5\d|1:00)\)/ }),
  ).toBeDisabled();
  await semViolacoes(page);

  await page.getByLabel("Código de 6 dígitos").fill("000000");
  await page.getByRole("button", { name: "Confirmar" }).click();
  // O Next.js tem outro role="alert", o anunciador de rotas, sempre vazio.
  const alerta = page.getByRole("alert", { name: /Código inválido/ });
  await expect(alerta).toContainText("Código inválido ou expirado.");
  await expect(alerta).toBeFocused();
  await semViolacoes(page);
});

test("no celular, a verificação cabe na largura da tela, sem rolagem lateral (RF52, RNF58)", async ({
  page,
}) => {
  await page.setViewportSize(CELULAR);
  await page.goto("/consultar");
  await expect(page.getByLabel("CPF ou número da inscrição")).toBeVisible();
  const larguras = await page.evaluate(() => ({
    pagina: document.documentElement.scrollWidth,
    janela: window.innerWidth,
  }));
  expect(larguras.pagina).toBeLessThanOrEqual(larguras.janela);
  await semViolacoes(page);
});
