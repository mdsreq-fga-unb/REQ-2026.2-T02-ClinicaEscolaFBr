"use client";
import { CalendarPlus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SessoesSemConfirmacao } from "@/components/confirmacao/sessoes-sem-confirmacao";
import { buttonVariants } from "@/components/ui/button";
import { useSessao } from "@/lib/sessao";

// Agenda da secretaria, com as sessões sem confirmação (RF14). A agenda do estagiário
// e a do supervisor entram com o RF11; até lá, a página não existe para eles.
export default function AgendaPage() {
  const { data: usuario, isPending } = useSessao();

  if (isPending) return <p role="status">Carregando…</p>;
  if (usuario?.perfil !== "secretaria") notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="ui-titulo">Agenda</h1>
          <p className="ui-subtitulo">
            Sessões de todos os estagiários. Os contatos dos pacientes ficam em
            Pacientes.
          </p>
        </div>
        <Link href="/agendar-sessao" className={buttonVariants()}>
          <CalendarPlus aria-hidden className="size-4" />
          Agendar sessão
        </Link>
      </div>
      <SessoesSemConfirmacao />
    </div>
  );
}
