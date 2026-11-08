"use client";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Lock } from "lucide-react";
import Link from "next/link";
import { Fragment, useEffect, useId, useState } from "react";
import {
  consultaAgendaSchema,
  LIMITE_FALTAS_CICLO,
  STATUS_PADRAO_DA_AGENDA,
  type AgendaDoEstagiario,
  type ResultadoCancelamento,
  type SessaoDaAgenda,
  type StatusSessao,
} from "@clinica/shared";
import {
  DialogoRegistrarFalta,
  SeloSessao,
} from "@/components/assiduidade/faltas";
import {
  aceitaCancelamento,
  DialogoCancelarSessao,
  ResultadoDoCancelamento,
} from "@/components/cancelamento/cancelar-sessao";
import { Aviso } from "@/components/comum/aviso";
import { Campo, classeEntrada } from "@/components/comum/campo";
import { Button, buttonVariants } from "@/components/ui/button";
import { api, ErroApi } from "@/lib/api";
import {
  dataBr,
  dataHoraBr,
  diaDaSemanaBr,
  horaBr,
  NOMES_STATUS_SESSAO,
} from "@/lib/formato";
import { cn } from "@/lib/utils";

const FUSO = "America/Sao_Paulo";

// Datas de Brasília no formato "2026-11-04", para o filtro e o agrupamento por dia.
const dataDe = (instante: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(instante);
const somarDias = (data: string, dias: number) => {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
};
// 0 = domingo, 6 = sábado.
const diaDaSemana = (data: string) => new Date(`${data}T12:00:00Z`).getUTCDay();
const dataCurta = (data: string) => dataBr(`${data}T12:00:00-03:00`);
const nomeDoDia = (data: string) => {
  const texto = diaDaSemanaBr(`${data}T12:00:00-03:00`);
  return `${texto.charAt(0).toUpperCase()}${texto.slice(1)}`;
};
const hora = (valor: string) => horaBr(new Date(valor));

type Periodo = "hoje" | "semana" | "mes" | "outro";
const PERIODOS: { valor: Periodo; rotulo: string }[] = [
  { valor: "hoje", rotulo: "Hoje" },
  { valor: "semana", rotulo: "Esta semana" },
  { valor: "mes", rotulo: "Este mês" },
  { valor: "outro", rotulo: "Outro período" },
];

// "Esta semana" vai de segunda a domingo; "Este mês", do dia 1 ao último dia.
function intervalo(periodo: Periodo, hoje: string) {
  if (periodo === "hoje") return { de: hoje, ate: hoje };
  if (periodo === "semana") {
    const segunda = somarDias(hoje, -((diaDaSemana(hoje) + 6) % 7));
    return { de: segunda, ate: somarDias(segunda, 6) };
  }
  const primeiro = `${hoje.slice(0, 7)}-01`;
  const proximo = somarDias(primeiro, 32).slice(0, 7);
  return { de: primeiro, ate: somarDias(`${proximo}-01`, -1) };
}

const SITUACOES: StatusSessao[] = [
  "agendada",
  "confirmada",
  "realizada",
  "cancelada",
  "falta_paciente",
];

// Dias da lista: no período de até uma semana, os dias úteis aparecem sempre (com
// "Nenhuma sessão neste dia"); o fim de semana e os períodos maiores, só com sessão.
function diasDaLista(de: string, ate: string, comSessao: Set<string>) {
  const curto = somarDias(de, 6) >= ate;
  const dias: string[] = [];
  for (let d = de; d <= ate; d = somarDias(d, 1)) {
    const util = diaDaSemana(d) % 6 !== 0;
    if (comSessao.has(d) || (curto && util)) dias.push(d);
  }
  return dias;
}

type Concluido =
  | {
      tipo: "cancelamento";
      sessao: SessaoDaAgenda;
      resultado: ResultadoCancelamento;
    }
  | { tipo: "falta"; sessao: SessaoDaAgenda };

// Agenda de sessões do estagiário (RF11), com os filtros de período e situação da
// prancha 4-2. Mostra só o nome do paciente, a data, os horários e a situação
// (RNF13). Cada linha traz a ação que a API aceita para quem consulta.
export function AgendaDeSessoes({
  estagiarioId,
  titulo,
}: {
  estagiarioId?: string;
  titulo?: string;
}) {
  const idFiltros = useId();
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const relogio = setInterval(() => setAgora(Date.now()), 60_000);
    return () => clearInterval(relogio);
  }, []);
  const hoje = dataDe(new Date(agora));
  const [periodo, setPeriodo] = useState<Periodo>("semana");
  const [outro, setOutro] = useState(() => intervalo("semana", hoje));
  const [situacoes, setSituacoes] = useState<StatusSessao[]>(
    STATUS_PADRAO_DA_AGENDA,
  );
  const [cancelando, setCancelando] = useState<SessaoDaAgenda | null>(null);
  const [registrandoFalta, setRegistrandoFalta] =
    useState<SessaoDaAgenda | null>(null);
  const [concluido, setConcluido] = useState<Concluido | null>(null);

  const { de, ate } = periodo === "outro" ? outro : intervalo(periodo, hoje);
  const filtro = consultaAgendaSchema.safeParse({
    estagiarioId,
    de,
    ate,
    status: situacoes,
  });
  const erroDoFiltro = filtro.success
    ? null
    : (filtro.error.issues[0]?.message ?? "Revise o filtro.");
  const chave = ["agenda", estagiarioId ?? "eu", de, ate, situacoes.join(",")];
  const consulta = useQuery({
    queryKey: chave,
    queryFn: () => {
      const busca = new URLSearchParams({
        de,
        ate,
        status: situacoes.join(","),
      });
      if (estagiarioId) busca.set("estagiarioId", estagiarioId);
      return api<AgendaDoEstagiario>(`/agenda?${busca}`);
    },
    enabled: filtro.success,
    retry: false,
  });

  if (consulta.error instanceof ErroApi && consulta.error.status === 403) {
    return <AgendaNegada />;
  }

  const agenda = consulta.data;
  const porDia = new Map<string, SessaoDaAgenda[]>();
  for (const s of agenda?.sessoes ?? []) {
    const dia = dataDe(new Date(s.inicio));
    porDia.set(dia, [...(porDia.get(dia) ?? []), s]);
  }
  const dias = agenda
    ? diasDaLista(agenda.de, agenda.ate, new Set(porDia.keys()))
    : [];
  const total = agenda?.sessoes.length ?? 0;

  const acao = (s: SessaoDaAgenda, celular = false) => {
    const emAberto = s.status === "agendada" || s.status === "confirmada";
    const passou = new Date(s.inicio).getTime() <= agora;
    const largura = celular ? "w-full" : undefined;
    if (s.status === "realizada" && s.prontuarioId) {
      return (
        <Link
          href={`/prontuarios/${s.prontuarioId}`}
          aria-label={`Abrir prontuário de ${s.paciente}`}
          className={buttonVariants({ variant: "outline", className: largura })}
        >
          Abrir prontuário
        </Link>
      );
    }
    if (emAberto && passou && s.acoes.registrarFalta) {
      return (
        <Button
          type="button"
          variant="outline"
          className={largura}
          aria-label={`Registrar falta do paciente ${s.paciente}`}
          onClick={() => {
            setConcluido(null);
            setRegistrandoFalta(s);
          }}
        >
          Registrar falta do paciente
        </Button>
      );
    }
    const acoes = {
      ...s.acoes,
      antecedenciaMinimaMinutos: agenda?.antecedenciaMinimaMinutos ?? 60,
    };
    if (aceitaCancelamento(s, acoes, agora)) {
      // O supervisor só registra a ausência do estagiário (RF16).
      const soAusencia = !s.acoes.pedidoPaciente && !s.acoes.administrativo;
      const rotulo = soAusencia
        ? "Registrar ausência do estagiário"
        : "Cancelar sessão";
      return (
        <Button
          type="button"
          variant={celular ? "outline" : "destructive-ghost"}
          className={cn(largura, celular && "text-destructive")}
          aria-label={`${rotulo}: ${s.paciente}, ${hora(s.inicio)}`}
          onClick={() => {
            setConcluido(null);
            setCancelando(s);
          }}
        >
          {rotulo}
        </Button>
      );
    }
    return null;
  };

  const situacao = (s: SessaoDaAgenda) => (
    <span className="flex flex-wrap items-center gap-2">
      <SeloSessao status={s.status} cancelamento={s.cancelamento} />
      {(s.status === "agendada" || s.status === "confirmada") &&
        new Date(s.inicio).getTime() <= agora && (
          <span className="ui-meta">Horário já passou</span>
        )}
    </span>
  );

  const tituloDoDia = (dia: string) => (
    <span className="flex items-center gap-2">
      {nomeDoDia(dia)}
      {dia === hoje && (
        <span className="rounded-full bg-marca px-2 py-0.5 text-xs font-bold text-white">
          Hoje
        </span>
      )}
    </span>
  );

  return (
    <div className="flex flex-col gap-4">
      {concluido?.tipo === "cancelamento" && (
        <ResultadoDoCancelamento
          nome={concluido.sessao.paciente}
          inicio={concluido.sessao.inicio}
          resultado={concluido.resultado}
          casoId={concluido.sessao.casoId}
        />
      )}
      {concluido?.tipo === "falta" && (
        <Aviso tipo="sucesso" titulo="Falta registrada." focar>
          A sessão de {concluido.sessao.paciente} em{" "}
          {dataBr(concluido.sessao.inicio)}, às {hora(concluido.sessao.inicio)},
          passou para “Falta do paciente”.
        </Aviso>
      )}
      <section
        aria-labelledby={titulo ? `${idFiltros}-titulo` : undefined}
        aria-label={titulo ? undefined : "Sessões"}
        className="ui-painel"
      >
        {titulo && (
          <h2
            id={`${idFiltros}-titulo`}
            className="border-b border-border px-5 py-4 text-lg font-bold text-marca"
          >
            {titulo}
          </h2>
        )}
        <div className="flex flex-col gap-4 border-b border-border px-4 py-4 md:px-5">
          <fieldset className="flex min-w-0 flex-col gap-2">
            <legend className="mb-1.5 text-[15px] font-semibold">
              Período
            </legend>
            <div className="flex flex-wrap gap-2">
              {PERIODOS.map((p) => (
                <label key={p.valor} className="ui-opcao py-2.5">
                  <input
                    type="radio"
                    name={`${idFiltros}-periodo`}
                    value={p.valor}
                    checked={periodo === p.valor}
                    onChange={() => {
                      if (p.valor === "outro") setOutro({ de, ate });
                      setPeriodo(p.valor);
                    }}
                  />
                  <span>{p.rotulo}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {periodo === "outro" && (
            <div className="flex flex-wrap items-end gap-3">
              <Campo rotulo="De" className="w-full sm:w-44">
                {(props) => (
                  <input
                    {...props}
                    type="date"
                    value={outro.de}
                    onChange={(e) => setOutro({ ...outro, de: e.target.value })}
                    className={classeEntrada}
                  />
                )}
              </Campo>
              <Campo
                rotulo="Até"
                className="w-full sm:w-44"
                erro={
                  periodo === "outro" ? (erroDoFiltro ?? undefined) : undefined
                }
              >
                {(props) => (
                  <input
                    {...props}
                    type="date"
                    value={outro.ate}
                    onChange={(e) =>
                      setOutro({ ...outro, ate: e.target.value })
                    }
                    className={classeEntrada}
                  />
                )}
              </Campo>
            </div>
          )}
          <fieldset className="flex min-w-0 flex-col gap-2">
            <legend className="mb-1.5 text-[15px] font-semibold">
              Situação
            </legend>
            <div className="flex flex-wrap gap-2">
              {SITUACOES.map((s) => (
                <label key={s} className="ui-opcao py-2.5">
                  <input
                    type="checkbox"
                    checked={situacoes.includes(s)}
                    onChange={(e) =>
                      setSituacoes(
                        e.target.checked
                          ? SITUACOES.filter(
                              (x) => x === s || situacoes.includes(x),
                            )
                          : situacoes.filter((x) => x !== s),
                      )
                    }
                  />
                  <span>{NOMES_STATUS_SESSAO[s]}</span>
                </label>
              ))}
            </div>
            {situacoes.length === 0 && (
              <p className="text-sm font-semibold text-destructive">
                Marque ao menos uma situação.
              </p>
            )}
          </fieldset>
        </div>

        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-3.5 md:px-5">
          <h3 className="text-base font-bold text-marca">
            {dataCurta(de)} a {dataCurta(ate)}
          </h3>
          {agenda && (
            <span className="ui-meta" role="status">
              {total === 1 ? "1 sessão" : `${total} sessões`}
            </span>
          )}
        </div>

        {!filtro.success ? null : consulta.isPending ? (
          <p role="status" className="px-5 py-6">
            Carregando…
          </p>
        ) : consulta.isError || !agenda ? (
          <div className="p-4">
            <Aviso tipo="erro" titulo="Não foi possível carregar a agenda.">
              Verifique a sua conexão e tente de novo.
            </Aviso>
          </div>
        ) : total === 0 ? (
          <Vazio />
        ) : (
          <>
            <table className="ui-tabela max-xl:hidden">
              <caption className="sr-only">
                Sessões de {agenda.estagiario.nome} de {dataCurta(de)} a{" "}
                {dataCurta(ate)}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Horário</th>
                  <th scope="col">Paciente</th>
                  <th scope="col">Situação</th>
                  <th scope="col">
                    <span className="sr-only">Ação</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {dias.map((dia) => (
                  <Fragment key={dia}>
                    <tr className="bg-muted">
                      <th
                        scope="colgroup"
                        colSpan={4}
                        className="text-[14px]! text-foreground!"
                      >
                        {tituloDoDia(dia)}
                      </th>
                    </tr>
                    {(porDia.get(dia) ?? []).length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="text-muted-foreground italic"
                        >
                          Nenhuma sessão neste dia.
                        </td>
                      </tr>
                    ) : (
                      porDia.get(dia)!.map((s) => (
                        <tr key={s.id}>
                          <td className="whitespace-nowrap">
                            {hora(s.inicio)} às {hora(s.termino)}
                          </td>
                          <td className="min-w-40 font-semibold">
                            {s.paciente}
                          </td>
                          <td>{situacao(s)}</td>
                          <td className="text-right">{acao(s)}</td>
                        </tr>
                      ))
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
            <div className="flex flex-col gap-4 p-4 xl:hidden">
              {dias.map((dia) => (
                <div key={dia} className="flex flex-col gap-2">
                  <h4 className="text-[15px] font-bold">{tituloDoDia(dia)}</h4>
                  {(porDia.get(dia) ?? []).length === 0 ? (
                    <p className="ui-dica italic">Nenhuma sessão neste dia.</p>
                  ) : (
                    <ul className="ui-lista-celular">
                      {porDia.get(dia)!.map((s) => (
                        <li key={s.id} className="ui-item-celular">
                          <span className="font-bold">
                            {hora(s.inicio)} às {hora(s.termino)}
                          </span>
                          <span className="font-semibold">{s.paciente}</span>
                          {situacao(s)}
                          {acao(s, true)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {cancelando && agenda && (
        <DialogoCancelarSessao
          nome={cancelando.paciente}
          sessao={{ ...cancelando, estagiario: agenda.estagiario.nome }}
          acoes={{
            ...cancelando.acoes,
            antecedenciaMinimaMinutos: agenda.antecedenciaMinimaMinutos,
          }}
          chave={["agenda"]}
          aoFechar={() => setCancelando(null)}
          aoConcluir={(resultado) => {
            setConcluido({
              tipo: "cancelamento",
              sessao: cancelando,
              resultado,
            });
            setCancelando(null);
          }}
        />
      )}
      {registrandoFalta && agenda && (
        <DialogoRegistrarFalta
          nome={registrandoFalta.paciente}
          sessao={{
            ...registrandoFalta,
            estagiario: agenda.estagiario.nome,
            falta: null,
          }}
          limite={LIMITE_FALTAS_CICLO}
          chave={["agenda"]}
          aoFechar={() => setRegistrandoFalta(null)}
          aoConcluir={() => {
            setConcluido({ tipo: "falta", sessao: registrandoFalta });
            setRegistrandoFalta(null);
          }}
        />
      )}
    </div>
  );
}

function Vazio() {
  return (
    <div className="ui-vazio">
      <span aria-hidden className="ui-vazio-icone">
        <CalendarDays className="size-7" />
      </span>
      <p className="text-base font-bold text-marca">
        Nenhuma sessão neste período.
      </p>
      <p className="text-muted-foreground">
        Escolha outro período ou marque outras situações.
      </p>
    </div>
  );
}

// Supervisor pedindo a agenda de um estagiário que não é dele: nenhuma sessão, e a
// tentativa fica registrada pela API.
function AgendaNegada() {
  const [registradoEm] = useState(() => new Date().toISOString());
  return (
    <div className="mx-auto mt-6 flex max-w-[640px] flex-col items-center gap-3.5 px-4 py-10 text-center md:px-10 md:py-[56px]">
      <span
        aria-hidden
        className="ui-vazio-icone bg-alerta-fundo! text-[#a85400]!"
      >
        <Lock className="size-7" />
      </span>
      <h2 className="ui-titulo">
        Você não tem acesso à agenda deste estagiário.
      </h2>
      <p className="text-base">
        Você pode ver só a agenda dos estagiários que você supervisiona. Se acha
        que deveria ter acesso, fale com a coordenação.
      </p>
      <Link href="/agenda" className={buttonVariants()}>
        Voltar para a agenda
      </Link>
      <p className="ui-meta">
        Tentativa registrada em {dataHoraBr(registradoEm)}.
      </p>
    </div>
  );
}
