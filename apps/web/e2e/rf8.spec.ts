import { test, expect } from "@playwright/test";
import { createDb } from "@clinica/database";
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
test.afterEach(fecharContextos);
for (const largura of [320, 360, 768, 1024, 1366, 1920]) {
  test(`RF8: situação sem posição, secretaria, código real e expiração em ${largura}px (DF55, RNF6, RNF7, RNF56, RNF57, RNF58)`, async ({
    page,
    browser,
    request,
    playwright,
  }, info) => {
    const nome = `Paciente fictício RF8 ${Date.now()}`;
    // E-mail só deste teste: os outros e2e também mandam e-mail ao paciente
    // padrão, e o código lido seria o de outra inscrição.
    const email = `paciente.rf8.${largura}.${Date.now()}@example.com`;
    await criarCasoTriado(playwright, nome, email);
    await request.post(`${API}/auth/login`, {
      data: { email: EQUIPE.coordenacao.email, senha: SENHA_EQUIPE },
    });
    const fila = await (await request.get(`${API}/fila`)).json();
    const { numero, inscricaoId: chaveEnvio } = fila.inscritos.find(
      (i: { nome: string }) => i.nome === nome,
    );
    const coordenacao = await entrar(browser, "coordenacao");
    await coordenacao.setViewportSize({ width: largura, height: 900 });
    if (largura < 768)
      await coordenacao
        .getByRole("button", { name: "Abrir menu", exact: true })
        .click();
    await coordenacao
      .getByRole("link", { name: "Fila de espera", exact: true })
      .click();
    await expect(
      coordenacao.getByRole("cell", { name: numero, exact: true }),
    ).toBeVisible();
    await semViolacoes(coordenacao);
    await coordenacao.screenshot({
      path: info.outputPath(`fila-${largura}.png`),
      fullPage: true,
    });
    const secretaria = await entrar(browser, "secretaria");
    await secretaria.goto("/pacientes");
    await secretaria.getByLabel("Número da inscrição").fill(numero);
    await secretaria
      .getByRole("button", { name: "Consultar situação" })
      .click();
    await expect(
      secretaria
        .getByRole("status", { name: "Situação da inscrição" })
        .getByText("Em triagem", { exact: true }),
    ).toBeVisible();
    await expect(secretaria.locator("main")).not.toContainText("Amarela");
    await expect(
      secretaria.getByRole("status", { name: "Situação da inscrição" }),
    ).not.toContainText(/posição|prioridade|\d+ª/i);
    await semViolacoes(secretaria);
    await page.setViewportSize({ width: largura, height: 900 });
    await page.goto("/consultar");
    await page.getByLabel("CPF ou número da inscrição").fill(numero);
    const recebidasAntes = (
      await (
        await request.get(
          `http://127.0.0.1:8026/mensagens?para=${encodeURIComponent(email)}`,
        )
      ).json()
    ).length;
    await page.getByRole("button", { name: "Enviar código" }).click();
    let codigo = "";
    await expect
      .poll(async () => {
        const mensagens = await (
          await request.get(
            `http://127.0.0.1:8026/mensagens?para=${encodeURIComponent(email)}`,
          )
        ).json();
        if (mensagens.length <= recebidasAntes) return 0;
        codigo =
          /(\d{6})<\/p>/.exec(
            (mensagens.at(-1)?.corpo || "").replace(/=\r\n/g, ""),
          )?.[1] || "";
        return codigo.length;
      })
      .toBe(6);
    await page.getByLabel("Código de 6 dígitos").fill(codigo);
    await page.getByRole("button", { name: "Confirmar", exact: true }).click();
    await expect(
      page
        .getByRole("status", { name: "Situação da inscrição" })
        .getByText("Em triagem", { exact: true }),
    ).toBeVisible();
    const cartao = page.getByRole("status", { name: "Situação da inscrição" });
    await expect(cartao).not.toContainText(/posição|prioridade|\d+ª/i);
    await expect(cartao).toContainText("A captação de pacientes é semestral.");
    await expect(cartao).toContainText(
      "não garante prazo nem data de atendimento",
    );
    const atualizar = page.getByRole("button", { name: "Atualizar situação" });
    // Chega ao controle por teclado para verificar o foco visível da página pública.
    await tabAte(page, atualizar);
    await expect(atualizar).toBeFocused();
    await focoVisivel(atualizar);
    await expect(page.locator("main")).not.toContainText("Amarela");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await semViolacoes(page);
    await page.screenshot({
      path: info.outputPath(`consulta-${largura}.png`),
      fullPage: true,
    });
    const banco = new URL(process.env.DATABASE_URL!);
    if (
      !["localhost", "127.0.0.1"].includes(banco.hostname) ||
      // No CI, o banco é o do serviço descartável do próprio job.
      (!banco.pathname.startsWith("/clinica_rf1_test_") && !process.env.CI)
    )
      throw new Error("Use somente banco local descartável de teste");
    const db = createDb(banco.href);
    try {
      await db.$client.query(
        "update verificacoes_identidade set expira_em = $1 where inscricao_id = $2",
        [new Date(0), chaveEnvio],
      );
    } finally {
      await db.$client.end();
    }
    await page.getByRole("button", { name: "Atualizar situação" }).click();
    await expect(
      page.getByRole("button", { name: "Confirmar identidade" }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("status", { name: "Situação da inscrição" })
        .getByText("Em triagem", { exact: true }),
    ).not.toBeVisible();
    // O aviso recebe foco ao expirar; Tab chega à ação de confirmar novamente.
    await expect(
      page.getByRole("alert", { name: /Confirme sua identidade/ }),
    ).toBeFocused();
    const confirmar = page.getByRole("button", {
      name: "Confirmar identidade",
    });
    await tabAte(page, confirmar);
    await expect(confirmar).toBeFocused();
    await focoVisivel(confirmar);
    await semViolacoes(page);
  });
}
