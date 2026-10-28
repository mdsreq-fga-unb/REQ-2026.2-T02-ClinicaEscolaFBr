import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

async function preencherDados(page: Page, menor = false) {
  await page.locator("#nomeCompleto").fill("Pessoa Fictícia E2E");
  await page
    .locator("#dataNascimento")
    .fill(menor ? "2020-01-01" : "1994-08-22");
  await page.locator("#cpf").fill("11144477735");
  await page.locator("#rg").fill("MG-12.345.678 SSP/MG");
  await page.locator("#endereco").fill("Rua Fictícia, 10, Brasília DF");
  await page.locator("#estadoCivil").selectOption("Solteiro(a)");
  if (menor) {
    await page.locator("#celular").fill("61999999999");
    await page.locator("#canalPreferencial").selectOption("whatsapp");
  } else {
    await page.locator("#email").fill("ficticio@example.com");
    await page.locator("#canalPreferencial").selectOption("email");
  }
}
async function preencherTriagem(page: Page) {
  await page
    .locator("#queixa")
    .fill("Declaração clínica fictícia sigilosa E2E");
  await page
    .locator("#percepcaoUrgencia")
    .fill("Urgência fictícia sigilosa E2E");
  await page
    .locator("#historicoRelevante")
    .fill("Histórico fictício sigiloso E2E");
}
const continuar = (page: Page) =>
  page.getByRole("button", { name: "Continuar" }).click();
const enviar = (page: Page) =>
  page.getByRole("button", { name: "Confirmar e enviar inscrição" }).click();
async function revisar(page: Page) {
  await page.goto("/inscricao");
  await preencherDados(page);
  await continuar(page);
  await preencherTriagem(page);
  await continuar(page);
}
async function verificarTela(page: Page, info: TestInfo, etapa: string) {
  const falhas = await page.evaluate(() => {
    const largura = document.documentElement.clientWidth;
    const controles = [
      ...document.querySelectorAll(
        "main input, main select, main textarea, main button",
      ),
    ];
    return {
      overflow: document.documentElement.scrollWidth > largura,
      cortados: controles
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width && (r.left < 0 || r.right > largura + 1);
        })
        .map((el) => el.id || el.textContent),
    };
  });
  expect(falhas).toEqual({ overflow: false, cortados: [] });
  for (const nome of [/CVV/, /SAMU/]) {
    const link = page.getByRole("link", { name: nome });
    await expect(link).toBeVisible();
    const r = await link.boundingBox();
    expect(r!.y).toBeGreaterThanOrEqual(0);
    expect(r!.y + r!.height).toBeLessThan(page.viewportSize()!.height);
  }
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: info.outputPath(`${etapa}.png`),
    fullPage: true,
  });
}
async function verificarComprovante(page: Page) {
  await expect(
    page.getByRole("heading", { name: "Inscrição recebida" }),
  ).toBeVisible();
  await expect(page.getByText(/^\d{4}-\d{5,}$/)).toBeVisible();
  await expect(page.getByText("Horário de Brasília")).toBeVisible();
  for (const texto of [
    "11144477735",
    "Pessoa Fictícia",
    "MG-12.345",
    "ficticio@example.com",
    "Declaração clínica fictícia",
    "Urgência fictícia sigilosa",
    "Histórico fictício sigiloso",
  ]) {
    await expect(page.locator("body")).not.toContainText(texto);
    expect(page.url()).not.toContain(texto);
  }
  expect(new URL(page.url()).pathname).toBe("/inscricao");
  expect(new URL(page.url()).search).toBe("");
  await expect(
    page.getByText("A inscrição não garante vaga nem agendamento."),
  ).toBeVisible();
}

