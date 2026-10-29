import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { API, entrar, focoVisivel, semViolacoes, tabAte } from "./apoio";
import { EQUIPE, SENHA_EQUIPE } from "./equipe";

// Acessibilidade das telas de distribuição e vínculo (RNF24): a distribuição
// (RF18, RF20) e o vínculo do estagiário (RF21) feitos só pelo teclado, com foco
// visível, nomes e papéis expostos ao leitor de tela, resultado anunciado e WCAG
// 2.2 AA (axe) no computador e no celular. A consulta de responsáveis (RF22) entra
// aqui quando for construída. A escuta com um leitor de tela de verdade continua
// manual, registrada na issue com /rnf.

const paciente = `Paciente Teclado ${Date.now()}`;

// Caso com prioridade registrada e sem supervisor, criado pela API.
test.beforeAll(async ({ playwright }) => {
  const api = await playwright.request.newContext({ baseURL: API });
  const inscricao = await api.post("/inscricoes", {
    data: {
      nomeCompleto: paciente,
      dataNascimento: "1988-03-15",
      cpf: String(Date.now() + 7)
        .slice(-11)
        .padStart(11, "2"),
      rg: "7654321",
      endereco: "Rua Fictícia, 200, Gama",
      estadoCivil: "Solteiro(a)",
      responsavelLegal: "",
      celular: "",
      email: "paciente.teclado@example.com",
      canalPreferencial: "email",
      queixa: "Queixa fictícia de acessibilidade",
      percepcaoUrgencia: "Urgência fictícia",
      historicoRelevante: "Histórico fictício",
      confirmado: true,
      chaveEnvio: randomUUID(),
    },
  });
  expect(inscricao.status()).toBe(201);
  const { numero } = (await inscricao.json()) as { numero: string };

  await api.post("/auth/login", {
    data: { email: EQUIPE.coordenacao.email, senha: SENHA_EQUIPE },
  });
  const pendentes = (await (await api.get("/triagem/inscricoes")).json()) as {
    id: string;
    numero: string;
  }[];
  const { id } = pendentes.find((i) => i.numero === numero)!;
  const prioridade = await api.post(`/triagem/inscricoes/${id}/prioridade`, {
    data: { cor: "amarela" },
  });
  expect(prioridade.ok()).toBe(true);
  await api.dispose();
});

// Marca pelo teclado a opção do grupo cujo nome contém o texto: as setas
// percorrem as opções, e o Espaço marca a que já está com o foco.
async function escolherPeloTeclado(page: Page, grupo: string, opcao: string) {
  const radios = page
    .getByRole("group", { name: grupo })
    .getByRole("radio", { disabled: false });
  await tabAte(page, radios.first());
  const alvo = page
    .getByRole("group", { name: grupo })
    .getByRole("radio", { name: new RegExp(opcao) });
  for (let i = 0; i < 50 && !(await alvo.isChecked()); i++) {
    const noAlvo = await alvo.evaluate((el) => el === document.activeElement);
    await page.keyboard.press(noAlvo ? "Space" : "ArrowDown");
  }
  await expect(alvo).toBeChecked();
  await expect(alvo).toBeFocused();
  await focoVisivel(alvo);
}

test.describe
  .serial("Acessibilidade da distribuição e do vínculo (RNF24)", () => {
  test("a coordenação distribui o caso só pelo teclado, com foco visível e o resultado anunciado (RF18, RF20, RNF24)", async ({
    browser,
  }) => {
    const page = await entrar(browser, "coordenacao");
    await page.goto("/distribuicao");
    const tabela = page.getByRole("table", {
      name: "Casos aguardando distribuição",
    });
    await expect(
      tabela.getByRole("row", { name: new RegExp(paciente) }),
    ).toBeVisible();
    await expect(tabela.getByRole("columnheader")).toHaveText([
      "Nº da inscrição",
      "Nome",
      "Prioridade clínica",
      "Data da inscrição",
      "Ações",
    ]);

    const abrir = page.getByRole("button", { name: `Distribuir ${paciente}` });
    await tabAte(page, abrir);
    await focoVisivel(abrir);

    // O Esc fecha o diálogo e devolve o foco a quem o abriu.
    await page.keyboard.press("Enter");
    const dialogo = page.getByRole("dialog", { name: "Distribuir caso" });
    await expect(dialogo).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialogo).toBeHidden();
    await expect(abrir).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(dialogo).toBeVisible();
    await escolherPeloTeclado(page, "Supervisor", EQUIPE.supervisor.nome);
    const confirmar = dialogo.getByRole("button", {
      name: "Confirmar distribuição",
    });
    await expect(confirmar).toBeEnabled();
    await expect(confirmar).toHaveCSS("opacity", "1");
    await semViolacoes(page);
    await tabAte(page, confirmar);
    await focoVisivel(confirmar);
    await page.keyboard.press("Enter");

    // O resultado vai para uma região de status, lida pelo leitor de tela.
    await expect(
      page.getByRole("status").filter({ hasText: "Caso distribuído." }),
    ).toContainText(`${paciente} agora está com ${EQUIPE.supervisor.nome}.`);
  });

  test("o supervisor vincula o estagiário só pelo teclado, com foco visível e o resultado anunciado (RF21, RNF24)", async ({
    browser,
  }) => {
    const page = await entrar(browser, "supervisor");
    await page.goto("/meus-casos");
    const abrir = page.getByRole("button", {
      name: `Vincular estagiário a ${paciente}`,
    });
    await tabAte(page, abrir);
    await focoVisivel(abrir);
    await page.keyboard.press("Enter");

    const dialogo = page.getByRole("dialog", { name: "Vincular estagiário" });
    await expect(dialogo).toBeVisible();
    await escolherPeloTeclado(page, "Estagiário ativo", EQUIPE.estagiario.nome);
    const confirmar = dialogo.getByRole("button", {
      name: "Confirmar vínculo",
    });
    await semViolacoes(page);
    await tabAte(page, confirmar);
    await focoVisivel(confirmar);
    await page.keyboard.press("Enter");

    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "O prontuário do caso foi criado." }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: `Abrir prontuário de ${paciente}` }),
    ).toBeVisible();
  });

  test("as telas de distribuição e de vínculo não têm violações WCAG no celular, sem rolagem horizontal (RF18, RF20, RF21, RNF24)", async ({
    browser,
  }) => {
    for (const [perfil, pagina] of [
      ["coordenacao", "/distribuicao"],
      ["supervisor", "/meus-casos"],
    ] as const) {
      const page = await entrar(browser, perfil);
      await page.setViewportSize({ width: 360, height: 800 });
      await page.goto(pagina);
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await semViolacoes(page);
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      ).toBe(true);
    }
  });
});
