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
  FormularioAnamnese,
  FormularioContrato,
  FormularioEvolucao,
  LeituraAnamnese,
  LeituraContrato,
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
      <section aria-labelledby="identificacao" className={cartao}>
        <h2 id="identificacao" className="ui-h2">
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
        <h2 id="dados-iniciais" className="ui-h2">
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
          <LeituraAnamnese anamnese={anamnese} />
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
          <LeituraContrato contrato={contrato} />
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
        <h2 id="sessoes-ciclo" className="ui-h2">
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
          <ol className="flex flex-col">
            {p.sessoes.map((atendimento) => {
              const responsavel = atendimento.estagiarioId === sessao?.id;
              const marcarRealizada =
                responsavel &&
                (atendimento.status === "agendada" ||
                  atendimento.status === "confirmada") &&
                new Date(atendimento.termino).getTime() <= agora;
              return (
                <li
                  key={atendimento.id}
                  className="border-b border-border py-4 first:pt-0 last:border-b-0 last:pb-0"
                >
                  <h3 className="flex flex-wrap items-center gap-2 text-[15px] font-bold">
                    {dataHoraBr(atendimento.inicio)}
                    <SeloSessao
                      status={atendimento.status}
                      justificada={atendimento.falta?.justificada}
                      cancelamento={atendimento.cancelamento}
                      porDesligamento={atendimento.canceladaPorDesligamento}
                    />
                  </h3>
                  {atendimento.falta && (
                    <DetalheFalta falta={atendimento.falta} />
                  )}
                  {atendimento.evolucao ? (
                    <LeituraEvolucao
                      evolucao={atendimento.evolucao}
                      inicio={atendimento.inicio}
                      numeroNoCiclo={atendimento.numeroNoCiclo}
                    />
                  ) : responsavel && atendimento.status === "realizada" ? (
                    <FormularioEvolucao
                      prontuarioId={p.id}
                      sessaoId={atendimento.id}
                      inicio={atendimento.inicio}
                      numeroNoCiclo={atendimento.numeroNoCiclo}
                    />
                  ) : (
                    !atendimento.falta && (
                      <p className="ui-dica mt-1">
                        {(atendimento.status === "agendada" ||
                          atendimento.status === "confirmada") &&
                        new Date(atendimento.termino).getTime() > agora
                          ? "A sessão ainda não aconteceu."
                          : atendimento.status === "cancelada"
                            ? "Sessão cancelada."
                            : "Evolução não registrada."}
                      </p>
                    )
                  )}
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
                  >
                    {marcarRealizada && (
                      <AcaoSessao
                        prontuarioId={p.id}
                        sessaoId={atendimento.id}
                      />
                    )}
                  </AcoesFaltaDaSessao>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="ui-dica">Não há sessões registradas neste ciclo.</p>
        )}
      </section>
      <HistoricoFaltas
        id="historico-faltas"
        contagem={p.faltasNoCiclo}
        ciclo={p.cicloAtendimento}
        sessoes={p.sessoes}
      />
      <section aria-labelledby="historico-responsaveis" className={cartao}>
        <h2 id="historico-responsaveis" className="ui-h2">
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
      </section>
      <div className="grid gap-6 sm:grid-cols-2">
        <section aria-labelledby="alta" className={cartao}>
          <h2 id="alta" className="ui-h2">
            Alta
          </h2>
          <p className="ui-dica">
            {p.alta ? `${p.alta.data} · ${p.alta.motivo}` : "Não registrada."}
          </p>
        </section>
        <section aria-labelledby="relatorio" className={cartao}>
          <h2 id="relatorio" className="ui-h2">
            Relatório final
          </h2>
          <p className="ui-dica">
            {p.relatorioFinal?.estado ?? "Não registrado."}
          </p>
        </section>
      </div>
    </div>
  );
}
