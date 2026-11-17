import { randomUUID } from "node:crypto";
import {
  createDb,
  inscricoes,
  casos,
  prontuarios,
  atribuicoesSupervisor,
  vinculosEstagiario,
} from "@clinica/database";
import { expect, test } from "@playwright/test";
import {
  API,
  entrar,
  fecharContextos,
  focoVisivel,
  semViolacoes,
  tabAte,
} from "./apoio";
import { EQUIPE, SENHA_EQUIPE } from "./equipe";

const paciente = `Paciente RF56 ${randomUUID()}`;
const clinico = "CONTEUDO_CLINICO_RESTRITO_RF56";
test.afterEach(fecharContextos);

test.beforeAll(async ({ playwright }) => {
  const url = new URL(process.env.DATABASE_URL!);
  if (
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    (!url.pathname.startsWith("/clinica_rf1_test_") && !process.env.CI)
  )
    throw new Error("RF56 exige banco local descartável de testes.");
  const db = createDb(url.href);
  let prontuarioId: string;
  try {
    const usuario = async (perfil: keyof typeof EQUIPE) =>
      (
        await db.$client.query<{ id: string }>(
          "select id from usuarios where email = $1",
          [EQUIPE[perfil].email],
        )
      ).rows[0];
    const coordenacao = await usuario("coordenacao"),
      supervisor = await usuario("supervisor"),
      estagiario = await usuario("estagiario");
    const [i] = await db
      .insert(inscricoes)
      .values({
        numero: `2026-${Date.now()}`,
        nomeCompleto: paciente,
        dataNascimento: "1990-01-01",
        cpf: "52998224725",
        rg: "123",
        endereco: "Rua Fictícia",
        estadoCivil: "Solteiro(a)",
        email: `${randomUUID()}@example.com`,
        canalPreferencial: "email",
      })
      .returning();
    const [c] = await db
      .insert(casos)
      .values({
        inscricaoId: i.id,
        entradaNaFilaEm: i.criadaEm,
        situacao: "em_atendimento",
      })
      .returning();
    await db.insert(atribuicoesSupervisor).values({
      casoId: c.id,
      supervisorId: supervisor.id,
      atribuidoPor: coordenacao.id,
    });
    const [v] = await db
      .insert(vinculosEstagiario)
      .values({
        casoId: c.id,
        estagiarioId: estagiario.id,
        vinculadoPor: supervisor.id,
      })
      .returning();
    const [p] = await db
      .insert(prontuarios)
      .values({ casoId: c.id, cicloAtendimento: 1, vinculoOrigemId: v.id })
      .returning();
    prontuarioId = p.id;
  } finally {
    await db.$client.end();
  }
  // Os registros consultados vêm da política e das rotas reais, não de mocks.
  for (const perfil of ["coordenacao", "estagiario", "secretaria"] as const) {
    const api = await playwright.request.newContext({ baseURL: API });
    try {
      expect(
        (
          await api.post("/auth/login", {
            data: { email: EQUIPE[perfil].email, senha: SENHA_EQUIPE },
          })
        ).ok(),
      ).toBe(true);
      expect((await api.get(`/prontuarios/${prontuarioId}`)).status()).toBe(
        perfil === "secretaria" ? 403 : 200,
      );
      if (perfil === "estagiario") {
        expect(
          (
            await api.post(`/prontuarios/${prontuarioId}/anamnese`, {
              data: { queixaPrincipal: clinico },
            })
          ).status(),
        ).toBe(201);
        // A tentativa autorizada que falha depois também permanece no registro.
        expect(
          (
            await api.post(
              `/prontuarios/${prontuarioId}/sessoes/${randomUUID()}/realizada`,
            )
          ).status(),
        ).toBe(404);
      }
      if (perfil === "secretaria")
        expect((await api.get(`/prontuarios/${randomUUID()}`)).status()).toBe(
          403,
        );
    } finally {
      await api.dispose();
    }
  }
});

