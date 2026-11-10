"use client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, ListOrdered, HeartHandshake, Info } from "lucide-react";
import type { SituacaoInscricao, VerificacaoAtual } from "@clinica/shared";
import { Aviso } from "@/components/comum/aviso";
import { Button } from "@/components/ui/button";
import { VerificacaoIdentidade } from "@/components/verificacao/verificacao-identidade";
import { api, ErroApi } from "@/lib/api";
import { dataHoraBr } from "@/lib/formato";
const estados = {
  aguardando_triagem: {
    titulo: "Aguardando triagem",
    texto:
      "Sua inscrição foi recebida e aguarda a avaliação da equipe. Ainda não há posição na fila.",
    Icone: Clock,
  },
  na_fila: {
    titulo: "Na fila de espera",
    texto:
      "A posição pode mudar conforme a avaliação da equipe e a disponibilidade de vagas. Ela não garante uma data de atendimento.",
    Icone: ListOrdered,
  },
  em_atendimento: {
    titulo: "Em atendimento",
    texto:
      "Você já está em atendimento. Para informações sobre suas sessões, procure a secretaria.",
    Icone: HeartHandshake,
  },
  procure_secretaria: {
    titulo: "Procure a secretaria",
    texto:
      "Entre em contato com a secretaria da clínica para informações sobre sua inscrição.",
    Icone: Info,
  },
};
export function CartaoSituacao({ dados }: { dados: SituacaoInscricao }) {
  const { titulo, texto, Icone } = estados[dados.situacao];
  return (
    <section
      role="status"
      aria-live="polite"
      className="space-y-4 rounded-xl border bg-card p-6"
    >
      <h2 className="flex items-center gap-2 text-xl font-bold">
        <Icone aria-hidden className="size-6 shrink-0" />
        {titulo}
      </h2>
      <p>
        Inscrição <strong>{dados.numero}</strong>
      </p>
      {dados.posicao !== null && (
        <p className="text-lg">
          Sua posição na fila:{" "}
          <strong className="text-3xl">{dados.posicao}ª</strong>
        </p>
      )}
      <p>{texto}</p>
      <p className="text-sm text-muted-foreground">
        Consulta feita em {dataHoraBr(dados.consultadaEm)} (horário de
        Brasília).
      </p>
    </section>
  );
}
export function MinhaSituacao({
  verificacao,
}: {
  verificacao: VerificacaoAtual;
}) {
  const [expirada, setExpirada] = useState(false);
  useEffect(() => {
    const timer = setTimeout(
      () => setExpirada(true),
      Math.max(0, Date.parse(verificacao.expiraEm) - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [verificacao.expiraEm]);
  const consulta = useQuery({
    queryKey: ["situacao-inscricao", verificacao.numero, verificacao.expiraEm],
    queryFn: () =>
      api<SituacaoInscricao>("/fila/minha-situacao", { cache: "no-store" }),
    retry: false,
    staleTime: 0,
    gcTime: 0,
    enabled: !expirada,
  });
  if (
    expirada ||
    (consulta.error instanceof ErroApi && consulta.error.status === 401)
  )
    return (
      <Aviso
        tipo="erro"
        titulo="Confirme sua identidade para consultar a inscrição."
        focar
      >
        <p>A verificação expirou ou foi encerrada.</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Confirmar identidade
        </Button>
      </Aviso>
    );
  if (consulta.isError)
    return (
      <Aviso
        tipo="erro"
        titulo="Não foi possível consultar sua inscrição."
        focar
      >
        <Button variant="outline" onClick={() => void consulta.refetch()}>
          Tentar novamente
        </Button>
      </Aviso>
    );
  if (!consulta.data) return <p role="status">Consultando sua inscrição…</p>;
  return (
    <>
      <CartaoSituacao dados={consulta.data} />
      <Button
        variant="outline"
        disabled={consulta.isFetching}
        onClick={() => void consulta.refetch()}
      >
        {consulta.isFetching ? "Atualizando…" : "Atualizar situação"}
      </Button>
    </>
  );
}
export function ConsultaInscricao() {
  return (
    <VerificacaoIdentidade>
      {(v) => <MinhaSituacao key={v.expiraEm} verificacao={v} />}
    </VerificacaoIdentidade>
  );
}