for (const largura of [320, 360, 768, 1024, 1366, 1920]) {
  test(`fluxo real, e-mail único, revisão, impressão e WCAG em ${largura}px (RF1, RF2, RNF2, RNF56, RNF58)`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width: largura, height: 900 });
    await page.goto("/inscricao");
    await verificarTela(page, info, "01-dados");
    await preencherDados(page);
    await continuar(page);
    await verificarTela(page, info, "02-triagem");
    await preencherTriagem(page);
    await continuar(page);
    await verificarTela(page, info, "03-revisao");
    await page.getByRole("button", { name: "Editar dados" }).click();
    await expect(page.locator("#email")).toHaveValue("ficticio@example.com");
    await page.locator("#endereco").fill("Rua Fictícia corrigida, 20");
    await continuar(page);
    await expect(page.locator("#queixa")).toHaveValue(
      "Declaração clínica fictícia sigilosa E2E",
    );
    await continuar(page);
    await expect(page.getByText("Rua Fictícia corrigida, 20")).toBeVisible();
    await page.getByRole("checkbox").check();
    const gravacao = page.waitForResponse(
      (res) =>
        res.url().endsWith("/inscricoes") && res.request().method() === "POST",
    );
    await enviar(page);
    const resposta = await gravacao;
    expect(resposta.status()).toBe(201);
    expect(Object.keys(await resposta.json()).sort()).toEqual([
      "criadaEm",
      "numero",
    ]);
    await verificarComprovante(page);
    await verificarTela(page, info, "04-comprovante");
    await page.evaluate(() => {
      window.print = () => {
        document.body.dataset.imprimiu = "sim";
      };
    });
    await page
      .getByRole("button", { name: "Imprimir ou salvar em PDF" })
      .click();
    await expect(page.locator("body")).toHaveAttribute("data-imprimiu", "sim");
    await page.emulateMedia({ media: "print" });
    await expect(
      page.getByRole("button", { name: "Imprimir ou salvar em PDF" }),
    ).toBeHidden();
    await expect(page.getByText(/^\d{4}-\d{5,}$/)).toBeVisible();
    await page.pdf({ path: info.outputPath("comprovante.pdf"), format: "A4" });
  });
}

test("menor: erro, responsável, teclado e preservação dos dados", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/inscricao");
  await preencherDados(page, true);
  await continuar(page);
  await expect(page.getByRole("main").getByRole("alert")).toBeFocused();
  await expect(page.locator("#responsavelLegal")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.locator("#nomeCompleto")).toHaveValue(
    "Pessoa Fictícia E2E",
  );
  await page.getByRole("link", { name: /Nome do responsável legal:/ }).click();
  await expect(page.locator("#responsavelLegal")).toBeFocused();
  await page.keyboard.type("Responsável Fictício");
  await page.keyboard.press("Tab");
  const foco = await page.locator(":focus").evaluate((el) => ({
    width: getComputedStyle(el).outlineWidth,
    color: getComputedStyle(el).outlineColor,
  }));
  expect(parseFloat(foco.width)).toBeGreaterThanOrEqual(2);
  expect(foco.color).toBe("rgb(0, 42, 61)");
  await continuar(page);
  await preencherTriagem(page);
  await continuar(page);
  await page.getByRole("checkbox").check();
  await enviar(page);
  await verificarComprovante(page);
  await verificarTela(page, info, "menor-comprovante");
});

test("HTTP 503 preserva os dados e repete a chave sem revelar detalhes", async ({
  page,
}) => {
  await revisar(page);
  await page.route(
    "**/inscricoes",
    (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ message: "SQL: segredo fictício" }),
      }),
    { times: 1 },
  );
  const enviados: string[] = [];
  page.on("request", (req) => {
    if (req.url().endsWith("/inscricoes") && req.method() === "POST")
      enviados.push(req.postDataJSON().chaveEnvio);
  });
  await page.getByRole("checkbox").check();
  await enviar(page);
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Não foi possível confirmar",
  );
  await expect(page.locator("body")).not.toContainText("SQL: segredo fictício");
  await expect(page.getByText("Pessoa Fictícia E2E")).toBeVisible();
  await enviar(page);
  await verificarComprovante(page);
  expect(enviados).toHaveLength(2);
  expect(enviados[1]).toBe(enviados[0]);
});

