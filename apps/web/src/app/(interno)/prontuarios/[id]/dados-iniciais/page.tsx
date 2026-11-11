"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import type { Anamnese } from "@clinica/shared";
import { Aviso } from "@/components/comum/aviso";
import {
  LeituraAnamnese,
  LeituraContrato,
} from "@/components/prontuario/fichas";
import { buttonVariants } from "@/components/ui/button";
import { api, ErroApi } from "@/lib/api";
import { useSessao } from "@/lib/sessao";

type DadosIniciais = {
  nome: string;
  dadosIniciais: {
    anamnese:
      | (Anamnese & {
          registradaEm: string | null;
          registradaPor: string | null;
        })
      | null;
    contrato: {
      textoLivre: string | null;
      dataAssinatura: string | null;
      aceiteTclePesquisa: boolean | null;
      viaGuardada: boolean | null;
      registradoEm: string | null;
      registradoPor: string | null;
    } | null;
  };
};

export default function DadosIniciaisPage() {
  const { id } = useParams<{ id: string }>();
  const { data: sessao } = useSessao();
  const consulta = useQuery({
    queryKey: ["prontuario", id],
    queryFn: () => api<DadosIniciais>(`/prontuarios/${id}`),
    retry: false,
  });
  const voltar =
    sessao?.perfil === "supervisor"
      ? "/meus-casos"
      : sessao?.perfil === "estagiario"
        ? "/meus-pacientes"
        : "/pacientes";

  if (consulta.isPending)
    return <p role="status">Carregando dados iniciais…</p>;
  if (consulta.error instanceof ErroApi && consulta.error.status === 403) {
    return (
      <Aviso tipo="erro" titulo="Você não tem acesso a este prontuário." />
    );
  }
  if (consulta.isError || !consulta.data)
    return (
      <Aviso tipo="erro" titulo="Não foi possível abrir os dados iniciais." />
    );

  const { nome, dadosIniciais } = consulta.data;
  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-6">
      <nav aria-label="Você está em" className="ui-trilha">
        <Link href={voltar}>Prontuários</Link>
        <span aria-hidden>›</span>
        <Link href={`/prontuarios/${id}`}>Prontuário de {nome}</Link>
        <span aria-hidden>›</span>
        <span aria-current="page">Dados iniciais</span>
      </nav>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="ui-titulo">Dados iniciais · {nome}</h1>
          <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Lock aria-hidden className="size-4" /> Só leitura · conteúdo
            clínico restrito
          </p>
        </div>
        <Link
          href={`/prontuarios/${id}#dados-iniciais`}
          className={buttonVariants({ variant: "outline" })}
        >
          <ArrowLeft aria-hidden className="size-4" /> Voltar ao prontuário
        </Link>
      </header>
      <section aria-labelledby="titulo-anamnese" className="ui-cartao">
        <h2 id="titulo-anamnese" className="ui-h2">
          Anamnese
        </h2>
        {dadosIniciais.anamnese ? (
          <LeituraAnamnese anamnese={dadosIniciais.anamnese} />
        ) : (
          <p className="ui-dica">Sem registro neste ciclo.</p>
        )}
      </section>
      <section aria-labelledby="titulo-contrato" className="ui-cartao">
        <h2 id="titulo-contrato" className="ui-h2">
          Contrato terapêutico
        </h2>
        {dadosIniciais.contrato ? (
          <LeituraContrato contrato={dadosIniciais.contrato} />
        ) : (
          <p className="ui-dica">Sem registro neste ciclo.</p>
        )}
      </section>
    </div>
  );
}
