import { voiceOverTest as test } from "@guidepup/playwright";
import { expect, type Page } from "@playwright/test";
import type {
  CasoAguardando,
  CasoDoSupervisor,
  EstagiarioDisponivel,
  Perfil,
  ResultadoDistribuicao,
  ResultadoVinculo,
  SupervisorDisponivel,
} from "@clinica/shared";
import { anexarFala, falou, irAte, ouvirFoco, simularRotas } from "./apoio";

// RNF24 com o VoiceOver de verdade: a distribuição (RF18, RF20) e o vínculo do
// estagiário (RF21) feitos com os comandos do leitor de tela, conferindo o que ele
// fala em cada passo. A API é simulada com os tipos de @clinica/shared, para o
// teste não depender de banco no macOS.

const PACIENTE = "Paciente Leitor de Tela";
const SUPERVISOR = "Carla Mendes";
const ESTAGIARIO = "Bruno Lima";
const CASO = "8f6f2c1e-0b7a-4d0e-9a51-3f0b6b1d2c01";

const caso: CasoAguardando = {
  casoId: CASO,
  numero: "2026-00042",
  nome: PACIENTE,
  prioridade: "amarela",
  dataInscricao: "2026-10-20T13:00:00.000Z",
};
const supervisores: SupervisorDisponivel[] = [
  {
    id: "2b1d7a3e-5c4f-4e8a-9b6d-1a2b3c4d5e01",
    nome: SUPERVISOR,
    casosAtivos: 3,
    limite: 50,
    noLimite: false,
  },
];
const distribuido: ResultadoDistribuicao = {
  casoId: CASO,
  numero: caso.numero,
  paciente: PACIENTE,
  supervisor: SUPERVISOR,
};
const casoDoSupervisor: CasoDoSupervisor = {
  casoId: CASO,
  numero: caso.numero,
  nome: PACIENTE,
  prioridade: "amarela",
  estagiario: null,
  prontuarioId: null,
};
const estagiarios: EstagiarioDisponivel[] = [
  {
    id: "6c7d8e9f-0a1b-4c2d-8e3f-4a5b6c7d8e01",
    nome: ESTAGIARIO,
    pacientesEmAtendimento: 2,
  },
];
const vinculado: ResultadoVinculo = {
  casoId: CASO,
  numero: caso.numero,
  paciente: PACIENTE,
  estagiario: ESTAGIARIO,
  prontuarioId: "9d8c7b6a-5f4e-4d3c-8b2a-1f0e9d8c7b01",
};

// Responde às chamadas do site como a API responderia, com o CORS da API real.
async function simularApi(page: Page, perfil: Perfil) {
  let vinculou = false;
  const respostas: Record<string, () => unknown> = {
    "GET /auth/sessao": () => ({ id: "u-1", nome: "Equipe", perfil }),
    "GET /casos/aguardando-distribuicao": () => [caso],
    "GET /supervisores/disponibilidade": () => supervisores,
    [`POST /casos/${CASO}/supervisor`]: () => distribuido,
    "GET /casos/meus": () => [
      vinculou
        ? {
            ...casoDoSupervisor,
            estagiario: ESTAGIARIO,
            prontuarioId: vinculado.prontuarioId,
          }
        : casoDoSupervisor,
    ],
    "GET /estagiarios/disponiveis": () => estagiarios,
    [`POST /casos/${CASO}/estagiario`]: () => {
      vinculou = true;
      return vinculado;
    },
  };
  await simularRotas(page, respostas);
}

test.describe("Leitor de tela na distribuição e no vínculo (RNF24)", () => {
  test("com o VoiceOver, a coordenação ouve a lista, o diálogo e o resultado da distribuição (RF18, RF20, RNF24)", async ({
    page,
    voiceOver,
  }) => {
    await simularApi(page, "coordenacao");
    await page.goto("/distribuicao", { waitUntil: "load" });
    await page
      .getByRole("heading", { name: "Casos aguardando distribuição" })
      .waitFor();
    await voiceOver.navigateToWebContent();

    try {
      await irAte(voiceOver, `Distribuir ${PACIENTE}`);
      expect(await voiceOver.lastSpokenPhrase()).toMatch(/button|botão/i);
      await voiceOver.act();

      await falou(voiceOver, "Distribuir caso");
      await irAte(voiceOver, SUPERVISOR);
      expect(await voiceOver.lastSpokenPhrase()).toMatch(/radio|opção/i);
      await voiceOver.act();
      await falou(voiceOver, "Supervisor");

      await irAte(voiceOver, "Confirmar distribuição");
      await voiceOver.act();
      await ouvirFoco(
        voiceOver,
        page.getByRole("status").filter({ hasText: "Caso distribuído" }),
        "Caso distribuído",
      );
      await falou(voiceOver, `agora está com ${SUPERVISOR}`);
    } finally {
      await anexarFala(test.info(), voiceOver, "fala-distribuicao.json");
    }
  });

  test("com o VoiceOver, o supervisor ouve o caso, o diálogo e o aviso do prontuário criado (RF21, RNF24)", async ({
    page,
    voiceOver,
  }) => {
    await simularApi(page, "supervisor");
    await page.goto("/meus-casos", { waitUntil: "load" });
    await page
      .getByRole("button", { name: `Vincular estagiário a ${PACIENTE}` })
      .waitFor();
    await voiceOver.navigateToWebContent();

    try {
      await irAte(voiceOver, `Vincular estagiário a ${PACIENTE}`);
      expect(await voiceOver.lastSpokenPhrase()).toMatch(/button|botão/i);
      await voiceOver.act();

      await falou(voiceOver, "Vincular estagiário");
      await irAte(voiceOver, ESTAGIARIO);
      expect(await voiceOver.lastSpokenPhrase()).toMatch(/radio|opção/i);
      await voiceOver.act();
      await falou(voiceOver, "Estagiário ativo");

      await irAte(voiceOver, "Confirmar vínculo");
      await voiceOver.act();
      await ouvirFoco(
        voiceOver,
        page
          .getByRole("status")
          .filter({ hasText: "O prontuário do caso foi criado" }),
        "O prontuário do caso foi criado",
      );
    } finally {
      await anexarFala(test.info(), voiceOver, "fala-vinculo.json");
    }
  });
});
