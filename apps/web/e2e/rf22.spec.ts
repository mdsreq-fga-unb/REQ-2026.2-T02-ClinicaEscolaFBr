import { expect, test, type Page } from "@playwright/test";
import { atribuicoesSupervisor, createDb } from "@clinica/database";
import {
  criarCasoTriado,
  entrar,
  fecharContextos,
  semViolacoes,
} from "./apoio";
import { criarPacienteComSessoes } from "./apoio-confirmacao";
import { EQUIPE } from "./equipe";

// Consulta de responsáveis pelo caso (RF22), de ponta a ponta, com a API e o banco
// reais. Três casos, como nos dados de teste do projeto: um com os dois
// responsáveis da semente, um só com o supervisor e um sem os dois. A lista e a
// ficha passam pelo axe (RNF24, RNF56) e cabem de 320 a 1920 px (RNF58).

const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const nomes = {
  completo: `RF22 ${marca} Mariana`,
  semEstagiario: `RF22 ${marca} Roberto`,
  pendente: `RF22 ${marca} Luana`,
};
const casos = { completo: "", semEstagiario: "", pendente: "" };

const url = () =>
  process.env.DATABASE_URL ??
  "postgresql://clinica:clinica@localhost:5432/clinica";

test.beforeAll(async ({ playwright }) => {
  // Com o estagiário e o supervisor da semente.
  const completo = await criarPacienteComSessoes(playwright, [], {
    daEquipe: true,
  });
  casos.completo = completo.casoId;
  // Só triados: aguardam distribuição.
  await criarCasoTriado(playwright, nomes.semEstagiario);
  await criarCasoTriado(playwright, nomes.pendente);

  const db = createDb(url());
  try {
    const caso = async (nome: string) => {
      const inscricao = await db.query.inscricoes.findFirst({
        columns: { id: true },
        where: (i, { eq }) => eq(i.nomeCompleto, nome),
      });
      const linha = await db.query.casos.findFirst({
        columns: { id: true },
        where: (c, { eq }) => eq(c.inscricaoId, inscricao!.id),
      });
      return linha!.id;
    };
    const pessoa = async (email: string) =>
      (await db.query.usuarios.findFirst({
        columns: { id: true },
        where: (u, { eq }) => eq(u.email, email),
      }))!.id;
    // O nome do caso completo segue o dos outros, para a busca achar os três.
    await db.$client.query(
      "update inscricoes set nome_completo = $1 where nome_completo = $2",
      [nomes.completo, completo.paciente],
    );
    casos.semEstagiario = await caso(nomes.semEstagiario);
    casos.pendente = await caso(nomes.pendente);
    // Distribuído ao supervisor da semente, ainda sem estagiário (RF20).
    await db.insert(atribuicoesSupervisor).values({
      casoId: casos.semEstagiario,
      supervisorId: await pessoa(EQUIPE.supervisor.email),
      atribuidoPor: await pessoa(EQUIPE.coordenacao.email),
    });
    await db.$client.query(
      "update casos set situacao = 'aguardando_vinculo' where id = $1",
      [casos.semEstagiario],
    );
  } finally {
    await db.$client.end();
  }
});

test.afterEach(fecharContextos);

const semRolagemLateral = (page: Page) =>
  page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );

async function buscar(page: Page) {
  await page.goto("/pacientes");
  await page.getByLabel("Buscar paciente").fill(`RF22 ${marca}`);
  await expect(page.getByText("Mostrando 3 pacientes.")).toBeVisible();
}

test("a secretaria vê os responsáveis e a situação de distribuição de cada caso, sem dado clínico, sem violações WCAG (RF22, RNF17, RNF24, RNF56)", async ({
  browser,
}) => {
  const page = await entrar(browser, "secretaria");
  await buscar(page);
  const tabela = page.getByRole("table", { name: "Pacientes e responsáveis" });
  const linha = (nome: string) =>
    tabela.getByRole("row").filter({ hasText: nome });
  await expect(linha(nomes.completo)).toContainText(EQUIPE.estagiario.nome);
  await expect(linha(nomes.completo)).toContainText(EQUIPE.supervisor.nome);
  await expect(linha(nomes.completo)).toContainText("Distribuído");
  await expect(linha(nomes.semEstagiario)).toContainText(
    "Aguardando vínculo de estagiário",
  );
  await expect(linha(nomes.pendente)).toContainText("Pendente de distribuição");
  // Sem número da inscrição e sem dado clínico para a secretaria (RNF17).
  await expect(tabela).not.toContainText(/Nº da inscrição|Prioridade|queixa/i);
  await semViolacoes(page);

  await page
    .getByRole("link", { name: `Ver ficha de ${nomes.completo}` })
    .click();
  const quadro = page.getByRole("region", { name: "Responsáveis pelo caso" });
  await expect(quadro).toContainText(EQUIPE.estagiario.nome);
  await expect(quadro).toContainText(EQUIPE.supervisor.nome);
  await expect(
    page.getByRole("region", { name: "Dados cadastrais" }),
  ).toBeVisible();
  await semViolacoes(page);
});

