import { expect, test } from "@playwright/test";
import {
  criarCasoTriado,
  entrar,
  fecharContextos,
  focoVisivel,
  semViolacoes,
  tabAte,
} from "./apoio";

test.afterEach(fecharContextos);

test("RF7: coordenação navega à fila com prioridade confirmada, teclado e tela estreita (RNF56)", async ({
  browser,
  playwright,
}, testInfo) => {
  const paciente = `Pessoa Fictícia RF7 ${Date.now()}`;
  await criarCasoTriado(playwright, paciente);
  const page = await entrar(browser, "coordenacao");
  const erros: string[] = [];
  page.on("pageerror", (erro) => erros.push(erro.message));
  page.on("console", (mensagem) => {
    if (mensagem.type() !== "error") return;
    const origem = new URL(mensagem.location().url || page.url());
    // A base aa3bee8 já tem o link /pacientes, mas ainda não a página da RF8.
    // Registra somente esse 404 de prefetch conhecido; outros erros reprovam.
    if (
      origem.origin === new URL(page.url()).origin &&
      origem.pathname === "/pacientes" &&
      origem.searchParams.has("_rsc") &&
      mensagem.text().includes("404 (Not Found)")
    ) {
      testInfo.annotations.push({
        type: "pendencia-da-base",
        description:
          "Prefetch de /pacientes retorna 404 na development aa3bee8; fora do escopo RF7.",
      });
      return;
    }
    erros.push(mensagem.text());
  });
  await page.getByRole("link", { name: "Fila de espera", exact: true }).click();
  await expect(page).toHaveURL(/\/fila$/);
  await expect(page).toHaveTitle(/Clínica Escola/i);
  await expect(
    page.getByRole("heading", { name: "Fila de espera", exact: true }),
  ).toBeVisible();
  const linha = page.getByRole("row").filter({ hasText: paciente });
  await expect(linha).toContainText("Amarela");
  await expect(
    page.getByRole("heading", { name: "Prioridade pendente" }),
  ).toBeVisible();
  await expect(
    page.getByText("Histórico de mudanças", { exact: true }),
  ).toHaveCount(0);
  const tabela = page.getByRole("region", { name: "Tabela da fila de espera" });
  await tabAte(page, tabela);
  await focoVisivel(tabela);
  await semViolacoes(page);
  await page.screenshot({
    path: testInfo.outputPath("fila-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(linha).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await semViolacoes(page);
  await page.screenshot({
    path: testInfo.outputPath("fila-mobile.png"),
    fullPage: true,
  });
  expect(erros).toEqual([]);
});

for (const perfil of ["supervisor", "secretaria", "estagiario"] as const) {
  test(`RF7: ${perfil} não recebe dados da fila (RNF16)`, async ({
    browser,
  }) => {
    const page = await entrar(browser, perfil);
    await expect(
      page.getByRole("link", { name: "Fila de espera", exact: true }),
    ).toHaveCount(0);
    await page.goto("/fila");
    await expect(
      page.getByText("Você não tem acesso à fila de espera.", { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("table")).toHaveCount(0);
  });
}
