"use client";
import { Lock } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { dataHoraBr } from "@/lib/formato";

// Acesso negado (prancha 4-1): a mesma tela para qualquer recusa, sem o nome do
// paciente (RNF25). A API registra a tentativa (RNF52), e a tela informa o horário.
export function AcessoNegado({
  titulo,
  voltar,
  rotuloVoltar,
  children,
}: {
  titulo: string;
  voltar: string;
  rotuloVoltar: string;
  children: ReactNode;
}) {
  const [registradoEm] = useState(() => new Date().toISOString());
  return (
    <div className="mx-auto mt-10 flex max-w-[640px] flex-col items-center gap-3.5 px-4 py-10 text-center md:px-10 md:py-[72px]">
      <span aria-hidden className="ui-vazio-icone">
        <Lock className="size-7" />
      </span>
      <h1 className="ui-titulo">{titulo}</h1>
      <p className="text-base">{children}</p>
      <Link href={voltar} className={buttonVariants()}>
        Voltar para {rotuloVoltar.toLowerCase()}
      </Link>
      <p className="ui-meta">
        Tentativa registrada em {dataHoraBr(registradoEm)}.
      </p>
    </div>
  );
}
