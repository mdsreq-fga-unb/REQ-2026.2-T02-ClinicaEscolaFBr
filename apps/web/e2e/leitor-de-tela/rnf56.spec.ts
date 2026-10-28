import { voiceOverTest as test } from "@guidepup/playwright";
import { expect } from "@playwright/test";
import {
  continuar,
  enviar,
  preencherDados,
  preencherTriagem,
} from "../apoio-inscricao";
import { anexarFala, falou, irAte, ouvirFoco, simularRotas } from "./apoio";

// Parte do RNF56 que pede o leitor de tela: a inscrição pública (RF1) e o
// comprovante (RF2) com o VoiceOver de verdade. A parte automática da WCAG (axe)
// está no e2e/inscricao.spec.ts; as duas são exigidas no D4.5. A API é simulada.

const NUMERO = "2026-00042";

test.describe("Leitor de tela na inscrição e no comprovante (RNF56)", () => {
  test("com o VoiceOver, a pessoa ouve a etapa, os campos e o resumo dos erros da inscrição (RF1, RNF56)", async ({
    page,
    voiceOver,
  }) => {
    await page.goto("/inscricao", { waitUntil: "load" });
    await page.getByRole("heading", { name: "Dados e contatos" }).waitFor();
    await voiceOver.navigateToWebContent();

    try {
      // O título da etapa, depois do indicador de etapas ("1 Dados e contatos").
      await irAte(voiceOver, /heading.*Dados e contatos/i);
      // O VoiceOver lê o rótulo e, no item seguinte, o campo, que precisa ser
      // anunciado como campo de texto com o nome do rótulo.
      await irAte(voiceOver, "Nome completo");
      const campo = /edit text|text field|campo de texto/i;
      for (let i = 0; i < 3; i++) {
        if (campo.test(await voiceOver.lastSpokenPhrase())) break;
        await voiceOver.next();
      }
      const falaDoCampo = await voiceOver.lastSpokenPhrase();
      expect(falaDoCampo).toMatch(campo);
      expect(falaDoCampo).toContain("Nome completo");

      // Continuar sem preencher: o resumo dos erros recebe o foco e é lido.
      await irAte(voiceOver, "Continuar");
      await voiceOver.act();
      await ouvirFoco(
        voiceOver,
        page
          .getByRole("alert")
          .filter({ hasText: "Confira os campos antes de continuar" }),
        "Confira os campos antes de continuar",
      );
      // Cada erro do resumo é um link para o campo ("link CPF : Preencha...").
      await irAte(voiceOver, /link CPF\s*:/);
    } finally {
      await anexarFala(test.info(), voiceOver, "fala-inscricao.json");
    }
  });

  test("com o VoiceOver, a pessoa ouve o comprovante com o número da inscrição (RF2, RNF56)", async ({
    page,
    voiceOver,
  }) => {
    await simularRotas(
      page,
      {
        "POST /inscricoes": () => ({
          numero: NUMERO,
          criadaEm: "2026-10-28T13:00:00.000Z",
        }),
      },
      { "POST /inscricoes": 201 },
    );
    await page.goto("/inscricao", { waitUntil: "load" });
    await preencherDados(page);
    await continuar(page);
    await preencherTriagem(page);
    await continuar(page);
    await page.getByRole("checkbox").check();
    await enviar(page);
    const titulo = page.getByRole("heading", { name: "Inscrição recebida" });
    // O título do comprovante recebe o foco do teclado ao aparecer.
    await expect(titulo).toBeFocused();
    await voiceOver.navigateToWebContent();

    try {
      await irAte(voiceOver, "Inscrição recebida");
      expect(await voiceOver.lastSpokenPhrase()).toMatch(/heading|título/i);
      await irAte(voiceOver, "Número da inscrição");
      await irAte(voiceOver, NUMERO);
      await irAte(voiceOver, "Imprimir ou salvar em PDF");
      expect(await voiceOver.lastSpokenPhrase()).toMatch(/button|botão/i);
      await falou(voiceOver, "Comprovante de inscrição");
    } finally {
      await anexarFala(test.info(), voiceOver, "fala-comprovante.json");
    }
  });
});
