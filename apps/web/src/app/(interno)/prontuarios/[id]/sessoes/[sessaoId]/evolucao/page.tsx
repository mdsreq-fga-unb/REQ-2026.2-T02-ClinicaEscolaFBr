"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Lock, PencilLine } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  CAMPOS_EVOLUCAO,
  CAMPOS_EVOLUCAO_ANTIGA,
  type StatusSessao,
} from "@clinica/shared";
import { Aviso } from "@/components/comum/aviso";
import { AcessoNegadoAoProntuario } from "@/components/prontuario/acesso-negado";
import {
  ComplementosEvolucao,
  LinhaDoTempoEvolucao,
} from "@/components/prontuario/complementos-evolucao";
import {
  FormularioEvolucao,
  NAO_INFORMADO,
  type EvolucaoRegistrada,
} from "@/components/prontuario/fichas";
import {
  SeloValidacao,
  ValidacaoDaEvolucao,
} from "@/components/prontuario/validacao-evolucao";
import { buttonVariants } from "@/components/ui/button";
import { api, ErroApi } from "@/lib/api";
import { dataHoraBr } from "@/lib/formato";
import { useSessao } from "@/lib/sessao";

// Resposta do GET /prontuarios/:id/sessoes/:sessaoId/evolucao (RF31).
type EvolucaoDaSessao = {
  prontuarioId: string;
  casoId: string;
  paciente: string;
  supervisor: string | null;
  sessao: {
    id: string;
    inicio: string;
    status: StatusSessao;
    numeroNoCiclo: number | null;
    estagiarioId: string;
    estagiario: string;
  };
  evolucao: EvolucaoRegistrada | null;
  acoes: {
    registrar: boolean;
    corrigir: boolean;
    complementar: boolean;
    validar: boolean;
  };
};

// Conteúdo atual: os campos da versão vigente (RF29). As evoluções anteriores à
// DF38 aparecem com os rótulos antigos.
function ConteudoAtual({ evolucao }: { evolucao: EvolucaoRegistrada }) {
  const campos =
    evolucao.humorAparencia !== null ? CAMPOS_EVOLUCAO : CAMPOS_EVOLUCAO_ANTIGA;
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {campos.map(([campo, rotulo]) => (
        <div key={campo} className="min-w-0">
          <dt className="text-[13px] font-semibold text-muted-foreground">
            {rotulo}
          </dt>
          <dd className="mt-0.5 text-[15px] whitespace-pre-wrap [overflow-wrap:anywhere]">
            {evolucao[campo] ?? NAO_INFORMADO}
          </dd>
        </div>
      ))}
    </dl>
  );
}

