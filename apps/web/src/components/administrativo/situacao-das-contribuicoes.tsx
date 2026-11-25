"use client";
import { useQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import type {
  ContribuicaoDoPaciente,
  SituacaoDaContribuicao,
} from "@clinica/shared";
import { Selo } from "@/components/administrativo/contribuicao";
import { Aviso } from "@/components/comum/aviso";
import { Campo, classeEntrada } from "@/components/comum/campo";
import { inicioDoPerfil } from "@/components/layout/menu";
import { Button, buttonVariants } from "@/components/ui/button";
import { api } from "@/lib/api";
import { dataBr } from "@/lib/formato";
import { useSessao } from "@/lib/sessao";

type Filtro = "" | SituacaoDaContribuicao;

const ROTULO_FILTRO: Record<Filtro, string> = {
  "": "Todas",
  pendente: "Pendente",
  efetivada: "Efetivada",
};

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
      <h1 className="ui-h2">Você não tem acesso à contribuição social</h1>
      <p className="ui-subtitulo m-0">
        A contribuição social é um controle administrativo, consultado pela
        secretaria e pela coordenação.
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

const primeiraSessao = (c: ContribuicaoDoPaciente) =>
  c.primeiraSessao ? dataBr(c.primeiraSessao) : "Ainda não agendada";
const prazo = (c: ContribuicaoDoPaciente) =>
  c.prazoAte ? `até ${dataBr(c.prazoAte)}` : "—";

const titulo = (filtro: Filtro, total: number) => {
  const pacientes = total === 1 ? "paciente" : "pacientes";
  if (filtro === "pendente")
    return `${total} ${pacientes} com contribuição pendente`;
  if (filtro === "efetivada")
    return `${total} ${pacientes} com contribuição efetivada`;
  return `${total} ${pacientes} em atendimento`;
};

const VAZIO: Record<Filtro, { titulo: string; texto: string }> = {
  "": {
    titulo: "Nenhum paciente em atendimento",
    texto: "A situação da contribuição aparece aqui depois do vínculo.",
  },
  pendente: {
    titulo: "Nenhum paciente com contribuição pendente",
    texto:
      "Todos os pacientes em atendimento já têm o pagamento do ciclo atual registrado.",
  },
  efetivada: {
    titulo: "Nenhum paciente com contribuição efetivada",
    texto: "Nenhum pagamento do ciclo atual foi registrado ainda.",
  },
};

function Lista({
  filtro,
  dados,
}: {
  filtro: Filtro;
  dados: ContribuicaoDoPaciente[];
}) {
  const pendentes = filtro === "pendente";
  if (dados.length === 0) {
    const { titulo: t, texto } = VAZIO[filtro];
    return (
      <section aria-labelledby="titulo-contribuicoes" className="ui-painel p-5">
        <div role="status">
          <h2 id="titulo-contribuicoes" className="ui-h2">
            {t}
          </h2>
          <p className="ui-dica mt-1">{texto}</p>
        </div>
      </section>
    );
  }
  const nome = (c: ContribuicaoDoPaciente) => (
    <Link
      href={`/pacientes/${c.casoId}`}
      className="font-semibold text-foreground underline-offset-4 hover:underline [overflow-wrap:anywhere]"
    >
      {c.paciente}
    </Link>
  );
  return (
    <section aria-labelledby="titulo-contribuicoes" className="ui-painel">
      <div role="status" className="border-b border-border p-4 sm:px-5">
        <h2 id="titulo-contribuicoes" className="ui-h2">
          {titulo(filtro, dados.length)}
        </h2>
      </div>
      <table className="ui-tabela max-md:hidden [&_td]:px-5 [&_th]:px-5">
        <caption className="sr-only">
          Situação da contribuição social no ciclo atual
          {filtro ? ` · ${ROTULO_FILTRO[filtro].toLowerCase()}` : ""}
        </caption>
        <thead>
          <tr>
            <th scope="col">Paciente</th>
            {!pendentes && <th scope="col">Situação</th>}
            <th scope="col">Primeira sessão</th>
            <th scope="col">{pendentes ? "Prazo para pagar" : "Pagamento"}</th>
          </tr>
        </thead>
        <tbody>
          {dados.map((c) => (
            <tr key={c.casoId}>
              <td>{nome(c)}</td>
              {!pendentes && (
                <td>
                  <Selo tipo={c.situacao} />
                </td>
              )}
              <td className="whitespace-nowrap">{primeiraSessao(c)}</td>
              <td className="whitespace-nowrap">
                {pendentes ? prazo(c) : c.pagoEm ? dataBr(c.pagoEm) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="flex flex-col divide-y divide-border px-4 md:hidden">
        {dados.map((c) => (
          <li key={c.casoId} className="flex flex-col items-start gap-1 py-3">
            {nome(c)}
            <Selo tipo={c.situacao} />
            <span className="text-[15px]">
              {c.primeiraSessao
                ? `1ª sessão em ${dataBr(c.primeiraSessao)}`
                : "1ª sessão ainda não agendada"}
            </span>
            {c.situacao === "efetivada" && c.pagoEm && (
              <span className="ui-meta">Pago em {dataBr(c.pagoEm)}</span>
            )}
            {c.situacao === "pendente" && c.prazoAte && (
              <span className="ui-meta">Prazo para pagar: {prazo(c)}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

// Contribuição social (RF42, prancha 8-1): os pacientes em atendimento e a
// situação da contribuição no ciclo atual, para a secretaria e a coordenação. O
// registro do pagamento continua na ficha do paciente (RF41), aberta pelo nome.
export function SituacaoDasContribuicoes() {
  const { data: sessao } = useSessao();
  const permitido =
    sessao?.perfil === "secretaria" || sessao?.perfil === "coordenacao";
  const [escolha, setEscolha] = useState<Filtro>("");
  const [filtro, setFiltro] = useState<Filtro>("");
  const lista = useQuery({
    queryKey: ["contribuicoes", filtro],
    queryFn: () =>
      api<ContribuicaoDoPaciente[]>(
        `/contribuicoes${filtro ? `?situacao=${filtro}` : ""}`,
      ),
    enabled: permitido,
    staleTime: 0,
  });

  if (!sessao) return <p role="status">Carregando…</p>;
  if (!permitido) return <SemAcesso perfil={sessao.perfil} />;

  function filtrar(evento: FormEvent) {
    evento.preventDefault();
    if (escolha === filtro) void lista.refetch();
    else setFiltro(escolha);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="ui-titulo">Contribuição social</h1>
        <p className="ui-subtitulo">
          Pacientes em atendimento e a situação da contribuição no ciclo atual.
        </p>
      </div>

      <form
        onSubmit={filtrar}
        className="ui-painel flex flex-col gap-4 p-4 md:flex-row md:items-start md:p-5"
      >
        <Campo
          id="contribuicoes-situacao"
          rotulo="Situação"
          className="w-full md:w-60"
        >
          {(props) => (
            <select
              {...props}
              value={escolha}
              onChange={(e) => setEscolha(e.target.value as Filtro)}
              className={classeEntrada}
            >
              {(Object.keys(ROTULO_FILTRO) as Filtro[]).map((f) => (
                <option key={f} value={f}>
                  {ROTULO_FILTRO[f]}
                </option>
              ))}
            </select>
          )}
        </Campo>
        <Button type="submit" className="max-md:w-full md:mt-[30px]">
          Filtrar
        </Button>
      </form>

      {lista.isPending && (
        <p role="status" aria-busy="true" className="font-semibold">
          Carregando a situação das contribuições…
        </p>
      )}
      {lista.isError && (
        <Aviso
          tipo="erro"
          titulo="Não foi possível carregar a situação das contribuições."
        >
          <Button variant="outline" onClick={() => void lista.refetch()}>
            Tentar novamente
          </Button>
        </Aviso>
      )}
      {lista.data && <Lista filtro={filtro} dados={lista.data} />}

      <p className="ui-dica">
        Na agenda, a 1ª sessão de quem ainda não pagou aparece com a indicação
        &ldquo;Contribuição pendente&rdquo;, que some quando o pagamento é
        registrado na ficha do paciente.
      </p>
    </div>
  );
}
