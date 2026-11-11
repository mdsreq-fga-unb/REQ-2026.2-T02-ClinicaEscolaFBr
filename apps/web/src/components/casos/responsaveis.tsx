"use client";
import { Check, Clock, User } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  situacaoDistribuicao,
  type Perfil,
  type ResponsaveisDoCaso,
  type SituacaoDistribuicao,
} from "@clinica/shared";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const NOMES_SITUACAO_DISTRIBUICAO: Record<SituacaoDistribuicao, string> =
  {
    distribuido: "Distribuído",
    aguardando_estagiario: "Aguardando vínculo de estagiário",
    pendente: "Pendente de distribuição",
  };

const ESTILO_PENDENTE = "border-[#f0cf9f] bg-alerta-fundo text-[#8a4600]";
const ESTILO_DISTRIBUIDO = "border-[#a3d4b3] bg-[#e5f4ea] text-[#1b5e33]";

// Selo da situação de distribuição (prancha 2-3): verde com o visto quando o caso
// tem os dois responsáveis; laranja com o relógio quando falta algum. O texto diz
// a situação, sem depender só da cor (RNF1).
export function SeloDistribuicao({
  situacao,
}: {
  situacao: SituacaoDistribuicao;
}) {
  const Icone = situacao === "distribuido" ? Check : Clock;
  return (
    <span
      className={cn(
        "ui-selo max-w-full whitespace-normal",
        situacao === "distribuido" ? ESTILO_DISTRIBUIDO : ESTILO_PENDENTE,
      )}
    >
      <Icone aria-hidden className="size-3.5 shrink-0" />
      {NOMES_SITUACAO_DISTRIBUICAO[situacao]}
    </span>
  );
}

// Nome do responsável na lista, ou "—" quando falta: a pendência fica no selo da
// situação de distribuição.
export function NomeDoResponsavel({ nome }: { nome: string | null }) {
  return <>{nome ?? "—"}</>;
}

// Cartão de um responsável: o ícone de pessoa e o nome, ou o relógio e o selo da
// pendência, sem nome no campo que falta (RF22).
function CartaoResponsavel({
  rotulo,
  nome,
  pendencia,
}: {
  rotulo: string;
  nome: string | null;
  pendencia: SituacaoDistribuicao;
}) {
  const Icone = nome ? User : Clock;
  return (
    <div className="flex min-w-0 items-center gap-3.5 rounded-[12px] border border-border bg-muted px-4 py-3.5">
      <span
        aria-hidden
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full",
          nome ? "bg-accent text-marca" : "bg-alerta-fundo text-[#8a4600]",
        )}
      >
        <Icone className="size-5" />
      </span>
      <dl className="min-w-0">
        <dt className="text-[13px] font-semibold text-muted-foreground">
          {rotulo}
        </dt>
        <dd className="mt-0.5 text-[17px] font-semibold break-words">
          {nome ?? <SeloDistribuicao situacao={pendencia} />}
        </dd>
      </dl>
    </div>
  );
}

// Quadro "Responsáveis pelo caso" da ficha do paciente (RF22, prancha 2-3): só os
// nomes do estagiário e do supervisor, sem dado clínico (RNF17). Quando falta
// alguém, mostra a orientação e a ação de quem pode resolver: a coordenação vai à
// distribuição; o supervisor do caso vincula o estagiário. Outras ações sobre os
// responsáveis, como a transferência (RF25), entram em `acoes`.
export function QuadroResponsaveis({
  responsaveis,
  perfil,
  aoVincular,
  acoes,
}: {
  responsaveis: ResponsaveisDoCaso;
  perfil: Perfil | undefined;
  aoVincular?: () => void;
  acoes?: ReactNode;
}) {
  const situacao = situacaoDistribuicao(responsaveis);
  const orientacao =
    perfil === "coordenacao" && situacao === "pendente"
      ? {
          texto: "O caso ainda não foi distribuído a um supervisor.",
          acao: (
            <Link
              href="/distribuicao"
              className={buttonVariants({
                variant: "outline",
                className: "w-fit max-sm:w-full",
              })}
            >
              Ir para Distribuição de casos
            </Link>
          ),
        }
      : perfil === "supervisor" &&
          situacao === "aguardando_estagiario" &&
          aoVincular
        ? {
            texto:
              "O caso fica aguardando o vínculo até você vincular um estagiário.",
            acao: (
              <Button className="w-fit max-sm:w-full" onClick={aoVincular}>
                Vincular estagiário
              </Button>
            ),
          }
        : null;
  return (
    <section aria-labelledby="responsaveis" className="ui-cartao">
      <h2 id="responsaveis" className="ui-h2">
        Responsáveis pelo caso
      </h2>
      <div className="grid gap-3 md:grid-cols-2">
        <CartaoResponsavel
          rotulo="Estagiário responsável"
          nome={responsaveis.estagiario}
          pendencia={situacao}
        />
        <CartaoResponsavel
          rotulo="Supervisor responsável"
          nome={responsaveis.supervisor}
          pendencia={situacao}
        />
      </div>
      {orientacao && (
        <div className="flex flex-col gap-3">
          <p className="text-[15px] text-muted-foreground">
            {orientacao.texto}
          </p>
          {orientacao.acao}
        </div>
      )}
      {acoes && (
        <div className="flex flex-wrap gap-3 max-sm:[&>*]:w-full">{acoes}</div>
      )}
    </section>
  );
}
