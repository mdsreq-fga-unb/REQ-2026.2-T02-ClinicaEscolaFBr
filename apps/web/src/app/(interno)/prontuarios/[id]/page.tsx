"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Lock } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Aviso } from "@/components/comum/aviso";
import { Dados } from "@/components/comum/dados";
import { buttonVariants } from "@/components/ui/button";
import { api, ErroApi } from "@/lib/api";
import { dataBr, dataHoraBr, idade, NOMES_SITUACAO_CASO } from "@/lib/formato";
import { useSessao } from "@/lib/sessao";

function FormularioDadosIniciais({ prontuarioId }: { prontuarioId: string }) {
  const cache = useQueryClient();
  const [anamnese, setAnamnese] = useState("");
  const [contrato, setContrato] = useState("");
  const [dataAssinaturaContrato, setDataAssinaturaContrato] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    setSalvando(true);
    try {
      await api(`/prontuarios/${prontuarioId}/dados-iniciais`, {
        method: "POST",
        body: JSON.stringify({ anamnese, contrato, dataAssinaturaContrato }),
      });
      await cache.invalidateQueries({ queryKey: ["prontuario", prontuarioId] });
    } catch (falha) {
      setErro(
        falha instanceof Error ? falha.message : "Não foi possível salvar.",
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form
      onSubmit={salvar}
      className="space-y-4 rounded-lg border border-border bg-card p-5"
    >
      <h3 className="font-semibold">Registrar dados iniciais</h3>
      <label className="block space-y-1 text-sm" htmlFor="anamnese">
        <span>Anamnese</span>
        <textarea
          id="anamnese"
          required
          value={anamnese}
          onChange={(e) => setAnamnese(e.target.value)}
          className="min-h-32 w-full rounded-md border border-border p-3"
        />
      </label>
      <label className="block space-y-1 text-sm" htmlFor="contrato">
        <span>Contrato terapêutico</span>
        <textarea
          id="contrato"
          required
          value={contrato}
          onChange={(e) => setContrato(e.target.value)}
          className="min-h-24 w-full rounded-md border border-border p-3"
        />
      </label>
      <label className="block space-y-1 text-sm" htmlFor="data-assinatura">
        <span>Data de assinatura</span>
        <input
          id="data-assinatura"
          type="date"
          required
          value={dataAssinaturaContrato}
          onChange={(e) => setDataAssinaturaContrato(e.target.value)}
          className="rounded-md border border-border p-2"
        />
      </label>
      {erro && (
        <p role="alert" className="text-sm text-alerta">
          {erro}
        </p>
      )}
      <button
        type="submit"
        disabled={salvando}
        className={buttonVariants({ size: "lg" })}
      >
        {salvando ? "Salvando…" : "Salvar dados iniciais"}
      </button>
    </form>
  );
}

function FormularioEvolucao({
  prontuarioId,
  sessaoId,
  inicio,
}: {
  prontuarioId: string;
  sessaoId: string;
  inicio: string;
}) {
  const cache = useQueryClient();
  const [queixa, setQueixa] = useState("");
  const [planejamento, setPlanejamento] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    try {
      await api(`/prontuarios/${prontuarioId}/sessoes/${sessaoId}/evolucoes`, {
        method: "POST",
        body: JSON.stringify({ queixa, planejamento }),
      });
      await cache.invalidateQueries({ queryKey: ["prontuario", prontuarioId] });
    } catch (falha) {
      setErro(
        falha instanceof Error ? falha.message : "Não foi possível salvar.",
      );
    }
  }
  return (
    <form
      onSubmit={salvar}
      className="mt-4 space-y-3 rounded-md border border-border p-4"
    >
      <h4 className="font-medium">
        Registrar evolução · sessão de {dataHoraBr(inicio)}
      </h4>
      <p className="text-sm text-muted-foreground">
        O registro fica vinculado a esta sessão e não pode ser alterado depois
        de salvo. Use até 10 linhas e 1.000 caracteres.
      </p>
      <label className="block space-y-1 text-sm" htmlFor={`queixa-${sessaoId}`}>
        <span>Evolução da queixa (até 10 linhas e 1.000 caracteres)</span>
        <textarea
          id={`queixa-${sessaoId}`}
          required
          maxLength={1000}
          value={queixa}
          onChange={(e) => setQueixa(e.target.value)}
          className="min-h-28 w-full rounded-md border border-border p-3"
        />
      </label>
      <label className="block space-y-1 text-sm" htmlFor={`plano-${sessaoId}`}>
        <span>Planejamento da próxima sessão</span>
        <textarea
          id={`plano-${sessaoId}`}
          required
          value={planejamento}
          onChange={(e) => setPlanejamento(e.target.value)}
          className="min-h-20 w-full rounded-md border border-border p-3"
        />
      </label>
      {erro && (
        <p role="alert" className="text-sm text-alerta">
          {erro}
        </p>
      )}
      <button className={buttonVariants({ size: "lg" })} type="submit">
        Salvar evolução
      </button>
    </form>
  );
}

