import { createHash, randomBytes } from "node:crypto";
import type { PlaywrightWorkerArgs } from "@playwright/test";
import {
  atribuicoesSupervisor,
  createDb,
  linksConfirmacao,
  prontuarios,
  sessoesAtendimento,
  usuarios,
  vinculosEstagiario,
} from "@clinica/database";
import type { StatusSessao } from "@clinica/shared";
import { criarCasoTriado } from "./apoio";
import { EQUIPE } from "./equipe";

const HORA = 60 * 60 * 1000;

// Paciente em atendimento com sessões e links de confirmação (RF10, RF14, RF15). A
// inscrição e o caso vêm da API (RF1, RF6), que cifra os dados de saúde (RNF51);
// o vínculo, as sessões e os links são gravados direto no banco local de teste,
// porque o token do link só existe no e-mail e o e2e precisa dele.
// - Sem `daEquipe`, cada chamada cria um estagiário próprio, para as sessões não
//   colidirem com as de outras execuções no mesmo banco (RNF9).
// - Com `daEquipe`, o caso fica com o estagiário e o supervisor da semente, com o
//   prontuário, para eles entrarem e verem as sessões (RF15, RF16). As sessões
//   ganham minutos aleatórios, para não colidirem na agenda do estagiário.
export async function criarPacienteComSessoes(
  playwright: PlaywrightWorkerArgs["playwright"],
  sessoes: { horas: number; status?: StatusSessao }[],
  { daEquipe = false }: { daEquipe?: boolean } = {},
) {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const paciente = `Paciente RF14 ${marca}`;
  await criarCasoTriado(playwright, paciente);

  const db = createDb(
    process.env.DATABASE_URL ??
      "postgresql://clinica:clinica@localhost:5432/clinica",
  );
  try {
    // Contas criadas pela semente.ts antes do e2e.
    const pessoa = async (email: string) => {
      const linha = await db.query.usuarios.findFirst({
        columns: { id: true },
        where: (u, { eq }) => eq(u.email, email),
      });
      if (!linha) throw new Error(`Conta ${email} não encontrada.`);
      return linha.id;
    };
    const secretaria = await pessoa(EQUIPE.secretaria.email);
    const supervisor = await pessoa(EQUIPE.supervisor.email);
    const inscricao = await db.query.inscricoes.findFirst({
      columns: { id: true },
      where: (i, { eq }) => eq(i.nomeCompleto, paciente),
    });
    const caso = inscricao
      ? await db.query.casos.findFirst({
          columns: { id: true },
          where: (c, { eq }) => eq(c.inscricaoId, inscricao.id),
        })
      : undefined;
    if (!caso) throw new Error(`Caso de ${paciente} não encontrado.`);
    // O caso passa direto a "em atendimento": a distribuição e o vínculo pela tela
    // são cobertos pelo e2e do Ciclo 3.
    await db.$client.query(
      "update casos set situacao = 'em_atendimento' where id = $1",
      [caso.id],
    );
    const estagiarioId = daEquipe
      ? await pessoa(EQUIPE.estagiario.email)
      : (
          await db
            .insert(usuarios)
            .values({
              nome: `Estagiário RF14 ${marca}`,
              email: `estagiario.rf14.${marca}@fbr.edu.br`,
              perfil: "estagiario",
              situacao: "ativo",
            })
            .returning()
        )[0].id;
    const [vinculo] = await db
      .insert(vinculosEstagiario)
      .values({ casoId: caso.id, estagiarioId, vinculadoPor: supervisor })
      .returning();
    let prontuarioId: string | undefined;
    if (daEquipe) {
      await db.insert(atribuicoesSupervisor).values({
        casoId: caso.id,
        supervisorId: supervisor,
        atribuidoPor: await pessoa(EQUIPE.coordenacao.email),
      });
      [{ id: prontuarioId }] = await db
        .insert(prontuarios)
        .values({
          casoId: caso.id,
          cicloAtendimento: 1,
          vinculoOrigemId: vinculo.id,
        })
        .returning();
    }

    const tokens: string[] = [];
    for (const { horas, status = "agendada" } of sessoes) {
      const minutos = daEquipe ? Math.floor(Math.random() * 600) : 0;
      const inicio = new Date(Date.now() + horas * HORA + minutos * 60_000);
      const termino = new Date(inicio.getTime() + 50 * 60_000);
      const [sessao] = await db
        .insert(sessoesAtendimento)
        .values({
          casoId: caso.id,
          estagiarioId,
          inicio,
          termino,
          fimIntervaloAnotacoes: new Date(termino.getTime() + 10 * 60_000),
          status,
          agendadaPor: secretaria,
        })
        .returning();
      const token = randomBytes(32).toString("base64url");
      await db.insert(linksConfirmacao).values({
        sessaoId: sessao.id,
        tokenHash: createHash("sha256").update(token).digest("hex"),
        expiraEm: inicio,
      });
      tokens.push(token);
    }
    return { paciente, casoId: caso.id, prontuarioId, tokens };
  } finally {
    await db.$client.end();
  }
}
