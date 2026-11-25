import { randomUUID } from "node:crypto";
import { createDb, inscricoes, casos } from "@clinica/database";
import { expect, test } from "@playwright/test";
import { entrar, fecharContextos, semViolacoes } from "./apoio";

test.afterEach(fecharContextos);
async function paciente(menor = false) {
  const url = new URL(process.env.DATABASE_URL!);
  if (
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    // No CI, o banco do job é descartável; localmente, só o banco de testes.
    (!url.pathname.startsWith("/clinica_rf1_test_") && !process.env.CI)
  )
    throw new Error("RF65 exige banco local descartável.");
  const db = createDb(url.href);
  try {
    const [i] = await db
      .insert(inscricoes)
      .values({
        numero: `rf65-${randomUUID()}`,
        nomeCompleto: "Paciente fictício RF65",
        cpf: "52998224725",
        dataNascimento: menor ? "2020-01-01" : "1990-01-01",
        responsavelLegal: menor ? "Responsável fictício" : null,
        endereco: "Rua fictícia",
        estadoCivil: "solteiro",
        canalPreferencial: "email",
        email: "rf65@example.test",
        versaoTermoAceita: "0.1",
        termoAceitoEm: new Date(),
        aceitePeloResponsavel: menor,
      })
      .returning();
    const [c] = await db
      .insert(casos)
      .values({ inscricaoId: i.id, entradaNaFilaEm: i.criadaEm })
      .returning();
    return c.id;
  } finally {
    await db.$client.end();
  }
}
for (const largura of [1280, 390]) {
  test(`RF65: secretaria registra e mantém histórico, ${largura}px`, async ({
    browser,
  }) => {
    const caso = await paciente(largura === 390);
    const page = await entrar(browser, "secretaria");
    await page.setViewportSize({ width: largura, height: 900 });
    await page.goto(`/pacientes/${caso}/revogacao`);
    await expect(
      page.getByRole("heading", { name: "Revogação do consentimento" }),
    ).toBeVisible();
    if (largura === 390)
      await expect(
        page.getByLabel("O responsável legal", { exact: true }),
      ).toBeChecked();
    await page.getByRole("button", { name: "Registrar revogação" }).click();
    await expect(
      page.getByLabel("Documento com foto, apresentado na clínica"),
    ).toBeFocused();
    await page.getByLabel("Documento com foto, apresentado na clínica").check();
    await page
      .getByLabel("Documento apresentado")
      .fill("Carteira de identidade");
    await semViolacoes(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Registrar revogação" }).click();
    await expect(
      page.getByText("Revogação registrada.", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Aceite", { exact: true })).toBeVisible();
    await expect(page.getByText("Revogação", { exact: true })).toBeVisible();
    await semViolacoes(page);
    await page.reload();
    await expect(
      page.getByText("Este consentimento já foi revogado."),
    ).toBeVisible();
  });
}
test("RF65: coordenação não pode registrar", async ({ browser }) => {
  const page = await entrar(browser, "coordenacao");
  await page.goto(`/pacientes/${await paciente()}/revogacao`);
  await expect(
    page.getByText("Você não pode registrar a revogação", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Registrar revogação" }),
  ).toHaveCount(0);
});
