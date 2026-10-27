"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Aviso } from "@/components/comum/aviso";
import { api } from "@/lib/api";

type InscricaoPendente = {
  id: string;
  numero: string;
  criadaEm: string;
  diasAguardando: number;
  declaracaoInteressado: {
    queixa: string | null;
    percepcaoUrgencia: string | null;
    historicoRelevante: string | null;
  };
};
type InscricaoClassificada = {
  id: string;
  numero: string;
  prioridade: "vermelha" | "amarela" | "verde";
  decididaEm: string;
  historico: {
    prioridade: "vermelha" | "amarela" | "verde";
    decisor: string;
    decididaEm: string;
  }[];
};

const CORES = ["vermelha", "amarela", "verde"] as const;
const REFERENCIA: Record<(typeof CORES)[number], string> = {
  vermelha: "Quadro clínico caracterizado, especialmente com uso de medicação.",
  amarela:
    "Sofrimento emocional pontual, sem quadro caracterizado nem uso de medicação.",
  verde: "Sem indício de adoecimento; busca por desenvolvimento pessoal.",
};

export default function TriagemPage() {
  const cache = useQueryClient();
  const [ordem, setOrdem] = useState<"antigas" | "recentes">("antigas");
  const pendentes = useQuery({
    queryKey: ["triagem", "pendentes", ordem],
    queryFn: () =>
      api<InscricaoPendente[]>(`/triagem/inscricoes?ordem=${ordem}`),
  });
  const classificadas = useQuery({
    queryKey: ["triagem", "classificadas"],
    queryFn: () =>
      api<InscricaoClassificada[]>("/triagem/inscricoes/classificadas"),
  });
  const decisao = useMutation({
    mutationFn: ({ id, cor }: { id: string; cor: string }) =>
      api(`/triagem/inscricoes/${id}/prioridade`, {
        method: "POST",
        body: JSON.stringify({ cor }),
      }),
    onSuccess: async () => {
      await Promise.all([
        cache.invalidateQueries({ queryKey: ["triagem", "pendentes"] }),
        cache.invalidateQueries({ queryKey: ["triagem", "classificadas"] }),
      ]);
    },
  });

  return (
    <main className="mx-auto max-w-5xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-marca">Triagem clínica</h1>
        <p className="text-sm text-muted-foreground">
          As respostas abaixo são declarações do interessado. A classificação é
          uma decisão clínica da equipe.
        </p>
      </header>

      <section aria-labelledby="pendentes-titulo" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="pendentes-titulo" className="text-lg font-semibold">
            Aguardando triagem
          </h2>
          <label className="text-sm" htmlFor="ordem-triagem">
            Ordenar por espera
            <select
              id="ordem-triagem"
              value={ordem}
              onChange={(e) => setOrdem(e.target.value as typeof ordem)}
              className="ml-2 rounded-md border border-border p-2"
            >
              <option value="antigas">Mais antigas primeiro</option>
              <option value="recentes">Mais recentes primeiro</option>
            </select>
          </label>
        </div>
        {pendentes.isPending && <p role="status">Carregando inscrições…</p>}
        {pendentes.isError && (
          <Aviso
            tipo="erro"
            titulo="Não foi possível carregar as inscrições."
          />
        )}
        {pendentes.data?.length === 0 && (
          <Aviso tipo="info" titulo="Não há inscrições pendentes de triagem." />
        )}
        <ul className="space-y-4">
          {pendentes.data?.map((inscricao) => (
            <li
              key={inscricao.id}
              className="space-y-4 rounded-lg border border-border bg-card p-5"
            >
              <div className="flex flex-wrap justify-between gap-2">
                <h3 className="font-semibold">Inscrição {inscricao.numero}</h3>
                <span className="text-sm">
                  Aguardando há {inscricao.diasAguardando} dias
                </span>
              </div>
              <dl className="grid gap-3 sm:grid-cols-3">
                {(
                  [
                    ["Queixa", inscricao.declaracaoInteressado.queixa],
                    [
                      "Percepção de urgência",
                      inscricao.declaracaoInteressado.percepcaoUrgencia,
                    ],
                    [
                      "Histórico relevante",
                      inscricao.declaracaoInteressado.historicoRelevante,
                    ],
                  ] as const
                ).map(([rotulo, valor]) => (
                  <div key={rotulo}>
                    <dt className="text-sm font-semibold">
                      {rotulo} · declarado pelo interessado
                    </dt>
                    <dd className="mt-1 whitespace-pre-wrap text-sm">
                      {valor || "Não informado"}
                    </dd>
                  </div>
                ))}
              </dl>
              <fieldset className="space-y-3 border-t border-border pt-4">
                <legend className="font-semibold">
                  Registrar prioridade clínica
                </legend>
                <p className="text-sm text-muted-foreground">
                  Use os critérios da clínica como referência. O sistema não
                  calcula nem sugere uma classificação.
                </p>
                <div className="grid gap-3 md:grid-cols-3">
                  {CORES.map((cor) => (
                    <button
                      key={cor}
                      type="button"
                      disabled={decisao.isPending}
                      onClick={() => decisao.mutate({ id: inscricao.id, cor })}
                      className="rounded-md border border-border p-3 text-left hover:border-primary disabled:opacity-60"
                    >
                      <span className="font-semibold">
                        {cor[0].toUpperCase() + cor.slice(1)}
                      </span>
                      <span className="mt-1 block text-sm">
                        {REFERENCIA[cor]}
                      </span>
                    </button>
                  ))}
                </div>
              </fieldset>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="classificadas-titulo" className="space-y-3">
        <h2 id="classificadas-titulo" className="text-lg font-semibold">
          Prioridades registradas
        </h2>
        {classificadas.isError && (
          <Aviso
            tipo="erro"
            titulo="Não foi possível carregar as prioridades."
          />
        )}
        {classificadas.data?.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhuma prioridade registrada.
          </p>
        )}
        <ul className="space-y-2">
          {classificadas.data?.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card p-3"
            >
              <span>
                Inscrição {item.numero} · Prioridade vigente:{" "}
                <strong>{item.prioridade}</strong>
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <details>
                  <summary className="cursor-pointer text-sm underline">
                    Ver histórico ({item.historico.length})
                  </summary>
                  <ol className="mt-2 space-y-1 text-sm">
                    {item.historico.map((evento) => (
                      <li key={`${evento.decididaEm}-${evento.decisor}`}>
                        {evento.prioridade} · {evento.decisor} ·{" "}
                        {new Date(evento.decididaEm).toLocaleString("pt-BR")}
                      </li>
                    ))}
                  </ol>
                </details>
                <label className="text-sm">
                  Registrar nova decisão
                  <select
                    defaultValue=""
                    disabled={decisao.isPending}
                    onChange={(e) => {
                      if (e.target.value)
                        decisao.mutate({ id: item.id, cor: e.target.value });
                      e.target.value = "";
                    }}
                    className="ml-2 rounded-md border border-border p-2"
                  >
                    <option value="" disabled>
                      Escolha uma prioridade
                    </option>
                    {CORES.map((cor) => (
                      <option key={cor} value={cor}>
                        {cor}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </li>
          ))}
        </ul>
      </section>
      {decisao.isError && (
        <Aviso tipo="erro" titulo="Não foi possível registrar a prioridade." />
      )}
      {decisao.isSuccess && (
        <Aviso tipo="sucesso" titulo="Decisão de prioridade registrada." />
      )}
    </main>
  );
}
