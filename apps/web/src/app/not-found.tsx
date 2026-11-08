import type { Metadata } from "next";
import { PaginaNaoEncontrada } from "@/components/layout/pagina-nao-encontrada";

export const metadata: Metadata = {
  title: "Página não encontrada · Clínica Escola FBr",
};

// Endereço que não corresponde a nenhuma página do sistema.
export default function NotFound() {
  return <PaginaNaoEncontrada />;
}
