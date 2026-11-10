import type { Metadata } from "next";
import { ConsultaInscricao } from "@/components/fila/situacao-inscricao";

export const metadata: Metadata = {
  title: "Consultar minha inscrição — Clínica Escola FBr",
};

export default function ConsultarPage() {
  return <ConsultaInscricao />;
}
