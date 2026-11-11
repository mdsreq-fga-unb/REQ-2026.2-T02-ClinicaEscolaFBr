"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import type { StatusSessao } from "@clinica/shared";
import { Aviso } from "@/components/comum/aviso";
import {
  FormularioEvolucao,
  LeituraEvolucao,
  type EvolucaoRegistrada,
} from "@/components/prontuario/fichas";
import { buttonVariants } from "@/components/ui/button";
import { api, ErroApi } from "@/lib/api";
import { dataBr, dataHoraBr } from "@/lib/formato";
import { useSessao } from "@/lib/sessao";

type Consulta = {
  id: string;
  nome: string;
  supervisor: string | null;
  sessoes: {
    id: string;
    inicio: string;
    status: StatusSessao;
    estagiarioId: string;
    estagiario: string;
    numeroNoCiclo: number | null;
    evolucao: EvolucaoRegistrada | null;
  }[];
};

export default function RegistrarEvolucaoPage() {
  const { id, sessaoId } = useParams<{ id: string; sessaoId: string }>();
  const { data: usuario } = useSessao();
  const [registrada, setRegistrada] = useState<{
    numeroNoCiclo: number;
    fechamentoAvaliativo: boolean;
  } | null>(null);
  const [conflito, setConflito] = useState(false);
  const consulta = useQuery({
    queryKey: ["prontuario", id],
    queryFn: () => api<Consulta>(`/prontuarios/${id}`),
    retry: false,
  });
  const voltar = `/prontuarios/${id}#sessoes-ciclo`;

  if (consulta.isPending) return <p role="status">Carregando sessão…</p>;
  if (consulta.error instanceof ErroApi && consulta.error.status === 403)
    return (
      <Aviso tipo="erro" titulo="Você não tem acesso a este prontuário." />
    );
  if (consulta.isError || !consulta.data)
    return (
      <Aviso
        tipo="erro"
        titulo="Não foi possível abrir o registro de evolução."
      />
    );

  const paciente = consulta.data;
  const sessao = paciente.sessoes.find((item) => item.id === sessaoId);
  if (!sessao)
    return <Aviso tipo="erro" titulo="Você não tem acesso a esta sessão." />;
  const podeRegistrar =
    usuario?.perfil === "estagiario" && sessao.estagiarioId === usuario.id;

  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-6">
      <nav aria-label="Você está em" className="ui-trilha">
        <Link href={voltar}>Prontuário</Link>
        <span aria-hidden>›</span>
        <span aria-current="page">Registro de evolução</span>
      </nav>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="ui-titulo">Registro de evolução</h1>
          <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Lock aria-hidden className="size-4" /> Conteúdo clínico restrito
          </p>
        </div>
        <Link href={voltar} className={buttonVariants({ variant: "outline" })}>
          <ArrowLeft aria-hidden className="size-4" /> Cancelar
        </Link>
      </header>
      <section aria-labelledby="dados-sessao" className="ui-cartao">
        <h2 id="dados-sessao" className="ui-h2">
          Dados da sessão
        </h2>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Paciente", paciente.nome],
            [
              "Sessão no ciclo",
              sessao.numeroNoCiclo
                ? `${sessao.numeroNoCiclo}ª`
                : "Não numerada",
            ],
            ["Data e horário", dataHoraBr(sessao.inicio)],
            [
              "Comparecimento",
              sessao.status === "realizada" ? "Sim" : "Não registrado",
            ],
            ["Estagiário", sessao.estagiario],
            ["Supervisor", paciente.supervisor ?? "Não identificado"],
          ].map(([rotulo, valor]) => (
            <div key={rotulo}>
              <dt className="ui-rotulo">{rotulo}</dt>
              <dd className="mt-1 text-[15px]">{valor}</dd>
            </div>
          ))}
        </dl>
      </section>
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
      {sessao.evolucao ? (
        <section aria-labelledby="evolucao-salva" className="ui-cartao">
          <h2 id="evolucao-salva" className="ui-h2">
            Evolução registrada · {dataBr(sessao.inicio)}
          </h2>
          <details open>
            <summary className="cursor-pointer font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              Ver evolução da sessão nº {sessao.numeroNoCiclo ?? "—"}
            </summary>
            <LeituraEvolucao
              evolucao={sessao.evolucao}
              inicio={sessao.inicio}
              numeroNoCiclo={sessao.numeroNoCiclo}
            />
          </details>
        </section>
      ) : !podeRegistrar ? (
        <Aviso
          tipo="erro"
          titulo="Você não tem acesso para registrar esta evolução."
        />
      ) : sessao.status !== "realizada" ? (
        <Aviso
          tipo="alerta"
          titulo="A evolução só pode ser registrada depois que a sessão for marcada como realizada."
        />
      ) : (
        <section aria-labelledby="form-evolucao" className="ui-cartao">
          <h2 id="form-evolucao" className="sr-only">
            Dados da evolução
          </h2>
          <FormularioEvolucao
            prontuarioId={id}
            sessaoId={sessao.id}
            inicio={sessao.inicio}
            numeroNoCiclo={sessao.numeroNoCiclo}
            paciente={paciente.nome}
            estagiario={sessao.estagiario}
            supervisor={paciente.supervisor ?? "Não identificado"}
            aoRegistrar={setRegistrada}
            aoConflitar={() => setConflito(true)}
            ocultarDadosDaSessao
          />
        </section>
      )}
    </div>
  );
}
