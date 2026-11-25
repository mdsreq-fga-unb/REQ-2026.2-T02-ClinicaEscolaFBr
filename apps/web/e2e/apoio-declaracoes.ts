import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { createDb, sessoesAtendimento, usuarios } from "@clinica/database";
import type { StatusSessao } from "@clinica/shared";
import { criarCasoTriado } from "./apoio";
import { EQUIPE } from "./equipe";

// Apoio dos e2e das sessões com presença (RF44) e da declaração (RF45, RNF41):
// o caso com as sessões gravadas no banco e a verificação de identidade (RF52),
// com o código lido na caixa do SMTP local dos testes.

const DIA = 24 * 60 * 60 * 1000;

const url = () =>
  process.env.DATABASE_URL ??
  "postgresql://clinica:clinica@localhost:5432/clinica";

// Caso em atendimento no ciclo 2, com um estagiário só dele, para as sessões não
// colidirem na agenda com as de outras execuções no mesmo banco (RNF9).
export async function criarCaso(
  playwright: Parameters<typeof criarCasoTriado>[0],
  nome: string,
  email: string,
  sessoes: { dias: number; status: StatusSessao; ciclo?: number }[],
) {
  await criarCasoTriado(playwright, nome, email);
  const db = createDb(url());
  try {
    const inscricao = await db.query.inscricoes.findFirst({
      columns: { id: true, numero: true },
      where: (i, { eq }) => eq(i.nomeCompleto, nome),
    });
    const caso = await db.query.casos.findFirst({
      columns: { id: true },
      where: (c, { eq }) => eq(c.inscricaoId, inscricao!.id),
    });
    await db.$client.query(
      "update casos set situacao = 'em_atendimento', ciclo_atendimento = 2 where id = $1",
      [caso!.id],
    );
    const secretaria = await db.query.usuarios.findFirst({
      columns: { id: true },
      where: (u, { eq }) => eq(u.email, EQUIPE.secretaria.email),
    });
    const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const [estagiario] = await db
      .insert(usuarios)
      .values({
        nome: `Estagiária RF44 ${marca}`,
        email: `estagiario.rf44.${marca}@fbr.edu.br`,
        perfil: "estagiario",
        situacao: "ativo",
      })
      .returning();
    const inicios: Record<string, Date[]> = {};
    for (const { dias, status, ciclo = 2 } of sessoes) {
      const inicio = new Date(Date.now() + dias * DIA);
      const termino = new Date(inicio.getTime() + 50 * 60_000);
      await db.insert(sessoesAtendimento).values({
        casoId: caso!.id,
        cicloAtendimento: ciclo,
        estagiarioId: estagiario.id,
        inicio,
        termino,
        fimIntervaloAnotacoes: new Date(termino.getTime() + 10 * 60_000),
        status,
        agendadaPor: secretaria!.id,
      });
      (inicios[status] ??= []).push(inicio);
    }
    return {
      numero: inscricao!.numero,
      casoId: caso!.id,
      estagiario: estagiario.nome,
      inicios,
    };
  } finally {
    await db.$client.end();
  }
}

// Pede o código pela tela e o lê na caixa do SMTP local dos testes.
export async function verificar(
  page: Page,
  request: APIRequestContext,
  numero: string,
  email: string,
) {
  const caixa = `http://127.0.0.1:8026/mensagens?para=${encodeURIComponent(email)}`;
  const antes = (await (await request.get(caixa)).json()).length;
  await page.getByLabel("CPF ou número da inscrição").fill(numero);
  await page.getByRole("button", { name: "Enviar código" }).click();
  let codigo = "";
  await expect
    .poll(async () => {
      const mensagens = await (await request.get(caixa)).json();
      if (mensagens.length <= antes) return 0;
      codigo =
        /(\d{6})<\/p>/.exec(
          (mensagens.at(-1)?.corpo || "").replace(/=\r\n/g, ""),
        )?.[1] || "";
      return codigo.length;
    })
    .toBe(6);
  await page.getByLabel("Código de 6 dígitos").fill(codigo);
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
}
