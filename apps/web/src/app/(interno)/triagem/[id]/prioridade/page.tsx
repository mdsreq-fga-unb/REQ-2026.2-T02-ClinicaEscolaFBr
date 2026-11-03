"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Cor } from "@clinica/shared";
import { AlertCircle, ClipboardList } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Aviso } from "@/components/comum/aviso";
import { ESTILOS_PRIORIDADE } from "@/components/casos/prioridade";
import {
  AcessoRestrito,
  CORES,
  dataEHora,
  HistoricoDecisoes,
  ReferenciaClinica,
  Trilha,
  useInscricao,
  useTriagemAutorizada,
} from "@/components/triagem/comum";
import { Button, buttonVariants } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

// Registro da prioridade clínica pela equipe (RF6): nenhuma cor vem marcada, cada
// opção tem o nome escrito, e a referência da clínica fica ao lado, só como apoio.
export default function RegistrarPrioridadePage() {
  const { id } = useParams<{ id: string }>();
  const { sessao, autorizado, negado } = useTriagemAutorizada();
  const cache = useQueryClient();
  const consulta = useInscricao(id, autorizado);
  const [cor, setCor] = useState<Cor | null>(null);
  const [semEscolha, setSemEscolha] = useState(false);
  // Guardado no envio: depois dele, o histórico recarregado já tem a nova decisão.
  const [primeira, setPrimeira] = useState(false);
  const decisao = useMutation({
    mutationFn: (escolhida: Cor) =>
      api<{ id: string; decididaEm: string }>(
        `/triagem/inscricoes/${id}/prioridade`,
        { method: "POST", body: JSON.stringify({ cor: escolhida }) },
      ),
    onSuccess: () => cache.invalidateQueries({ queryKey: ["triagem"] }),
  });

  if (negado) return <AcessoRestrito />;
  if (consulta.isPending) return <p role="status">Carregando inscrição…</p>;
  if (consulta.isError || !consulta.data)
    return <Aviso tipo="erro" titulo="Não foi possível abrir a inscrição." />;

  const inscricao = consulta.data;
  const { queixa, percepcaoUrgencia } = inscricao.declaracaoInteressado;

  const registrar = (evento: FormEvent) => {
    evento.preventDefault();
    if (!cor) {
      setSemEscolha(true);
      return;
    }
    setSemEscolha(false);
    setPrimeira(inscricao.historico.length === 0);
    decisao.mutate(cor);
  };

  return (
    <div className="flex flex-col gap-6">
      <Trilha numero={inscricao.numero} />
      <div>
        <h1 className="ui-titulo">Inscrição {inscricao.numero}</h1>
        <p className="ui-subtitulo">
          Recebida em {dataEHora(inscricao.criadaEm)}
        </p>
      </div>
      <div className="flex flex-col justify-between gap-4 rounded-[12px] border border-[#a9cfe0] bg-info-fundo px-5 py-4 md:flex-row md:items-center">
        <p className="text-[15px]">
          <b>Declarado pelo interessado:</b>{" "}
          {queixa ? `“${queixa}”` : "queixa não informada"} · Urgência
          percebida: {percepcaoUrgencia ?? "não informada"}
        </p>
        <Link
          href={`/triagem/${inscricao.id}`}
          className="inline-flex min-h-11 items-center font-semibold whitespace-nowrap text-primary underline underline-offset-2"
        >
          Ver declaração completa
        </Link>
      </div>

      {decisao.isSuccess && cor ? (
        <section
          aria-label="Prioridade registrada"
          className="ui-cartao ui-equipe"
        >
          <Aviso
            tipo="sucesso"
            focar
            titulo={`Prioridade ${ESTILOS_PRIORIDADE[cor].rotulo} registrada.`}
          >
            Por {sessao?.nome} em {dataEHora(decisao.data.decididaEm)}.{" "}
            {primeira
              ? "O caso foi para a lista de casos aguardando distribuição."
              : "A nova decisão passa a valer, e as anteriores ficam no histórico."}
          </Aviso>
          <Link
            href="/triagem"
            className={buttonVariants({
              variant: "outline",
              className: "self-start",
            })}
          >
            Voltar para a triagem
          </Link>
        </section>
      ) : (
        <section
          aria-labelledby="prioridade-titulo"
          className="ui-cartao ui-equipe"
        >
          <div className="flex items-center gap-2.5">
            <ClipboardList aria-hidden className="size-5 text-marca" />
            <h2 id="prioridade-titulo" className="ui-h2">
              Avaliação da equipe: prioridade clínica
            </h2>
          </div>
          {semEscolha && (
            <Aviso
              tipo="erro"
              titulo="Escolha a prioridade clínica para registrar."
            >
              Selecione Vermelha, Amarela ou Verde.
            </Aviso>
          )}
          {decisao.isError && (
            <Aviso
              tipo="erro"
              titulo="Não foi possível registrar a prioridade."
            >
              Tente novamente em instantes.
            </Aviso>
          )}
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
            <form
              noValidate
              onSubmit={registrar}
              className="flex flex-col gap-5"
            >
              <fieldset
                aria-invalid={semEscolha || undefined}
                aria-describedby={
                  semEscolha ? "prioridade-erro" : "prioridade-dica"
                }
                className="flex min-w-0 flex-col gap-2.5"
              >
                <legend className="mb-1.5 text-base font-semibold">
                  Prioridade clínica
                </legend>
                <p id="prioridade-dica" className="ui-dica -mt-1">
                  Escolha uma opção. Consulte a referência da clínica ao lado.
                </p>
                {semEscolha && (
                  <p
                    id="prioridade-erro"
                    className="flex items-start gap-1.5 text-sm font-semibold text-destructive"
                  >
                    <AlertCircle aria-hidden className="mt-0.5 size-4" />
                    Selecione uma das três prioridades.
                  </p>
                )}
                {CORES.map((opcao) => (
                  <label
                    key={opcao}
                    className={cn(
                      "flex min-h-16 cursor-pointer items-center gap-3.5 rounded-[12px] border-[1.5px] border-input bg-white px-4 py-3 text-[17px] font-bold has-checked:border-primary has-checked:bg-accent",
                      semEscolha && "border-2 border-destructive",
                    )}
                  >
                    <input
                      type="radio"
                      name="prioridade"
                      value={opcao}
                      checked={cor === opcao}
                      disabled={decisao.isPending}
                      onChange={() => {
                        setCor(opcao);
                        setSemEscolha(false);
                      }}
                      className="size-[22px] shrink-0 accent-primary"
                    />
                    <span
                      aria-hidden
                      className={cn(
                        "size-8 shrink-0 rounded-lg border border-black/15",
                        {
                          vermelha: "bg-[#c62828]",
                          amarela: "bg-[#e0a800]",
                          verde: "bg-[#2e7d32]",
                        }[opcao],
                      )}
                    />
                    {ESTILOS_PRIORIDADE[opcao].rotulo}
                  </label>
                ))}
              </fieldset>
              <div className="flex justify-end gap-3">
                <Link
                  href={`/triagem/${inscricao.id}`}
                  className={buttonVariants({ variant: "outline" })}
                >
                  Cancelar
                </Link>
                <Button type="submit" disabled={decisao.isPending}>
                  {decisao.isPending ? "Registrando…" : "Registrar prioridade"}
                </Button>
              </div>
            </form>
            <ReferenciaClinica />
          </div>
        </section>
      )}

      {inscricao.historico.length > 0 && (
        <section
          aria-labelledby="historico-titulo"
          className="ui-painel flex flex-col"
        >
          <h2 id="historico-titulo" className="ui-h2 px-5 py-4">
            Histórico de decisões
          </h2>
          <HistoricoDecisoes historico={inscricao.historico} marcarAtual />
        </section>
      )}
    </div>
  );
}
