"use client";
import { useQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Aviso } from "@/components/comum/aviso";
import { Dados } from "@/components/comum/dados";
import { buttonVariants } from "@/components/ui/button";
import { api, ErroApi } from "@/lib/api";
import { dataBr, dataHoraBr, idade, NOMES_SITUACAO_CASO } from "@/lib/formato";
import { useSessao } from "@/lib/sessao";

type Prontuario = {
  id: string;
  cicloAtendimento: number;
  criadoEm: string;
  numeroInscricao: string;
  nome: string;
  dataNascimento: string;
  situacao: keyof typeof NOMES_SITUACAO_CASO;
  estagiario: string | null;
  supervisor: string | null;
  vinculadoEm: string | null;
  dadosIniciais: {
    anamnese: string | null;
    contrato: string | null;
    dataAssinaturaContrato: string | null;
    registradoEm: string | null;
  };
};

// Acesso negado: a mesma tela para qualquer recusa, sem o nome do paciente (RNF25).
function AcessoNegado({ voltar }: { voltar: string }) {
  const [registradoEm] = useState(() => new Date().toISOString());
  return (
    <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
      <Lock
        aria-hidden
        className="mx-auto size-12 rounded-full bg-alerta-fundo p-3 text-alerta"
      />
      <h1 className="text-2xl font-semibold text-marca">
        Você não tem acesso a este prontuário
      </h1>
      <p className="text-sm">
        O prontuário só pode ser aberto pelo estagiário responsável pelo caso e
        pelo supervisor dele. Se você acha que deveria ter acesso, fale com o
        supervisor do caso.
      </p>
      <Link href={voltar} className={buttonVariants({ size: "lg" })}>
        Voltar
      </Link>
      <p className="text-xs text-muted-foreground">
        Tentativa registrada em {dataHoraBr(registradoEm)}.
      </p>
    </div>
  );
}

// Prontuário, só para o estagiário responsável e o supervisor do caso (RF55).
export default function ProntuarioPage() {
  const { id } = useParams<{ id: string }>();
  const { data: sessao } = useSessao();
  const consulta = useQuery({
    queryKey: ["prontuario", id],
    queryFn: () => api<Prontuario>(`/prontuarios/${id}`),
    retry: false,
  });
  const voltar =
    sessao?.perfil === "supervisor"
      ? "/meus-casos"
      : sessao?.perfil === "estagiario"
        ? "/meus-pacientes"
        : "/pacientes";

  if (consulta.isPending) return <p role="status">Carregando prontuário…</p>;
  if (consulta.error instanceof ErroApi && consulta.error.status === 403)
    return <AcessoNegado voltar={voltar} />;
  if (consulta.isError || !consulta.data)
    return <Aviso tipo="erro" titulo="Não foi possível abrir o prontuário." />;

  const p = consulta.data;
  const { anamnese, contrato, dataAssinaturaContrato, registradoEm } =
    p.dadosIniciais;
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <nav aria-label="Trilha" className="text-sm">
        <Link href={voltar} className="text-primary underline">
          {sessao?.perfil === "supervisor" ? "Meus casos" : "Meus pacientes"}
        </Link>{" "}
        › Prontuário
      </nav>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-marca">
          Prontuário · {p.nome}
        </h1>
        <span className="inline-flex items-center gap-1 rounded-full bg-info-fundo px-2 py-0.5 text-xs font-semibold text-primary">
          <Lock aria-hidden className="size-3" /> Conteúdo clínico restrito
        </span>
      </div>
      <section
        aria-labelledby="identificacao"
        className="rounded-lg border border-border bg-card p-5"
      >
        <h2 id="identificacao" className="mb-4 font-semibold text-marca">
          Identificação
        </h2>
        <Dados
          itens={[
            ["Paciente", p.nome],
            [
              "Data de nascimento",
              `${dataBr(p.dataNascimento)} (${idade(p.dataNascimento)} anos)`,
            ],
            ["Inscrição", p.numeroInscricao],
            [
              "Ciclo de atendimento",
              `Ciclo ${p.cicloAtendimento} · desde ${dataBr(p.vinculadoEm ?? p.criadoEm)}`,
            ],
            ["Situação", NOMES_SITUACAO_CASO[p.situacao]],
            ["Estagiário responsável", p.estagiario],
            ["Supervisor", p.supervisor],
            ["Prontuário criado em", dataHoraBr(p.criadoEm)],
          ]}
        />
      </section>
      <section
        aria-labelledby="dados-iniciais"
        className="space-y-3 rounded-lg border border-border bg-card p-5"
      >
        <h2 id="dados-iniciais" className="font-semibold text-marca">
          Dados iniciais
        </h2>
        {anamnese || contrato ? (
          <>
            <h3 className="text-sm font-semibold">Anamnese</h3>
            <p className="text-sm whitespace-pre-wrap">
              {anamnese ?? "Não registrada."}
            </p>
            <h3 className="text-sm font-semibold">Contrato terapêutico</h3>
            <p className="text-sm whitespace-pre-wrap">
              {contrato ?? "Não registrado."}
            </p>
            <p className="text-xs text-muted-foreground">
              Assinado em {dataBr(dataAssinaturaContrato)} · registrado em{" "}
              {dataHoraBr(registradoEm)}
            </p>
          </>
        ) : (
          <Aviso
            tipo="info"
            titulo="A anamnese e o contrato terapêutico ainda não foram registrados."
          >
            O registro dos dados iniciais entra no próximo ciclo, com os modelos
            da clínica.
          </Aviso>
        )}
      </section>
    </div>
  );
}
