import { voiceOverTest as test } from "@guidepup/playwright";
import { expect } from "@playwright/test";
import type { ListaAcessosProntuario } from "@clinica/shared";
import { anexarFala, irAte, ouvirFoco, simularRotas } from "./apoio";

// Executado pelo workflow macOS; não substituído por uma simulação de leitor.
test("VoiceOver lê filtros, contagem e tentativa negada (RF56, RNF56)", async ({
  page,
  voiceOver,
}) => {
  const lista: ListaAcessosProntuario = {
    acessos: [
      {
        id: "a1",
        dataHora: "2026-11-14T13:00:00Z",
        usuario: "Pessoa Auditoria",
        perfil: "secretaria",
        paciente: "Paciente Fictício",
        operacao: "acesso_negado",
        descricao: "Abertura do prontuário (tentativa negada)",
      },
    ],
    total: 1,
    pagina: 1,
    tamanhoPagina: 50,
  };
  await simularRotas(page, {
    "GET /auth/sessao": () => ({
      id: "u1",
      nome: "Coordenação",
      perfil: "coordenacao",
    }),
    "GET /acessos-prontuario": () => lista,
  });
  await page.goto("/acessos-prontuario", { waitUntil: "load" });
  await page.getByRole("table").waitFor();
  await voiceOver.navigateToWebContent();
  try {
    // Os campos de texto são lidos com o rótulo quando recebem o foco.
    for (const rotulo of ["Paciente", "Usuário"]) {
      const campo = page.getByLabel(rotulo, { exact: true });
      await campo.focus();
      await ouvirFoco(voiceOver, campo, rotulo);
    }
    // No campo de data, o WebKit põe o foco do teclado direto no segmento do mês, e
    // o VoiceOver descreve só o segmento ("10 month stepper"), sem o rótulo. Por
    // isso, as datas são conferidas de outro jeito: o campo tem o rótulo como nome
    // acessível, e o VoiceOver lê o rótulo ao percorrer o formulário a partir do
    // campo do usuário.
    for (const rotulo of ["Data inicial", "Data final"]) {
      await expect(
        page.getByLabel(rotulo, { exact: true }),
      ).toHaveAccessibleName(rotulo);
      await irAte(voiceOver, rotulo);
    }
    await page.getByRole("button", { name: "Filtrar" }).click();
    await ouvirFoco(
      voiceOver,
      page.getByRole("status").filter({ hasText: "1 acesso encontrado" }),
      "1 acesso encontrado",
    );
    await irAte(voiceOver, "Pessoa Auditoria");
    await irAte(voiceOver, "Secretaria");
    await irAte(voiceOver, "Paciente Fictício");
    await irAte(voiceOver, "Acesso negado");
  } finally {
    await anexarFala(test.info(), voiceOver, "fala-registro-acessos.json");
  }
});
