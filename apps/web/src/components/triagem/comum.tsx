"use client";
import { useQuery } from "@tanstack/react-query";
import type { Cor, Perfil } from "@clinica/shared";
import { MinusCircle } from "lucide-react";
import Link from "next/link";
import { Aviso } from "@/components/comum/aviso";
import { ESTILOS_PRIORIDADE, Prioridade } from "@/components/casos/prioridade";
import { api } from "@/lib/api";
import { dataBr, horaBr } from "@/lib/formato";
import { NOMES_PERFIL, useSessao } from "@/lib/sessao";
import { cn } from "@/lib/utils";

export type Declaracao = {
  queixa: string | null;
  percepcaoUrgencia: string | null;
  historicoRelevante: string | null;
};

export type DecisaoPrioridade = {
  prioridade: Cor;
  decisor: string;
  perfilDecisor?: Perfil;
  decididaEm: string;
};

export type InscricaoDaTriagem = {
  id: string;
  numero: string;
  criadaEm: string;
  diasAguardando: number;
  declaracaoInteressado: Declaracao;
  historico: DecisaoPrioridade[];
};

export const CORES = ["vermelha", "amarela", "verde"] as const;

// Referência da clínica para cada prioridade, só como apoio à decisão da equipe.
export const REFERENCIA: Record<Cor, string> = {
  vermelha:
    "Quadro clínico já caracterizado (por exemplo, depressão ou ansiedade), especialmente com uso de medicação.",
  amarela:
    "Sofrimento emocional pontual, sem quadro caracterizado e sem medicação (por exemplo, luto).",
  verde:
    "Sem indício de adoecimento; busca de desenvolvimento pessoal. Atendida só se houver vaga.",
};

// "Hoje", "1 dia", "17 dias".
export const tempoAguardando = (dias: number) =>
  dias === 0 ? "Hoje" : dias === 1 ? "1 dia" : `${dias} dias`;

// "06/10/2026 às 18:02", no horário de Brasília.
export const dataEHora = (iso: string) =>
  `${dataBr(iso)} às ${horaBr(new Date(iso))}`;

// Só a equipe clínica (supervisores e coordenação) vê a triagem (RF4).
export function useTriagemAutorizada() {
  const { data: sessao } = useSessao();
  const autorizado =
    sessao?.perfil === "supervisor" || sessao?.perfil === "coordenacao";
  return { sessao, autorizado, negado: !!sessao && !autorizado };
}

export function AcessoRestrito() {
  return (
    <Aviso
      tipo="erro"
      titulo="Acesso restrito aos supervisores e à coordenação."
    />
  );
}

export function useInscricao(id: string, habilitada: boolean) {
  return useQuery({
    queryKey: ["triagem", "inscricao", id],
    queryFn: () => api<InscricaoDaTriagem>(`/triagem/inscricoes/${id}`),
    enabled: habilitada,
    retry: false,
  });
}

export function Trilha({ numero }: { numero: string }) {
  return (
    <nav aria-label="Você está em" className="ui-trilha">
      <Link href="/triagem">Triagem</Link>
      <span aria-hidden>›</span>
      <span aria-current="page">Inscrição {numero}</span>
    </nav>
  );
}

// Resposta do interessado; sem resposta, aparece como ausente (RF4).
export function Resposta({ valor }: { valor: string | null }) {
  return valor ? (
    <span className="whitespace-pre-wrap">{valor}</span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground italic">
      <MinusCircle aria-hidden className="size-4" />
      Não informado
    </span>
  );
}

// Histórico de decisões de prioridade, da mais recente para a mais antiga (RF6).
export function HistoricoDecisoes({
  historico,
  marcarAtual = false,
}: {
  historico: DecisaoPrioridade[];
  marcarAtual?: boolean;
}) {
  return (
    <>
      <ol className="divide-y divide-border border-t border-border md:hidden">
        {historico.map((decisao, indice) => (
          <li
            key={`${decisao.decididaEm}-${indice}`}
            className="flex flex-col gap-1 px-4 py-3"
          >
            <span className="flex items-center gap-2">
              <Prioridade cor={decisao.prioridade} />
              {marcarAtual && indice === 0 && (
                <span className="ui-meta">Atual</span>
              )}
            </span>
            <span className="text-[15px]">
              {decisao.decisor}
              {decisao.perfilDecisor && (
                <span className="ui-meta">
                  {" "}
                  · {NOMES_PERFIL[decisao.perfilDecisor]}
                </span>
              )}
            </span>
            <span className="ui-meta">{dataEHora(decisao.decididaEm)}</span>
          </li>
        ))}
      </ol>
      <table className="ui-tabela max-md:hidden">
        <caption className="sr-only">
          Histórico de decisões de prioridade
        </caption>
        <thead>
          <tr>
            <th scope="col">Prioridade</th>
            <th scope="col">Decidido por</th>
            <th scope="col">Data e hora</th>
          </tr>
        </thead>
        <tbody>
          {historico.map((decisao, indice) => (
            <tr key={`${decisao.decididaEm}-${indice}`}>
              <td>
                <Prioridade cor={decisao.prioridade} />
                {marcarAtual && indice === 0 && (
                  <div className="ui-meta">Atual</div>
                )}
              </td>
              <td>
                {decisao.decisor}
                {decisao.perfilDecisor && (
                  <span className="ui-meta">
                    {" "}
                    · {NOMES_PERFIL[decisao.perfilDecisor]}
                  </span>
                )}
              </td>
              <td>{dataEHora(decisao.decididaEm)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

// Referência da clínica, ao lado das opções de prioridade.
export function ReferenciaClinica({ className }: { className?: string }) {
  return (
    <aside
      aria-labelledby="referencia-titulo"
      className={cn(
        "flex flex-col gap-3.5 rounded-[12px] border border-border bg-muted p-5",
        className,
      )}
    >
      <h3 id="referencia-titulo" className="text-[15px] font-bold text-marca">
        Referência da clínica
      </h3>
      <dl className="flex flex-col gap-3">
        {CORES.map((cor) => (
          <div key={cor}>
            <dt className="flex items-center gap-2 text-[15px] font-bold">
              <span
                aria-hidden
                className={cn(
                  "size-2.5 rounded-full",
                  ESTILOS_PRIORIDADE[cor].ponto,
                )}
              />
              {ESTILOS_PRIORIDADE[cor].rotulo}
            </dt>
            <dd className="mt-0.5 ml-[18px] text-sm leading-normal">
              {REFERENCIA[cor]}
            </dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
