import { expect, test, type Page } from "@playwright/test";
import { entrar, fecharContextos, semViolacoes } from "./apoio";
import { EQUIPE } from "./equipe";

// Indicadores operacionais (RF48), de ponta a ponta, com a API e o banco reais. Os
// valores dependem do que os outros testes gravaram no banco, então o teste confere
// a estrutura da tela, o registro das vagas, o intervalo recusado e o acesso negado.
// A tela passa pelo axe (RNF56) e cabe de 320 a 1920 px (RNF58).

test.afterEach(fecharContextos);

const semRolagemLateral = (page: Page) =>
  page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );

async function abrirIndicadores(page: Page) {
  await page.goto("/indicadores");
  await expect(
    page.getByRole("heading", { name: "Indicadores operacionais", level: 1 }),
  ).toBeVisible();
  await expect(page.getByText("Tempo médio de espera")).toBeVisible();
}

test("a coordenação consulta os quatro indicadores e registra as vagas ofertadas do semestre (RF48, RNF56)", async ({
  browser,
}) => {
  const page = await entrar(browser, "coordenacao");
  await page.getByRole("link", { name: "Indicadores" }).click();
  await abrirIndicadores(page);
  await expect(page.getByText("Vagas ocupadas", { exact: true })).toBeVisible();
  await expect(page.getByText("Taxa de evasão")).toBeVisible();
  const tabela = page.getByRole("table", {
    name: "Casos ativos de cada supervisor",
  });
  await expect(tabela.getByText(EQUIPE.supervisor.nome)).toBeVisible();
  await semViolacoes(page);

  // Registrar ou alterar as vagas ofertadas do semestre.
  const total = 100 + Math.floor(Math.random() * 400);
  await page
    .getByRole("button", { name: /(Registrar|Alterar) vagas ofertadas/ })
    .click();
  const dialogo = page.getByRole("dialog");
  await expect(dialogo).toBeVisible();
  await semViolacoes(page);
  await dialogo.getByLabel("Total de vagas ofertadas").fill(String(total));
  await dialogo.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText(new RegExp(`de ${total} vagas`))).toBeVisible();

  // A última alteração aparece ao abrir de novo, com o autor.
  await page.getByRole("button", { name: "Alterar vagas ofertadas" }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByText(new RegExp(`${total} vagas, por ${EQUIPE.coordenacao.nome}`)),
  ).toBeVisible();
});

test("a data final depois de hoje é recusada no campo, sem calcular nenhum indicador (RF48)", async ({
  browser,
}) => {
  const page = await entrar(browser, "coordenacao");
  await abrirIndicadores(page);
  await page.getByLabel("Data final", { exact: true }).fill("2999-12-31");
  await page.getByRole("button", { name: "Consultar" }).click();
  await expect(
    page.getByText("Não foi possível consultar este período."),
  ).toBeVisible();
  await expect(page.getByLabel("Data final", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.getByText("Tempo médio de espera")).toHaveCount(0);
  await semViolacoes(page);
});

test("o supervisor não consulta os indicadores (RF48)", async ({ browser }) => {
  const page = await entrar(browser, "supervisor");
  await page.goto("/indicadores");
  await expect(
    page.getByRole("heading", {
      name: "Você não tem acesso aos indicadores operacionais",
    }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Indicadores" })).toHaveCount(0);
});

test("os indicadores cabem de 320 a 1920 px, sem rolagem lateral (RF48, RNF58)", async ({
  browser,
}) => {
  const page = await entrar(browser, "coordenacao");
  for (const largura of [320, 375, 768, 1024, 1366, 1920]) {
    await page.setViewportSize({ width: largura, height: 900 });
    await abrirIndicadores(page);
    expect(await semRolagemLateral(page), `indicadores em ${largura}px`).toBe(
      true,
    );
  }
  await semViolacoes(page);
});