test("a coordenação vê o número da inscrição e, no caso sem supervisor, vai à distribuição pela ficha, sem violações WCAG (RF22, RNF24, RNF56)", async ({
  browser,
}) => {
  const page = await entrar(browser, "coordenacao");
  await buscar(page);
  await expect(
    page.getByRole("columnheader", { name: "Nº da inscrição" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: `Ver ficha de ${nomes.pendente}` })
    .click();
  const quadro = page.getByRole("region", { name: "Responsáveis pelo caso" });
  await expect(quadro.getByText("Pendente de distribuição")).toHaveCount(2);
  await expect(
    quadro.getByRole("link", { name: "Ir para Distribuição de casos" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Identificação" }),
  ).toBeVisible();
  await semViolacoes(page);
});

test("o supervisor responsável abre a ficha pelo 'Meus casos' e vincula o estagiário pelo quadro, sem violações WCAG (RF22, RF21, RNF24, RNF56)", async ({
  browser,
}) => {
  const page = await entrar(browser, "supervisor");
  await page.goto("/meus-casos");
  await page.getByRole("link", { name: nomes.semEstagiario }).first().click();
  await expect(page).toHaveURL(
    new RegExp(`/pacientes/${casos.semEstagiario}$`),
  );
  await expect(
    page.getByRole("navigation", { name: "Você está em" }),
  ).toContainText("Meus casos");
  const quadro = page.getByRole("region", { name: "Responsáveis pelo caso" });
  await expect(quadro).toContainText("Aguardando vínculo de estagiário");
  await expect(quadro).toContainText(EQUIPE.supervisor.nome);
  await expect(
    quadro.getByText(
      "O caso fica aguardando o vínculo até você vincular um estagiário.",
    ),
  ).toBeVisible();
  await semViolacoes(page);
  await quadro.getByRole("button", { name: "Vincular estagiário" }).click();
  await expect(
    page.getByRole("dialog", { name: "Vincular estagiário" }),
  ).toBeVisible();
});

test("o estagiário responsável vê os responsáveis, e o de outro caso tem o acesso negado, sem violações WCAG (RF22, RNF16, RNF17, RNF56)", async ({
  browser,
}) => {
  const page = await entrar(browser, "estagiario");
  await page.goto(`/pacientes/${casos.completo}`);
  const quadro = page.getByRole("region", { name: "Responsáveis pelo caso" });
  await expect(quadro).toContainText(EQUIPE.estagiario.nome);
  await expect(quadro).toContainText(EQUIPE.supervisor.nome);
  await semViolacoes(page);

  await page.goto(`/pacientes/${casos.pendente}`);
  await expect(
    page.getByRole("heading", { name: "Você não tem acesso a este caso" }),
  ).toBeVisible();
  await expect(page.getByText(nomes.pendente)).toHaveCount(0);
  await semViolacoes(page);
});

test("a lista e a ficha cabem de 320 a 1920 px, sem rolagem lateral (RF22, RNF58)", async ({
  browser,
}) => {
  const page = await entrar(browser, "coordenacao");
  for (const largura of [320, 375, 768, 1024, 1366, 1920]) {
    await page.setViewportSize({ width: largura, height: 900 });
    await buscar(page);
    expect(await semRolagemLateral(page), `lista em ${largura}px`).toBe(true);
    await page.goto(`/pacientes/${casos.semEstagiario}`);
    await expect(
      page.getByRole("region", { name: "Responsáveis pelo caso" }),
    ).toBeVisible();
    expect(await semRolagemLateral(page), `ficha em ${largura}px`).toBe(true);
  }
  // No celular, a lista vira cartões, que também passam pelo axe.
  await page.setViewportSize({ width: 375, height: 800 });
  await buscar(page);
  await semViolacoes(page);
});
