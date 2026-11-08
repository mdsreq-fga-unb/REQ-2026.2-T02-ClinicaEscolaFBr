import { expect, test, type Page } from "@playwright/test";
import {
  entrar,
  fecharContextos,
  focoVisivel,
  semViolacoes,
  tabAte,
} from "./apoio";
import { criarPacienteComSessoes } from "./apoio-confirmacao";

// Confirmação de presença (RF14), de ponta a ponta, com a API e o banco reais: a
// página pública do link (RNF15, RNF59) e a Agenda da secretaria, com a verificação
// de WCAG 2.2 AA (RNF56), o foco visível (RNF57) e as larguras de 320 a 1920 px
// (RNF58).

let paciente = "";
let link = { agendada: "", prazoEncerrado: "", cancelada: "", largura: "" };

test.beforeAll(async ({ playwright }) => {
  const criado = await criarPacienteComSessoes(playwright, [
    { horas: 72 },
    { horas: 5 },
    { horas: 96, status: "cancelada" },
    { horas: 8 },
  ]);
  paciente = criado.paciente;
  const [agendada, prazoEncerrado, cancelada, largura] = criado.tokens;
  link = { agendada, prazoEncerrado, cancelada, largura };
});

test.afterEach(fecharContextos);

const semRolagemLateral = (page: Page) =>
  page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );

test.describe.serial("Confirmação de presença (RF14)", () => {
  test("o paciente confirma pelo link, só com o teclado e sem login (RF14, RNF15, RNF56, RNF57)", async ({
    page,
  }) => {
    await page.goto(`/confirmacao/${link.agendada}`);
    await expect(page.getByText("Olá, Paciente.")).toBeVisible();
    await expect(page.getByText(/Confirme a sua presença até/)).toBeVisible();
    await semViolacoes(page);

    const botao = page.getByRole("button", { name: "Confirmar presença" });
    await tabAte(page, botao);
    await focoVisivel(botao);
    await page.keyboard.press("Enter");

    await expect(page.getByText("Presença confirmada")).toBeVisible();
    await semViolacoes(page);
    // Depois de confirmar, o link informa e não confirma de novo (RNF59).
    await page.reload();
    await expect(page.getByText("Presença confirmada")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Confirmar presença" }),
    ).toHaveCount(0);
  });

  test("depois do prazo, o link orienta a procurar a secretaria (RF14, RNF56)", async ({
    page,
  }) => {
    await page.goto(`/confirmacao/${link.prazoEncerrado}`);
    await expect(
      page.getByText("Prazo de confirmação encerrado."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Confirmar presença" }),
    ).toHaveCount(0);
    await semViolacoes(page);
  });

  test("sessão cancelada: link inválido, sem nenhum dado da sessão (RF14, RNF59, RNF56)", async ({
    page,
  }) => {
    await page.goto(`/confirmacao/${link.cancelada}`);
    await expect(
      page.getByRole("heading", { name: "Este link não é mais válido" }),
    ).toBeVisible();
    await expect(page.getByText(/Paciente/)).toHaveCount(0);
    await semViolacoes(page);
  });

  test("a secretaria vê a sessão sem confirmação e registra a confirmação por telefone (RF14, RNF13, RNF56)", async ({
    browser,
  }) => {
    const page = await entrar(browser, "secretaria");
    await page.goto("/agenda");
    const linha = page.getByRole("row", { name: new RegExp(paciente) });
    await expect(linha.first()).toBeVisible();
    // Telefone e e-mail ficam na ficha do paciente, e não na agenda (RNF13).
    await expect(linha.first()).not.toContainText("99876");
    await expect(linha.first()).not.toContainText("@");
    await semViolacoes(page);

    await linha
      .first()
      .getByRole("button", { name: `Registrar confirmação de ${paciente}` })
      .click();
    const dialogo = page.getByRole("dialog");
    await expect(dialogo).toBeVisible();
    await semViolacoes(page);
    await dialogo
      .getByRole("button", { name: "Registrar confirmação", exact: true })
      .click();

    await expect(page.getByText("Confirmação registrada.")).toBeVisible();
    // Das duas sessões do paciente com o prazo vencido, sobra a que não foi confirmada.
    await expect(linha).toHaveCount(1);
  });

  // Desde o RF11, o estagiário tem a própria agenda em /agenda, sem a seção da
  // secretaria; a coordenação não tem agenda.
  test("o estagiário não vê as sessões sem confirmação da secretaria (RF14)", async ({
    browser,
  }) => {
    const page = await entrar(browser, "estagiario");
    await page.goto("/agenda");
    await expect(
      page.getByText("Suas sessões agendadas, confirmadas e realizadas."),
    ).toBeVisible();
    await expect(page.getByText("Sessões sem confirmação")).toHaveCount(0);

    const coordenacao = await entrar(browser, "coordenacao");
    await coordenacao.goto("/agenda");
    await expect(
      coordenacao.getByRole("heading", { name: "Página não encontrada" }),
    ).toBeVisible();
  });

  test("a página do link e a Agenda cabem de 320 a 1920 px, sem rolagem lateral (RNF58)", async ({
    browser,
  }) => {
    const publica = await browser.newPage();
    const secretaria = await entrar(browser, "secretaria");
    for (const largura of [320, 375, 768, 1024, 1366, 1920]) {
      await publica.setViewportSize({ width: largura, height: 900 });
      await publica.goto(`/confirmacao/${link.largura}`);
      await expect(publica.getByText("Olá, Paciente.")).toBeVisible();
      expect(await semRolagemLateral(publica), `link em ${largura}px`).toBe(
        true,
      );

      await secretaria.setViewportSize({ width: largura, height: 900 });
      await secretaria.goto("/agenda");
      await expect(
        secretaria.getByRole("heading", { name: /Sessões sem confirmação/ }),
      ).toBeVisible();
      await expect(
        secretaria.getByText(paciente, { exact: true }).locator("visible=true"),
      ).toHaveCount(1);
      expect(
        await semRolagemLateral(secretaria),
        `agenda em ${largura}px`,
      ).toBe(true);
      // O painel corta o que passa da borda: a tabela ou os cartões cabem nele.
      const painel = secretaria.locator(
        "section[aria-labelledby='titulo-sem-confirmacao']",
      );
      expect(
        await painel.evaluate((el) => el.scrollWidth <= el.clientWidth),
        `painel da agenda em ${largura}px`,
      ).toBe(true);
    }
    await publica.close();
  });
});
