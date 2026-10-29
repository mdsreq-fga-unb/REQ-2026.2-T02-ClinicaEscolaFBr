import { connection } from "next/server";
import { Suspense } from "react";
import { FormularioInscricao } from "@/components/inscricao/formulario";

// INSCRICAO_ABERTA=false mantém a inscrição pública fechada na produção até o
// termo de consentimento (RF57). O valor é lido a cada pedido, e não no build,
// para abrir só trocando a variável no Coolify.
async function Inscricao() {
  await connection();
  return (
    <FormularioInscricao aberta={process.env.INSCRICAO_ABERTA !== "false"} />
  );
}

export default function InscricaoPage() {
  return (
    <Suspense
      fallback={
        <p role="status" className="p-6 text-sm">
          Carregando…
        </p>
      }
    >
      <Inscricao />
    </Suspense>
  );
}
