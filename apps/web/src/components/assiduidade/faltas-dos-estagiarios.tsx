"use client";
import { hashKey, useQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  consultaFaltasEstagiarioSchema,
  inicioDoSemestre,
  type ConsultaFaltasEstagiario,
  type EstagiarioComFaltas,
  type FaltasDoEstagiario,
} from "@clinica/shared";
import { Aviso } from "@/components/comum/aviso";
import { Campo, classeEntrada } from "@/components/comum/campo";
import { inicioDoPerfil } from "@/components/layout/menu";
import { Button, buttonVariants } from "@/components/ui/button";
import { api, ErroApi } from "@/lib/api";
import { dataBr, dataHoraBr, hojeBr, horaBr } from "@/lib/formato";
import { useSessao } from "@/lib/sessao";

type Filtro = { estagiarioId: string; inicio: string; fim: string };
type Erros = Partial<Record<keyof Filtro, string>>;

const ROTULOS: Record<keyof Filtro, string> = {
  estagiarioId: "estagiário",
  inicio: "data inicial",
  fim: "data final",
};

// Abre com o semestre vigente até hoje, com todos os estagiários.
const filtroInicial = (): Filtro => {
  const hoje = hojeBr();
  return { estagiarioId: "", inicio: inicioDoSemestre(hoje), fim: hoje };
};

const paraConsulta = ({ estagiarioId, ...datas }: Filtro) =>
  consultaFaltasEstagiarioSchema.safeParse(
    estagiarioId ? { estagiarioId, ...datas } : datas,
  );

const endereco = ({ estagiarioId, inicio, fim }: ConsultaFaltasEstagiario) =>
  `/faltas-estagiarios?${new URLSearchParams({
    ...(estagiarioId ? { estagiarioId } : {}),
    inicio,
    fim,
  })}`;

const hora = (valor: string) => horaBr(new Date(valor));

function SemAcesso({
  perfil,
}: {
  perfil: Parameters<typeof inicioDoPerfil>[0];
}) {
  return (
    <div className="mx-auto mt-10 flex max-w-[560px] flex-col items-start gap-3 rounded-xl border bg-card p-8">
      <span aria-hidden className="ui-vazio-icone">
        <Lock className="size-6" />
      </span>
      <h1 className="ui-h2">Você não tem acesso à relação de faltas</h1>
      <p className="ui-subtitulo m-0">
        Esta consulta é do supervisor responsável pelo estagiário e da
        coordenação.
      </p>
      <Link
        href={inicioDoPerfil(perfil)}
        className={buttonVariants({ variant: "link", className: "px-0" })}
      >
        Voltar para a página inicial
      </Link>
    </div>
  );
}

