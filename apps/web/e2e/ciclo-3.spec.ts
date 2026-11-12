import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createDb } from "@clinica/database";
import { API, entrar, fecharContextos, semViolacoes } from "./apoio";
import { EQUIPE } from "./equipe";

// Integração das features do Ciclo 3, de ponta a ponta, com a API e o banco reais:
// inscrição (RF1) → triagem e prioridade (RF4, RF6) → distribuição (RF18, RF20) →
// vínculo do estagiário e criação do prontuário (RF21, RF66) → agendamento (RF10)
// → acesso ao prontuário por perfil (RF55). Cada tela interna passa também pela
// verificação de WCAG 2.2 AA com a pessoa logada (RNF56).

const paciente = `Paciente Integração ${Date.now()}`;
let numero = "";
let prontuarioId = "";

function hojeEmCuiaba() {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Cuiaba",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const valor = Object.fromEntries(
    partes.map(({ type, value }) => [type, value]),
  );
  return `${valor.year}-${valor.month}-${valor.day}`;
}

// Dia útil daqui a algumas semanas, no formato AAAA-MM-DD, para não colidir com
// sessões de execuções anteriores no mesmo banco.
function diaDaSessao() {
  const dia = new Date(Date.now() + (20 + (Date.now() % 200)) * 86_400_000);
  while (dia.getUTCDay() === 0 || dia.getUTCDay() === 6) {
    dia.setUTCDate(dia.getUTCDate() + 1);
  }
  return dia.toISOString().slice(0, 10);
}

test.afterEach(fecharContextos);