test("resposta perdida depois do commit: retry recupera o mesmo comprovante", async ({
  page,
}) => {
  await revisar(page);
  let gravado: { numero: string; criadaEm: string };
  await page.route(
    "**/inscricoes",
    async (route) => {
      const res = await route.fetch();
      expect(res.status()).toBe(201);
      gravado = await res.json();
      await route.abort("connectionreset");
    },
    { times: 1 },
  );
  await page.getByRole("checkbox").check();
  await enviar(page);
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Não foi possível confirmar",
  );
  await expect(
    page.getByRole("heading", { name: "Inscrição recebida" }),
  ).toHaveCount(0);
  const repeticao = page.waitForResponse(
    (res) => res.url().endsWith("/inscricoes") && res.status() === 201,
  );
  await enviar(page);
  expect(await (await repeticao).json()).toEqual(gravado!);
  await verificarComprovante(page);
});

test("teclado percorre campos, links e botões com foco visível em 320px (RF1, RNF57)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/inscricao");
  // Espera a hidratação e seu foco inicial antes de começar a sequência de Tab.
  await expect(
    page.getByRole("heading", { name: "Dados e contatos", exact: true }),
  ).toBeFocused();
  await page.getByRole("link", { name: "Ir para o conteúdo" }).focus();
  const previstos = await page
    .locator("a, input, select, textarea, button")
    .evaluateAll((els) =>
      els.slice(1).map((el) => el.id || el.textContent!.trim()),
    );
  const visitados = new Set<string>();
  for (let i = 0; i < 40 && visitados.size < previstos.length; i++) {
    await page.keyboard.press("Tab");
    // Campos date têm segmentos nativos: document.activeElement identifica
    // o controle mesmo quando o foco está dentro do seu shadow DOM nativo.
    const foco = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      const r = el.getBoundingClientRect();
      const estilo = getComputedStyle(el);
      return {
        nome: el.id || el.textContent!.trim(),
        tag: el.tagName,
        largura: estilo.outlineWidth,
        cor: estilo.outlineColor,
        x: r.x,
        y: r.y,
        direita: r.right,
        baixo: r.bottom,
      };
    });
    expect(foco.tag).not.toBe("BODY");
    expect(parseFloat(foco.largura)).toBeGreaterThanOrEqual(2);
    expect(foco.cor).toBe("rgb(0, 42, 61)");
    expect(foco.x).toBeGreaterThanOrEqual(0);
    expect(foco.direita).toBeLessThanOrEqual(320);
    expect(foco.y).toBeGreaterThanOrEqual(0);
    expect(foco.baixo).toBeLessThanOrEqual(900);
    visitados.add(foco.nome);
  }
  expect([...visitados]).toEqual(previstos);
});

test("offline preserva o envio até a conexão voltar", async ({
  page,
  context,
}) => {
  await revisar(page);
  await page.getByRole("checkbox").check();
  await context.setOffline(true);
  await enviar(page);
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Não foi possível confirmar",
  );
  await expect(page.getByText("Pessoa Fictícia E2E")).toBeVisible();
  await context.setOffline(false);
  await enviar(page);
  await verificarComprovante(page);
});

test("timeout real não confirma; repetição mantém a mesma chave", async ({
  page,
}) => {
  await revisar(page);
  let liberar!: () => void;
  const chaves: string[] = [];
  page.on("request", (req) => {
    if (req.url().endsWith("/inscricoes") && req.method() === "POST")
      chaves.push(req.postDataJSON().chaveEnvio);
  });
  await page.route(
    "**/inscricoes",
    async (route) => {
      await new Promise<void>((resolve) => {
        liberar = resolve;
      });
      await route.abort("timedout");
    },
    { times: 1 },
  );
  await page.getByRole("checkbox").check();
  await enviar(page);
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Não foi possível confirmar",
    { timeout: 30_000 },
  );
  await expect(
    page.getByRole("heading", { name: "Inscrição recebida" }),
  ).toHaveCount(0);
  liberar();
  await enviar(page);
  await verificarComprovante(page);
  expect(chaves).toHaveLength(2);
  expect(chaves[1]).toBe(chaves[0]);
});

test("a raiz mantém entrada institucional e cadastro público não libera área interna", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/entrar$/);
  await page.goto("/usuarios");
  await expect(page).toHaveURL(/\/entrar$/);
  await page.goto("/inscricao");
  await expect(
    page.getByRole("heading", {
      name: "Inscrição para atendimento",
      exact: true,
    }),
  ).toBeVisible();
});
