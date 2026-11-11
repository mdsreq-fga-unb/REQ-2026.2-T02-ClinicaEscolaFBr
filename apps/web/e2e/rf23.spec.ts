import { expect, test, type Page } from "@playwright/test";
import {
  atribuicoesSupervisor,
  createDb,
  prontuarios,
} from "@clinica/database";
import {
  criarCasoTriado,
  entrar,
  fecharContextos,
  semViolacoes,
} from "./apoio";
import { criarPacienteComSessoes } from "./apoio-confirmacao";
import { EQUIPE } from "./equipe";

// Casos sob a responsabilidade do estagiário ou do supervisor (RF23), de ponta a
// ponta, com a API e o banco reais: "Meus pacientes" do estagiário, que é a página
// inicial dele (#160), e "Meus casos" do supervisor, com o filtro por estagiário.
// As telas passam pelo axe (RNF24, RNF56) e cabem de 320 a 1920 px (RNF58).

let doEstagiario = "";
let deOutro = "";
let prontuarioDeOutro = "";
const semEstagiario = `RF23 sem estagiário ${Date.now()}`;

const url = () =>
  process.env.DATABASE_URL ??
  "postgresql://clinica:clinica@localhost:5432/clinica";

test.beforeAll(async ({ playwright }) => {
  // Caso do estagiário e do supervisor da semente.
  doEstagiario = (
    await criarPacienteComSessoes(playwright, [], { daEquipe: true })
  ).paciente;
  // Caso de outro estagiário, com prontuário, que o da semente não pode abrir.
  const outro = await criarPacienteComSessoes(playwright, []);
  deOutro = outro.paciente;
  // Caso do supervisor da semente que ainda aguarda o vínculo (RF21).
  await criarCasoTriado(playwright, semEstagiario);
  const db = createDb(url());
  try {
    const pessoa = async (email: string) =>
      (await db.query.usuarios.findFirst({
        columns: { id: true },
        where: (u, { eq }) => eq(u.email, email),
      }))!.id;
    const inscricao = await db.query.inscricoes.findFirst({
      columns: { id: true },
      where: (i, { eq }) => eq(i.nomeCompleto, semEstagiario),
    });
    const caso = await db.query.casos.findFirst({
      columns: { id: true },
      where: (c, { eq }) => eq(c.inscricaoId, inscricao!.id),
    });
    await db.insert(atribuicoesSupervisor).values({
      casoId: caso!.id,
      supervisorId: await pessoa(EQUIPE.supervisor.email),
      atribuidoPor: await pessoa(EQUIPE.coordenacao.email),
    });
    await db.$client.query(
      "update casos set situacao = 'aguardando_vinculo' where id = $1",
      [caso!.id],
    );
    const vinculo = await db.query.vinculosEstagiario.findFirst({
      where: (v, { eq }) => eq(v.casoId, outro.casoId),
    });
    [{ id: prontuarioDeOutro }] = await db
      .insert(prontuarios)
      .values({
        casoId: outro.casoId,
        cicloAtendimento: 1,
        vinculoOrigemId: vinculo!.id,
      })
      .returning();
  } finally {
    await db.$client.end();
  }
});

test.afterEach(fecharContextos);

const semRolagemLateral = (page: Page) =>
  page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );

test("o estagiário entra direto em 'Meus pacientes' e vê só os casos vinculados a ele, sem violações WCAG (RF23, RNF17, RNF24, RNF56)", async ({
  browser,
}) => {
  const page = await entrar(browser, "estagiario");
  await expect(page).toHaveURL(/\/meus-pacientes$/);
  await expect(
    page.getByRole("heading", { name: "Meus pacientes", level: 1 }),
  ).toBeVisible();
  const tabela = page.getByRole("table", {
    name: "Pacientes vinculados a você",
  });
  const linha = tabela.getByRole("row").filter({ hasText: doEstagiario });
  await expect(linha).toContainText("Amarela");
  await expect(linha).toContainText("Em atendimento");
  await expect(linha).toContainText(EQUIPE.supervisor.nome);
  await expect(tabela).not.toContainText(deOutro);
  await expect(tabela).not.toContainText(/queixa/i);
  await semViolacoes(page);
});

test("o estagiário tem o acesso direto negado ao prontuário de um caso de outro, sem o nome do paciente (RF23, RNF16, RNF56)", async ({
  browser,
}) => {
  const page = await entrar(browser, "estagiario");
  await page.goto(`/prontuarios/${prontuarioDeOutro}`);
  await expect(
    page.getByRole("heading", { name: /Você não tem acesso/ }),
  ).toBeVisible();
  await expect(page.getByText(deOutro)).toHaveCount(0);
  await page.getByRole("link", { name: "Voltar para meus pacientes" }).click();
  await expect(page).toHaveURL(/\/meus-pacientes$/);
  await semViolacoes(page);
});

test("o supervisor filtra 'Meus casos' pelo estagiário, sem violações WCAG (RF23, RNF16, RNF24, RNF56)", async ({
  browser,
}) => {
  const page = await entrar(browser, "supervisor");
  await page.goto("/meus-casos");
  const tabela = page.getByRole("table", {
    name: "Casos sob a sua responsabilidade e os dos seus estagiários",
  });
  await expect(
    tabela.getByRole("row").filter({ hasText: doEstagiario }),
  ).toBeVisible();
  await expect(tabela).not.toContainText(deOutro);
  const linhaDo = (nome: string) =>
    tabela.getByRole("row").filter({ hasText: nome });
  const filtro = page.getByRole("group", { name: "Estagiário" });
  await filtro.getByRole("radio", { name: "Sem estagiário" }).check();
  await expect(linhaDo(semEstagiario)).toBeVisible();
  await expect(linhaDo(doEstagiario)).toHaveCount(0);
  await filtro.getByRole("radio", { name: EQUIPE.estagiario.nome }).check();
  await expect(linhaDo(doEstagiario)).toBeVisible();
  await expect(linhaDo(semEstagiario)).toHaveCount(0);
  await semViolacoes(page);
});

test("'Meus pacientes' e 'Meus casos' cabem de 320 a 1920 px, sem rolagem lateral (RF23, RNF58)", async ({
  browser,
}) => {
  const estagiario = await entrar(browser, "estagiario");
  const supervisor = await entrar(browser, "supervisor");
  for (const largura of [320, 375, 768, 1024, 1366, 1920]) {
    for (const [page, caminho] of [
      [estagiario, "/meus-pacientes"],
      [supervisor, "/meus-casos"],
    ] as const) {
      await page.setViewportSize({ width: largura, height: 900 });
      await page.goto(caminho);
      await expect(
        page.getByText(doEstagiario).filter({ visible: true }).first(),
      ).toBeVisible();
      expect(await semRolagemLateral(page), `${caminho} em ${largura}px`).toBe(
        true,
      );
    }
  }
  // No celular, as listas viram cartões, que também passam pelo axe.
  await estagiario.setViewportSize({ width: 375, height: 800 });
  await estagiario.goto("/meus-pacientes");
  await expect(
    estagiario.getByText(doEstagiario).filter({ visible: true }).first(),
  ).toBeVisible();
  await semViolacoes(estagiario);
});
