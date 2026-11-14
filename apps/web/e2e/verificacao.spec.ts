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

// Percorre a página com o Tab e confere, em cada controle, o indicador de foco do
// RNF57: contorno sólido, de cor visível (não transparente) e com pelo menos 2 px.
// Cada controle visitado é marcado, e a volta só termina quando o foco chega a um
// controle já marcado ou sai da página: dois controles com o mesmo nome são os dois
// conferidos. Devolve os nomes visitados.
async function percorrerComFoco(page: Page) {
  await page.evaluate(() =>
    document
      .querySelectorAll("[data-foco-visitado]")
      .forEach((el) => el.removeAttribute("data-foco-visitado")),
  );
  const visitados: string[] = [];
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press("Tab");
    const foco = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      const estilo = getComputedStyle(el);
      const repetido = el.hasAttribute("data-foco-visitado");
      el.setAttribute("data-foco-visitado", "");
      const cor = estilo.outlineColor.match(/[\d.]+/g)?.map(Number) ?? [];
      return {
        nome:
          el.getAttribute("aria-label") ||
          (el as HTMLInputElement).labels?.[0]?.textContent?.trim() ||
          el.textContent!.trim() ||
          el.id,
        tag: el.tagName,
        repetido,
        largura: estilo.outlineWidth,
        estilo: estilo.outlineStyle,
        // rgba com alfa 0 é transparente.
        transparente:
          estilo.outlineColor === "transparent" ||
          (cor.length === 4 && cor[3] === 0),
      };
    });
    if (foco.tag === "BODY" || foco.repetido) break;
    expect(foco.estilo, foco.nome).toBe("solid");
    expect(foco.transparente, foco.nome).toBe(false);
    expect(parseFloat(foco.largura), foco.nome).toBeGreaterThanOrEqual(2);
    visitados.push(foco.nome);
  }
  return visitados;
}

test("o teclado percorre as duas etapas da verificação com foco visível de pelo menos 2 px (RF52, RNF57)", async ({
  page,
}) => {
  await page.setViewportSize(CELULAR);
  await page.goto("/consultar");
  await expect(page.getByLabel("CPF ou número da inscrição")).toBeVisible();

  // Etapa 1: o campo do CPF ou do número e o "Enviar código".
  const etapa1 = await percorrerComFoco(page);
  expect(etapa1).toContain("CPF ou número da inscrição");
  expect(etapa1).toContain("Enviar código");

  // Etapa 2: o campo do código, o "Confirmar" e o "Usar outro CPF ou número".
  await page.getByLabel("CPF ou número da inscrição").fill(
    String(Date.now() + 7)
      .slice(-11)
      .padStart(11, "8"),
  );
  await page.getByRole("button", { name: "Enviar código" }).click();
  await expect(page.getByLabel("Código de 6 dígitos")).toBeFocused();
  const etapa2 = await percorrerComFoco(page);
  expect(etapa2).toContain("Confirmar");
  expect(etapa2).toContain("Usar outro CPF ou número");
});
