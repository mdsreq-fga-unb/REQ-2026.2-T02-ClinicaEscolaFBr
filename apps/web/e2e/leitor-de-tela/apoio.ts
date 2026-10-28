import type { VoiceOverPlaywright } from "@guidepup/playwright";
import {
  expect,
  type Locator,
  type Page,
  type Route,
  type TestInfo,
} from "@playwright/test";

export const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333";

// Responde às chamadas do site como a API responderia, com o CORS da API real.
// As chaves são "MÉTODO /caminho"; o que não estiver na lista recebe 404.
export async function simularRotas(
  page: Page,
  respostas: Record<string, () => unknown>,
  status: Record<string, number> = {},
) {
  await page.route(`${API}/**`, async (route: Route) => {
    const pedido = route.request();
    const cors = {
      "Access-Control-Allow-Origin": new URL(page.url()).origin,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE",
    };
    if (pedido.method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers: cors });
    }
    const chave = `${pedido.method()} ${new URL(pedido.url()).pathname}`;
    const resposta = respostas[chave];
    return route.fulfill(
      resposta
        ? { status: status[chave] ?? 200, headers: cors, json: resposta() }
        : { status: 404, headers: cors, json: { message: "Não simulado." } },
    );
  });
}

// Avança o cursor do VoiceOver (VO + seta para a direita) até ele falar o texto.
export async function irAte(voiceOver: VoiceOverPlaywright, texto: string) {
  for (let i = 0; i < 80; i++) {
    if ((await voiceOver.lastSpokenPhrase()).includes(texto)) return;
    await voiceOver.next();
  }
  throw new Error(`O VoiceOver não chegou a "${texto}".`);
}

// O VoiceOver falou o texto em algum momento (avisos ao vivo chegam com atraso).
export async function falou(voiceOver: VoiceOverPlaywright, texto: string) {
  await expect
    .poll(async () => (await voiceOver.spokenPhraseLog()).join(" | "), {
      timeout: 10_000,
    })
    .toContain(texto);
}

// Confere que o elemento recebeu o foco, leva o cursor do VoiceOver até ele (a
// navegação seguinte parte dali) e pede que descreva o item com o foco do
// teclado, para conferir o que ele lê, mesmo que a fala espontânea da troca de
// foco não tenha sido captada.
export async function ouvirFoco(
  voiceOver: VoiceOverPlaywright,
  alvo: Locator,
  texto: string,
) {
  await expect(alvo).toBeFocused();
  await voiceOver.perform(voiceOver.keyboardCommands.moveCursorToKeyboardFocus);
  await voiceOver.perform(
    voiceOver.keyboardCommands.describeItemWithKeyboardFocus,
  );
  await falou(voiceOver, texto);
}

// Anexa ao resultado do teste tudo o que o VoiceOver falou, como evidência.
export async function anexarFala(
  info: TestInfo,
  voiceOver: VoiceOverPlaywright,
  nome: string,
) {
  await info.attach(nome, {
    body: JSON.stringify(await voiceOver.spokenPhraseLog(), null, 2),
    contentType: "application/json",
  });
}
