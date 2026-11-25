"use client";
import { useQuery } from "@tanstack/react-query";
import { Lock, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import {
  LIMITE_FALTAS_ESTAGIARIO,
  semestreDaData,
  type SinalizacaoReprovacao,
  type Sinalizacoes,
} from "@clinica/shared";
import { Aviso } from "@/components/comum/aviso";
import { inicioDoPerfil } from "@/components/layout/menu";
import { Button, buttonVariants } from "@/components/ui/button";
import { api, ErroApi } from "@/lib/api";
import { dataBr, hojeBr, horaBr } from "@/lib/formato";
import { useSessao } from "@/lib/sessao";

const plural = (n: number, um: string, varios: string) =>
  `${n} ${n === 1 ? um : varios}`;

// "21/08, às 16:00; 17/09, às 10:00 e 12/11/2026, às 16:00": a data e o horário de
// cada sessão (nit 4 da inspeção), com o ano na última, ou em todas quando as
// sessões passam de um ano para outro.
export function listaDeSessoes(sessoes: string[]) {
  const anos = new Set(sessoes.map((s) => dataBr(s).slice(6)));
  const itens = sessoes.map((s, i) => {
    const data = dataBr(s);
    const comAno = anos.size > 1 || i === sessoes.length - 1;
    return `${comAno ? data : data.slice(0, 5)}, às ${horaBr(new Date(s))}`;
  });
  return itens.length > 1
    ? `${itens.slice(0, -1).join("; ")} e ${itens[itens.length - 1]}`
    : (itens[0] ?? "");
}

// As sessões que o perfil vê, e as faltas em casos de outros supervisores, que o
// supervisor só vê como número (RNF35).
function TextoSessoes({ s }: { s: SinalizacaoReprovacao }) {
  const outros = s.faltasDeOutrosSupervisores;
  return (
    <>
      {s.sessoes.length > 0 && <>Sessões: {listaDeSessoes(s.sessoes)}.</>}
      {outros > 0 && (
        <>
          {" "}
          {s.sessoes.length > 0 ? "Mais " : ""}
          {plural(
            outros,
            "falta em casos de outros supervisores",
            "faltas em casos de outros supervisores",
          )}
          .
        </>
      )}
    </>
  );
}

// Depois da terceira falta, a contagem continua subindo, mas a sinalização é a
// mesma (prancha 7-2).
function contagemAtualizada(s: SinalizacaoReprovacao) {
  return s.faltas > LIMITE_FALTAS_ESTAGIARIO
    ? `${s.estagiario.nome} tem agora ${s.faltas} faltas em ${s.semestre}. A sinalização de ${dataBr(s.geradaEm)} continua a mesma, com a contagem atualizada.`
    : null;
}

const CHAVE_ANUNCIO = "sinalizacao-anunciada:";

// Quais sinalizações ainda não foram anunciadas nesta sessão do navegador. O
// `role="alert"` vale só na primeira vez, para o leitor de tela não repetir o
// anúncio a cada página (nit 4 da inspeção).
function useAnunciar(ids: string[]) {
  const chave = ids.join(",");
  const novas = useMemo(() => {
    const resultado = new Set<string>();
    for (const id of chave ? chave.split(",") : []) {
      try {
        if (!sessionStorage.getItem(CHAVE_ANUNCIO + id)) resultado.add(id);
      } catch {
        resultado.add(id);
      }
    }
    return resultado;
  }, [chave]);
  useEffect(() => {
    for (const id of novas) {
      try {
        sessionStorage.setItem(CHAVE_ANUNCIO + id, "1");
      } catch {
        // Sem o armazenamento da sessão, o aviso é anunciado de novo.
      }
    }
  }, [novas]);
  return novas;
}

// Faixa de alerta em "Meus casos" (RF63, prancha 7-2): as sinalizações abertas dos
// estagiários que o supervisor tem hoje. Sem sinalização, ou se a consulta falhar,
// a página segue sem a faixa.
export function FaixaSinalizacoes() {
  const consulta = useQuery({
    queryKey: ["sinalizacoes-reprovacao", "abertas"],
    queryFn: () =>
      api<Sinalizacoes>("/sinalizacoes-reprovacao?situacao=abertas"),
  });
  const lista = consulta.data?.sinalizacoes ?? [];
  const anunciar = useAnunciar(lista.map((s) => s.id));
  if (lista.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      {lista.map((s) => {
        const atualizada = contagemAtualizada(s);
        return (
          <section
            key={s.id}
            role={anunciar.has(s.id) ? "alert" : undefined}
            aria-label={
              anunciar.has(s.id)
                ? undefined
                : `Sinalização de reprovação de ${s.estagiario.nome}`
            }
            className="flex gap-3 rounded-[12px] border border-[#efb4ad] bg-erro-fundo px-4 py-3.5 text-[15px] leading-[1.45]"
          >
            <TriangleAlert
              aria-hidden
              className="mt-px size-5 shrink-0 text-destructive"
            />
            <div className="min-w-0">
              <p className="font-bold">
                {s.estagiario.nome} atingiu {LIMITE_FALTAS_ESTAGIARIO} faltas no
                semestre {s.semestre}, o limite que reprova o campo de estágio.
              </p>
              <p className="mt-0.5">
                <TextoSessoes s={s} /> A decisão sobre o caso é da coordenação.
              </p>
              {atualizada && <p className="mt-1">{atualizada}</p>}
              <Link
                href="/sinalizacoes-reprovacao"
                className="mt-1 inline-block font-semibold text-primary underline underline-offset-2"
              >
                Ver as sinalizações de reprovação
              </Link>
            </div>
          </section>
        );
      })}
    </div>
  );
}

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
      <h1 className="ui-h2">Você não tem acesso a esta sinalização</h1>
      <p className="ui-subtitulo m-0">
        A sinalização de reprovação é vista só pelo supervisor do estagiário e
        pela coordenação.
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

function Abertas({ lista }: { lista: SinalizacaoReprovacao[] }) {
  if (lista.length === 0) {
    return (
      <div role="status" className="ui-painel p-5">
        <p className="ui-h2">Nenhuma sinalização aguardando decisão</p>
        <p className="ui-dica mt-1">
          Quando um estagiário atingir {LIMITE_FALTAS_ESTAGIARIO} faltas no
          semestre, ele aparece aqui.
        </p>
      </div>
    );
  }
  const atualizadas = lista.map(contagemAtualizada).filter(Boolean);
  return (
    <>
      <div className="ui-painel">
        <table className="ui-tabela max-md:hidden [&_td]:px-5 [&_th]:px-5">
          <caption className="sr-only">
            Sinalizações de reprovação aguardando a decisão institucional
          </caption>
          <thead>
            <tr>
              <th scope="col">Estagiário</th>
              <th scope="col">Supervisor</th>
              <th scope="col">Faltas no semestre</th>
              <th scope="col">Sinalizado em</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((s) => (
              <tr key={s.id}>
                <td className="[overflow-wrap:anywhere]">
                  <span className="block">{s.estagiario.nome}</span>
                  <span className="ui-meta block">
                    <TextoSessoes s={s} />
                  </span>
                </td>
                <td>{s.supervisores.join(", ") || "—"}</td>
                <td className="whitespace-nowrap">
                  {s.faltas} em {s.semestre}
                </td>
                <td className="whitespace-nowrap">{dataBr(s.geradaEm)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ul className="flex flex-col divide-y divide-border px-4 md:hidden">
          {lista.map((s) => (
            <li key={s.id} className="flex flex-col gap-0.5 py-3">
              <span className="font-bold [overflow-wrap:anywhere]">
                {s.estagiario.nome}
              </span>
              <span>
                {plural(s.faltas, "falta", "faltas")} em {s.semestre} ·
                sinalizado em {dataBr(s.geradaEm)}
              </span>
              <span className="ui-meta">
                Supervisor: {s.supervisores.join(", ") || "—"}
              </span>
              <span className="ui-meta">
                <TextoSessoes s={s} />
              </span>
            </li>
          ))}
        </ul>
      </div>
      {atualizadas.map((texto) => (
        <Aviso key={texto} tipo="info" titulo={texto!} />
      ))}
    </>
  );
}

function Encerrada({ s }: { s: SinalizacaoReprovacao }) {
  const vigente = s.semestre === semestreDaData(hojeBr());
  const gerada = dataBr(s.geradaEm);
  const encerrada = dataBr(s.encerradaEm);
  if (s.motivoEncerramento === "contagem_abaixo_do_limite") {
    const falta = s.faltaReclassificada;
    return (
      <li className="ui-painel flex flex-col gap-2 p-4 sm:px-5">
        <span className="ui-selo self-start border-border bg-muted text-foreground">
          Sinalização encerrada sem decisão
        </span>
        <p className="font-semibold">
          {s.estagiario.nome} · {s.semestre}
        </p>
        <p>
          Sinalizada em {gerada} e encerrada em {encerrada}: a contagem caiu
          para {LIMITE_FALTAS_ESTAGIARIO - 1}, abaixo do limite, porque a falta
          {falta ? ` de ${dataBr(falta.inicio).slice(0, 5)}` : ""} foi
          reclassificada como cancelamento administrativo.
        </p>
        {vigente && (
          <p className="ui-dica">
            Se a contagem voltar a {LIMITE_FALTAS_ESTAGIARIO} neste semestre, a
            sinalização é gerada de novo.
          </p>
        )}
      </li>
    );
  }
  return (
    <li className="ui-painel flex flex-col gap-2 p-4 sm:px-5">
      <span className="ui-selo self-start border-border bg-muted text-foreground">
        Encerrada pela decisão da coordenação
      </span>
      <p className="font-semibold">
        {s.estagiario.nome} · {s.semestre}
      </p>
      <p>
        Sinalizada em {gerada} e encerrada em {encerrada}. Contagem atual:{" "}
        {plural(s.faltas, "falta", "faltas")} em {s.semestre}.
      </p>
    </li>
  );
}

// Sinalizações de reprovação (RF63, prancha 7-2): as que aguardam a decisão da
// coordenação (RF64) e o histórico das encerradas. O supervisor vê só as dos
// estagiários dele, com as datas só dos casos dele; a coordenação vê todas.
export function SinalizacoesDeReprovacao() {
  const { data: sessao } = useSessao();
  const permitido =
    sessao?.perfil === "supervisor" || sessao?.perfil === "coordenacao";
  const consulta = useQuery({
    queryKey: ["sinalizacoes-reprovacao", "todas"],
    queryFn: () => api<Sinalizacoes>("/sinalizacoes-reprovacao?situacao=todas"),
    enabled: permitido,
    staleTime: 0,
  });

  if (!sessao) return <p role="status">Carregando…</p>;
  if (!permitido) return <SemAcesso perfil={sessao.perfil} />;

  const lista = consulta.data?.sinalizacoes ?? [];
  const abertas = lista.filter((s) => !s.encerradaEm);
  const encerradas = lista.filter((s) => s.encerradaEm);
  const negado =
    consulta.error instanceof ErroApi && consulta.error.status === 403;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="ui-titulo">Sinalizações de reprovação</h1>
        <p className="ui-subtitulo">
          Estagiários que atingiram {LIMITE_FALTAS_ESTAGIARIO} faltas no
          semestre e aguardam a decisão institucional.
        </p>
      </div>

      {consulta.isPending && (
        <p role="status" aria-busy="true" className="font-semibold">
          Consultando as sinalizações…
        </p>
      )}

      {consulta.isError && (
        <Aviso
          tipo="erro"
          titulo={
            negado
              ? consulta.error.message
              : "Não foi possível consultar as sinalizações."
          }
        >
          {!negado && (
            <Button variant="outline" onClick={() => void consulta.refetch()}>
              Tentar novamente
            </Button>
          )}
        </Aviso>
      )}

      {consulta.data && (
        <>
          <section
            aria-labelledby="titulo-abertas"
            className="flex flex-col gap-3"
          >
            <h2 id="titulo-abertas" className="ui-h2">
              Aguardando a decisão
            </h2>
            <Abertas lista={abertas} />
          </section>
          {encerradas.length > 0 && (
            <section
              aria-labelledby="titulo-historico"
              className="flex flex-col gap-3"
            >
              <h2 id="titulo-historico" className="ui-h2">
                Histórico
              </h2>
              <ol className="flex flex-col gap-3">
                {encerradas.map((s) => (
                  <Encerrada key={s.id} s={s} />
                ))}
              </ol>
            </section>
          )}
        </>
      )}
    </div>
  );
}
