import { randomUUID } from "node:crypto";
import { createDb } from "@clinica/database";
import { expect, test, type Page } from "@playwright/test";
import {
  entrar,
  fecharContextos,
  focoVisivel,
  semViolacoes,
  tabAte,
} from "./apoio";
import { criarProntuarioComEvolucao } from "./apoio-prontuario";
import { EQUIPE } from "./equipe";

// RF33: o estagiário responsável escreve o relatório final em seções e o envia;
// o supervisor do caso devolve com observações ou aprova. O caso, a sessão e a
// evolução vêm do banco e das rotas reais, não de mocks.

const paciente = `Paciente RF33 ${randomUUID()}`;
const OBSERVACAO = "Detalhar a análise com as sessões do ciclo.";
let casoId: string;
test.afterEach(fecharContextos);
test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ playwright }) => {
  const prontuarioId = await criarProntuarioComEvolucao(
    playwright,
    paciente,
    "Conteudo original da evolucao RF33",
  );
  const db = createDb(process.env.DATABASE_URL!);
  try {
    casoId = (
      await db.$client.query<{ caso_id: string }>(
        "select caso_id from prontuarios where id = $1",
        [prontuarioId],
      )
    ).rows[0].caso_id;
  } finally {
    await db.$client.end();
  }
});

const abrir = (page: Page) => page.goto(`/relatorio-final/${casoId}?ciclo=1`);

const semRolagemLateral = async (page: Page) =>
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);

test("o estagiário escreve e envia o relatório em 360px (RF33, RNF56)", async ({
  browser,
}, info) => {
  const page = await entrar(browser, "estagiario");
  await page.setViewportSize({ width: 360, height: 900 });
  await abrir(page);
  await expect(
    page.getByRole("heading", { name: "Relatório final · ciclo 1" }),
  ).toBeVisible();
  // Uma sessão só: fora de 8 a 10, a justificativa é exigida no envio.
  await page.getByRole("button", { name: "Enviar para revisão" }).click();
  await expect(page.getByText("O relatório não foi enviado.")).toBeVisible();

  for (const [rotulo, texto] of [
    ["Finalidade do relatório", "Devolutiva do acompanhamento."],
    ["2. Descrição da demanda", "Dificuldade na rotina de estudos."],
    ["3. Procedimentos", "Uma sessão semanal."],
    ["4. Análise", "Primeira redação da análise."],
    ["5. Conclusão", "Orientações de continuidade."],
    [
      "Justificativa do encerramento fora de 8 a 10 sessões",
      "Paciente mudou de cidade.",
    ],
  ] as const)
    await page.getByLabel(rotulo, { exact: true }).fill(texto);
  await page.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(page.getByText("Rascunho salvo.")).toBeVisible();
  await page.getByRole("button", { name: "Enviar para revisão" }).click();
  await expect(
    page.getByText(`A versão 1 está em revisão por ${EQUIPE.supervisor.nome}.`),
  ).toBeVisible();
  await semRolagemLateral(page);
  await semViolacoes(page);
  await page.screenshot({
    path: info.outputPath("relatorio-envio-360.png"),
    fullPage: true,
  });
});

test("o supervisor devolve com observações (RF33)", async ({ browser }) => {
  const page = await entrar(browser, "supervisor");
  await abrir(page);
  await expect(
    page.getByRole("heading", { name: "Revisão da versão 1" }),
  ).toBeVisible();
  await expect(page.getByRole("main")).toContainText(
    "Primeira redação da análise.",
  );
  // Sem observações, a devolução é recusada na tela.
  await page.getByRole("button", { name: "Devolver para ajustes" }).click();
  await expect(page.getByText("Obrigatórias para devolver.")).toBeVisible();
  await page
    .getByLabel("Observações para o estagiário", { exact: true })
    .fill(OBSERVACAO);
  await page.getByRole("button", { name: "Devolver para ajustes" }).click();
  await expect(
    page.getByText("Versão 1 devolvida para ajustes."),
  ).toBeVisible();
});

test("o estagiário ajusta e envia a versão 2 (RF33)", async ({ browser }) => {
  const page = await entrar(browser, "estagiario");
  await abrir(page);
  await expect(
    page.getByText("A versão 1 foi devolvida para ajustes."),
  ).toBeVisible();
  await expect(
    page.getByText(`Observações: ${OBSERVACAO}`).first(),
  ).toBeVisible();
  // O rascunho novo começa com o texto devolvido.
  const analise = page.getByLabel("4. Análise", { exact: true });
  await expect(analise).toHaveValue("Primeira redação da análise.");
  await analise.fill("Análise com as sessões do ciclo.");
  await page.getByRole("button", { name: "Enviar para revisão" }).click();
  await expect(
    page.getByText(`A versão 2 está em revisão por ${EQUIPE.supervisor.nome}.`),
  ).toBeVisible();
});

test("o supervisor aprova a versão 2 em 1366px, pelo teclado (RF33, RNF56, RNF57)", async ({
  browser,
}, info) => {
  const page = await entrar(browser, "supervisor");
  await page.setViewportSize({ width: 1366, height: 900 });
  await abrir(page);
  await expect(
    page.getByRole("heading", { name: "Revisão da versão 2" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Aprovar relatório" }).click();
  const dialogo = page.getByRole("dialog", {
    name: "Aprovar a versão 2 do relatório?",
  });
  await expect(dialogo).toBeVisible();
  const aprovar = dialogo.getByRole("button", { name: "Aprovar", exact: true });
  await tabAte(page, aprovar, 10);
  await focoVisivel(aprovar);
  await page.keyboard.press("Enter");
  await expect(page.getByText("Versão 2 aprovada.")).toBeVisible();
  // Depois da aprovação, não há mais o que decidir nem o aviso de lacunas.
  await expect(
    page.getByRole("button", { name: "Aprovar relatório" }),
  ).toHaveCount(0);
  await expect(page.getByText(/não tem evolução registrada/)).toHaveCount(0);
  await semRolagemLateral(page);
  await semViolacoes(page);
  await page.screenshot({
    path: info.outputPath("relatorio-aprovado-1366.png"),
    fullPage: true,
  });
});