function Resultado({ dados }: { dados: FaltasDoEstagiario }) {
  const { faltas } = dados;
  const total = faltas.length;
  if (total === 0) {
    return (
      <section aria-labelledby="titulo-faltas" className="ui-painel p-5">
        <div role="status">
          <h2 id="titulo-faltas" className="ui-h2">
            Nenhuma falta no período
          </h2>
          <p className="ui-dica mt-1">
            Não há sessões canceladas por ausência real do estagiário entre{" "}
            {dataBr(dados.inicio)} e {dataBr(dados.fim)}.
          </p>
        </div>
      </section>
    );
  }
  return (
    <section aria-labelledby="titulo-faltas" className="ui-painel">
      <div role="status" className="border-b border-border p-4 sm:px-5">
        <h2 id="titulo-faltas" className="ui-h2">
          {total} {total === 1 ? "falta" : "faltas"} no período
        </h2>
      </div>
      <table className="ui-tabela max-md:hidden [&_td]:px-5 [&_th]:px-5">
        <caption className="sr-only">
          Sessões canceladas por ausência real do estagiário, de{" "}
          {dataBr(dados.inicio)} a {dataBr(dados.fim)}
        </caption>
        <thead>
          <tr>
            <th scope="col">Estagiário</th>
            <th scope="col">Data da sessão</th>
            <th scope="col">Horário</th>
            <th scope="col">Registrado em</th>
          </tr>
        </thead>
        <tbody>
          {faltas.map((f) => (
            <tr key={f.id}>
              <td className="[overflow-wrap:anywhere]">{f.estagiario.nome}</td>
              <td className="whitespace-nowrap">{dataBr(f.inicio)}</td>
              <td className="whitespace-nowrap">{hora(f.inicio)}</td>
              <td className="whitespace-nowrap">
                {dataHoraBr(f.registradaEm)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="flex flex-col divide-y divide-border px-4 md:hidden">
        {faltas.map((f) => (
          <li key={f.id} className="flex flex-col gap-0.5 py-3">
            <span className="font-bold [overflow-wrap:anywhere]">
              {f.estagiario.nome}
            </span>
            <span>
              {dataBr(f.inicio)}, {hora(f.inicio)}
            </span>
            <span className="ui-meta">
              Registrado em {dataHoraBr(f.registradaEm)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// Faltas dos estagiários (RF39, prancha 7-1): as sessões canceladas por ausência
// real do estagiário (RF16), para o supervisor, dos estagiários dele, e para a
// coordenação, de todos (RNF35). Sem o nome do paciente nem o motivo da ausência.
export function FaltasDosEstagiarios() {
  const { data: sessao } = useSessao();
  const supervisor = sessao?.perfil === "supervisor";
  const permitido = supervisor || sessao?.perfil === "coordenacao";
  const [filtro, setFiltro] = useState<Filtro>(filtroInicial);
  const [consulta, setConsulta] = useState<ConsultaFaltasEstagiario | null>(
    () => {
      const r = paraConsulta(filtroInicial());
      return r.success ? r.data : null;
    },
  );
  const [erros, setErros] = useState<Erros>({});

  const estagiarios = useQuery({
    queryKey: ["faltas-estagiarios", "estagiarios"],
    queryFn: () =>
      api<EstagiarioComFaltas[]>("/faltas-estagiarios/estagiarios"),
    enabled: permitido,
  });
  const faltas = useQuery({
    queryKey: ["faltas-estagiarios", consulta],
    queryFn: () => api<FaltasDoEstagiario>(endereco(consulta!)),
    enabled: permitido && consulta !== null,
    staleTime: 0,
  });

  if (!sessao) return <p role="status">Carregando…</p>;
  if (!permitido) return <SemAcesso perfil={sessao.perfil} />;

  function consultar(evento: FormEvent) {
    evento.preventDefault();
    const r = paraConsulta(filtro);
    if (!r.success) {
      const novos: Erros = {};
      for (const issue of r.error.issues) {
        novos[issue.path[0] as keyof Filtro] ??= issue.message;
      }
      setErros(novos);
      setConsulta(null);
      return;
    }
    setErros({});
    // Com os mesmos filtros, a chave da consulta não muda e o React Query não
    // busca de novo: o refetch traz as faltas registradas desde a última consulta.
    if (consulta && hashKey([consulta]) === hashKey([r.data])) {
      void faltas.refetch();
      return;
    }
    setConsulta(r.data);
  }

  const campoComErro = (Object.keys(erros) as (keyof Filtro)[])[0];
  const negado = faltas.error instanceof ErroApi && faltas.error.status === 403;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="ui-titulo">Faltas dos estagiários</h1>
        <p className="ui-subtitulo">
          Sessões canceladas por ausência real do estagiário.
        </p>
      </div>

      <form
        onSubmit={consultar}
        noValidate
        className="ui-painel flex flex-col gap-4 p-4 md:flex-row md:items-start md:p-5"
      >
        <Campo
          id="faltas-estagiarioId"
          rotulo="Estagiário"
          erro={erros.estagiarioId}
          className="w-full md:w-72"
        >
          {(props) => (
            <select
              {...props}
              value={filtro.estagiarioId}
              onChange={(e) =>
                setFiltro({ ...filtro, estagiarioId: e.target.value })
              }
              className={classeEntrada}
            >
              <option value="">
                {supervisor
                  ? "Todos os meus estagiários"
                  : "Todos os estagiários"}
              </option>
              {estagiarios.data?.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </select>
          )}
        </Campo>
        {(["inicio", "fim"] as const).map((campo) => (
          <Campo
            key={campo}
            id={`faltas-${campo}`}
            rotulo={campo === "inicio" ? "Data inicial" : "Data final"}
            erro={erros[campo]}
            className="w-full md:w-44"
          >
            {(props) => (
              <input
                {...props}
                type="date"
                value={filtro[campo]}
                onChange={(e) =>
                  setFiltro({ ...filtro, [campo]: e.target.value })
                }
                className={classeEntrada}
              />
            )}
          </Campo>
        ))}
        <Button type="submit" className="max-md:w-full md:mt-[30px]">
          Consultar
        </Button>
      </form>

      {estagiarios.isError && (
        <Aviso
          tipo="alerta"
          titulo="Não foi possível carregar a lista de estagiários."
        >
          A consulta continua valendo para todos os estagiários.
        </Aviso>
      )}

      {campoComErro && (
        <Aviso
          tipo="erro"
          titulo="Não foi possível consultar este período."
          focar
        >
          Corrija o campo{" "}
          <a href={`#faltas-${campoComErro}`} className="underline">
            {ROTULOS[campoComErro]}
          </a>{" "}
          e consulte de novo.
        </Aviso>
      )}

      {consulta && faltas.isPending && (
        <p role="status" aria-busy="true" className="font-semibold">
          Consultando as faltas…
        </p>
      )}

      {consulta && faltas.isError && (
        <Aviso
          tipo="erro"
          titulo={
            negado
              ? faltas.error.message
              : "Não foi possível consultar as faltas."
          }
        >
          {!negado && (
            <Button variant="outline" onClick={() => void faltas.refetch()}>
              Tentar novamente
            </Button>
          )}
        </Aviso>
      )}

      {consulta && faltas.data && <Resultado dados={faltas.data} />}
    </div>
  );
}
