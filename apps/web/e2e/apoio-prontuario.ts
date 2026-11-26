import { randomUUID } from "node:crypto";
import {
  atribuicoesSupervisor,
  casos,
  createDb,
  inscricoes,
  prontuarios,
  sessoesAtendimento,
  vinculosEstagiario,
} from "@clinica/database";
import { expect, type Page, type PlaywrightWorkerArgs } from "@playwright/test";
import { API } from "./apoio";
import { EQUIPE, SENHA_EQUIPE } from "./equipe";

// Apoio dos e2e do prontuário (RF30, RF67): caso em atendimento com a equipe do
// e2e, uma sessão realizada e a evolução original, registrada pela rota do RF28
// (o texto é cifrado pela API). Devolve o id do prontuário.
export async function criarProntuarioComEvolucao(
  playwright: PlaywrightWorkerArgs["playwright"],
  paciente: string,
  conteudo: string,
) {
  const url = new URL(process.env.DATABASE_URL!);
  if (!["localhost", "127.0.0.1"].includes(url.hostname))
    throw new Error(
      "O e2e do prontuário exige banco local descartável de testes.",
    );
  const db = createDb(url.href);
  let sessaoId: string;
  let prontuarioId: string;
  try {
    const usuario = async (perfil: keyof typeof EQUIPE) =>
      (
        await db.$client.query<{ id: string }>(
          "select id from usuarios where email = $1",
          [EQUIPE[perfil].email],
        )
      ).rows[0];
    const [coordenacao, supervisor, estagiario, secretaria] = await Promise.all(
      (["coordenacao", "supervisor", "estagiario", "secretaria"] as const).map(
        usuario,
      ),
    );
    const [i] = await db
      .insert(inscricoes)
      .values({
        numero: `2026-${Date.now()}`,
        nomeCompleto: paciente,
        dataNascimento: "1990-01-01",
        cpf: "52998224725",
        rg: "123",
        endereco: "Rua Fictícia",
        estadoCivil: "Solteiro(a)",
        email: `${randomUUID()}@example.com`,
        canalPreferencial: "email",
      })
      .returning();
    const [c] = await db
      .insert(casos)
      .values({
        inscricaoId: i.id,
        entradaNaFilaEm: i.criadaEm,
        situacao: "em_atendimento",
      })
      .returning();
    await db.insert(atribuicoesSupervisor).values({
      casoId: c.id,
      supervisorId: supervisor.id,
      atribuidoPor: coordenacao.id,
    });
    const [v] = await db
      .insert(vinculosEstagiario)
      .values({
        casoId: c.id,
        estagiarioId: estagiario.id,
        vinculadoPor: supervisor.id,
      })
      .returning();
    const [p] = await db
      .insert(prontuarios)
      .values({ casoId: c.id, cicloAtendimento: 1, vinculoOrigemId: v.id })
      .returning();
    prontuarioId = p.id;
    // Num horário passado sorteado, para não colidir na agenda do mesmo
    // estagiário com as sessões de outras execuções (RNF9).
    const inicio = new Date(
      Date.now() - (2 + Math.floor(Math.random() * 2000)) * 70 * 60_000,
    );
    const termino = new Date(inicio.getTime() + 50 * 60_000);
    const [s] = await db
      .insert(sessoesAtendimento)
      .values({
        casoId: c.id,
        cicloAtendimento: 1,
        estagiarioId: estagiario.id,
        inicio,
        termino,
        fimIntervaloAnotacoes: new Date(termino.getTime() + 10 * 60_000),
        status: "realizada",
        agendadaPor: secretaria.id,
      })
      .returning();
    sessaoId = s.id;
  } finally {
    await db.$client.end();
  }
  // A evolução original entra pela rota do RF28, com o texto cifrado pela API.
  const api = await playwright.request.newContext({ baseURL: API });
  try {
    expect(
      (
        await api.post("/auth/login", {
          data: { email: EQUIPE.estagiario.email, senha: SENHA_EQUIPE },
        })
      ).ok(),
    ).toBe(true);
    expect(
      (
        await api.post(
          `/prontuarios/${prontuarioId}/sessoes/${sessaoId}/evolucoes`,
          {
            data: {
              humorAparencia: "Tranquila.",
              conteudoTrabalhado: conteudo,
              tecnicasUtilizadas: "Escuta.",
              intervencoesEncaminhamentos: "",
              planoProximaSessao: "Seguir.",
            },
          },
        )
      ).status(),
    ).toBe(201);
  } finally {
    await api.dispose();
  }
  return prontuarioId;
}

// Abre o prontuário com a evolução da sessão 1 aberta.
export async function abrirEvolucao(page: Page, prontuarioId: string) {
  await page.goto(`/prontuarios/${prontuarioId}`);
  await page.getByText("Ver evolução", { exact: true }).first().click();
}
