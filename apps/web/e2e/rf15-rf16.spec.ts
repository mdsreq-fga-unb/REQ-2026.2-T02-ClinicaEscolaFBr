import { expect, test, type Page } from "@playwright/test";
import {
  entrar,
  fecharContextos,
  focoVisivel,
  semViolacoes,
  tabAte,
} from "./apoio";
import { criarPacienteComSessoes } from "./apoio-confirmacao";

// Cancelamento de sessão (RF15) e ausência do estagiário (RF16), de ponta a ponta,
// com a API e o banco reais: a página pública do link (RNF59), o diálogo "Cancelar
// sessão" da secretaria, do estagiário e do supervisor, com a verificação de WCAG
// 2.2 AA (RNF56), o foco visível (RNF57) e as larguras de 320 a 1920 px (RNF58).

let link = { paciente: "", largura: "" };
let caso = { paciente: "", casoId: "", prontuarioId: "" };

test.beforeAll(async ({ playwright }) => {
  const pelaPagina = await criarPacienteComSessoes(playwright, [
    { horas: 72 },
    { horas: 80 },
  ]);
  link = { paciente: pelaPagina.tokens[0], largura: pelaPagina.tokens[1] };

  // Caso do estagiário e do supervisor da semente, com uma sessão para cada perfil.
  const daEquipe = await criarPacienteComSessoes(
    playwright,
    [{ horas: 300 }, { horas: 330 }, { horas: 360 }],
    { daEquipe: true },
  );
  caso = {
    paciente: daEquipe.paciente,
    casoId: daEquipe.casoId,
    prontuarioId: daEquipe.prontuarioId!,
  };
});

test.afterEach(fecharContextos);

const semRolagemLateral = (page: Page) =>
  page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );

test.describe.serial("Cancelamento de sessão (RF15 e RF16)", () => {
  test("o paciente cancela pelo link, só com o teclado e com a justificativa (RF15, RNF56, RNF57, RNF59)", async ({
    page,
  }) => {
    await page.goto(`/confirmacao/${link.paciente}`);
    const abrir = page.getByRole("button", {
      name: "Não vou poder ir: cancelar sessão",
    });
    await tabAte(page, abrir);
    await focoVisivel(abrir);
    await page.keyboard.press("Enter");

    await expect(
      page.getByRole("heading", { name: "Cancelar a sua sessão" }),
    ).toBeVisible();
    const campo = page.getByLabel(/Por que você precisa cancelar/);
    await expect(campo).toBeFocused();
    await semViolacoes(page);

    // Sem justificativa, não cancela, e o foco volta ao campo.
    await page.getByRole("button", { name: "Confirmar cancelamento" }).click();
    await expect(
      page.getByText("Escreva o motivo do cancelamento."),
    ).toBeVisible();
    await expect(campo).toBeFocused();
    await semViolacoes(page);

    await campo.fill("Consulta médica marcada no mesmo horário.");
    await page.getByRole("button", { name: "Confirmar cancelamento" }).click();
    await expect(page.getByText("Sessão cancelada")).toBeVisible();
    await expect(page.getByRole("button")).toHaveCount(0);
    await semViolacoes(page);

    // Depois do cancelamento, o link não permite mais nada (RNF59).
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Este link não é mais válido" }),
    ).toBeVisible();
  });

  test("a secretaria registra o pedido do paciente na ficha dele (RF15, RNF56)", async ({
    browser,
  }) => {
    const page = await entrar(browser, "secretaria");
    await page.goto(`/pacientes/${caso.casoId}`);
    await expect(
      page.getByRole("heading", { name: caso.paciente }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Cancelar sessão" })
      .locator("visible=true")
      .first()
      .click();

    const dialogo = page.getByRole("dialog");
    await expect(
      dialogo.getByLabel("O paciente pediu o cancelamento"),
    ).toBeChecked();
    await expect(dialogo.getByText(/Cancelamento no prazo/)).toBeVisible();
    await semViolacoes(page);
    await dialogo
      .getByLabel(/Justificativa/)
      .fill("Paciente ligou informando que estará viajando.");
    await dialogo.getByRole("button", { name: "Cancelar sessão" }).click();

    await expect(page.getByText("Sessão cancelada.")).toBeVisible();
    await expect(
      page.getByText(/foi cancelada no prazo e não conta como falta/),
    ).toBeVisible();
    await semViolacoes(page);
  });

  test("o estagiário registra a própria ausência no prontuário (RF16, RNF56)", async ({
    browser,
  }) => {
    const page = await entrar(browser, "estagiario");
    await page.goto(`/prontuarios/${caso.prontuarioId}`);
    await page.getByRole("button", { name: "Cancelar sessão" }).first().click();

    const dialogo = page.getByRole("dialog");
    await expect(dialogo.getByLabel("Ausência do estagiário")).toBeChecked();
    await expect(
      dialogo.getByText("O paciente pediu o cancelamento"),
    ).toHaveCount(0);
    await expect(
      dialogo.getByText(
        "Ausência do estagiário: conta nas suas faltas de estágio.",
      ),
    ).toBeVisible();
    await semViolacoes(page);
    await dialogo
      .getByLabel(/Justificativa/)
      .fill("Prova da disciplina no mesmo horário.");
    await dialogo.getByRole("button", { name: "Cancelar sessão" }).click();

    await expect(page.getByText("Ausência registrada.")).toBeVisible();
    await expect(
      page.getByText("Cancelada · ausência do estagiário"),
    ).toBeVisible();
    await semViolacoes(page);
  });

  test("o supervisor do caso só registra a ausência do estagiário (RF16)", async ({
    browser,
  }) => {
    const page = await entrar(browser, "supervisor");
    await page.goto(`/prontuarios/${caso.prontuarioId}`);
    await page.getByRole("button", { name: "Cancelar sessão" }).first().click();

    const dialogo = page.getByRole("dialog");
    await expect(dialogo.getByRole("radio")).toHaveCount(1);
    await expect(dialogo.getByLabel("Ausência do estagiário")).toBeChecked();
    await semViolacoes(page);
  });

  test("a página do link e o diálogo cabem de 320 a 1920 px, sem rolagem lateral (RNF58)", async ({
    browser,
  }) => {
    const publica = await browser.newPage();
    const secretaria = await entrar(browser, "secretaria");
    for (const largura of [320, 375, 768, 1024, 1366, 1920]) {
      await publica.setViewportSize({ width: largura, height: 900 });
      await publica.goto(`/confirmacao/${link.largura}`);
      await publica
        .getByRole("button", { name: "Não vou poder ir: cancelar sessão" })
        .click();
      await expect(
        publica.getByRole("heading", { name: "Cancelar a sua sessão" }),
      ).toBeVisible();
      expect(await semRolagemLateral(publica), `link em ${largura}px`).toBe(
        true,
      );

      await secretaria.setViewportSize({ width: largura, height: 900 });
      await secretaria.goto(`/pacientes/${caso.casoId}`);
      await secretaria
        .getByRole("button", { name: "Cancelar sessão" })
        .locator("visible=true")
        .first()
        .click();
      const dialogo = secretaria.getByRole("dialog");
      await expect(dialogo).toBeVisible();
      expect(
        await dialogo.evaluate((el) => el.scrollWidth <= el.clientWidth),
        `diálogo em ${largura}px`,
      ).toBe(true);
      // No celular, o diálogo fecha pelo X; o "Voltar" fica só no computador.
      await dialogo.getByRole("button", { name: "Fechar" }).click();
    }
    await publica.close();
  });
});
