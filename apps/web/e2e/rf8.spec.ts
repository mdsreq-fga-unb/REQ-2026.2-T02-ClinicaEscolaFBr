import { test, expect } from "@playwright/test";
import { createDb } from "@clinica/database";
import {
  API,
  criarCasoTriado,
  entrar,
  fecharContextos,
  semViolacoes,
} from "./apoio";
import { EQUIPE, SENHA_EQUIPE } from "./equipe";
test.afterEach(fecharContextos);
for (const largura of [320, 1366]) {
  test(`RF8: fila, secretaria, código real e expiração em ${largura}px (RNF6, RNF7, RNF56, RNF58)`, async ({
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
    const lerPosicao = async (): Promise<number> =>
      (await (await request.get(`${API}/fila`)).json()).inscritos.find(
        (i: { nome: string }) => i.nome === nome,
      ).posicao;
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
      secretaria.getByRole("heading", { name: "Na fila de espera" }),
    ).toBeVisible();
    await expect(secretaria.locator("main")).not.toContainText("Amarela");
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
    const posicaoAntes = await lerPosicao();
    await page.getByRole("button", { name: "Confirmar", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Na fila de espera" }),
    ).toBeVisible();
    // Os outros e2e mudam a fila ao mesmo tempo: a posição mostrada fica entre a
    // da fila antes e a de depois da consulta.
    const textoPosicao = page.getByText(/^\d+ª$/);
    await expect(textoPosicao).toBeVisible();
    const posicaoMostrada = Number(
      (await textoPosicao.innerText()).replace("ª", ""),
    );
    const posicaoDepois = await lerPosicao();
    expect(posicaoMostrada).toBeGreaterThanOrEqual(
      Math.min(posicaoAntes, posicaoDepois),
    );
    expect(posicaoMostrada).toBeLessThanOrEqual(
      Math.max(posicaoAntes, posicaoDepois),
    );
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
      page.getByRole("heading", { name: "Na fila de espera" }),
    ).not.toBeVisible();
    await semViolacoes(page);
  });
}
