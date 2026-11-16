"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Aviso } from "@/components/comum/aviso";
import { AcessoNegadoAoProntuario } from "@/components/prontuario/acesso-negado";
import {
  camposDaFicha,
  diaBr,
  FormularioCorrecaoEvolucao,
  VersoesEvolucao,
} from "@/components/prontuario/correcao-evolucao";
import type { EvolucaoRegistrada } from "@/components/prontuario/fichas";
import { buttonVariants } from "@/components/ui/button";
import { api, ErroApi } from "@/lib/api";
import { dataHoraBr } from "@/lib/formato";
import { useSessao } from "@/lib/sessao";

type Consulta = {
  id: string;
  nome: string;
  sessoes: {
    id: string;
    inicio: string;
    numeroNoCiclo: number | null;
    evolucao: EvolucaoRegistrada | null;
  }[];
};

// Correção de evolução registrada (RF29), aberta pelo "Corrigir evolução" do
// prontuário. A versão original continua guardada.
export default function CorrigirEvolucaoPage() {
  const { id, evolucaoId } = useParams<{ id: string; evolucaoId: string }>();
  const router = useRouter();
  const { data: usuario } = useSessao();
  const [corrigida, setCorrigida] = useState<number | null>(null);
  const consulta = useQuery({
    queryKey: ["prontuario", id],
    queryFn: () => api<Consulta>(`/prontuarios/${id}`),
    retry: false,
  });
  const voltar = `/prontuarios/${id}#evolucoes`;

  if (consulta.isPending) return <p role="status">Carregando evolução…</p>;
  if (consulta.error instanceof ErroApi && consulta.error.status === 403)
    return <AcessoNegadoAoProntuario perfil={usuario?.perfil} />;
  if (consulta.isError || !consulta.data)
    return (
      <Aviso
        tipo="erro"
        titulo="Não foi possível abrir a correção da evolução."
      />
    );

  const paciente = consulta.data;
  const sessao = paciente.sessoes.find(
    (item) => item.evolucao?.id === evolucaoId,
  );
  // A pessoa já tem acesso ao prontuário: só a evolução não pertence a ele.
  if (!sessao?.evolucao)
    return <Aviso tipo="erro" titulo="Você não tem acesso a esta evolução." />;
  const evolucao = sessao.evolucao;
  const numero = sessao.numeroNoCiclo ?? "—";
  const correcao = evolucao.correcao;

  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-6">
      <nav aria-label="Você está em" className="ui-trilha">
        <Link href={voltar}>Prontuário</Link>
        <span aria-hidden>›</span>
        <span aria-current="page">Corrigir evolução</span>
      </nav>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="ui-titulo">Corrigir evolução da sessão {numero}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {paciente.nome} · {dataHoraBr(sessao.inicio)} · registrada por{" "}
            {evolucao.registradaPor}
          </p>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <Lock aria-hidden className="size-4" /> Conteúdo clínico restrito
          </p>
        </div>
        <Link href={voltar} className={buttonVariants({ variant: "outline" })}>
          <ArrowLeft aria-hidden className="size-4" /> Voltar ao prontuário
        </Link>
      </header>

      {corrigida !== null ? (
        <>
          <Aviso
            tipo="sucesso"
            titulo={`Correção salva. A versão ${corrigida} da evolução da sessão ${numero} já está no prontuário.`}
            focar
          />
          <section aria-labelledby="titulo-versoes" className="ui-cartao">
            <h2 id="titulo-versoes" className="ui-h2">
              Evolução da sessão {numero}
            </h2>
            <VersoesEvolucao
              versoes={evolucao.versoes ?? []}
              campos={camposDaFicha(evolucao)}
            />
          </section>
        </>
      ) : correcao?.prazoEncerrado && correcao.dataLimite ? (
        <Aviso
          tipo="alerta"
          titulo={`O prazo para corrigir evoluções deste semestre terminou em ${diaBr(correcao.dataLimite)}.`}
        />
      ) : !correcao?.permitida ? (
        <Aviso tipo="erro" titulo="Você não pode corrigir esta evolução." />
      ) : (
        <section aria-labelledby="titulo-correcao" className="ui-cartao">
          <h2 id="titulo-correcao" className="sr-only">
            Dados da correção
          </h2>
          <Aviso
            tipo="info"
            className="mb-4"
            titulo={
              correcao.dataLimite
                ? `A correção é permitida até ${diaBr(correcao.dataLimite)}. A versão original continua guardada no histórico.`
                : "A versão original continua guardada no histórico."
            }
          />
          <FormularioCorrecaoEvolucao
            prontuarioId={id}
            evolucao={evolucao}
            aoCancelar={() => router.push(voltar)}
            aoCorrigir={({ versao }) => setCorrigida(versao)}
          />
        </section>
      )}
    </div>
  );
}
