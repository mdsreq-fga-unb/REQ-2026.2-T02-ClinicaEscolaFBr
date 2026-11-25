"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import type { ConsentimentoDaInscricao } from "@clinica/shared";
import { Aviso } from "@/components/comum/aviso";
import { buttonVariants } from "@/components/ui/button";
import { api } from "@/lib/api";
import { dataHoraBr } from "@/lib/formato";
import { useSessao } from "@/lib/sessao";

export function HistoricoConsentimento({
  dados,
}: {
  dados: ConsentimentoDaInscricao;
}) {
  return (
    <section className="ui-cartao" aria-label="Histórico do consentimento">
      <h2 className="ui-h2">Histórico do consentimento</h2>
      <ol className="flex flex-col gap-4 border-l-2 border-primary pl-4">
        {dados.aceite && (
          <li>
            <strong>Aceite</strong>
            <p className="ui-meta">
              {dataHoraBr(dados.aceite.em)} · termo versão {dados.aceite.versao}{" "}
              ·{" "}
              {dados.aceite.peloResponsavel
                ? "pelo responsável legal"
                : "pelo titular"}
              , na inscrição.
            </p>
          </li>
        )}
        {dados.revogacao && (
          <li>
            <strong>Revogação</strong>
            <p className="ui-meta">
              {dataHoraBr(dados.revogacao.em)} · termo versão{" "}
              {dados.revogacao.versao} · pedida{" "}
              {dados.revogacao.solicitante === "titular"
                ? "pelo titular"
                : "pelo responsável legal"}{" "}
              · identidade confirmada{" "}
              {dados.revogacao.formaVerificacao === "documento"
                ? "com documento com foto"
                : "pelo sistema"}{" "}
              · registrada por {dados.revogacao.por}.
            </p>
          </li>
        )}
      </ol>
    </section>
  );
}

export function CartaoConsentimento({ casoId }: { casoId: string }) {
  const { data: sessao } = useSessao();
  const consulta = useQuery({
    queryKey: ["consentimento", casoId, sessao?.id],
    queryFn: () =>
      api<ConsentimentoDaInscricao>(`/casos/${casoId}/consentimento`, {
        cache: "no-store",
      }),
    enabled: !!sessao,
    retry: false,
    gcTime: 0,
  });
  if (consulta.isPending) return <p role="status">Carregando consentimento…</p>;
  if (consulta.isError || !consulta.data)
    return (
      <Aviso tipo="erro" titulo="Não foi possível consultar o consentimento.">
        <button onClick={() => void consulta.refetch()} className="underline">
          Tentar novamente
        </button>
      </Aviso>
    );
  const d = consulta.data;
  return (
    <div className="flex flex-col gap-5">
      {d.revogacao && (
        <Aviso
          tipo="alerta"
          titulo={`${d.paciente} revogou o consentimento em ${dataHoraBr(d.revogacao.em)}.`}
        >
          {d.situacao === "cancelado_por_revogacao"
            ? "A inscrição saiu da fila por revogação do consentimento."
            : "Novos agendamentos estão bloqueados e as comunicações ao titular foram suspensas. O supervisor e a coordenação conduzem o encerramento do atendimento."}
        </Aviso>
      )}
      <section
        className="ui-cartao"
        aria-label="Consentimento para tratamento de dados"
      >
        <h2 className="ui-h2">Consentimento para tratamento de dados</h2>
        <dl className="grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="ui-meta">Situação</dt>
            <dd className="font-semibold">
              {d.revogacao
                ? "Revogado"
                : d.aceite
                  ? "Aceito"
                  : "Sem aceite registrado"}
            </dd>
          </div>
          <div>
            <dt className="ui-meta">Aceite em</dt>
            <dd>{d.aceite ? dataHoraBr(d.aceite.em) : "—"}</dd>
          </div>
          <div>
            <dt className="ui-meta">Versão do termo</dt>
            <dd>{d.aceite?.versao ?? "—"}</dd>
          </div>
        </dl>
        {sessao?.perfil === "secretaria" && d.aceite && !d.revogacao && (
          <Link
            href={`/pacientes/${casoId}/revogacao`}
            className={buttonVariants({ variant: "outline" })}
          >
            Registrar revogação
          </Link>
        )}
      </section>
      {d.revogacao && <HistoricoConsentimento dados={d} />}
    </div>
  );
}
