import { createDb, usuarios } from "@clinica/database";
import { EQUIPE, HASH_SENHA_EQUIPE, type PerfilEquipe } from "./equipe";

// Antes do e2e: garante as contas ativas da equipe no banco de teste, com a
// senha conhecida e sem bloqueio de tentativas (RF50, RF53).
export default async function semente() {
  const url =
    process.env.DATABASE_URL ??
    "postgresql://clinica:clinica@localhost:5432/clinica";
  // As contas usam uma senha que está no repositório: nunca criar fora de um
  // banco local de desenvolvimento ou de teste.
  const host = new URL(url).hostname;
  if (
    process.env.NODE_ENV === "production" ||
    !["localhost", "127.0.0.1", "::1", "[::1]"].includes(host)
  ) {
    throw new Error(
      `O e2e só cria as contas de teste num banco local (localhost), e não em "${host}" nem com NODE_ENV=production.`,
    );
  }
  const db = createDb(url);
  for (const [perfil, pessoa] of Object.entries(EQUIPE) as [
    PerfilEquipe,
    (typeof EQUIPE)[PerfilEquipe],
  ][]) {
    const conta = {
      nome: pessoa.nome,
      email: pessoa.email,
      perfil,
      situacao: "ativo" as const,
      senhaHash: HASH_SENHA_EQUIPE,
      tentativasFalhas: 0,
      bloqueadoAte: null,
    };
    await db
      .insert(usuarios)
      .values(conta)
      .onConflictDoUpdate({ target: usuarios.email, set: conta });
  }
  await db.$client.end();
}
