"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Lock } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  type AcoesCancelamento,
  type Anamnese,
  type CancelamentoDaSessao,
  type ContagemFaltas,
  type FaltaDaSessao,
  type SessaoAReagendar,
  type StatusSessao,
} from "@clinica/shared";
import {
  AcoesFaltaDaSessao,
  DetalheFalta,
  HistoricoFaltas,
  ResumoFaltas,
  SeloSessao,
} from "@/components/assiduidade/faltas";
import { SessoesAReagendar } from "@/components/assiduidade/desligamento";
import { Aviso } from "@/components/comum/aviso";
import { Dados } from "@/components/comum/dados";
import {
  LeituraEvolucao,
  type EvolucaoRegistrada,
} from "@/components/prontuario/fichas";
import { Button, buttonVariants } from "@/components/ui/button";
import { api, ErroApi } from "@/lib/api";
import { dataBr, dataHoraBr, idade, NOMES_SITUACAO_CASO } from "@/lib/formato";
import { useSessao } from "@/lib/sessao";

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
    <div>
      {erro && <Aviso tipo="alerta" titulo={erro} className="mb-3" />}
      <Button type="button" onClick={marcar}>
        Marcar sessão como realizada
      </Button>
    </div>
  );
}

type Prontuario = {
  casoId: string;
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
    anamnese:
      | (Anamnese & {
          registradaEm: string | null;
          registradaPor: string | null;
        })
      | null;
    contrato: null | {
      textoLivre: string | null;
      dataAssinatura: string | null;
      aceiteTclePesquisa: boolean | null;
      viaGuardada: boolean | null;
      registradoEm: string | null;
      registradoPor: string | null;
    };
    // Só para o estagiário responsável, enquanto a anamnese não existe (RF69).
    queixaDaInscricao: string | null;
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
    estagiario: string;
    status: StatusSessao;
    falta: FaltaDaSessao | null;
    cancelamento: CancelamentoDaSessao | null;
    canceladaPorDesligamento: boolean;
    numeroNoCiclo: number | null;
    evolucao: EvolucaoRegistrada | null;
  }[];
  alta: null | { data: string; motivo: string };
  relatorioFinal: null | { estado: string };
  sessoesRealizadas: number;
  fechamentoAvaliativoPendente: boolean;
  faltasNoCiclo: ContagemFaltas;
  sessoesAReagendar: SessaoAReagendar[];
  acoesFalta: { registrar: boolean; justificar: boolean };
  acoesCancelamento: AcoesCancelamento;
};

