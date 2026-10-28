"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Lock } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  dadosIniciaisSchema,
  evolucaoSchema,
  type DadosIniciais,
  type Evolucao,
} from "@clinica/shared";
import { Aviso } from "@/components/comum/aviso";
import { Campo } from "@/components/comum/campo";
import { Dados } from "@/components/comum/dados";
import { buttonVariants } from "@/components/ui/button";
import { api, ErroApi } from "@/lib/api";
import { dataBr, dataHoraBr, idade, NOMES_SITUACAO_CASO } from "@/lib/formato";
import { useSessao } from "@/lib/sessao";

type ErrosDe<T> = Partial<Record<keyof T, string>>;

// Erros do esquema compartilhado, um por campo (RNF1).
function errosPorCampo<T>(issues: { path: PropertyKey[]; message: string }[]) {
  const erros: ErrosDe<T> = {};
  for (const problema of issues) {
    const campo = problema.path[0] as keyof T;
    erros[campo] ??= problema.message;
  }
  return erros;
}

function FormularioDadosIniciais({ prontuarioId }: { prontuarioId: string }) {
  const cache = useQueryClient();
  const [dados, setDados] = useState({
    anamnese: "",
    contrato: "",
    dataAssinaturaContrato: "",
  });
  const [erros, setErros] = useState<ErrosDe<DadosIniciais>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    const resultado = dadosIniciaisSchema.safeParse(dados);
    if (!resultado.success) {
      setErros(errosPorCampo<DadosIniciais>(resultado.error.issues));
      return;
    }
    setErros({});
    setSalvando(true);
    try {
      await api(`/prontuarios/${prontuarioId}/dados-iniciais`, {
        method: "POST",
        body: JSON.stringify(resultado.data),
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
      noValidate
      onSubmit={salvar}
      className="space-y-4 rounded-lg border border-border bg-card p-5"
    >
      <h3 className="font-semibold">Registrar dados iniciais</h3>
      <Campo rotulo="Anamnese" erro={erros.anamnese}>
        {(props) => (
          <textarea
            {...props}
            value={dados.anamnese}
            onChange={(e) => setDados({ ...dados, anamnese: e.target.value })}
            className="min-h-32 w-full rounded-md border border-input p-3 text-sm aria-[invalid=true]:border-destructive"
          />
        )}
      </Campo>
      <Campo rotulo="Contrato terapêutico" erro={erros.contrato}>
        {(props) => (
          <textarea
            {...props}
            value={dados.contrato}
            onChange={(e) => setDados({ ...dados, contrato: e.target.value })}
            className="min-h-24 w-full rounded-md border border-input p-3 text-sm aria-[invalid=true]:border-destructive"
          />
        )}
      </Campo>
      <Campo rotulo="Data de assinatura" erro={erros.dataAssinaturaContrato}>
        {(props) => (
          <input
            {...props}
            type="date"
            value={dados.dataAssinaturaContrato}
            onChange={(e) =>
              setDados({ ...dados, dataAssinaturaContrato: e.target.value })
            }
            className="rounded-md border border-input p-2 text-sm aria-[invalid=true]:border-destructive"
          />
        )}
      </Campo>
      {erro && (
        <p role="alert" className="text-sm text-destructive">
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

// Evolução da sessão realizada (RF28): os campos obrigatórios e os limites são
// conferidos antes do envio, com o erro junto de cada campo.
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
  const [dados, setDados] = useState({ queixa: "", planejamento: "" });
  const [erros, setErros] = useState<ErrosDe<Evolucao>>({});
  const [erro, setErro] = useState<string | null>(null);
  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    const resultado = evolucaoSchema.safeParse(dados);
    if (!resultado.success) {
      setErros(errosPorCampo<Evolucao>(resultado.error.issues));
      return;
    }
    setErros({});
    try {
      await api(`/prontuarios/${prontuarioId}/sessoes/${sessaoId}/evolucoes`, {
        method: "POST",
        body: JSON.stringify(resultado.data),
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
      noValidate
      onSubmit={salvar}
      className="mt-4 space-y-3 rounded-md border border-border p-4"
    >
      <h4 className="font-medium">
        Registrar evolução · sessão de {dataHoraBr(inicio)}
      </h4>
      <p className="text-sm text-muted-foreground">
        O registro fica vinculado a esta sessão e não pode ser alterado depois
        de salvo.
      </p>
      <Campo
        rotulo="Evolução da queixa"
        dica="Até 10 linhas e 1.000 caracteres."
        erro={erros.queixa}
      >
        {(props) => (
          <textarea
            {...props}
            value={dados.queixa}
            onChange={(e) => setDados({ ...dados, queixa: e.target.value })}
            className="min-h-28 w-full rounded-md border border-input p-3 text-sm aria-[invalid=true]:border-destructive"
          />
        )}
      </Campo>
      <Campo rotulo="Planejamento da próxima sessão" erro={erros.planejamento}>
        {(props) => (
          <textarea
            {...props}
            value={dados.planejamento}
            onChange={(e) =>
              setDados({ ...dados, planejamento: e.target.value })
            }
            className="min-h-20 w-full rounded-md border border-input p-3 text-sm aria-[invalid=true]:border-destructive"
          />
        )}
      </Campo>
      {erro && (
        <p role="alert" className="text-sm text-destructive">
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
  // Horário de referência para saber se a sessão já terminou.
  const [agora] = useState(() => Date.now());
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
                  atendimento.status === "agendada" &&
                  new Date(atendimento.termino).getTime() <= agora ? (
                  <AcaoSessao prontuarioId={p.id} sessaoId={atendimento.id} />
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {atendimento.status === "agendada" &&
                    new Date(atendimento.termino).getTime() > agora
                      ? "A sessão ainda não aconteceu."
                      : "Evolução não registrada."}
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
