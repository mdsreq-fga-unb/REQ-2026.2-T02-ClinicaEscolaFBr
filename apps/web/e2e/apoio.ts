import { randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  type Browser,
  type BrowserContext,
  type Locator,
  type Page,
  type PlaywrightWorkerArgs,
} from "@playwright/test";
import { EQUIPE, SENHA_EQUIPE, type PerfilEquipe } from "./equipe";

export const API = `http://localhost:${process.env.E2E_API_PORT || "3333"}`;

// Verificação automática de WCAG 2.2 AA com o axe (RNF56).
export async function semViolacoes(page: Page) {
  const resultado = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(resultado.violations).toEqual([]);
}

// Contextos abertos por entrar(), fechados ao fim de cada teste: páginas que
// ficam abertas no mesmo navegador disputam o foco do teclado.
const contextos = new Set<BrowserContext>();
export async function fecharContextos() {
  await Promise.all([...contextos].map((c) => c.close()));
  contextos.clear();
}

// Entra com a conta do perfil (RF50) e devolve a página já na área interna.
export async function entrar(browser: Browser, perfil: PerfilEquipe) {
  const contexto = await browser.newContext();
  contextos.add(contexto);
  const page = await contexto.newPage();
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(EQUIPE[perfil].email);
  await page.getByLabel("Senha", { exact: true }).fill(SENHA_EQUIPE);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/entrar"));
  return page;
}

// Aperta Tab até o elemento receber o foco, como faria quem usa só o teclado.
export async function tabAte(page: Page, alvo: Locator, limite = 60) {
  for (let i = 0; i < limite; i++) {
    if (await alvo.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press("Tab");
  }
  throw new Error("O elemento não recebeu o foco pelo teclado.");
}

// O elemento com foco tem indicador visível: contorno ou anel (box-shadow).
export async function focoVisivel(alvo: Locator) {
  const estilo = await alvo.evaluate((el) => {
    const css = getComputedStyle(el);
    return {
      contorno: css.outlineStyle !== "none" && parseFloat(css.outlineWidth),
      anel: css.boxShadow !== "none",
    };
  });
  expect(Boolean(estilo.contorno) || estilo.anel).toBe(true);
}

// Caso com prioridade registrada e sem supervisor, criado pela API: inscrição
// pública (RF1) e prioridade clínica dada pela coordenação (RF6).
export async function criarCasoTriado(
  playwright: PlaywrightWorkerArgs["playwright"],
  paciente: string,
) {
  const api = await playwright.request.newContext({ baseURL: API });
  const inscricao = await api.post("/inscricoes", {
    data: {
      nomeCompleto: paciente,
      dataNascimento: "1988-03-15",
      cpf: String(Date.now() + Math.floor(Math.random() * 1000))
        .slice(-11)
        .padStart(11, "2"),
      rg: "7654321",
      endereco: "Rua Fictícia, 200, Gama",
      estadoCivil: "Solteiro(a)",
      responsavelLegal: "",
      celular: "",
      email: "paciente.e2e@example.com",
      canalPreferencial: "email",
      queixa: "Queixa fictícia de teste",
      percepcaoUrgencia: "Urgência fictícia",
      historicoRelevante: "Histórico fictício",
      confirmado: true,
      chaveEnvio: randomUUID(),
    },
  });
  expect(inscricao.status()).toBe(201);
  const { numero } = (await inscricao.json()) as { numero: string };

  await api.post("/auth/login", {
    data: { email: EQUIPE.coordenacao.email, senha: SENHA_EQUIPE },
  });
  const pendentes = (await (await api.get("/triagem/inscricoes")).json()) as {
    id: string;
    numero: string;
  }[];
  const { id } = pendentes.find((i) => i.numero === numero)!;
  const prioridade = await api.post(`/triagem/inscricoes/${id}/prioridade`, {
    data: { cor: "amarela" },
  });
  expect(prioridade.ok()).toBe(true);
  await api.dispose();
}
