import { voiceOverTest as test } from "@guidepup/playwright";
import { expect } from "@playwright/test";
import type { SituacaoInscricao, VerificacaoAtual } from "@clinica/shared";
import { anexarFala, falou, irAte, simularRotas } from "./apoio";

// Parte do RNF56 que faltava no D4.5 do RF8: com o VoiceOver de verdade, a pessoa
// que já confirmou a identidade (RF52) ouve o número da inscrição, a situação
// ("Em triagem", pela DF55, sem a posição na fila), o aviso de que a triagem não
// garante data e o botão "Atualizar situação". Ao atualizar, a nova situação é
// anunciada pela região ao vivo do cartão. A API é simulada com os tipos de
// @clinica/shared, como nos outros testes desta pasta.

const NUMERO = "2026-00042";

const verificacao = (): VerificacaoAtual => ({
  numero: NUMERO,
  expiraEm: new Date(Date.now() + 15 * 60_000).toISOString(),
});

test.describe("Leitor de tela na consulta da situação da inscrição", () => {
  test("com o VoiceOver, a pessoa ouve o número, a situação sem a posição, o aviso da triagem e a atualização da situação (RF8, RNF56)", async ({
    page,
    voiceOver,
  }) => {
    let situacao: SituacaoInscricao["situacao"] = "em_triagem";
    await simularRotas(page, {
      "GET /verificacao": verificacao,
      "GET /fila/minha-situacao": () => ({
        numero: NUMERO,
        situacao,
        consultadaEm: new Date().toISOString(),
      }),
    });
    await page.goto("/consultar", { waitUntil: "load" });
    const atualizar = page.getByRole("button", { name: "Atualizar situação" });
    await atualizar.waitFor();
    await voiceOver.navigateToWebContent();

    try {
      await irAte(voiceOver, /heading.*Consultar minha inscrição/i);
      await irAte(voiceOver, "Identidade confirmada.");
      // No cartão: o número da inscrição e a situação, sem a posição na fila.
      await irAte(voiceOver, "Número da inscrição");
      await irAte(voiceOver, NUMERO);
      await irAte(voiceOver, "Situação");
      await irAte(voiceOver, "Em triagem");
      await irAte(voiceOver, "aguarda a chamada para o atendimento");
      await irAte(
        voiceOver,
        "Estar em triagem não garante prazo nem data de atendimento.",
      );
      await irAte(voiceOver, "A captação de pacientes é semestral.");
      const log = (await voiceOver.spokenPhraseLog()).join(" | ");
      expect(log).not.toMatch(/posição/i);

      // O botão é lido como botão, e a nova situação é anunciada ao atualizar.
      await irAte(voiceOver, "Atualizar situação");
      expect(await voiceOver.lastSpokenPhrase()).toMatch(/button|botão/i);
      situacao = "em_atendimento";
      await voiceOver.act();
      await expect(page.getByText("Em atendimento")).toBeVisible();
      await falou(voiceOver, "Em atendimento");
    } finally {
      await anexarFala(test.info(), voiceOver, "fala-situacao-inscricao.json");
    }
  });
});
