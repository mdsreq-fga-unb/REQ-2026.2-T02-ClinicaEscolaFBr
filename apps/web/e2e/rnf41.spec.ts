import { expect, test, type Locator, type Page } from "@playwright/test";
import { entrar, fecharContextos } from "./apoio";
import { criarCaso, verificar } from "./apoio-declaracoes";

// Parte automática do RNF41 (usabilidade da emissão): a declaração de
// comparecimento sai em até 3 interações a partir da tela do paciente, tanto
// para o paciente ou responsável (depois da verificação de identidade, RF52)
// quanto para a secretaria, na ficha do paciente. A outra parte, o teste de
// tarefa com pessoas sem treinamento (patamar mínimo: 3 por público), é
// registrada na issue com /rnf; as duas são exigidas no D4.5.

const dataBr = (d: Date) =>
  d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

// Conta cada toque da pessoa, como no RNF22.
function contador() {
  let toques = 0;
  return {
    tocar: async (alvo: Locator) => {
      toques += 1;
      await alvo.click();
    },
    total: () => toques,
  };
}

// A impressão do navegador vira um contador: o teste confere que "Imprimir"
// chamou o window.print, sem abrir o diálogo do sistema.
const contarImpressoes = (page: Page) =>
  page.evaluate(() => {
    const janela = window as unknown as { impressoes: number };
    janela.impressoes = 0;
    window.print = () => {
      janela.impressoes += 1;
    };
  });
const impressoes = (page: Page) =>
  page.evaluate(() => (window as unknown as { impressoes: number }).impressoes);

async function emitir(page: Page, area: Page | Locator, inicio: Date) {
  await contarImpressoes(page);
  const toque = contador();
  await toque.tocar(
    area.getByRole("button", {
      name: `Emitir declaração da sessão de ${dataBr(inicio)}`,
    }),
  );
  await expect(
    page.getByRole("heading", { name: "Declaração de comparecimento" }),
  ).toBeFocused();
  await toque.tocar(page.getByRole("button", { name: "Imprimir" }));
  expect(await impressoes(page)).toBe(1);
  expect(toque.total()).toBeLessThanOrEqual(3);
}

test.afterEach(fecharContextos);

for (const [dispositivo, tamanho] of [
  ["celular", { width: 360, height: 800 }],
  ["computador", { width: 1366, height: 900 }],
] as const) {
  test(`no ${dispositivo}, o paciente emite e imprime a declaração em até 3 interações a partir das sessões (RF45, RNF41)`, async ({
    page,
    request,
    playwright,
  }) => {
    const marca = `${dispositivo}.${Date.now()}`;
    const email = `rnf41.${Date.now().toString(36)}@example.com`;
    const caso = await criarCaso(
      playwright,
      `Paciente fictício RNF41 ${marca}`,
      email,
      [{ dias: -7, status: "realizada" }],
    );
    await page.setViewportSize(tamanho);
    await page.goto("/declaracoes");
    await verificar(page, request, caso.numero, email);
    await emitir(page, page, caso.inicios.realizada[0]);
  });

  test(`no ${dispositivo}, a secretaria emite e imprime a declaração em até 3 interações a partir da ficha do paciente (RF45, RNF41)`, async ({
    browser,
    playwright,
  }) => {
    const marca = `secretaria.${dispositivo}.${Date.now()}`;
    const caso = await criarCaso(
      playwright,
      `Paciente fictício RNF41 ${marca}`,
      `rnf41.s.${Date.now().toString(36)}@example.com`,
      [{ dias: -7, status: "realizada" }],
    );
    const page = await entrar(browser, "secretaria");
    await page.setViewportSize(tamanho);
    await page.goto(`/pacientes/${caso.casoId}`);
    const secao = page.getByRole("region", {
      name: "Sessões com presença registrada",
    });
    await expect(secao).toBeVisible();
    await emitir(page, secao, caso.inicios.realizada[0]);
  });
}
