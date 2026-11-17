import { voiceOverTest as test } from "@guidepup/playwright";
import { expect } from "@playwright/test";
import type { SessaoComPresenca, VerificacaoAtual } from "@clinica/shared";
import { anexarFala, irAte, simularRotas } from "./apoio";

// RNF43 e RNF56 do RF44: com o VoiceOver de verdade, a pessoa que já confirmou a
// identidade (RF52) ouve o título da página, o aviso sobre a emissão, a tabela
// pelo nome (a legenda) e, em cada linha, a data, o horário e o estagiário. Sem
// sessão com presença, ouve o título do estado vazio. A API é simulada com os
// tipos de @clinica/shared, como nos outros testes desta pasta.

const NUMERO = "2026-00398";

const verificacao = (): VerificacaoAtual => ({
  numero: NUMERO,
  expiraEm: new Date(Date.now() + 15 * 60_000).toISOString(),
});

// Sessões das 14h de Brasília (17h UTC), como na prancha 8-2.
const SESSOES: SessaoComPresenca[] = [
  { inicio: "2026-11-05T17:00:00.000Z", estagiario: "Ana Beatriz Costa" },
  { inicio: "2026-10-29T17:00:00.000Z", estagiario: "Ana Beatriz Costa" },
];

test.describe("Leitor de tela nas sessões com presença registrada", () => {
  test("com o VoiceOver, a pessoa ouve o título, o aviso da emissão, a tabela e a data, o horário e o estagiário de cada sessão (RF44, RNF43, RNF56)", async ({
    page,
    voiceOver,
  }) => {
    await simularRotas(page, {
      "GET /verificacao": verificacao,
      "GET /declaracoes/minhas-sessoes": () => SESSOES,
    });
    await page.goto("/declaracoes", { waitUntil: "load" });
    await page.getByRole("table").waitFor();
    await voiceOver.navigateToWebContent();

    try {
      await irAte(voiceOver, /heading.*Sessões com presença registrada/i);
      await irAte(voiceOver, "Identidade confirmada.");
      await irAte(
        voiceOver,
        "A emissão da declaração pelo sistema ainda não está disponível.",
      );
      // A tabela é anunciada pela legenda, e as células pelos cabeçalhos.
      await irAte(
        voiceOver,
        `Sessões com presença registrada da inscrição ${NUMERO}`,
      );
      await irAte(voiceOver, "05/11/2026");
      await irAte(voiceOver, "14:00");
      await irAte(voiceOver, "Ana Beatriz Costa");
      await irAte(voiceOver, "29/10/2026");
      await irAte(voiceOver, "Encerrar consulta");
      expect(await voiceOver.lastSpokenPhrase()).toMatch(/button|botão/i);
      const log = (await voiceOver.spokenPhraseLog()).join(" | ");
      expect(log).not.toMatch(/queixa|prioridade|erro/i);
    } finally {
      await anexarFala(test.info(), voiceOver, "fala-sessoes-presenca.json");
    }
  });

  test("com o VoiceOver, sem sessão com presença, a pessoa ouve o título do estado vazio e o texto (RF44, RNF56)", async ({
    page,
    voiceOver,
  }) => {
    await simularRotas(page, {
      "GET /verificacao": verificacao,
      "GET /declaracoes/minhas-sessoes": () => [],
    });
    await page.goto("/declaracoes", { waitUntil: "load" });
    await page
      .getByRole("heading", {
        name: "Não há sessões disponíveis para declaração",
      })
      .waitFor();
    await voiceOver.navigateToWebContent();

    try {
      await irAte(voiceOver, /heading.*Sessões com presença registrada/i);
      await irAte(
        voiceOver,
        /heading.*Não há sessões disponíveis para declaração/i,
      );
      await irAte(
        voiceOver,
        "Ainda não há sessão com presença registrada nesta inscrição.",
      );
    } finally {
      await anexarFala(test.info(), voiceOver, "fala-sessoes-vazio.json");
    }
  });
});
