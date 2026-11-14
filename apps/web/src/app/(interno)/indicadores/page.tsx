"use client";
import { useQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  consultaIndicadoresSchema,
  type ConsultaIndicadores,
  type Indicadores,
} from "@clinica/shared";
import { VagasOfertadasDialogo } from "@/components/indicadores/vagas-ofertadas";
import { Aviso } from "@/components/comum/aviso";
import { Campo, classeEntrada } from "@/components/comum/campo";
import { inicioDoPerfil } from "@/components/layout/menu";
import { Button, buttonVariants } from "@/components/ui/button";
import { api } from "@/lib/api";
import { dataBr, hojeBr } from "@/lib/formato";
import { useSessao } from "@/lib/sessao";

type Erros = Partial<Record<keyof ConsultaIndicadores, string>>;

const decimal = (valor: number) =>
  valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
const plural = (n: number, um: string, varios: string) =>
  `${n} ${n === 1 ? um : varios}`;

// Primeiro dia do mês corrente até hoje, como a consulta abre.
const periodoInicial = (): ConsultaIndicadores => {
  const hoje = hojeBr();
  return { inicio: `${hoje.slice(0, 8)}01`, fim: hoje };
};

// Indicadores operacionais da coordenação (RF48, pranchas 9-1 e 9-2).
export default function IndicadoresPage() {
  const { data: sessao } = useSessao();
  const permitido = sessao?.perfil === "coordenacao";
  const [datas, setDatas] = useState<ConsultaIndicadores>(periodoInicial);
  const [consulta, setConsulta] = useState<ConsultaIndicadores | null>(
    periodoInicial,
  );
  const [erros, setErros] = useState<Erros>({});
  const [vagasAberto, setVagasAberto] = useState(false);

  const indicadores = useQuery({
    queryKey: ["indicadores", consulta],
    queryFn: () =>
      api<Indicadores>(
        `/indicadores?inicio=${consulta!.inicio}&fim=${consulta!.fim}`,
      ),
    enabled: permitido && consulta !== null,
    staleTime: 0,
  });

  if (!sessao) return <p role="status">Carregando…</p>;
  if (!permitido) {
    return (
      <div className="mx-auto mt-10 flex max-w-[560px] flex-col items-start gap-3 rounded-xl border bg-card p-8">
        <span aria-hidden className="ui-vazio-icone">
          <Lock className="size-6" />
        </span>
        <h1 className="ui-h2">
          Você não tem acesso aos indicadores operacionais
        </h1>
        <p className="ui-subtitulo m-0">
          Esta consulta é exclusiva do perfil de coordenação. Se precisar destas
          informações, procure a coordenação da clínica.
        </p>
        <Link
          href={inicioDoPerfil(sessao.perfil)}
          className={buttonVariants({ variant: "link", className: "px-0" })}
        >
          Voltar para a página inicial
        </Link>
      </div>
    );
  }

  function consultar(evento: FormEvent) {
    evento.preventDefault();
    const r = consultaIndicadoresSchema.safeParse(datas);
    if (!r.success) {
      const novos: Erros = {};
      for (const issue of r.error.issues) {
        const campo = issue.path[0] as keyof ConsultaIndicadores;
        novos[campo] ??= issue.message;
      }
      setErros(novos);
      setConsulta(null);
      return;
    }
    setErros({});
    setConsulta(r.data);
  }

  const campoComErro = (Object.keys(erros) as (keyof ConsultaIndicadores)[])[0];
  const dados = indicadores.data;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="ui-titulo">Indicadores operacionais</h1>
        <p className="ui-subtitulo">
          Situação das vagas, da espera, da evasão e da distribuição de casos no
          período escolhido.
        </p>
      </div>

      <form
        onSubmit={consultar}
        noValidate
        className="ui-painel flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:p-5"
      >
        {(["inicio", "fim"] as const).map((campo) => (
          <Campo
            key={campo}
            id={`indicadores-${campo}`}
            rotulo={campo === "inicio" ? "Data inicial" : "Data final"}
            erro={erros[campo]}
            className="w-full sm:w-48"
          >
            {(props) => (
              <input
                {...props}
                type="date"
                max={hojeBr()}
                value={datas[campo]}
                onChange={(e) =>
                  setDatas({ ...datas, [campo]: e.target.value })
                }
                className={classeEntrada}
              />
            )}
          </Campo>
        ))}
        <Button type="submit" className="sm:mt-[30px]">
          Consultar
        </Button>
      </form>

      {campoComErro && (
        <Aviso
          tipo="erro"
          titulo="Não foi possível consultar este período."
          focar
        >
          Corrija a{" "}
          <a href={`#indicadores-${campoComErro}`} className="underline">
            {campoComErro === "inicio" ? "data inicial" : "data final"}
          </a>{" "}
          e consulte de novo. Nenhum indicador foi calculado.
        </Aviso>
      )}

      {consulta && indicadores.isPending && (
        <div aria-busy="true">
          <p role="status" className="font-semibold">
            Calculando os indicadores…
          </p>
          <div aria-hidden className="mt-3 grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="ui-painel h-28 animate-pulse p-5" />
            ))}
          </div>
        </div>
      )}

      {consulta && indicadores.isError && (
        <Aviso tipo="erro" titulo="Não foi possível calcular os indicadores.">
          <Button variant="outline" onClick={() => void indicadores.refetch()}>
            Tentar novamente
          </Button>
        </Aviso>
      )}

      {consulta && dados && (
        <section
          aria-labelledby="titulo-resultado"
          className="flex flex-col gap-4"
        >
          <h2 id="titulo-resultado" className="sr-only">
            Resultado da consulta
          </h2>
          <p role="status" className="ui-dica">
            Vagas ocupadas e distribuição mostram a situação{" "}
            {dados.referenciaEhAgora
              ? "no momento da consulta"
              : `ao fim de ${dataBr(dados.fim)}`}
            . Tempo de espera e evasão consideram de {dataBr(dados.inicio)} a{" "}
            {dataBr(dados.fim)}.
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="ui-painel flex flex-col gap-2 p-5">
              <h3 className="ui-rotulo">Vagas ocupadas</h3>
              <p>
                <strong className="text-3xl">{dados.vagas.ocupadas}</strong>{" "}
                {dados.vagas.ofertadas !== null
                  ? `de ${dados.vagas.ofertadas} vagas · ${decimal(dados.vagas.percentual!)}%`
                  : "vagas ocupadas"}
              </p>
              {dados.vagas.ofertadas !== null ? (
                <>
                  <div
                    role="img"
                    aria-label={`${decimal(dados.vagas.percentual!)}% das vagas ocupadas`}
                    className="h-2 overflow-hidden rounded-full bg-muted"
                  >
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: `${Math.min(100, dados.vagas.percentual!)}%`,
                      }}
                    />
                  </div>
                  <p className="ui-meta">
                    Semestre {dados.vagas.semestre} ·{" "}
                    <button
                      type="button"
                      className="font-semibold text-primary underline"
                      onClick={() => setVagasAberto(true)}
                    >
                      Alterar vagas ofertadas
                    </button>
                  </p>
                </>
              ) : (
                <Aviso
                  tipo="alerta"
                  titulo={`O total de vagas ofertadas no semestre ${dados.vagas.semestre} não foi registrado.`}
                >
                  <button
                    type="button"
                    className="font-semibold text-primary underline"
                    onClick={() => setVagasAberto(true)}
                  >
                    Registrar vagas ofertadas
                  </button>
                </Aviso>
              )}
            </div>

            <div className="ui-painel flex flex-col gap-2 p-5">
              <h3 className="ui-rotulo">Tempo médio de espera</h3>
              <p>
                <strong className="text-3xl">
                  {decimal(dados.espera.mediaDias)}
                </strong>{" "}
                dias corridos
              </p>
              <p className="ui-meta">
                {dados.espera.pacientes
                  ? `Da inscrição à primeira sessão realizada, para ${plural(dados.espera.pacientes, "paciente atendido", "pacientes atendidos")} pela primeira vez no período.`
                  : "Nenhuma primeira sessão realizada no período."}
              </p>
            </div>

            <div className="ui-painel flex flex-col gap-2 p-5">
              <h3 className="ui-rotulo">Taxa de evasão</h3>
              <p>
                <strong className="text-3xl">
                  {decimal(dados.evasao.percentual)}%
                </strong>
              </p>
              <p className="ui-meta">
                {dados.evasao.ativos
                  ? `${plural(dados.evasao.desligamentos, "desligamento", "desligamentos")} por faltas, de ${plural(dados.evasao.ativos, "paciente", "pacientes")} em atendimento ativo no período. Desligamentos revertidos não contam.`
                  : "Nenhum paciente em atendimento ativo no período."}
              </p>
            </div>
          </div>

          <div className="ui-painel">
            <div className="border-b border-border p-4 sm:px-5">
              <h3 className="ui-h2">Distribuição de casos por supervisor</h3>
              <p className="ui-dica">
                Pacientes em atendimento ativo{" "}
                {dados.referenciaEhAgora
                  ? "no momento da consulta"
                  : `em ${dataBr(dados.fim)}`}
                .
              </p>
            </div>
            {dados.supervisores.length === 0 ? (
              <p className="p-5">Não há supervisores ativos.</p>
            ) : (
              <table className="ui-tabela">
                <caption className="sr-only">
                  Casos ativos de cada supervisor
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Supervisor</th>
                    <th scope="col" className="text-right">
                      Casos ativos
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dados.supervisores.map((s) => (
                    <tr key={s.id}>
                      <td>{s.nome}</td>
                      <td className="text-right">{s.casos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <VagasOfertadasDialogo
            aberto={vagasAberto}
            semestre={dados.vagas.semestre}
            aoFechar={() => setVagasAberto(false)}
            aoSalvar={() => {
              setVagasAberto(false);
              void indicadores.refetch();
            }}
          />
        </section>
      )}
    </div>
  );
}
