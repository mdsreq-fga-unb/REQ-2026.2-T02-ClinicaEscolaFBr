"use client";

import { ClipboardList, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Aviso } from "@/components/comum/aviso";
import { Prioridade } from "@/components/casos/prioridade";
import {
  AcessoRestrito,
  dataEHora,
  HistoricoDecisoes,
  Resposta,
  tempoAguardando,
  Trilha,
  useInscricao,
  useTriagemAutorizada,
} from "@/components/triagem/comum";
import { buttonVariants } from "@/components/ui/button";

// Inscrição aberta na triagem (RF4): a declaração do interessado fica separada
// da avaliação da equipe, que registra a prioridade clínica (RF6).
export default function InscricaoTriagemPage() {
  const { id } = useParams<{ id: string }>();
  const { autorizado, negado } = useTriagemAutorizada();
  const consulta = useInscricao(id, autorizado);

  if (negado) return <AcessoRestrito />;
  if (consulta.isPending) return <p role="status">Carregando inscrição…</p>;
  if (consulta.isError || !consulta.data)
    return <Aviso tipo="erro" titulo="Não foi possível abrir a inscrição." />;

  const inscricao = consulta.data;
  const { queixa, percepcaoUrgencia, historicoRelevante } =
    inscricao.declaracaoInteressado;
  const vigente = inscricao.historico[0];
  return (
    <div className="flex flex-col gap-6">
      <Trilha numero={inscricao.numero} />
      <div>
        <h1 className="ui-titulo">Inscrição {inscricao.numero}</h1>
        <p className="ui-subtitulo">
          Recebida em {dataEHora(inscricao.criadaEm)}
          {!vigente &&
            ` · aguardando triagem há ${tempoAguardando(inscricao.diasAguardando).toLowerCase()}`}
        </p>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section
          aria-labelledby="declaracao-titulo"
          className="flex flex-col gap-[18px] rounded-[12px] border border-[#a9cfe0] bg-info-fundo p-4 md:p-6"
        >
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="grid size-10 shrink-0 place-items-center rounded-[10px] border border-[#a9cfe0] bg-white text-primary"
            >
              <MessageSquare className="size-5" />
            </span>
            <div>
              <h2 id="declaracao-titulo" className="ui-h2">
                Declarado pelo interessado
              </h2>
              <p className="ui-subtitulo mt-0.5">
                Respostas enviadas pelo próprio interessado na inscrição, sem
                edição. Não são avaliação da equipe.
              </p>
            </div>
          </div>
          <dl className="flex flex-col gap-3">
            {(
              [
                ["Motivo da busca pelo atendimento", queixa],
                ["Percepção de urgência", percepcaoUrgencia],
                ["Histórico relevante", historicoRelevante],
              ] as const
            ).map(([rotulo, valor]) => (
              <div
                key={rotulo}
                className="rounded-lg border border-[#cfe3ec] bg-white px-4 py-3.5"
              >
                <dt className="mb-1 text-[13px] font-semibold text-muted-foreground">
                  {rotulo}
                </dt>
                <dd className="text-base leading-[1.55]">
                  <Resposta valor={valor} />
                </dd>
              </div>
            ))}
          </dl>
        </section>
        <section
          aria-labelledby="avaliacao-titulo"
          className="ui-cartao ui-equipe gap-4"
        >
          <div className="flex items-center gap-2.5">
            <ClipboardList aria-hidden className="size-5 text-marca" />
            <h2 id="avaliacao-titulo" className="ui-h2">
              Avaliação da equipe
            </h2>
          </div>
          {vigente ? (
            <>
              <p className="flex flex-wrap items-center gap-2 text-[15px]">
                Prioridade clínica vigente:{" "}
                <Prioridade cor={vigente.prioridade} />
              </p>
              <p className="ui-meta">
                Registrada por {vigente.decisor} em{" "}
                {dataEHora(vigente.decididaEm)}.
              </p>
              <Link
                href={`/triagem/${inscricao.id}/prioridade`}
                className={buttonVariants({ variant: "outline" })}
              >
                Registrar nova decisão
              </Link>
            </>
          ) : (
            <>
              <p className="ui-subtitulo m-0">
                Nenhuma prioridade clínica registrada para esta inscrição.
              </p>
              <Link
                href={`/triagem/${inscricao.id}/prioridade`}
                className={buttonVariants()}
              >
                Registrar prioridade clínica
              </Link>
            </>
          )}
        </section>
      </div>
      {vigente && (
        <section
          aria-labelledby="historico-titulo"
          className="ui-painel flex flex-col"
        >
          <h2 id="historico-titulo" className="ui-h2 px-5 py-4">
            Histórico de decisões
          </h2>
          <HistoricoDecisoes historico={inscricao.historico} marcarAtual />
        </section>
      )}
    </div>
  );
}
