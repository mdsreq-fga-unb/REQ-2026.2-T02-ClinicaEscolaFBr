import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { entrar, fecharContextos, semViolacoes } from "./apoio";
import { criarPacienteComSessoes } from "./apoio-confirmacao";

// Agenda de sessões do estagiário (RF11), de ponta a ponta, com a API e o banco
// reais: a agenda do estagiário, a dos estagiários do supervisor e o acesso negado,
// com a verificação de WCAG 2.2 AA (RNF56) e as larguras de 320 a 1920 px (RNF58).

let paciente = "";

test.beforeAll(async ({ playwright }) => {
  // Uma sessão realizada, uma que já passou sem registro e uma futura, no caso do
  // estagiário e do supervisor da semente.
  const criado = await criarPacienteComSessoes(
    playwright,
    [
      { horas: -60, status: "realizada" },
      { horas: -14, status: "confirmada" },
      { horas: 40 },
    ],
    { daEquipe: true },
  );
  paciente = criado.paciente;
});

test.afterEach(fecharContextos);

const FUSO = "America/Sao_Paulo";
const dataDaqui = (dias: number) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(
    new Date(Date.now() + dias * 24 * 60 * 60 * 1000),
  );

// "Outro período" de 4 dias atrás a 4 dias à frente, com as sessões criadas acima.
async function escolherPeriodo(page: Page) {
  await page.getByLabel("Outro período").check();
  await page.getByLabel("De", { exact: true }).fill(dataDaqui(-4));
  await page.getByLabel("Até", { exact: true }).fill(dataDaqui(4));
}

const linhaDo = (page: Page, horario?: RegExp) =>
  page
    .getByRole("row")
    .filter({ hasText: paciente })
    .filter({ hasText: horario ?? /./ });

const semRolagemLateral = (page: Page) =>
  page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );

test.describe.serial("Agenda de sessões do estagiário (RF11)", () => {
  test("o estagiário vê as próprias sessões, com a ação de cada uma (RF11, RNF13, RNF56)", async ({
    browser,
  }) => {
    const page = await entrar(browser, "estagiario");
    await page.goto("/agenda");
    await expect(
      page.getByText("Suas sessões agendadas, confirmadas e realizadas."),
    ).toBeVisible();
    await escolherPeriodo(page);

    const linhas = page.getByRole("row").filter({ hasText: paciente });
    await expect(linhas).toHaveCount(3);
    await expect(
      linhas.filter({ hasText: "Realizada" }).getByRole("link", {
        name: `Abrir prontuário de ${paciente}`,
      }),
    ).toBeVisible();
    await expect(
      linhas
        .filter({ hasText: "Horário já passou" })
        .getByRole("button", { name: /Registrar falta do paciente/ }),
    ).toBeVisible();
    await expect(
      linhas.filter({ hasText: "Agendada" }).getByRole("button", {
        name: /Cancelar sessão/,
      }),
    ).toBeVisible();
    // Só o nome, a data, os horários e a situação (RNF13).
    await expect(linhas.first()).not.toContainText("@");
    await semViolacoes(page);
  });

  test("o supervisor escolhe o estagiário e só registra a ausência dele (RF11, RF16, RNF56)", async ({
    browser,
  }) => {
    const page = await entrar(browser, "supervisor");
    await page.getByRole("link", { name: "Agenda", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Agenda dos estagiários" }),
    ).toBeVisible();
    const campo = page.getByLabel("Estagiário");
    await campo.selectOption({ label: "Ana Beatriz E2E" });
    await expect(page).toHaveURL(/\/agenda\?estagiario=/);
    await expect(
      page.getByRole("heading", { name: "Agenda de Ana Beatriz E2E" }),
    ).toBeVisible();
    await escolherPeriodo(page);

    const futura = linhaDo(page).filter({ hasText: "Agendada" });
    await expect(
      futura.getByRole("button", { name: /Registrar ausência do estagiário/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Cancelar sessão/ }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /Registrar falta do paciente/ }),
    ).toHaveCount(0);
    await semViolacoes(page);
  });

  test("a agenda de um estagiário que não é do supervisor não abre, e nenhuma sessão aparece (RF11)", async ({
    browser,
  }) => {
    const page = await entrar(browser, "supervisor");
    await page.goto(`/agenda?estagiario=${randomUUID()}`);

    await expect(
      page.getByRole("heading", {
        name: "Você não tem acesso à agenda deste estagiário.",
      }),
    ).toBeVisible();
    await expect(page.getByText("Tentativa registrada em")).toBeVisible();
    await expect(page.getByRole("table")).toHaveCount(0);
    await semViolacoes(page);
  });

  test("a agenda cabe de 320 a 1920 px, sem rolagem lateral (RNF58)", async ({
    browser,
  }) => {
    const page = await entrar(browser, "estagiario");
    for (const largura of [320, 375, 768, 1024, 1366, 1920]) {
      await page.setViewportSize({ width: largura, height: 900 });
      await page.goto("/agenda");
      await escolherPeriodo(page);
      await expect(
        page.getByText(paciente, { exact: true }).locator("visible=true"),
      ).toHaveCount(3);
      expect(await semRolagemLateral(page), `agenda em ${largura}px`).toBe(
        true,
      );
    }
  });
});
