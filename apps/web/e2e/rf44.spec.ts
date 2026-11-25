import { expect, test, type Page } from "@playwright/test";
import { EQUIPE, SENHA_EQUIPE } from "./equipe";
import {
  API,
  entrar,
  fecharContextos,
  focoVisivel,
  semViolacoes,
  tabAte,
} from "./apoio";
import { criarCaso, verificar } from "./apoio-declaracoes";

// Sessões com presença registrada (RF44), de ponta a ponta, com a API, o banco e
// a verificação de identidade reais (RF52). Dados de teste do projeto: uma
// inscrição com três sessões realizadas (uma no ciclo anterior), uma cancelada,
// uma com falta e uma agendada, das quais só as três aparecem; e uma inscrição
// sem sessão realizada (estado vazio). A página pública passa pelo axe, sem
// rolagem lateral, em 320, 360, 768, 1024, 1366 e 1920 px (RNF56 a RNF58).

const semRolagemLateral = (page: Page) =>
  page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );

const dataBr = (d: Date) =>
  d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

test.afterEach(fecharContextos);

for (const largura of [320, 360, 768, 1024, 1366, 1920]) {
  test(`RF44: sessões com presença registrada do paciente e da ficha em ${largura}px (RNF38, RNF43, RNF56, RNF57, RNF58)`, async ({
    page,
    browser,
    request,
    playwright,
  }, info) => {
    const marca = `${largura}.${Date.now()}`;
    // E-mail curto: a ficha mostra o e-mail inteiro, sem quebra, em 320 px.
    const email = `rf44.${largura}.${Date.now().toString(36)}@example.com`;
    const caso = await criarCaso(
      playwright,
      `Paciente fictício RF44 ${marca}`,
      email,
      [
        { dias: -28, status: "realizada", ciclo: 1 },
        { dias: -21, status: "cancelada" },
        { dias: -14, status: "realizada" },
        { dias: -7, status: "realizada" },
        { dias: -3, status: "falta_paciente" },
        { dias: 7, status: "agendada" },
      ],
    );
    const realizadas = caso.inicios.realizada
      .toSorted((a, b) => b.getTime() - a.getTime())
      .map(dataBr);
    const outras = [
      ...caso.inicios.cancelada,
      ...caso.inicios.falta_paciente,
      ...caso.inicios.agendada,
    ].map(dataBr);

    // Paciente ou responsável, depois dos dois passos do RF52.
    await page.setViewportSize({ width: largura, height: 900 });
    await page.goto("/declaracoes");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Sessões com presença registrada",
      }),
    ).toBeVisible();
    await verificar(page, request, caso.numero, email);
    const lista =
      largura < 640
        ? page.getByRole("list", {
            name: `Sessões com presença registrada da inscrição ${caso.numero}`,
          })
        : page.getByRole("table", {
            name: `Sessões com presença registrada da inscrição ${caso.numero}`,
          });
    await expect(lista).toBeVisible();
    await expect(lista.locator(largura < 640 ? "li" : "tbody tr")).toHaveCount(
      3,
    );
    const texto = (await lista.textContent()) ?? "";
    // Da mais recente para a mais antiga, todas com a estagiária.
    expect(realizadas.map((d) => texto.indexOf(d))).toEqual(
      realizadas.map((d) => texto.indexOf(d)).toSorted((a, b) => a - b),
    );
    for (const d of realizadas) expect(texto).toContain(d);
    for (const d of outras) expect(texto).not.toContain(d);
    expect(texto).toContain(caso.estagiario);
    await expect(page.locator("main")).not.toContainText(/queixa|amarela/i);
    // A emissão chegou com o RF45: uma ação por sessão da lista.
    await expect(
      page.getByText(
        "Escolha a sessão para emitir a declaração de comparecimento.",
        { exact: false },
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^Emitir declaração/ }),
    ).toHaveCount(3);
    // Foco visível no controle da página pública, chegando por teclado (RNF57).
    const encerrar = page.getByRole("button", { name: "Encerrar consulta" });
    await tabAte(page, encerrar);
    await focoVisivel(encerrar);
    expect(await semRolagemLateral(page)).toBe(true);
    await semViolacoes(page);
    await page.screenshot({
      path: info.outputPath(`declaracoes-${largura}.png`),
      fullPage: true,
    });

    // Ao encerrar, a lista some e a API recusa sem a verificação (RNF38).
    await encerrar.click();
    await expect(page.getByText("Consulta encerrada.")).toBeVisible();
    await expect(lista).not.toBeVisible();
    expect(
      (await page.request.get(`${API}/declaracoes/minhas-sessoes`)).status(),
    ).toBe(401);

    // Secretaria: a seção da ficha do paciente.
    const secretaria = await entrar(browser, "secretaria");
    await secretaria.setViewportSize({ width: largura, height: 900 });
    await secretaria.goto(`/pacientes/${caso.casoId}`);
    const secao = secretaria.getByRole("region", {
      name: "Sessões com presença registrada",
    });
    await expect(secao).toBeVisible();
    await expect(secao.locator(largura < 640 ? "li" : "tbody tr")).toHaveCount(
      3,
    );
    await expect(
      secao.getByRole("button", { name: /^Emitir declaração/ }),
    ).toHaveCount(3);
    expect(await semRolagemLateral(secretaria)).toBe(true);
    await semViolacoes(secretaria);

    // Coordenação: a ficha mostra que a lista não é do perfil (RNF38).
    const coordenacao = await entrar(browser, "coordenacao");
    await coordenacao.setViewportSize({ width: largura, height: 900 });
    await coordenacao.goto(`/pacientes/${caso.casoId}`);
    await expect(
      coordenacao.getByRole("region", {
        name: "Você não tem acesso a esta lista",
      }),
    ).toBeVisible();
    await expect(
      coordenacao.getByRole("region", {
        name: "Sessões com presença registrada",
      }),
    ).toHaveCount(0);
    await semViolacoes(coordenacao);
  });
}

test("RF44: inscrição sem sessão realizada mostra o estado vazio, e o estagiário e o supervisor não listam (RNF38)", async ({
  page,
  request,
  playwright,
}) => {
  const marca = `vazio.${Date.now()}`;
  const email = `rf44.vazio.${Date.now().toString(36)}@example.com`;
  const caso = await criarCaso(
    playwright,
    `Paciente fictício RF44 ${marca}`,
    email,
    [
      { dias: -7, status: "falta_paciente" },
      { dias: 7, status: "agendada" },
    ],
  );
  await page.goto("/declaracoes");
  await verificar(page, request, caso.numero, email);
  await expect(
    page.getByRole("heading", {
      name: "Não há sessões disponíveis para declaração",
    }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Ainda não há sessão com presença registrada nesta inscrição.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
  await semViolacoes(page);

  for (const perfil of ["estagiario", "supervisor"] as const) {
    const api = await playwright.request.newContext({ baseURL: API });
    await api.post("/auth/login", {
      data: { email: EQUIPE[perfil].email, senha: SENHA_EQUIPE },
    });
    expect(
      (await api.get(`/pacientes/${caso.casoId}/sessoes-realizadas`)).status(),
    ).toBe(403);
    await api.dispose();
  }
});
