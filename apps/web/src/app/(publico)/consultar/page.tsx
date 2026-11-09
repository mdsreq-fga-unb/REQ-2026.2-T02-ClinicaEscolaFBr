import type { Metadata } from "next";
import { VerificacaoIdentidade } from "@/components/verificacao/verificacao-identidade";

export const metadata: Metadata = {
  title: "Consultar minha inscrição — Clínica Escola FBr",
};

// Consulta pública do paciente ou do responsável. Antes de qualquer dado da
// inscrição, confirma a identidade (RF52); a posição na fila (RF8) entra aqui,
// no conteúdo mostrado depois da verificação.
export default function ConsultarPage() {
  return <VerificacaoIdentidade />;
}
