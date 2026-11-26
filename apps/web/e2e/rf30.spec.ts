import { randomUUID } from "node:crypto";
import {
  atribuicoesSupervisor,
  casos,
  createDb,
  inscricoes,
  prontuarios,
  sessoesAtendimento,
  vinculosEstagiario,
} from "@clinica/database";
import { expect, test, type Page } from "@playwright/test";
import {
  API,
  entrar,
  fecharContextos,
  focoVisivel,
  semViolacoes,
} from "./apoio";
import { EQUIPE, SENHA_EQUIPE } from "./equipe";

// RF30: o estagiário responsável e o supervisor do caso (DF68) somam um
// complemento à evolução, sem mudar o que foi registrado. O caso, a sessão
// realizada e a evolução vêm do banco e das rotas reais, não de mocks.

const paciente = `Paciente RF30 ${randomUUID()}`;
const ORIGINAL = "Conteudo original da evolucao RF30";
let prontuarioId: string;
test.afterEach(fecharContextos);

test.beforeAll(async ({ playwright }) => {
  const url = new URL(process.env.DATABASE_URL!);
  if (!["localhost", "127.0.0.1"].includes(url.hostname))
    throw new Error("O RF30 exige banco local descartável de testes.");
  const db = createDb(url.href);
  let sessaoId: string;
  try {
    const usuario = async (perfil: keyof typeof EQUIPE) =>
      (
        await db.$client.query<{ id: string }>(
          "select id from usuarios where email = $1",
          [EQUIPE[perfil].email],
        )
      ).rows[0];
    const [coordenacao, supervisor, estagiario, secretaria] = await Promise.all(
      (["coordenacao", "supervisor", "estagiario", "secretaria"] as const).map(
        usuario,
      ),
    );
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
    // Num horário passado sorteado, para não colidir na agenda do mesmo
    // estagiário com as sessões de outras execuções (RNF9).
    const inicio = new Date(
      Date.now() - (2 + Math.floor(Math.random() * 2000)) * 70 * 60_000,
    );
    const termino = new Date(inicio.getTime() + 50 * 60_000);
    const [s] = await db
      .insert(sessoesAtendimento)
      .values({
        casoId: c.id,
        cicloAtendimento: 1,
        estagiarioId: estagiario.id,
        inicio,
        termino,
        fimIntervaloAnotacoes: new Date(termino.getTime() + 10 * 60_000),
        status: "realizada",
        agendadaPor: secretaria.id,
      })
      .returning();
    sessaoId = s.id;
  } finally {
    await db.$client.end();
  }
  // A evolução original entra pela rota do RF28, com o texto cifrado pela API.
  const api = await playwright.request.newContext({ baseURL: API });
  try {
    expect(
      (
        await api.post("/auth/login", {
          data: { email: EQUIPE.estagiario.email, senha: SENHA_EQUIPE },
        })
      ).ok(),
    ).toBe(true);
    expect(
      (
        await api.post(
          `/prontuarios/${prontuarioId}/sessoes/${sessaoId}/evolucoes`,
          {
            data: {
              humorAparencia: "Tranquila.",
              conteudoTrabalhado: ORIGINAL,
              tecnicasUtilizadas: "Escuta.",
              intervencoesEncaminhamentos: "",
              planoProximaSessao: "Seguir.",
            },
          },
        )
      ).status(),
    ).toBe(201);
  } finally {
    await api.dispose();
  }
});

// Abre o prontuário com a evolução da sessão 1 aberta.
async function abrirEvolucao(page: Page) {
  await page.goto(`/prontuarios/${prontuarioId}`);
  await page.getByText("Ver evolução", { exact: true }).first().click();
}

async function complementar(page: Page, texto: string) {
  await abrirEvolucao(page);
  const adicionar = page.getByRole("button", {
    name: /Adicionar complemento à evolução da sessão/,
  });
  await adicionar.first().click();
  const campo = page.getByLabel("Novo complemento", { exact: true });
  // O foco vai para o campo que abriu (RNF57).
  await expect(campo).toBeFocused();
  await focoVisivel(campo);
  // Em branco, o complemento é recusado na tela, com o aviso em foco.
  await page.getByRole("button", { name: "Salvar complemento" }).click();
  await expect(page.getByText("O complemento não foi salvo.")).toBeVisible();
  await campo.fill(texto);
  await page.getByRole("button", { name: "Salvar complemento" }).click();
  await expect(page.getByText("Complemento salvo.")).toBeVisible();
}

test.describe.configure({ mode: "serial" });

for (const [perfil, largura] of [
  ["estagiario", 360],
  ["supervisor", 1366],
] as const) {
  test(`complemento pelo ${perfil} em ${largura}px, sem mudar o original (RF30, DF68, RNF27, RNF56, RNF57)`, async ({
    browser,
  }, info) => {
    const page = await entrar(browser, perfil);
    await page.setViewportSize({ width: largura, height: 900 });
    const texto = `Complemento do ${perfil} ${randomUUID()}`;
    await complementar(page, texto);

    const historico = page.getByRole("list", {
      name: "Histórico desta evolução",
    });
    const item = historico.getByRole("listitem").filter({ hasText: texto });
    await expect(item).toContainText("Complemento · informação adicional");
    await expect(item).toContainText(`Registrado por ${EQUIPE[perfil].nome}`);
    // O registro original continua o mesmo, antes do complemento.
    await expect(historico.getByRole("listitem").first()).toContainText(
      "Registro original",
    );
    await expect(page.getByRole("main")).toContainText(ORIGINAL);

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await semViolacoes(page);
    await page.screenshot({
      path: info.outputPath(`complemento-${perfil}-${largura}.png`),
      fullPage: true,
    });
  });
}

test("a coordenação lê os complementos, mas não complementa (RF30, RF27)", async ({
  browser,
}) => {
  const page = await entrar(browser, "coordenacao");
  await abrirEvolucao(page);
  const historico = page.getByRole("list", {
    name: "Histórico desta evolução",
  });
  await expect(
    historico.getByText("Complemento · informação adicional"),
  ).toHaveCount(2);
  await expect(
    page.getByRole("button", { name: /Adicionar complemento/ }),
  ).toHaveCount(0);
});
