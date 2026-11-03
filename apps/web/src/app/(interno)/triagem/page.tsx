"use client";

import { useQuery } from "@tanstack/react-query";
import type { Cor } from "@clinica/shared";
import { Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Aviso } from "@/components/comum/aviso";
import { Prioridade } from "@/components/casos/prioridade";
import {
  AcessoRestrito,
  dataEHora,
  tempoAguardando,
  useTriagemAutorizada,
  type Declaracao,
} from "@/components/triagem/comum";
import { buttonVariants } from "@/components/ui/button";
import { api } from "@/lib/api";
import { dataBr } from "@/lib/formato";

type InscricaoPendente = {
  id: string;
  numero: string;
  criadaEm: string;
  diasAguardando: number;
  declaracaoInteressado: Declaracao;
};
type InscricaoClassificada = {
  id: string;
  numero: string;
  prioridade: Cor;
  decididaEm: string;
};

const abrir = (id: string, numero: string, largo = false) => (
  <Link
    href={`/triagem/${id}`}
    aria-label={`Abrir inscrição ${numero}`}
    className={buttonVariants({
      variant: "outline",
      className: largo ? "w-full" : undefined,
    })}
  >
    Abrir
  </Link>
);

// Inscrições aguardando triagem (RF4), da mais antiga para a mais recente por
// padrão, e as que já têm prioridade clínica registrada (RF6).
export default function TriagemPage() {
  const { autorizado, negado } = useTriagemAutorizada();
  const [ordem, setOrdem] = useState<"antigas" | "recentes">("antigas");
  const pendentes = useQuery({
    queryKey: ["triagem", "pendentes", ordem],
    queryFn: () =>
      api<InscricaoPendente[]>(`/triagem/inscricoes?ordem=${ordem}`),
    enabled: autorizado,
  });
  const classificadas = useQuery({
    queryKey: ["triagem", "classificadas"],
    queryFn: () =>
      api<InscricaoClassificada[]>("/triagem/inscricoes/classificadas"),
    enabled: autorizado,
  });

  if (negado) return <AcessoRestrito />;

  const lista = pendentes.data ?? [];
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="ui-titulo">Inscrições aguardando triagem</h1>
        <p className="ui-subtitulo">
          {ordem === "antigas"
            ? "Mais antigas primeiro."
            : "Mais recentes primeiro."}
        </p>
      </div>

      {pendentes.isPending && autorizado && (
        <p role="status">Carregando inscrições…</p>
      )}
      {pendentes.isError && (
        <Aviso tipo="erro" titulo="Não foi possível carregar as inscrições." />
      )}
      {pendentes.data && (
        <>
          <p className="flex w-fit items-baseline gap-2.5 rounded-[12px] border border-border bg-white px-[18px] py-3 text-[15px] text-muted-foreground">
            <b className="text-[22px] text-marca">{lista.length}</b>
            aguardando triagem
          </p>
          <section aria-label="Aguardando triagem" className="ui-painel">
            <div className="ui-ordem">
              <label htmlFor="ordem-triagem">Ordenar por espera</label>
              <select
                id="ordem-triagem"
                value={ordem}
                onChange={(e) => setOrdem(e.target.value as typeof ordem)}
                className="h-11 rounded-lg border-[1.5px] border-input bg-white px-3 text-[15px] text-foreground"
              >
                <option value="antigas">Mais antigas primeiro</option>
                <option value="recentes">Mais recentes primeiro</option>
              </select>
            </div>
            {lista.length === 0 ? (
              <div className="ui-vazio">
                <span aria-hidden className="ui-vazio-icone">
                  <Check className="size-7" />
                </span>
                <h2 className="ui-h2">
                  Não há inscrições pendentes de triagem.
                </h2>
                <p className="ui-subtitulo m-0 max-w-[460px]">
                  Novas inscrições aparecem aqui assim que são enviadas pelo
                  formulário on-line.
                </p>
              </div>
            ) : (
              <>
                <table className="ui-tabela max-md:hidden">
                  <caption className="sr-only">
                    Inscrições sem triagem,{" "}
                    {ordem === "antigas"
                      ? "da mais antiga para a mais recente"
                      : "da mais recente para a mais antiga"}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Nº da inscrição</th>
                      <th scope="col">Data da inscrição</th>
                      <th scope="col">Aguardando há</th>
                      <th scope="col">
                        <span className="sr-only">Ação</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lista.map((inscricao) => (
                      <tr key={inscricao.id}>
                        <td className="ui-numero">{inscricao.numero}</td>
                        <td>{dataBr(inscricao.criadaEm)}</td>
                        <td>{tempoAguardando(inscricao.diasAguardando)}</td>
                        <td className="text-right">
                          {abrir(inscricao.id, inscricao.numero)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <ul className="ui-lista-celular p-4 md:hidden">
                  {lista.map((inscricao) => (
                    <li key={inscricao.id} className="ui-item-celular">
                      <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                        <span className="ui-numero text-foreground">
                          {inscricao.numero}
                        </span>
                        <span>
                          Aguardando há{" "}
                          {tempoAguardando(
                            inscricao.diasAguardando,
                          ).toLowerCase()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Inscrição em {dataBr(inscricao.criadaEm)}
                      </p>
                      {abrir(inscricao.id, inscricao.numero, true)}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </>
      )}

      <section
        aria-labelledby="classificadas-titulo"
        className="flex flex-col gap-3"
      >
        <h2 id="classificadas-titulo" className="ui-h2">
          Prioridades registradas
        </h2>
        {classificadas.isError && (
          <Aviso
            tipo="erro"
            titulo="Não foi possível carregar as prioridades."
          />
        )}
        {classificadas.data?.length === 0 && (
          <p className="ui-dica">Nenhuma prioridade registrada.</p>
        )}
        {!!classificadas.data?.length && (
          <div className="ui-painel">
            <table className="ui-tabela max-md:hidden">
              <caption className="sr-only">
                Inscrições com prioridade clínica registrada
              </caption>
              <thead>
                <tr>
                  <th scope="col">Nº da inscrição</th>
                  <th scope="col">Prioridade vigente</th>
                  <th scope="col">Decidida em</th>
                  <th scope="col">
                    <span className="sr-only">Ação</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {classificadas.data.map((item) => (
                  <tr key={item.id}>
                    <td className="ui-numero">{item.numero}</td>
                    <td>
                      <Prioridade cor={item.prioridade} />
                    </td>
                    <td>{dataEHora(item.decididaEm)}</td>
                    <td className="text-right">
                      {abrir(item.id, item.numero)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="ui-lista-celular p-4 md:hidden">
              {classificadas.data.map((item) => (
                <li key={item.id} className="ui-item-celular">
                  <div className="flex items-center justify-between gap-2">
                    <span className="ui-numero">{item.numero}</span>
                    <Prioridade cor={item.prioridade} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Decidida em {dataEHora(item.decididaEm)}
                  </p>
                  {abrir(item.id, item.numero, true)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
