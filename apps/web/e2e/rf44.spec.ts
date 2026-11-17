import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { createDb, sessoesAtendimento, usuarios } from "@clinica/database";
import type { StatusSessao } from "@clinica/shared";
import {
  API,
  criarCasoTriado,
  entrar,
  fecharContextos,
  focoVisivel,
  semViolacoes,
  tabAte,
} from "./apoio";
import { EQUIPE, SENHA_EQUIPE } from "./equipe";

// Sessões com presença registrada (RF44), de ponta a ponta, com a API, o banco e
// a verificação de identidade reais (RF52). Dados de teste do projeto: uma
// inscrição com três sessões realizadas (uma no ciclo anterior), uma cancelada,
// uma com falta e uma agendada, das quais só as três aparecem; e uma inscrição
// sem sessão realizada (estado vazio). A página pública passa pelo axe, sem
// rolagem lateral, em 320, 360, 768, 1024, 1366 e 1920 px (RNF56 a RNF58).

const DIA = 24 * 60 * 60 * 1000;

const url = () =>
  process.env.DATABASE_URL ??
  "postgresql://clinica:clinica@localhost:5432/clinica";

const semRolagemLateral = (page: Page) =>
  page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );

const dataBr = (d: Date) =>
  d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

// Caso em atendimento no ciclo 2, com um estagiário só dele, para as sessões não
// colidirem na agenda com as de outras execuções no mesmo banco (RNF9).
async function criarCaso(
  playwright: Parameters<typeof criarCasoTriado>[0],
  nome: string,
  email: string,
  sessoes: { dias: number; status: StatusSessao; ciclo?: number }[],
) {
  await criarCasoTriado(playwright, nome, email);
  const db = createDb(url());
  try {
    const inscricao = await db.query.inscricoes.findFirst({
      columns: { id: true, numero: true },
      where: (i, { eq }) => eq(i.nomeCompleto, nome),
    });
    const caso = await db.query.casos.findFirst({
      columns: { id: true },
      where: (c, { eq }) => eq(c.inscricaoId, inscricao!.id),
    });
    await db.$client.query(
      "update casos set situacao = 'em_atendimento', ciclo_atendimento = 2 where id = $1",
      [caso!.id],
    );
    const secretaria = await db.query.usuarios.findFirst({
      columns: { id: true },
      where: (u, { eq }) => eq(u.email, EQUIPE.secretaria.email),
    });
    const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const [estagiario] = await db
      .insert(usuarios)
      .values({
        nome: `Estagiária RF44 ${marca}`,
        email: `estagiario.rf44.${marca}@fbr.edu.br`,
        perfil: "estagiario",
        situacao: "ativo",
      })
      .returning();
    const inicios: Record<string, Date[]> = {};
    for (const { dias, status, ciclo = 2 } of sessoes) {
      const inicio = new Date(Date.now() + dias * DIA);
      const termino = new Date(inicio.getTime() + 50 * 60_000);
      await db.insert(sessoesAtendimento).values({
        casoId: caso!.id,
        cicloAtendimento: ciclo,
        estagiarioId: estagiario.id,
        inicio,
        termino,
        fimIntervaloAnotacoes: new Date(termino.getTime() + 10 * 60_000),
        status,
        agendadaPor: secretaria!.id,
      });
      (inicios[status] ??= []).push(inicio);
    }
    return {
      numero: inscricao!.numero,
      casoId: caso!.id,
      estagiario: estagiario.nome,
      inicios,
    };
  } finally {
    await db.$client.end();
  }
}

// Pede o código pela tela e o lê na caixa do SMTP local dos testes.
async function verificar(
  page: Page,
  request: APIRequestContext,
  numero: string,
  email: string,
) {
  const caixa = `http://127.0.0.1:8026/mensagens?para=${encodeURIComponent(email)}`;
  const antes = (await (await request.get(caixa)).json()).length;
  await page.getByLabel("CPF ou número da inscrição").fill(numero);
  await page.getByRole("button", { name: "Enviar código" }).click();
  let codigo = "";
  await expect
    .poll(async () => {
      const mensagens = await (await request.get(caixa)).json();
      if (mensagens.length <= antes) return 0;
      codigo =
        /(\d{6})<\/p>/.exec(
          (mensagens.at(-1)?.corpo || "").replace(/=\r\n/g, ""),
        )?.[1] || "";
      return codigo.length;
    })
    .toBe(6);
  await page.getByLabel("Código de 6 dígitos").fill(codigo);
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
}

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
    await expect(
      page.getByText(
        "A emissão da declaração pelo sistema ainda não está disponível.",
        { exact: false },
      ),
    ).toBeVisible();
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
