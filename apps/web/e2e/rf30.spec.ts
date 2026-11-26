import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { entrar, fecharContextos, focoVisivel, semViolacoes } from "./apoio";
import { abrirEvolucao, criarProntuarioComEvolucao } from "./apoio-prontuario";
import { EQUIPE } from "./equipe";

// RF30: o estagiário responsável e o supervisor do caso (DF68) somam um
// complemento à evolução, sem mudar o que foi registrado. O caso, a sessão
// realizada e a evolução vêm do banco e das rotas reais, não de mocks.

const paciente = `Paciente RF30 ${randomUUID()}`;
const ORIGINAL = "Conteudo original da evolucao RF30";
let prontuarioId: string;
test.afterEach(fecharContextos);

test.beforeAll(async ({ playwright }) => {
  prontuarioId = await criarProntuarioComEvolucao(
    playwright,
    paciente,
    ORIGINAL,
  );
});

async function complementar(page: Page, texto: string) {
  await abrirEvolucao(page, prontuarioId);
  const adicionar = page.getByRole("button", {
    name: /Adicionar complemento à evolução da sessão/,
  });
  await adicionar.first().click();
  const campo = page.getByLabel("Novo complemento", { exact: true });
  // O foco vai para o campo que abriu (RNF57).
  await expect(campo).toBeFocused();
  await focoVisivel(campo);
  // Em branco, o complemento é recusado na tela, com o aviso em foco.
  await page.getByRole("button", { name: "Salvar complemento" }).click();
  await expect(page.getByText("O complemento não foi salvo.")).toBeVisible();
  await campo.fill(texto);
  await page.getByRole("button", { name: "Salvar complemento" }).click();
  await expect(page.getByText("Complemento salvo.")).toBeVisible();
}

test.describe.configure({ mode: "serial" });

for (const [perfil, largura] of [
  ["estagiario", 360],
  ["supervisor", 1366],
] as const) {
  test(`complemento pelo ${perfil} em ${largura}px, sem mudar o original (RF30, DF68, RNF27, RNF56, RNF57)`, async ({
    browser,
  }, info) => {
    const page = await entrar(browser, perfil);
    await page.setViewportSize({ width: largura, height: 900 });
    const texto = `Complemento do ${perfil} ${randomUUID()}`;
    await complementar(page, texto);

    const historico = page.getByRole("list", {
      name: "Histórico desta evolução",
    });
    const item = historico.getByRole("listitem").filter({ hasText: texto });
    await expect(item).toContainText("Complemento · informação adicional");
    await expect(item).toContainText(`Registrado por ${EQUIPE[perfil].nome}`);
    // O registro original continua o mesmo, antes do complemento.
    await expect(historico.getByRole("listitem").first()).toContainText(
      "Registro original",
    );
    await expect(page.getByRole("main")).toContainText(ORIGINAL);

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await semViolacoes(page);
    await page.screenshot({
      path: info.outputPath(`complemento-${perfil}-${largura}.png`),
      fullPage: true,
    });
  });
}

test("a coordenação lê os complementos, mas não complementa (RF30, RF27)", async ({
  browser,
}) => {
  const page = await entrar(browser, "coordenacao");
  await abrirEvolucao(page, prontuarioId);
  const historico = page.getByRole("list", {
    name: "Histórico desta evolução",
  });
  await expect(
    historico.getByText("Complemento · informação adicional"),
  ).toHaveCount(2);
  await expect(
    page.getByRole("button", { name: /Adicionar complemento/ }),
  ).toHaveCount(0);
});
