import { createDb, usuarios } from "@clinica/database";
import { EQUIPE, HASH_SENHA_EQUIPE, type PerfilEquipe } from "./equipe";

// Antes do e2e: garante as contas ativas da equipe no banco de teste, com a
// senha conhecida e sem bloqueio de tentativas (RF50, RF53).
export default async function semente() {
  const db = createDb(
    process.env.DATABASE_URL ??
      "postgresql://clinica:clinica@localhost:5432/clinica",
  );
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