function AcaoSessao({
  prontuarioId,
  sessaoId,
}: {
  prontuarioId: string;
  sessaoId: string;
}) {
  const cache = useQueryClient();
  const [erro, setErro] = useState<string | null>(null);
  async function marcar() {
    setErro(null);
    try {
      await api(`/prontuarios/${prontuarioId}/sessoes/${sessaoId}/realizada`, {
        method: "POST",
      });
      await cache.invalidateQueries({ queryKey: ["prontuario", prontuarioId] });
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível atualizar a sessão.",
      );
    }
  }
  return (
    <div className="mt-3">
      {erro && (
        <p role="alert" className="text-sm text-alerta">
          {erro}
        </p>
      )}
      <button
        type="button"
        onClick={marcar}
        className={buttonVariants({ size: "lg" })}
      >
        Marcar sessão como realizada
      </button>
    </div>
  );
}

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
    registradoPor: string | null;
  };
  historicoResponsaveis: {
    estagiarios: { nome: string; desde: string; vigente: boolean }[];
    supervisores: { nome: string; desde: string; vigente: boolean }[];
  };
  sessoes: {
    id: string;
    inicio: string;
    termino: string;
    estagiarioId: string;
    status: string;
    evolucao: null | {
      id: string;
      queixa: string;
      planejamento: string;
      registradaPor: string;
      registradaEm: string;
    };
  }[];
  alta: null | { data: string; motivo: string };
  relatorioFinal: null | { estado: string };
  sessoesRealizadas: number;
  fechamentoAvaliativoPendente: boolean;
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
        O prontuário só pode ser aberto pelo estagiário responsável pelo caso,
        pelo supervisor dele e pela coordenação. Se você acha que deveria ter
        acesso, fale com o supervisor do caso.
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

// Prontuário, para o estagiário responsável e o supervisor do caso e, só para
// consulta, para a coordenação (RF55, DF32).
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
          {sessao?.perfil === "supervisor"
            ? "Meus casos"
            : sessao?.perfil === "estagiario"
              ? "Meus pacientes"
              : "Pacientes"}
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
      {sessao?.perfil === "coordenacao" && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Eye aria-hidden className="size-4" /> Seu acesso fica registrado no
          registro de acessos ao prontuário.
        </p>
      )}
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
        aria-labelledby="historico-responsaveis"
        className="rounded-lg border border-border bg-card p-5"
      >
        <h2
          id="historico-responsaveis"
          className="mb-4 font-semibold text-marca"
        >
          Histórico de responsáveis
        </h2>
        <div className="grid gap-5 sm:grid-cols-2">
          {(
            [
              ["Estagiários", p.historicoResponsaveis.estagiarios],
              ["Supervisores", p.historicoResponsaveis.supervisores],
            ] as const
          ).map(([titulo, responsaveis]) => (
            <div key={titulo}>
              <h3 className="font-medium">{titulo}</h3>
              {responsaveis.length ? (
                <ol className="mt-2 space-y-2 text-sm">
                  {responsaveis.map((responsavel, indice) => (
                    <li key={`${responsavel.desde}-${indice}`}>
                      {responsavel.nome} · desde {dataHoraBr(responsavel.desde)}
                      {responsavel.vigente ? " · vigente" : " · encerrado"}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  Não registrado.
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
      <section
        aria-labelledby="sessoes-ciclo"
        className="rounded-lg border border-border bg-card p-5"
      >
        <h2 id="sessoes-ciclo" className="mb-4 font-semibold text-marca">
          Sessões do ciclo {p.cicloAtendimento}
        </h2>
        {p.fechamentoAvaliativoPendente && (
          <Aviso
            tipo="info"
            titulo={`Fechamento avaliativo devido após ${p.sessoesRealizadas} sessões realizadas.`}
          >
            Registre o fechamento no relatório final do ciclo.
          </Aviso>
        )}
        {p.sessoes.length ? (
          <ol className="space-y-4">
            {p.sessoes.map((atendimento) => (
              <li key={atendimento.id} className="border-b border-border pb-4">
                <h3 className="font-medium">
                  {dataHoraBr(atendimento.inicio)} ·{" "}
                  {atendimento.status === "realizada"
                    ? "Realizada"
                    : "Agendada"}
                </h3>
                {atendimento.evolucao ? (
                  <div className="mt-2 space-y-2 text-sm">
                    <p>
                      <strong>Evolução:</strong> {atendimento.evolucao.queixa}
                    </p>
                    <p>
                      <strong>Planejamento:</strong>{" "}
                      {atendimento.evolucao.planejamento}
                    </p>
                    <p className="text-muted-foreground">
                      Registrada por {atendimento.evolucao.registradaPor} ·{" "}
                      {dataHoraBr(atendimento.evolucao.registradaEm)}
                    </p>
                  </div>
                ) : atendimento.estagiarioId === sessao?.id &&
                  atendimento.status === "realizada" ? (
                  <FormularioEvolucao
                    prontuarioId={p.id}
                    sessaoId={atendimento.id}
                    inicio={atendimento.inicio}
                  />
                ) : atendimento.estagiarioId === sessao?.id &&
                  atendimento.status === "agendada" ? (
                  <AcaoSessao prontuarioId={p.id} sessaoId={atendimento.id} />
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Evolução não registrada.
                  </p>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">
            Não há sessões registradas neste ciclo.
          </p>
        )}
      </section>
      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="font-semibold text-marca">Alta</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {p.alta ? `${p.alta.data} · ${p.alta.motivo}` : "Não registrada."}
        </p>
      </section>
      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="font-semibold text-marca">Relatório final</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {p.relatorioFinal?.estado ?? "Não registrado."}
        </p>
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
              Registrado por{" "}
              {p.dadosIniciais.registradoPor ?? "responsável não identificado"}{" "}
              · assinado em {dataBr(dataAssinaturaContrato)} · registrado em{" "}
              {dataHoraBr(registradoEm)}
            </p>
          </>
        ) : (
          <>
            <Aviso
              tipo="info"
              titulo="A anamnese e o contrato terapêutico ainda não foram registrados."
            />
            {sessao?.perfil === "estagiario" && (
              <FormularioDadosIniciais prontuarioId={p.id} />
            )}
          </>
        )}
      </section>
    </div>
  );
}
