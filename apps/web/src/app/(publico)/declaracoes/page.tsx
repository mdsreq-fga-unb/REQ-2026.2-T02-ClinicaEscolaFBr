import type { Metadata } from "next";
import { DeclaracoesDoPaciente } from "@/components/declaracoes/sessoes-com-presenca";

export const metadata: Metadata = {
  title: "Sessões com presença registrada — Clínica Escola FBr",
};

// Sessões com presença registrada do paciente ou do responsável (RF44), depois
// da verificação de identidade (RF52).
export default function DeclaracoesPage() {
  return <DeclaracoesDoPaciente />;
}
