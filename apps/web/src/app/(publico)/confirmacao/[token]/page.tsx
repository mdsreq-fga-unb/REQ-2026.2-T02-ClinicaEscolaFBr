"use client";
import { useParams } from "next/navigation";
import { LinkDaSessao } from "@/components/confirmacao/link-da-sessao";

// Página do link recebido no agendamento, sem login (RF14, RNF15).
export default function ConfirmacaoPage() {
  const { token } = useParams<{ token: string }>();
  return <LinkDaSessao token={token} />;
}
