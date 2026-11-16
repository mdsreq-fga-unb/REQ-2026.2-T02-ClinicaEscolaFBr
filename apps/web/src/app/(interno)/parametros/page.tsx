"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { inicioDoPerfil } from "@/components/layout/menu";
import { CartaoDataLimiteCorrecao } from "@/components/prontuario/correcao-evolucao";
import { buttonVariants } from "@/components/ui/button";
import { useSessao } from "@/lib/sessao";

// Parâmetros alterados pela coordenação. Por enquanto, a data-limite para corrigir
// evoluções (RF29); o RF41 acrescenta o valor da contribuição social nesta página.
export default function ParametrosPage() {
  const { data: sessao } = useSessao();

  if (!sessao) return <p role="status">Carregando…</p>;
  if (sessao.perfil !== "coordenacao") {
    return (
      <div className="mx-auto mt-10 flex max-w-[560px] flex-col items-start gap-3 rounded-xl border bg-card p-8">
        <span aria-hidden className="ui-vazio-icone">
          <Lock className="size-6" />
        </span>
        <h1 className="ui-h2">Você não tem acesso aos parâmetros</h1>
        <p className="ui-subtitulo m-0">
          Os parâmetros são alterados só pela coordenação da clínica.
        </p>
        <Link
          href={inicioDoPerfil(sessao.perfil)}
          className={buttonVariants({ variant: "link", className: "px-0" })}
        >
          Voltar para a página inicial
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-6">
      <header>
        <h1 className="ui-titulo">Parâmetros</h1>
        <p className="ui-subtitulo">
          Valores que a coordenação define para o funcionamento da clínica.
        </p>
      </header>
      <CartaoDataLimiteCorrecao />
    </div>
  );
}
