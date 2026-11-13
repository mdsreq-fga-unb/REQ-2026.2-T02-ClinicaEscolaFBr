import { voiceOverTest as test } from "@guidepup/playwright";
import { expect } from "@playwright/test";
import type { VoiceOverPlaywright } from "@guidepup/playwright";
import type { ListaDePacientes } from "@clinica/shared";
import { anexarFala, irAte, ouvirFoco, simularRotas } from "./apoio";

// Partes com o VoiceOver de verdade que faltavam no D4.5:
// - RNF24 na lista de Pacientes (RF22): a secretaria ouve a busca, os
//   responsáveis, a situação de distribuição e o link da ficha de cada paciente;
// - RNF56 na verificação de identidade (RF52): a pessoa ouve o campo, o aviso do
//   pedido e o campo do código, que recebe o foco.
// A API é simulada com os tipos de @clinica/shared, como nos outros testes desta
// pasta.

// Nomes sem as palavras das situações, para a leitura da situação ser conferida
// separada do nome.
const DISTRIBUIDO = "Mariana Alves Toledo";
const PENDENTE = "Roberto Carvalho";

const lista: ListaDePacientes = {
  cortada: false,
  pacientes: [
    {
      casoId: "5a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c01",
      nome: DISTRIBUIDO,
      situacao: "em_atendimento",
      supervisor: "Carla Mendes",
      estagiario: "Bruno Lima",
    },
    {
      casoId: "5a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c02",
      nome: PENDENTE,
      situacao: "aguardando_distribuicao",
      supervisor: null,
      estagiario: null,
    },
  ],
};

// Como o irAte, mas voltando o cursor (VO + seta para a esquerda).
async function voltarAte(voiceOver: VoiceOverPlaywright, texto: string) {
  for (let i = 0; i < 30; i++) {
    if ((await voiceOver.lastSpokenPhrase()).includes(texto)) return;
    await voiceOver.previous();
  }
  throw new Error(`O VoiceOver não chegou a "${texto}" voltando o cursor.`);
}

test.describe("Leitor de tela na lista de Pacientes e na verificação de identidade", () => {
  test("com o VoiceOver, a secretaria ouve a busca, os responsáveis e a situação de cada paciente (RF22, RNF24)", async ({
    page,
    voiceOver,
  }) => {
    await simularRotas(page, {
      "GET /auth/sessao": () => ({
        id: "u-3",
        nome: "Secretaria",
        perfil: "secretaria",
      }),
      "GET /pacientes": () => lista,
    });
    await page.goto("/pacientes", { waitUntil: "load" });
    await page
      .getByRole("link", { name: `Ver ficha de ${PENDENTE}` })
      .waitFor();
    await voiceOver.navigateToWebContent();

    try {
      // O campo de busca é anunciado como campo de busca, com o rótulo.
      await irAte(voiceOver, "Buscar paciente");
      const campo = /search|edit text|text field|campo/i;
      for (let i = 0; i < 3; i++) {
        if (campo.test(await voiceOver.lastSpokenPhrase())) break;
        await voiceOver.next();
      }
      expect(await voiceOver.lastSpokenPhrase()).toMatch(campo);

      // Na tabela: o responsável de cada paciente e a situação de distribuição.
      await irAte(voiceOver, DISTRIBUIDO);
      await irAte(voiceOver, "Bruno Lima");
      await irAte(voiceOver, "Carla Mendes");
      await irAte(voiceOver, "Distribuído");
      await irAte(voiceOver, `Ver ficha de ${DISTRIBUIDO}`);
      expect(await voiceOver.lastSpokenPhrase()).toMatch(/link/i);
      await irAte(voiceOver, PENDENTE);
      await irAte(voiceOver, "Pendente de distribuição");
      await irAte(voiceOver, `Ver ficha de ${PENDENTE}`);
      expect(await voiceOver.lastSpokenPhrase()).toMatch(/link/i);
    } finally {
      await anexarFala(test.info(), voiceOver, "fala-lista-pacientes.json");
    }
  });

  test("com o VoiceOver, a pessoa ouve o campo, o aviso do pedido e o campo do código da verificação (RF52, RNF56)", async ({
    page,
    voiceOver,
  }) => {
    // Sem verificação ativa (GET /verificacao fica com o 404 da simulação), a
    // página abre na etapa da identificação.
    await simularRotas(
      page,
      { "POST /verificacao/codigo": () => ({}) },
      { "POST /verificacao/codigo": 202 },
    );
    await page.goto("/consultar", { waitUntil: "load" });
    await page.getByLabel("CPF ou número da inscrição").waitFor();
    await voiceOver.navigateToWebContent();

    try {
      await irAte(voiceOver, /heading.*Consultar minha inscrição/i);
      // O rótulo e, no item seguinte, o campo, anunciado como campo de texto.
      await irAte(voiceOver, "CPF ou número da inscrição");
      const campo = /edit text|text field|campo de texto/i;
      for (let i = 0; i < 3; i++) {
        if (campo.test(await voiceOver.lastSpokenPhrase())) break;
        await voiceOver.next();
      }
      expect(await voiceOver.lastSpokenPhrase()).toMatch(campo);

      await page.getByLabel("CPF ou número da inscrição").fill("2026-00042");
      await irAte(voiceOver, "Enviar código");
      await voiceOver.act();
      // O campo do código recebe o foco e é lido com o rótulo.
      await ouvirFoco(
        voiceOver,
        page.getByLabel("Código de 6 dígitos"),
        "Código de 6 dígitos",
      );
      // O aviso do pedido fica acima do campo: voltando o cursor, o VoiceOver lê o
      // título e a orientação, juntos (nome acessível do Aviso).
      await voltarAte(voiceOver, "Pedido recebido.");
      expect(await voiceOver.lastSpokenPhrase()).toContain(
        "enviamos para ele um código de 6 dígitos",
      );
    } finally {
      await anexarFala(test.info(), voiceOver, "fala-verificacao.json");
    }
  });
});