test.describe.serial("Integração do Ciclo 3", () => {
  test("a inscrição pública entra na API com número e data (RF1, RF2)", async ({
    request,
  }) => {
    const resposta = await request.post(`${API}/inscricoes`, {
      data: {
        nomeCompleto: paciente,
        dataNascimento: "1990-05-10",
        cpf: String(Date.now()).slice(-11).padStart(11, "1"),
        rg: "1234567",
        endereco: "Rua Fictícia, 100, Santa Maria",
        estadoCivil: "Solteiro(a)",
        responsavelLegal: "",
        celular: "61999999999",
        email: "paciente.integracao@example.com",
        queixa: "Queixa fictícia de integração",
        percepcaoUrgencia: "Urgência fictícia",
        historicoRelevante: "Histórico fictício",
        confirmado: true,
        aceiteTermo: true,
        versaoTermo: "0.1",
        chaveEnvio: randomUUID(),
      },
    });
    expect(resposta.status()).toBe(201);
    ({ numero } = (await resposta.json()) as { numero: string });
    expect(numero).toMatch(/^\d{4}-\d{5,}$/);
  });

  test("a coordenação registra a prioridade clínica na triagem, sem violações WCAG (RF4, RF6, RNF56)", async ({
    browser,
  }) => {
    const page = await entrar(browser, "coordenacao");
    await page.goto("/triagem");
    await semViolacoes(page);
    await page
      .getByRole("link", { name: `Abrir inscrição ${numero}` })
      .first()
      .click();
    const declaracao = page.getByRole("region", {
      name: "Declarado pelo interessado",
    });
    await expect(declaracao).toContainText("Queixa fictícia de integração");
    await semViolacoes(page);
    await page
      .getByRole("link", { name: "Registrar prioridade clínica" })
      .click();
    await page.getByRole("radio", { name: "Vermelha" }).check();
    await semViolacoes(page);
    await page.getByRole("button", { name: "Registrar prioridade" }).click();
    await expect(
      page.getByText("Prioridade Vermelha registrada."),
    ).toBeVisible();
  });

  test("a coordenação distribui o caso ao supervisor, sem violações WCAG (RF18, RF20, RNF56)", async ({
    browser,
  }) => {
    const page = await entrar(browser, "coordenacao");
    await page.goto("/distribuicao");
    await expect(page.getByText(paciente).first()).toBeVisible();
    await semViolacoes(page);
    await page.getByRole("button", { name: `Distribuir ${paciente}` }).click();
    const dialogo = page.getByRole("dialog", { name: "Distribuir caso" });
    await dialogo.getByText(EQUIPE.supervisor.nome).click();
    const confirmar = dialogo.getByRole("button", {
      name: "Confirmar distribuição",
    });
    // Mede o contraste só depois da transição do botão habilitado.
    await expect(confirmar).toBeEnabled();
    await expect(confirmar).toHaveCSS("opacity", "1");
    await semViolacoes(page);
    await confirmar.click();
    await expect(page.getByText("Caso distribuído.")).toBeVisible();
    await expect(
      page.getByText(`${paciente} agora está com ${EQUIPE.supervisor.nome}.`),
    ).toBeVisible();
  });

  test("o supervisor vincula o estagiário e o prontuário é criado, sem violações WCAG (RF21, RF66, RNF56)", async ({
    browser,
  }) => {
    const page = await entrar(browser, "supervisor");
    await page.goto("/meus-casos");
    await semViolacoes(page);
    await page
      .getByRole("button", { name: `Vincular estagiário a ${paciente}` })
      .click();
    const dialogo = page.getByRole("dialog", { name: "Vincular estagiário" });
    await dialogo.getByText(EQUIPE.estagiario.nome).click();
    await dialogo.getByRole("button", { name: "Confirmar vínculo" }).click();
    await expect(
      page.getByText("O prontuário do caso foi criado."),
    ).toBeVisible();
    const link = page.getByRole("link", {
      name: `Abrir prontuário de ${paciente}`,
    });
    prontuarioId = (await link.getAttribute("href"))!.split("/").pop()!;
    expect(prontuarioId).toMatch(/^[0-9a-f-]{36}$/);
  });

  test("a secretaria agenda a sessão do paciente vinculado, sem violações WCAG (RF10, RNF56)", async ({
    browser,
  }) => {
    const page = await entrar(browser, "secretaria");
    await page.goto("/agendar-sessao");
    await page.getByRole("searchbox", { name: "Paciente" }).fill(paciente);
    await page.getByRole("button", { name: new RegExp(paciente) }).click();
    await expect(page.getByText(EQUIPE.estagiario.nome).first()).toBeVisible();
    await page.getByLabel("Data").fill(diaDaSessao());
    await page.getByLabel("Início").fill("10:00");
    await semViolacoes(page);
    await page.getByRole("button", { name: "Agendar sessão" }).click();
    await expect(
      page.getByRole("region", { name: "Sessão agendada" }),
    ).toBeVisible();
  });

  test("o estagiário responsável abre o prontuário com a sessão do ciclo, sem violações WCAG (RF55, RF66, RNF56)", async ({
    browser,
  }) => {
    const page = await entrar(browser, "estagiario");
    await page.goto(`/prontuarios/${prontuarioId}`);
    await expect(
      page.getByRole("heading", { name: `Prontuário · ${paciente}` }),
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: "Não se aplica" }),
    ).toBeVisible();
    await semViolacoes(page);
  });

  test("o estagiário registra anamnese, contrato e evolução pela tela em larguras de 320 a 1920 px (RF27, RF28, RF69, RNF25, RNF27, RNF30, RNF51, RNF52, RNF56, RNF58)", async ({
    browser,
  }) => {
    const page = await entrar(browser, "estagiario");
    const dbUrl =
      process.env.DATABASE_URL ??
      "postgresql://clinica:clinica@localhost:5432/clinica";
    const host = new URL(dbUrl).hostname;
    if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(host)) {
      throw new Error("Este e2e só altera horários no banco local de teste.");
    }
    const db = createDb(dbUrl);
    const {
      rows: [prontuario],
    } = await db.$client.query<{ casoId: string }>(
      'SELECT caso_id AS "casoId" FROM prontuarios WHERE id = $1',
      [prontuarioId],
    );
    const {
      rows: [sessao],
    } = await db.$client.query<{ id: string }>(
      "SELECT id FROM sessoes_atendimento WHERE caso_id = $1 LIMIT 1",
      [prontuario.casoId],
    );
    expect(sessao).toBeTruthy();
    const inicio = new Date("2001-01-01T13:00:00.000Z");
    await db.$client.query(
      `UPDATE sessoes_atendimento
       SET inicio = $1, termino = $2, fim_intervalo_anotacoes = $3
       WHERE id = $4`,
      [
        inicio,
        new Date("2001-01-01T13:50:00.000Z"),
        new Date("2001-01-01T14:00:00.000Z"),
        sessao.id,
      ],
    );
    await db.$client.end();

    await page.goto(`/prontuarios/${prontuarioId}`);
    await expect(
      page.getByRole("heading", { name: `Prontuário · ${paciente}` }),
    ).toBeVisible();
    const queixa = page.getByLabel("Queixa principal");
    await queixa.fill("Queixa fictícia de integração");
    await semViolacoes(page);
    await page.getByRole("button", { name: "Salvar anamnese" }).click();
    await expect(
      page.getByRole("button", { name: "Salvar anamnese" }),
    ).toHaveCount(0);

    await page
      .getByLabel("Data de assinatura do contrato")
      .fill(hojeEmCuiaba());
    await page.getByLabel(/A via assinada do contrato está guardada/).check();
    await semViolacoes(page);
    await page.getByRole("button", { name: "Salvar contrato" }).click();
    await expect(
      page.getByRole("button", { name: "Salvar contrato" }),
    ).toHaveCount(0);

    await page
      .getByRole("button", { name: "Marcar sessão como realizada" })
      .click();
    const registrar = page.getByRole("link", { name: "Registrar evolução" });
    await expect(registrar).toBeVisible();
    await registrar.click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Registro de evolução" }),
    ).toBeVisible();
    for (const [rotulo, valor] of [
      ["Humor e aparência do paciente", "Tranquilo e atento."],
      ["Conteúdo trabalhado", "Rotina de sono."],
      ["Técnicas utilizadas", "Escuta qualificada."],
      ["Plano para a próxima sessão", "Retomar o tema."],
    ])
      await page.getByLabel(new RegExp(rotulo)).fill(valor);

    for (const largura of [320, 360, 375, 768, 1024, 1366, 1920]) {
      await page.setViewportSize({ width: largura, height: 1000 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
        `rolagem horizontal em ${largura}px`,
      ).toBeLessThanOrEqual(largura);
      await semViolacoes(page);
    }
    await page.getByRole("button", { name: "Salvar evolução" }).click();
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: /Evolução registrada\. A evolução da sessão nº/ }),
    ).toBeVisible();
    await expect(page.getByText("Retomar o tema.")).toBeVisible();
    await expect(page.locator("details[open]")).toHaveCount(1);
    await semViolacoes(page);
  });

  test("a coordenação consulta o prontuário só para leitura, e a secretaria tem o acesso negado sem o nome do paciente (RF55, RNF25, RNF56)", async ({
    browser,
  }) => {
    const coordenacao = await entrar(browser, "coordenacao");
    await coordenacao.goto(`/prontuarios/${prontuarioId}`);
    await expect(
      coordenacao.getByRole("heading", { name: `Prontuário · ${paciente}` }),
    ).toBeVisible();
    await expect(
      coordenacao.getByText(/Seu acesso fica registrado/),
    ).toBeVisible();
    await expect(
      coordenacao.getByRole("button", { name: "Salvar anamnese" }),
    ).toHaveCount(0);
    await expect(
      coordenacao.getByRole("button", { name: "Salvar contrato" }),
    ).toHaveCount(0);

    const secretaria = await entrar(browser, "secretaria");
    await secretaria.goto(`/prontuarios/${prontuarioId}`);
    await expect(
      secretaria.getByRole("heading", {
        name: "Você não tem acesso a este prontuário",
      }),
    ).toBeVisible();
    await expect(secretaria.locator("body")).not.toContainText(paciente);
    await semViolacoes(secretaria);
  });

  test("a coordenação gere os usuários da equipe, sem violações WCAG (RF53, RF54, RNF56)", async ({
    browser,
  }) => {
    const page = await entrar(browser, "coordenacao");
    await page.goto("/usuarios");
    await expect(page.getByText(EQUIPE.estagiario.email).first()).toBeVisible();
    await semViolacoes(page);
  });

  test("a saída encerra a sessão e as páginas internas pedem nova entrada (RF51)", async ({
    browser,
  }) => {
    const page = await entrar(browser, "supervisor");
    await page.getByRole("button", { name: "Sair" }).first().click();
    await page.waitForURL("**/entrar");
    await page.goto("/meus-casos");
    await page.waitForURL("**/entrar");
  });
});