// Evolução de uma sessão (RF31, prancha 6-3): o conteúdo atual com a situação da
// validação (RF67), o histórico desta evolução, com o original, as correções (RF29)
// e os complementos (RF30), e as ações de quem pode. Sem evolução, o estagiário
// responsável registra a da sessão realizada (RF28).
export default function EvolucaoDaSessaoPage() {
  const { id, sessaoId } = useParams<{ id: string; sessaoId: string }>();
  const { data: usuario } = useSessao();
  const [registrada, setRegistrada] = useState<{
    numeroNoCiclo: number;
    fechamentoAvaliativo: boolean;
  } | null>(null);
  const [conflito, setConflito] = useState(false);
  // A chave começa com o prontuário: o registro, a correção, o complemento e a
  // validação atualizam esta página junto com o prontuário.
  const consulta = useQuery({
    queryKey: ["prontuario", id, "sessao", sessaoId],
    queryFn: () =>
      api<EvolucaoDaSessao>(`/prontuarios/${id}/sessoes/${sessaoId}/evolucao`),
    retry: false,
  });
  const voltar = `/prontuarios/${id}#sessoes-ciclo`;

  if (consulta.isPending) return <p role="status">Carregando sessão…</p>;
  if (consulta.error instanceof ErroApi && consulta.error.status === 403)
    return <AcessoNegadoAoProntuario perfil={usuario?.perfil} />;
  if (consulta.isError || !consulta.data)
    return (
      <Aviso
        tipo="erro"
        titulo="Não foi possível abrir a evolução da sessão."
      />
    );

  const { paciente, supervisor, sessao, evolucao, acoes } = consulta.data;
  const numero = sessao.numeroNoCiclo;
  const titulo = evolucao
    ? `Evolução da sessão ${numero ?? ""}`.trim()
    : "Registro de evolução";
  const coordenacao = usuario?.perfil === "coordenacao";

  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-6">
      <nav aria-label="Você está em" className="ui-trilha">
        <Link href={voltar}>Prontuário</Link>
        <span aria-hidden>›</span>
        <span aria-current="page">{titulo}</span>
      </nav>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="ui-titulo">{titulo}</h1>
          {evolucao && (
            <p className="mt-1 text-[15px] text-muted-foreground [overflow-wrap:anywhere]">
              {paciente} · {dataHoraBr(sessao.inicio)} · estagiário(a){" "}
              {sessao.estagiario} · supervisor(a){" "}
              {supervisor ?? "não identificado"}
            </p>
          )}
          <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Lock aria-hidden className="size-4" /> Conteúdo clínico restrito
          </p>
        </div>
        <Link href={voltar} className={buttonVariants({ variant: "outline" })}>
          <ArrowLeft aria-hidden className="size-4" />{" "}
          {evolucao ? "Voltar ao prontuário" : "Cancelar"}
        </Link>
      </header>

      {coordenacao && evolucao && (
        <Aviso tipo="info" titulo="Você está consultando como coordenação.">
          A consulta fica no registro de acessos ao prontuário (RF56), e não há
          ações de corrigir nem de complementar.
        </Aviso>
      )}
      {registrada && (
        <Aviso
          tipo="sucesso"
          titulo={`Evolução registrada. A evolução da sessão nº ${registrada.numeroNoCiclo} já está no prontuário.`}
          focar
        >
          {registrada.fechamentoAvaliativo &&
            "Esta sessão também atingiu o marco do fechamento avaliativo do ciclo."}
        </Aviso>
      )}
      {conflito && (
        <Aviso
          tipo="info"
          titulo="Esta sessão já tinha uma evolução. O registro existente foi carregado."
          focar
        />
      )}

      {evolucao ? (
        <>
          <section aria-labelledby="conteudo-atual" className="ui-cartao">
            <div className="flex flex-wrap items-center gap-3">
              <h2 id="conteudo-atual" className="ui-h2">
                Conteúdo atual
              </h2>
              {evolucao.validacao && (
                <SeloValidacao situacao={evolucao.validacao.situacao} />
              )}
            </div>
            <ConteudoAtual evolucao={evolucao} />
            <ValidacaoDaEvolucao
              prontuarioId={id}
              evolucao={evolucao}
              numeroNoCiclo={numero}
              supervisor={supervisor}
            />
          </section>
          <section aria-labelledby="historico-evolucao" className="ui-cartao">
            <h2 id="historico-evolucao" className="ui-h2">
              Histórico desta evolução
            </h2>
            <LinhaDoTempoEvolucao evolucao={evolucao} />
          </section>
          {(acoes.corrigir || acoes.complementar) && (
            // Lado a lado, como na prancha 6-3; o formulário do complemento, quando
            // aberto, ocupa a linha inteira.
            <div className="flex flex-wrap items-start gap-3">
              {acoes.corrigir && (
                <Link
                  href={`/prontuarios/${id}/evolucoes/${evolucao.id}/corrigir`}
                  className={`${buttonVariants({ variant: "outline" })} w-fit max-sm:w-full`}
                  aria-label={`Corrigir evolução da sessão ${numero ?? ""}`.trim()}
                >
                  <PencilLine aria-hidden className="size-4" /> Corrigir
                  evolução
                </Link>
              )}
              {acoes.complementar && (
                <ComplementosEvolucao
                  prontuarioId={id}
                  evolucao={evolucao}
                  numeroNoCiclo={numero}
                  soAcao
                />
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <section aria-labelledby="dados-sessao" className="ui-cartao">
            <h2 id="dados-sessao" className="ui-h2">
              Dados da sessão
            </h2>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["Paciente", paciente],
                ["Sessão no ciclo", numero ? `${numero}ª` : "Não numerada"],
                ["Data e horário", dataHoraBr(sessao.inicio)],
                [
                  "Comparecimento",
                  sessao.status === "realizada" ? "Sim" : "Não registrado",
                ],
                ["Estagiário", sessao.estagiario],
                ["Supervisor", supervisor ?? "Não identificado"],
              ].map(([rotulo, valor]) => (
                <div key={rotulo}>
                  <dt className="ui-rotulo">{rotulo}</dt>
                  <dd className="mt-1 text-[15px]">{valor}</dd>
                </div>
              ))}
            </dl>
          </section>
          {acoes.registrar ? (
            <section aria-labelledby="form-evolucao" className="ui-cartao">
              <h2 id="form-evolucao" className="sr-only">
                Dados da evolução
              </h2>
              <FormularioEvolucao
                prontuarioId={id}
                sessaoId={sessao.id}
                inicio={sessao.inicio}
                numeroNoCiclo={numero}
                paciente={paciente}
                estagiario={sessao.estagiario}
                supervisor={supervisor ?? "Não identificado"}
                aoRegistrar={setRegistrada}
                aoConflitar={() => setConflito(true)}
                ocultarDadosDaSessao
              />
            </section>
          ) : sessao.status !== "realizada" ? (
            <Aviso
              tipo="alerta"
              titulo="A evolução só pode ser registrada depois que a sessão for marcada como realizada."
            />
          ) : (
            <Aviso
              tipo="info"
              titulo="Ainda não há evolução registrada para esta sessão."
            >
              {usuario?.perfil === "estagiario"
                ? "Só o estagiário que atendeu a sessão registra a evolução."
                : "O registro é feito pelo estagiário que atendeu a sessão."}
            </Aviso>
          )}
        </>
      )}
    </div>
  );
}
