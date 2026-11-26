"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type {
  HistoricoEvolucoes,
  SessaoHistoricoEvolucao,
} from "@clinica/shared";
import { Aviso } from "@/components/comum/aviso";
import { classeEntrada } from "@/components/comum/campo";
import { Button } from "@/components/ui/button";
import { api, ErroApi } from "@/lib/api";
import { dataBr, dataHoraBr } from "@/lib/formato";
import { useSessao } from "@/lib/sessao";
import { SeloValidacao } from "./validacao-evolucao";

export function HistoricoEvolucoesDoPaciente({
  prontuarioId,
}: {
  prontuarioId: string;
}) {
  const { data: usuario } = useSessao();
  const [ciclo, setCiclo] = useState<number | undefined>();
  const consulta = useQuery({
    queryKey: [
      "prontuario",
      prontuarioId,
      "historico-evolucoes",
      usuario?.id,
      ciclo,
    ],
    queryFn: () =>
      api<HistoricoEvolucoes>(
        `/prontuarios/${prontuarioId}/evolucoes${ciclo === undefined ? "" : `?ciclo=${ciclo}`}`,
        { cache: "no-store" },
      ),
    enabled: !!usuario,
    gcTime: 0,
    retry: false,
  });
  const dados = consulta.data;
  return (
    <section
      id="historico-evolucoes"
      aria-labelledby="titulo-historico-evolucoes"
      className="ui-cartao scroll-mt-24"
    >
      <h2 id="titulo-historico-evolucoes" className="ui-h2">
        {dados ? `Evoluções do ciclo ${dados.ciclo}` : "Histórico de evoluções"}
      </h2>
      {consulta.isPending ? (
        <p role="status">Carregando histórico de evoluções…</p>
      ) : consulta.isError || !dados ? (
        <Aviso
          tipo="erro"
          titulo={
            consulta.error instanceof ErroApi && consulta.error.status === 403
              ? "Você não tem acesso a este prontuário."
              : "Não foi possível carregar o histórico de evoluções."
          }
        >
          <Button onClick={() => void consulta.refetch()}>
            Tentar novamente
          </Button>
        </Aviso>
      ) : (
        <>
          <div className="my-4 flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="ciclo-historico" className="block font-semibold">
                Ciclo de atendimento
              </label>
              <select
                id="ciclo-historico"
                className={classeEntrada}
                value={dados.ciclo}
                onChange={(e) => setCiclo(Number(e.target.value))}
              >
                {dados.ciclos.map((c) => (
                  <option key={c.numero} value={c.numero}>
                    Ciclo {c.numero}
                    {c.atual ? " · atual" : " · anterior"}
                  </option>
                ))}
              </select>
            </div>
            <Button
              variant="outline"
              disabled={consulta.isFetching}
              onClick={() => void consulta.refetch()}
            >
              Atualizar histórico
            </Button>
          </div>
          {dados.transferencias.map((t) => (
            <Aviso
              key={t.id}
              tipo="info"
              titulo={`Transferência em ${dataHoraBr(t.em)}`}
            >
              {t.estagiarioNovo && (
                <p>
                  Estagiário: {t.estagiarioAnterior ?? "Sem responsável"} →{" "}
                  {t.estagiarioNovo}.
                </p>
              )}
              {t.supervisorNovo && (
                <p>
                  Supervisor: {t.supervisorAnterior ?? "Sem responsável"} →{" "}
                  {t.supervisorNovo}.
                </p>
              )}
              <p>
                Os registros anteriores permanecem com seus autores originais.
              </p>
            </Aviso>
          ))}
          {!dados.sessoes.length ? (
            <p role="status" className="mt-4">
              Ainda não há evoluções registradas neste ciclo.
            </p>
          ) : (
            <>
              <div className="mt-4 hidden md:block">
                <table className="w-full text-left">
                  <caption className="sr-only">
                    Evoluções do ciclo {dados.ciclo}, em ordem cronológica
                  </caption>
                  <thead>
                    <tr>
                      {[
                        "Sessão",
                        "Data",
                        "Autor",
                        "Registros",
                        "Validação",
                      ].map((t) => (
                        <th key={t} scope="col" className="border-b p-3">
                          {t}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dados.sessoes.map((s) => (
                      <tr key={s.id} className="border-b align-top">
                        <td className="p-3">{s.numero ?? "—"}</td>
                        <td className="p-3 whitespace-nowrap">
                          {dataBr(s.inicio)}
                        </td>
                        <td className="p-3">{s.autor}</td>
                        <td className="p-3">
                          <Registros sessao={s} />
                        </td>
                        <td className="p-3">
                          <Validacao sessao={s} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ol className="mt-4 space-y-4 md:hidden">
                {dados.sessoes.map((s) => (
                  <li key={s.id} className="rounded-lg border p-4">
                    <h3 className="font-semibold">
                      Sessão {s.numero ?? "—"} · {dataBr(s.inicio)}
                    </h3>
                    <p>{s.autor}</p>
                    <Validacao sessao={s} />
                    <Registros sessao={s} />
                  </li>
                ))}
              </ol>
            </>
          )}
        </>
      )}
    </section>
  );
}

function Validacao({ sessao }: { sessao: SessaoHistoricoEvolucao }) {
  const { situacao, ultima, mudanca } = sessao.validacao;
  return (
    <div className="space-y-1">
      <SeloValidacao situacao={situacao} />
      {ultima && (
        <p className="ui-meta">
          Última validação: {ultima.por} · {dataHoraBr(ultima.em)}
        </p>
      )}
      {situacao === "pendente" && mudanca && (
        <p className="ui-meta">
          {mudanca.tipo === "correcao" ? "Correção" : "Complemento"} em{" "}
          {dataHoraBr(mudanca.em)}. Aguarda nova validação.
        </p>
      )}
    </div>
  );
}

function Registros({ sessao }: { sessao: SessaoHistoricoEvolucao }) {
  return (
    <details>
      <summary className="cursor-pointer font-semibold text-marca underline focus-visible:outline focus-visible:outline-2">
        Ver registros da sessão {sessao.numero ?? "—"} (
        {sessao.registros.length})
      </summary>
      <ol className="mt-3 space-y-4">
        {sessao.registros.map((r) => (
          <li key={r.id}>
            <h4 className="font-semibold">
              {r.tipo === "original"
                ? "Original"
                : r.tipo === "complemento"
                  ? "Complemento"
                  : `Correção · versão ${r.versao}`}
            </h4>
            <p className="ui-meta">
              {r.autor} · {dataHoraBr(r.em)}
            </p>
            {r.motivo && (
              <p className="whitespace-pre-wrap break-words">
                Motivo da correção: {r.motivo}
              </p>
            )}
            <dl>
              {r.campos.map((c) => (
                <div key={c.rotulo} className="mt-2">
                  <dt className="font-semibold">{c.rotulo}</dt>
                  <dd className="whitespace-pre-wrap break-words">
                    {c.texto ?? "Não informado"}
                  </dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ol>
    </details>
  );
}
