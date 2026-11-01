import { expect, test, type Locator } from "@playwright/test";
import { criarCasoTriado, entrar, fecharContextos } from "./apoio";
import { EQUIPE } from "./equipe";

// Parte automática do RNF22 (usabilidade da distribuição e do vínculo): no
// celular, a distribuição termina em até 3 interações a partir da lista de
// pendentes, e o vínculo também. A outra parte, o teste de tarefa com pessoas sem
// treinamento, é registrada na issue com /rnf (as duas são exigidas no D4.5).

const paciente = `Paciente Celular ${Date.now()}`;
const CELULAR = { width: 360, height: 800 };

test.beforeAll(async ({ playwright }) => {
  await criarCasoTriado(playwright, paciente);
});

// Conta cada toque da pessoa: botão, opção ou confirmação.
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

test.afterEach(fecharContextos);

test.describe
  .serial("Interações da distribuição e do vínculo no celular (RNF22)", () => {
  test("no celular, a coordenação distribui o caso em 3 interações a partir da lista (RF18, RF20, RNF22)", async ({
    browser,
  }) => {
    const page = await entrar(browser, "coordenacao");
    await page.setViewportSize(CELULAR);
    await page.goto("/distribuicao");
    const toque = contador();
    await toque.tocar(
      page.getByRole("button", { name: `Distribuir ${paciente}` }),
    );
    await toque.tocar(
      page.getByRole("radio", { name: new RegExp(EQUIPE.supervisor.nome) }),
    );
    await toque.tocar(
      page.getByRole("button", { name: "Confirmar distribuição" }),
    );
    await expect(
      page.getByRole("status").filter({ hasText: "Caso distribuído." }),
    ).toBeVisible();
    expect(toque.total()).toBeLessThanOrEqual(3);
  });

  test("no celular, o supervisor vincula o estagiário em 3 interações a partir de Meus casos (RF21, RNF22)", async ({
    browser,
  }) => {
    const page = await entrar(browser, "supervisor");
    await page.setViewportSize(CELULAR);
    await page.goto("/meus-casos");
    const toque = contador();
    await toque.tocar(
      page.getByRole("button", { name: `Vincular estagiário a ${paciente}` }),
    );
    await toque.tocar(
      page.getByRole("radio", { name: new RegExp(EQUIPE.estagiario.nome) }),
    );
    await toque.tocar(page.getByRole("button", { name: "Confirmar vínculo" }));
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "O prontuário do caso foi criado." }),
    ).toBeVisible();
    expect(toque.total()).toBeLessThanOrEqual(3);
  });
});
