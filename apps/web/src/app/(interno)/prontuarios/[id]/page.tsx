"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Lock } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  dadosIniciaisSchema,
  evolucaoSchema,
  type AcoesCancelamento,
  type CancelamentoDaSessao,
  type ContagemFaltas,
  type DadosIniciais,
  type Evolucao,
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
import { AcessoNegado } from "@/components/comum/acesso-negado";
import { Aviso } from "@/components/comum/aviso";
import {
  Campo,
  classeTextoLongo,
  classeEntrada,
} from "@/components/comum/campo";
import { Dados } from "@/components/comum/dados";
import { Button } from "@/components/ui/button";
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
    dataAssinaturaContrato: "",
    aceiteTclePesquisa: false,
    viaContratoGuardada: false,
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
    <form noValidate onSubmit={salvar} className="flex flex-col gap-5">
      <Campo rotulo="Anamnese" erro={erros.anamnese}>
        {(props) => (
          <textarea
            {...props}
            value={dados.anamnese}
            onChange={(e) => setDados({ ...dados, anamnese: e.target.value })}
            className={classeTextoLongo}
          />
        )}
      </Campo>
      <fieldset className="flex min-w-0 flex-col gap-4 rounded-[12px] border border-border bg-muted p-4">
        <legend className="ui-rotulo px-1">Contrato terapêutico</legend>
        <p className="ui-dica">
          O contrato é o “Contrato de Prestação de Serviço” da Clínica Escola,
          assinado em papel na primeira sessão. Registre aqui a assinatura e a
          guarda da via.
        </p>
        <Campo
          rotulo="Data de assinatura do contrato"
          erro={erros.dataAssinaturaContrato}
          className="max-w-[280px]"
        >
          {(props) => (
            <input
              {...props}
              type="date"
              value={dados.dataAssinaturaContrato}
              onChange={(e) =>
                setDados({ ...dados, dataAssinaturaContrato: e.target.value })
              }
              className={classeEntrada}
            />
          )}
        </Campo>
        <label className="flex cursor-pointer items-start gap-3 text-[15px]">
          <input
            type="checkbox"
            checked={dados.aceiteTclePesquisa}
            onChange={(e) =>
              setDados({ ...dados, aceiteTclePesquisa: e.target.checked })
            }
            className="mt-0.5 size-5 shrink-0 accent-primary"
          />
          <span>
            O paciente aceitou o termo de consentimento livre e esclarecido para
            pesquisa
            <span className="ui-meta"> (opcional)</span>
          </span>
        </label>
        <div className="flex flex-col gap-1.5">
          <label className="flex cursor-pointer items-start gap-3 text-[15px]">
            <input
              type="checkbox"
              checked={dados.viaContratoGuardada}
              aria-invalid={erros.viaContratoGuardada ? true : undefined}
              aria-describedby={
                erros.viaContratoGuardada ? "via-guardada-erro" : undefined
              }
              onChange={(e) =>
                setDados({ ...dados, viaContratoGuardada: e.target.checked })
              }
              className="mt-0.5 size-5 shrink-0 accent-primary"
            />
            <span>A via assinada do contrato está guardada na clínica</span>
          </label>
          {erros.viaContratoGuardada && (
            <p
              id="via-guardada-erro"
              className="text-sm font-semibold text-destructive"
            >
              {erros.viaContratoGuardada}
            </p>
          )}
        </div>
      </fieldset>
      {erro && <Aviso tipo="erro" titulo={erro} />}
      <div className="flex justify-end">
        <Button type="submit" disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar dados iniciais"}
        </Button>
      </div>
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
      className="mt-4 flex flex-col gap-4 rounded-[12px] border border-border bg-muted p-4"
    >
      <h4 className="text-[15px] font-bold text-marca">
        Registrar evolução · sessão de {dataHoraBr(inicio)}
      </h4>
      <p className="ui-dica">
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
            className={classeTextoLongo}
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
            className={classeTextoLongo}
          />
        )}
      </Campo>
      {erro && <Aviso tipo="erro" titulo={erro} />}
      <div className="flex justify-end">
        <Button type="submit">Salvar evolução</Button>
      </div>
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
    anamnese: string | null;
    contrato: string | null;
    dataAssinaturaContrato: string | null;
    aceiteTclePesquisa: boolean | null;
    viaContratoGuardada: boolean | null;
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
    estagiario: string;
    status: StatusSessao;
    falta: FaltaDaSessao | null;
    cancelamento: CancelamentoDaSessao | null;
    canceladaPorDesligamento: boolean;
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
  faltasNoCiclo: ContagemFaltas;
  sessoesAReagendar: SessaoAReagendar[];
  acoesFalta: { registrar: boolean; justificar: boolean };
  acoesCancelamento: AcoesCancelamento;
};

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
    return (
      <AcessoNegado
        titulo="Você não tem acesso a este prontuário"
        voltar={voltar}
        rotuloVoltar={rotuloVoltar}
      >
        O prontuário só pode ser aberto pelo estagiário responsável pelo caso,
        pelo supervisor dele e pela coordenação. Se você acha que deveria ter
        acesso, fale com o supervisor do caso.
      </AcessoNegado>
    );
  if (consulta.isError || !consulta.data)
    return <Aviso tipo="erro" titulo="Não foi possível abrir o prontuário." />;

  const p = consulta.data;
  const { anamnese, contrato, dataAssinaturaContrato, registradoEm } =
    p.dadosIniciais;
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
        {anamnese || dataAssinaturaContrato ? (
          <>
            <div className="flex flex-col gap-1.5">
              <h3 className="ui-rotulo">Anamnese</h3>
              <p className="rounded-lg border border-border bg-muted p-3 text-[15px] leading-[1.55] whitespace-pre-wrap">
                {anamnese ?? "Não registrada."}
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <h3 className="ui-rotulo">Contrato terapêutico</h3>
              {/* Registros anteriores à DF41 têm o contrato em texto livre. */}
              {contrato && (
                <p className="rounded-lg border border-border bg-muted p-3 text-[15px] leading-[1.55] whitespace-pre-wrap">
                  {contrato}
                </p>
              )}
              <Dados
                itens={[
                  [
                    "Data de assinatura do contrato",
                    dataBr(dataAssinaturaContrato),
                  ],
                  [
                    "Termo de consentimento para pesquisa",
                    p.dadosIniciais.aceiteTclePesquisa === null
                      ? "Não informado"
                      : p.dadosIniciais.aceiteTclePesquisa
                        ? "Aceito"
                        : "Não aceito",
                  ],
                  [
                    "Via assinada",
                    p.dadosIniciais.viaContratoGuardada
                      ? "Guardada na clínica"
                      : "Não informado",
                  ],
                ]}
              />
            </div>
            <p className="ui-meta">
              Registrado por{" "}
              {p.dadosIniciais.registradoPor ?? "responsável não identificado"}{" "}
              em {dataHoraBr(registradoEm)}
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
                    <div className="mt-2 flex flex-col gap-2 text-[15px]">
                      <p>
                        <strong>Evolução:</strong> {atendimento.evolucao.queixa}
                      </p>
                      <p>
                        <strong>Planejamento:</strong>{" "}
                        {atendimento.evolucao.planejamento}
                      </p>
                      <p className="ui-meta">
                        Registrada por {atendimento.evolucao.registradaPor} em{" "}
                        {dataHoraBr(atendimento.evolucao.registradaEm)}
                      </p>
                    </div>
                  ) : responsavel && atendimento.status === "realizada" ? (
                    <FormularioEvolucao
                      prontuarioId={p.id}
                      sessaoId={atendimento.id}
                      inicio={atendimento.inicio}
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