for (const largura of [320, 360, 768, 1024, 1366, 1920]) {
  test(`consulta real, filtros, teclado e sigilo em ${largura}px (RF56, RNF17, RNF52, RNF56, RNF57, RNF58)`, async ({
    browser,
  }, info) => {
    const page = await entrar(browser, "coordenacao");
    await page.setViewportSize({ width: largura, height: 900 });
    if (largura < 768)
      await page
        .getByRole("button", { name: "Abrir menu", exact: true })
        .click();
    await page
      .getByRole("link", { name: "Registro de acessos", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Registro de acessos ao prontuário" }),
    ).toBeVisible();
    const filtrar = page.getByRole("button", { name: "Filtrar", exact: true });
    await expect(filtrar).toBeEnabled();
    await page.getByLabel("Paciente", { exact: true }).fill(paciente);
    await filtrar.click();
    await expect(
      page.getByRole("status").filter({ hasText: "5 acessos encontrados" }),
    ).toBeVisible();
    const lista =
      largura < 1024
        ? page.getByRole("list", { name: "Acessos ao prontuário" })
        : page.getByRole("table", {
            name: "Registro de acessos ao prontuário",
          });
    for (const operacao of [
      "Visualização",
      "Criação",
      "Alteração",
      "Acesso negado",
    ])
      await expect(
        lista.getByText(operacao, { exact: true }).first(),
      ).toBeVisible();
    await expect(page.getByRole("main")).not.toContainText(clinico);
    // O indicador de teclado permanece visível nos quatro filtros e no botão.
    for (const rotulo of [
      "Paciente",
      "Usuário",
      "Data inicial",
      "Data final",
    ]) {
      const campo = page.getByLabel(rotulo, { exact: true });
      await tabAte(page, campo);
      await focoVisivel(campo);
      expect(
        await campo.evaluate((el) =>
          parseFloat(getComputedStyle(el).outlineWidth),
        ),
      ).toBeGreaterThanOrEqual(2);
    }
    await tabAte(page, filtrar);
    await focoVisivel(filtrar);
    expect(
      await filtrar.evaluate((el) =>
        parseFloat(getComputedStyle(el).outlineWidth),
      ),
    ).toBeGreaterThanOrEqual(2);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await semViolacoes(page);
    await page.screenshot({
      path: info.outputPath(`acessos-${largura}.png`),
      fullPage: true,
    });
    await page
      .getByLabel("Usuário", { exact: true })
      .fill(EQUIPE.secretaria.nome);
    await filtrar.click();
    await expect(
      page.getByRole("status").filter({ hasText: "1 acesso encontrado" }),
    ).toBeVisible();
    await expect(
      lista.getByText("Acesso negado", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(/Tentativas sem paciente identificado aparecem somente/),
    ).toBeVisible();
    const semPaciente = lista.getByText(largura < 1024 ? "Paciente: —" : "—", {
      exact: true,
    });
    await expect(semPaciente).toHaveCount(0);
    await page.getByLabel("Paciente", { exact: true }).fill("");
    const consultaSemPaciente = page.waitForResponse((resposta) => {
      const url = new URL(resposta.url());
      return (
        url.pathname === "/acessos-prontuario" &&
        !url.searchParams.has("paciente")
      );
    });
    await filtrar.click();
    const dados = await (await consultaSemPaciente).json();
    // Outros testes/execuções podem ter registrado acessos do mesmo usuário.
    expect(dados.total).toBeGreaterThanOrEqual(2);
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: `${dados.total} acessos encontrados` }),
    ).toBeVisible();
    await expect(semPaciente.first()).toBeVisible();
    await page.getByLabel("Data inicial").fill("2000-01-01");
    await page.getByLabel("Data final").fill("2000-01-02");
    await filtrar.click();
    await expect(
      page.getByRole("heading", { name: "Nenhum acesso encontrado" }),
    ).toBeVisible();
    await semViolacoes(page);
  });
}

for (const perfil of ["secretaria", "supervisor", "estagiario"] as const) {
  test(`recusa o registro para ${perfil} na tela e API (RF56, RNF17)`, async ({
    browser,
  }) => {
    const page = await entrar(browser, perfil);
    await expect(
      page.getByRole("link", { name: "Registro de acessos" }),
    ).toHaveCount(0);
    const resposta = await page.request.get(`${API}/acessos-prontuario`);
    expect(resposta.status()).toBe(403);
    expect(await resposta.text()).not.toContain(paciente);
    await page.goto("/acessos-prontuario");
    await expect(
      page.getByRole("heading", {
        name: "Você não tem acesso ao registro de acessos",
      }),
    ).toBeVisible();
    await expect(page.getByRole("main")).not.toContainText(paciente);
    await semViolacoes(page);
  });
}
