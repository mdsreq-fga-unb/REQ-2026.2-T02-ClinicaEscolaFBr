import { connection } from "next/server";
import { FormularioInscricao } from "@/components/inscricao/formulario";

// INSCRICAO_ABERTA=false mantém a inscrição pública fechada na produção até o
// termo de consentimento (RF57). O valor é lido a cada pedido, e não no build,
// para abrir só trocando a variável no Coolify.
export default async function InscricaoPage() {
  await connection();
  return (
    <FormularioInscricao aberta={process.env.INSCRICAO_ABERTA !== "false"} />
  );
}
