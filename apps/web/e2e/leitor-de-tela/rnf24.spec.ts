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

// RNF24 com o VoiceOver de verdade: a distribuição (RF18, RF20), o vínculo do
// estagiário (RF21) e a consulta dos casos sob responsabilidade do estagiário e do
// supervisor (RF23) feitos com os comandos do leitor de tela, conferindo o que ele
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
  situacao: "aguardando_vinculo",
  vinculoEncerradoEm: null,
  estagiarioId: null,
  estagiarioAnterior: null,
  estagiarioAnteriorId: null,
  supervisor: "Carla Mendes E2E",
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

// Casos da consulta do RF23: um paciente do Bruno e dois da Marina, para o filtro
// falar "1 caso." e "2 casos.", e um que ainda aguarda o vínculo.
const OUTRO_ESTAGIARIO = "Marina Souza";
const casosDoRf23: CasoDoSupervisor[] = [
  {
    ...casoDoSupervisor,
    estagiario: ESTAGIARIO,
    estagiarioId: "6c7d8e9f-0a1b-4c2d-8e3f-4a5b6c7d8e01",
    prontuarioId: vinculado.prontuarioId,
    situacao: "em_atendimento",
  },
  {
    ...casoDoSupervisor,
    casoId: "8f6f2c1e-0b7a-4d0e-9a51-3f0b6b1d2c02",
    numero: "2026-00043",
    nome: "Paciente Dois",
    estagiario: OUTRO_ESTAGIARIO,
    estagiarioId: "6c7d8e9f-0a1b-4c2d-8e3f-4a5b6c7d8e02",
    prontuarioId: "9d8c7b6a-5f4e-4d3c-8b2a-1f0e9d8c7b02",
    situacao: "em_atendimento",
  },
  {
    ...casoDoSupervisor,
    casoId: "8f6f2c1e-0b7a-4d0e-9a51-3f0b6b1d2c03",
    numero: "2026-00044",
    nome: "Paciente Três",
    estagiario: OUTRO_ESTAGIARIO,
    estagiarioId: "6c7d8e9f-0a1b-4c2d-8e3f-4a5b6c7d8e02",
    prontuarioId: "9d8c7b6a-5f4e-4d3c-8b2a-1f0e9d8c7b03",
    situacao: "em_atendimento",
  },
  {
    ...casoDoSupervisor,
    casoId: "8f6f2c1e-0b7a-4d0e-9a51-3f0b6b1d2c04",
    numero: "2026-00045",
    nome: "Paciente Quatro",
  },
];

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

test.describe("Leitor de tela na distribuição, no vínculo e na consulta dos casos (RNF24)", () => {
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

  test("com o VoiceOver, o estagiário ouve os próprios pacientes e as ações de cada um em 'Meus pacientes' (RF23, RNF24)", async ({
    page,
    voiceOver,
  }) => {
    await simularRotas(page, {
      "GET /auth/sessao": () => ({
        id: "u-2",
        nome: ESTAGIARIO,
        perfil: "estagiario",
      }),
      "GET /casos/meus": () => [casosDoRf23[0]],
    });
    await page.goto("/meus-pacientes", { waitUntil: "load" });
    await page
      .getByRole("heading", { name: "Meus pacientes", level: 1 })
      .waitFor();
    await voiceOver.navigateToWebContent();

    try {
      await irAte(voiceOver, `Ver ficha de ${PACIENTE}`);
      expect(await voiceOver.lastSpokenPhrase()).toMatch(/link/i);
      await irAte(voiceOver, `Abrir prontuário de ${PACIENTE}`);
      expect(await voiceOver.lastSpokenPhrase()).toMatch(/link/i);
    } finally {
      await anexarFala(test.info(), voiceOver, "fala-meus-pacientes.json");
    }
  });

  test("com o VoiceOver, o supervisor filtra 'Meus casos' pelo estagiário e ouve quantos casos ficaram (RF23, RNF24)", async ({
    page,
    voiceOver,
  }) => {
    await simularRotas(page, {
      "GET /auth/sessao": () => ({
        id: "u-1",
        nome: "Equipe",
        perfil: "supervisor",
      }),
      "GET /casos/meus": () => casosDoRf23,
    });
    await page.goto("/meus-casos", { waitUntil: "load" });
    await page
      .getByRole("group", { name: "Estagiário" })
      .getByRole("radio", { name: ESTAGIARIO })
      .waitFor();
    await voiceOver.navigateToWebContent();

    try {
      await irAte(voiceOver, ESTAGIARIO);
      expect(await voiceOver.lastSpokenPhrase()).toMatch(/radio|opção/i);
      await voiceOver.act();
      await falou(voiceOver, "1 caso.");

      await irAte(voiceOver, OUTRO_ESTAGIARIO);
      expect(await voiceOver.lastSpokenPhrase()).toMatch(/radio|opção/i);
      await voiceOver.act();
      await falou(voiceOver, "2 casos.");
    } finally {
      await anexarFala(test.info(), voiceOver, "fala-filtro-meus-casos.json");
    }
  });
});