// Acesso negado: a mesma tela para qualquer recusa, sem o nome do paciente (RNF25).
function AcessoNegado({
  voltar,
  rotuloVoltar,
}: {
  voltar: string;
  rotuloVoltar: string;
}) {
  const [registradoEm] = useState(() => new Date().toISOString());
  return (
    <div className="mx-auto mt-10 flex max-w-[640px] flex-col items-center gap-3.5 px-4 py-10 text-center md:px-10 md:py-[72px]">
      <span aria-hidden className="ui-vazio-icone">
        <Lock className="size-7" />
      </span>
      <h1 className="ui-titulo">Você não tem acesso a este prontuário</h1>
      <p className="text-base">
        O prontuário só pode ser aberto pelo estagiário responsável pelo caso,
        pelo supervisor dele e pela coordenação. Se você acha que deveria ter
        acesso, fale com o supervisor do caso.
      </p>
      <Link href={voltar} className={buttonVariants()}>
        Voltar para {rotuloVoltar.toLowerCase()}
      </Link>
      <p className="ui-meta">
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
  // Horário de referência para saber se a sessão já terminou, atualizado a cada
  // minuto para o botão aparecer sem recarregar a página.
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const relogio = setInterval(() => setAgora(Date.now()), 60_000);
    return () => clearInterval(relogio);
  }, []);
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
  const rotuloVoltar =
    sessao?.perfil === "supervisor"
      ? "Meus casos"
      : sessao?.perfil === "estagiario"
        ? "Meus pacientes"
        : "Pacientes";
  if (consulta.error instanceof ErroApi && consulta.error.status === 403)
    return <AcessoNegado voltar={voltar} rotuloVoltar={rotuloVoltar} />;
  if (consulta.isError || !consulta.data)
    return <Aviso tipo="erro" titulo="Não foi possível abrir o prontuário." />;

  const p = consulta.data;
  const { anamnese, contrato, queixaDaInscricao } = p.dadosIniciais;
  const estagiario = sessao?.perfil === "estagiario";
  const cartao = "ui-cartao";
  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Você está em" className="ui-trilha">
        <Link href={voltar}>{rotuloVoltar}</Link>
        <span aria-hidden>›</span>
        <span aria-current="page">Prontuário</span>
      </nav>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3.5">
          <h1 className="ui-titulo">Prontuário · {p.nome}</h1>
          <span className="ui-selo border-[#a9cfe0] bg-accent text-marca">
            <Lock aria-hidden className="size-3.5" /> Conteúdo clínico restrito
          </span>
        </div>
        {sessao?.perfil === "coordenacao" && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Eye aria-hidden className="size-4" /> Seu acesso fica registrado no
            registro de acessos ao prontuário.
          </p>
        )}
      </div>
      <nav
        aria-label="Ir para"
        className="sticky top-0 z-20 -mx-4 flex gap-2 overflow-x-auto border-y border-border bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:flex-wrap sm:rounded-lg sm:border"
      >
        {[
          ["identificacao", "Identificação"],
          ["dados-iniciais", "Dados iniciais"],
          ["historico-responsaveis", "Responsáveis"],
          ["sessoes-ciclo", "Sessões do ciclo"],
          ["evolucoes", "Evoluções"],
          ["alta", "Encerramento por alta"],
          ["relatorio", "Relatório final"],
        ].map(([alvo, rotulo]) => (
          <a
            key={alvo}
            href={`#${alvo}`}
            className="shrink-0 rounded-full border border-border px-3 py-1.5 text-sm font-semibold text-marca underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {rotulo}
          </a>
        ))}
      </nav>
      <section aria-labelledby="identificacao" className={cartao}>
        <h2 id="identificacao" className="ui-h2 scroll-mt-24">
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
            [
              "Situação",
              <span
                key="situacao"
                className="ui-selo border-[#a3d4b3] bg-[#e5f4ea] text-[#1b5e33]"
              >
                {NOMES_SITUACAO_CASO[p.situacao]}
              </span>,
            ],
            ["Estagiário responsável", p.estagiario],
            ["Supervisor", p.supervisor],
            ["Prontuário criado em", dataHoraBr(p.criadoEm)],
          ]}
        />
      </section>
      <section aria-labelledby="dados-iniciais" className={cartao}>
        <h2 id="dados-iniciais" className="ui-h2 scroll-mt-24">
          Dados iniciais
        </h2>
        {!anamnese && !contrato && (
          <Aviso
            tipo="info"
            titulo="A anamnese e o contrato terapêutico ainda não foram registrados."
          />
        )}
        {/* Anamnese e contrato são salvos separados, cada um uma vez (RF69). */}
        {anamnese ? (
          <div className="mb-5 flex flex-col gap-2 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-semibold">
                {anamnese.queixaPrincipal ?? "Não informado"}
              </p>
              <p className="ui-dica">
                {
                  [
                    anamnese.queixaPrincipal,
                    anamnese.historiaProblemaAtual,
                    anamnese.historicoFamiliar,
                    anamnese.desenvolvimento,
                    anamnese.historicoMedico,
                    anamnese.aspectosPsicossociais,
                  ].filter((valor) => valor?.trim()).length
                }{" "}
                de 6 seções preenchidas
              </p>
            </div>
            <Link
              href={`/prontuarios/${p.id}/dados-iniciais`}
              className={buttonVariants({ variant: "outline" })}
            >
              Ver dados iniciais completos
            </Link>
          </div>
        ) : estagiario ? (
          <FormularioAnamnese
            prontuarioId={p.id}
            queixaDaInscricao={queixaDaInscricao}
          />
        ) : (
          contrato && (
            <p className="ui-dica">A anamnese ainda não foi registrada.</p>
          )
        )}
        {contrato ? (
          <p className="ui-dica">
            Contrato terapêutico registrado.{" "}
            <Link
              className="font-semibold text-marca underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              href={`/prontuarios/${p.id}/dados-iniciais`}
            >
              Ver dados completos
            </Link>
          </p>
        ) : estagiario ? (
          <FormularioContrato prontuarioId={p.id} />
        ) : (
          anamnese && (
            <p className="ui-dica">
              O contrato terapêutico ainda não foi registrado.
            </p>
          )
        )}
      </section>
      <SessoesAReagendar
        casoId={p.casoId}
        sessoes={p.sessoesAReagendar}
        desligamento={undefined}
        podeAgendar={sessao?.perfil === "estagiario"}
      />
      <section aria-labelledby="sessoes-ciclo" className={cartao}>
        <h2 id="sessoes-ciclo" className="ui-h2 scroll-mt-24">
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
        <ResumoFaltas
          contagem={p.faltasNoCiclo}
          nome={p.nome}
          linkHistorico="#historico-faltas"
        />
        {p.sessoes.length ? (
          <div
            role="table"
            aria-label="Sessões do ciclo"
            className="flex flex-col"
          >
            <div
              role="row"
              className="hidden grid-cols-[1.2fr_1fr_1fr] gap-4 border-b border-border pb-2 text-sm font-semibold md:grid"
            >
              <span role="columnheader">Sessão</span>
              <span role="columnheader">Situação</span>
              <span role="columnheader">Evolução</span>
            </div>
            {p.sessoes.map((atendimento) => {
              const responsavel = atendimento.estagiarioId === sessao?.id;
              const marcarRealizada =
                responsavel &&
                (atendimento.status === "agendada" ||
                  atendimento.status === "confirmada") &&
                new Date(atendimento.termino).getTime() <= agora;
              return (
                <div
                  role="row"
                  key={atendimento.id}
                  className="grid grid-cols-1 gap-2 border-b border-border py-4 first:pt-3 last:border-b-0 last:pb-0 md:grid-cols-[1.2fr_1fr_1fr] md:items-start md:gap-4"
                >
                  <div role="cell" className="flex min-w-0 flex-col gap-1">
                    <h3 className="text-[15px] font-bold">
                      {dataHoraBr(atendimento.inicio)}
                    </h3>
                    <span className="md:hidden ui-meta">
                      Sessão no ciclo:{" "}
                      {atendimento.numeroNoCiclo
                        ? `${atendimento.numeroNoCiclo}ª`
                        : "Não numerada"}
                    </span>
                  </div>
                  <div
                    role="cell"
                    className="flex flex-wrap items-center gap-2"
                  >
                    <span className="md:hidden ui-meta">Situação</span>
                    <SeloSessao
                      status={atendimento.status}
                      justificada={atendimento.falta?.justificada}
                      cancelamento={atendimento.cancelamento}
                      porDesligamento={atendimento.canceladaPorDesligamento}
                    />
                  </div>
                  <div role="cell" className="min-w-0">
                    <span className="mb-1 block ui-meta md:hidden">
                      Evolução
                    </span>
                    {atendimento.evolucao ? (
                      <span className="text-sm">
                        Sessão nº {atendimento.numeroNoCiclo ?? "—"} ·
                        registrada
                      </span>
                    ) : responsavel && atendimento.status === "realizada" ? (
                      <Link
                        className={buttonVariants({
                          variant: "outline",
                          size: "sm",
                        })}
                        href={`/prontuarios/${p.id}/sessoes/${atendimento.id}/evolucao`}
                      >
                        Registrar evolução
                      </Link>
                    ) : marcarRealizada ? (
                      <AcaoSessao
                        prontuarioId={p.id}
                        sessaoId={atendimento.id}
                      />
                    ) : (
                      <span className="ui-dica">Não se aplica</span>
                    )}
                  </div>
                  {atendimento.falta && (
                    <div role="cell" className="md:col-span-3">
                      <DetalheFalta falta={atendimento.falta} />
                    </div>
                  )}
                  <div role="cell" className="md:col-span-3">
                    <AcoesFaltaDaSessao
                      nome={p.nome}
                      sessao={atendimento}
                      limite={p.faltasNoCiclo.limite}
                      agora={agora}
                      podeRegistrar={p.acoesFalta.registrar}
                      podeJustificar={p.acoesFalta.justificar}
                      chave={["prontuario", p.id]}
                      acoesCancelamento={p.acoesCancelamento}
                      casoId={p.casoId}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="ui-dica">Não há sessões registradas neste ciclo.</p>
        )}
      </section>
      <section
        id="evolucoes"
        aria-labelledby="titulo-evolucoes"
        className={`${cartao} scroll-mt-24`}
      >
        <h2 id="titulo-evolucoes" className="ui-h2 scroll-mt-24">
          Evoluções
        </h2>
        {p.sessoes.some((atendimento) => atendimento.evolucao) ? (
          <ol className="flex flex-col">
            {p.sessoes
              .filter((atendimento) => atendimento.evolucao)
              .map((atendimento) => (
                <li
                  key={atendimento.id}
                  className="border-b border-border py-4 first:pt-0 last:border-b-0 last:pb-0"
                >
                  <details>
                    <summary className="cursor-pointer font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>
                          Sessão nº {atendimento.numeroNoCiclo ?? "—"} ·{" "}
                          {dataBr(atendimento.inicio)}
                        </span>
                        <span className="ui-meta">
                          Registrada por {atendimento.evolucao!.registradaPor}{" "}
                          em {dataHoraBr(atendimento.evolucao!.registradaEm)}
                        </span>
                        <span className="text-marca underline underline-offset-4">
                          Ver evolução
                        </span>
                      </span>
                    </summary>
                    <LeituraEvolucao
                      evolucao={atendimento.evolucao!}
                      inicio={atendimento.inicio}
                      numeroNoCiclo={atendimento.numeroNoCiclo}
                    />
                  </details>
                </li>
              ))}
          </ol>
        ) : (
          <p className="ui-dica">Sem registro neste ciclo.</p>
        )}
      </section>
      <HistoricoFaltas
        id="historico-faltas"
        contagem={p.faltasNoCiclo}
        ciclo={p.cicloAtendimento}
        sessoes={p.sessoes}
      />
      <section
        id="historico-responsaveis"
        aria-labelledby="titulo-responsaveis"
        className={`${cartao} scroll-mt-24`}
      >
        <h2 id="titulo-responsaveis" className="ui-h2">
          Responsáveis
        </h2>
        <details className="mt-3">
          <summary className="cursor-pointer font-semibold text-marca underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            Ver histórico de responsáveis (
            {p.historicoResponsaveis.estagiarios.length +
              p.historicoResponsaveis.supervisores.length}
            )
          </summary>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            {(
              [
                ["Estagiários", p.historicoResponsaveis.estagiarios],
                ["Supervisores", p.historicoResponsaveis.supervisores],
              ] as const
            ).map(([titulo, responsaveis]) => (
              <div key={titulo}>
                <h3 className="ui-rotulo">{titulo}</h3>
                {responsaveis.length ? (
                  <ol className="mt-2 flex flex-col gap-2 text-[15px]">
                    {responsaveis.map((responsavel, indice) => (
                      <li key={`${responsavel.desde}-${indice}`}>
                        {responsavel.nome}
                        <span className="ui-meta">
                          {" "}
                          · desde {dataHoraBr(responsavel.desde)}
                          {responsavel.vigente ? " · vigente" : " · encerrado"}
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="ui-dica mt-2">Não registrado.</p>
                )}
              </div>
            ))}
          </div>
        </details>
      </section>
      <div className="grid gap-6 sm:grid-cols-2">
        <section
          id="alta"
          aria-labelledby="titulo-alta"
          className={`${cartao} scroll-mt-24`}
        >
          <h2 id="titulo-alta" className="ui-h2">
            Alta
          </h2>
          <p className="ui-dica">
            {p.alta
              ? `${p.alta.data} · ${p.alta.motivo}`
              : "Sem registro neste ciclo."}
          </p>
        </section>
        <section
          id="relatorio"
          aria-labelledby="titulo-relatorio"
          className={`${cartao} scroll-mt-24`}
        >
          <h2 id="titulo-relatorio" className="ui-h2">
            Relatório final
          </h2>
          <p className="ui-dica">
            {p.relatorioFinal?.estado ?? "Sem registro neste ciclo."}
          </p>
        </section>
      </div>
    </div>
  );
}
