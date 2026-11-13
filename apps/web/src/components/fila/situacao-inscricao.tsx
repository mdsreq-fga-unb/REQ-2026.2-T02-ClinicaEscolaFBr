"use client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, HeartHandshake, Info } from "lucide-react";
import type { SituacaoInscricao, VerificacaoAtual } from "@clinica/shared";
import { Aviso } from "@/components/comum/aviso";
import { Button } from "@/components/ui/button";
import { VerificacaoIdentidade } from "@/components/verificacao/verificacao-identidade";
import { api, ErroApi } from "@/lib/api";
import { dataHoraBr } from "@/lib/formato";
// Nomes confirmados pela FBr na DF55; o encaminhamento à secretaria segue pendente.
const estados = {
  em_triagem: {
    titulo: "Em triagem",
    texto:
      "Sua inscrição aguarda a chamada para o atendimento pela equipe da clínica.",
    Icone: Clock,
    classe: "bg-muted text-foreground",
  },
  em_atendimento: {
    titulo: "Em atendimento",
    texto:
      "Sua inscrição já saiu da fila de espera: o atendimento foi iniciado. Para dúvidas sobre as sessões, fale com a secretaria.",
    Icone: HeartHandshake,
    classe: "border-[#a3d4b3] bg-sucesso-fundo text-[#1b5e33]",
  },
  procure_secretaria: {
    titulo: "Procure a secretaria",
    texto:
      "Entre em contato com a secretaria da clínica para informações sobre sua inscrição.",
    Icone: Info,
    classe: "border-[#a9cfe0] bg-info-fundo text-primary",
  },
};
export function CartaoSituacao({ dados }: { dados: SituacaoInscricao }) {
  const { titulo, texto, Icone, classe } = estados[dados.situacao];
  return (
    <section
      role="status"
      aria-live="polite"
      aria-label="Situação da inscrição"
      className="ui-painel space-y-6 p-4 sm:p-6"
    >
      <dl className="flex flex-wrap gap-x-8 gap-y-4 border-b border-border pb-6">
        <div>
          <dt className="ui-dica">Número da inscrição</dt>
          <dd className="mt-1 font-semibold">{dados.numero}</dd>
        </div>
        <div>
          <dt className="ui-dica">Situação</dt>
          <dd className="mt-1">
            <span className={`ui-selo max-w-full whitespace-normal ${classe}`}>
              <Icone aria-hidden className="size-4 shrink-0" />
              {titulo}
            </span>
          </dd>
        </div>
      </dl>
      <p>{texto}</p>
      {dados.situacao === "em_triagem" && (
        <Aviso
          tipo="info"
          titulo="Estar em triagem não garante prazo nem data de atendimento."
        >
          A captação de pacientes é semestral.
        </Aviso>
      )}
      <p className="ui-dica flex items-start gap-2">
        <Clock aria-hidden className="mt-0.5 size-4 shrink-0" />
        <span>
          Consulta feita em{" "}
          {dataHoraBr(dados.consultadaEm).replace(", ", ", às ")} (horário de
          Brasília). Ao consultar de novo, você vê a situação atualizada.
        </span>
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
