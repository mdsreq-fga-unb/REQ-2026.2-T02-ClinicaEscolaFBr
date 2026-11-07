import { createHash, randomBytes } from "node:crypto";
import {
  casos,
  createDb,
  inscricoes,
  linksConfirmacao,
  sessoesAtendimento,
  usuarios,
  vinculosEstagiario,
} from "@clinica/database";
import type { StatusSessao } from "@clinica/shared";
import { EQUIPE } from "./equipe";

const HORA = 60 * 60 * 1000;

// Paciente em atendimento com sessões e links de confirmação gravados direto no banco
// local de teste (RF10, RF14): o token do link só existe no e-mail, e o e2e precisa
// dele. Cada chamada cria um estagiário próprio, para as sessões não colidirem com as
// de outras execuções no mesmo banco (RNF9).
export async function criarPacienteComSessoes(
  sessoes: { horas: number; status?: StatusSessao }[],
) {
  const db = createDb(
    process.env.DATABASE_URL ??
      "postgresql://clinica:clinica@localhost:5432/clinica",
  );
  try {
    const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const paciente = `Paciente RF14 ${marca}`;
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
    const [estagiario] = await db
      .insert(usuarios)
      .values({
        nome: `Estagiário RF14 ${marca}`,
        email: `estagiario.rf14.${marca}@fbr.edu.br`,
        perfil: "estagiario",
        situacao: "ativo",
      })
      .returning();
    const [inscricao] = await db
      .insert(inscricoes)
      .values({
        numero: `E2E-${marca}`,
        nomeCompleto: paciente,
        dataNascimento: "1990-01-01",
        cpf: marca.slice(-11).padStart(11, "3"),
        rg: "1234567",
        endereco: "Rua Fictícia, 14",
        estadoCivil: "solteiro",
        canalPreferencial: "whatsapp",
        celular: "61998765432",
        email: "paciente.rf14@example.com",
        queixaCifrada: "x",
        percepcaoUrgenciaCifrada: "x",
        historicoRelevanteCifrado: "x",
      })
      .returning();
    const [caso] = await db
      .insert(casos)
      .values({ inscricaoId: inscricao.id, situacao: "em_atendimento" })
      .returning();
    await db.insert(vinculosEstagiario).values({
      casoId: caso.id,
      estagiarioId: estagiario.id,
      vinculadoPor: supervisor,
    });

    const tokens: string[] = [];
    for (const { horas, status = "agendada" } of sessoes) {
      const inicio = new Date(Date.now() + horas * HORA);
      const termino = new Date(inicio.getTime() + 50 * 60_000);
      const [sessao] = await db
        .insert(sessoesAtendimento)
        .values({
          casoId: caso.id,
          estagiarioId: estagiario.id,
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
    return { paciente, tokens };
  } finally {
    await db.$client.end();
  }
}
