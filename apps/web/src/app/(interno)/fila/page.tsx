"use client";
import { useQuery } from "@tanstack/react-query";
import { Check, Clock, Lock } from "lucide-react";
import Link from "next/link";
import type { FilaEspera } from "@clinica/shared";
import { Prioridade } from "@/components/casos/prioridade";
import { Aviso } from "@/components/comum/aviso";
import { MENU_POR_PERFIL } from "@/components/layout/menu";
import { Button, buttonVariants } from "@/components/ui/button";
import { api, ErroApi } from "@/lib/api";
import { dataBr } from "@/lib/formato";
import { useSessao } from "@/lib/sessao";

export default function FilaPage() {
  const { data: usuario } = useSessao();
  const permitida = usuario?.perfil === "coordenacao";
  const fila = useQuery({
    queryKey: ["fila", usuario?.id],
    queryFn: () => api<FilaEspera>("/fila"),
    enabled: permitida,
    staleTime: 0,
  });
  if (!usuario) return <p role="status">Carregando…</p>;
  if (
    !permitida ||
    (fila.error instanceof ErroApi && [401, 403].includes(fila.error.status))
  ) {
    // Acesso negado da prancha 6-1: cartão com o cadeado e a volta para a
    // página inicial do perfil, sem nenhum nome de inscrito.
    const inicio = MENU_POR_PERFIL[usuario.perfil][0];
    return (
      <div className="mx-auto mt-10 flex max-w-[640px] flex-col items-center gap-3.5 px-4 py-10 text-center md:px-10 md:py-[72px]">
        <span aria-hidden className="ui-vazio-icone">
          <Lock className="size-7" />
        </span>
        <h1 className="ui-titulo">Você não tem acesso à fila de espera.</h1>
        <p className="text-base">
          A fila de espera é consultada pela equipe que distribui os casos. Se
          você precisa de alguma informação sobre um inscrito, fale com a
          coordenação.
        </p>
        <Link href={inicio.href} className={buttonVariants()}>
          Voltar para {inicio.rotulo.toLowerCase()}
        </Link>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Fila de espera</h1>
          <p className="mt-1 max-w-3xl text-muted-foreground">
            Ordem pela prioridade clínica confirmada na triagem (vermelha,
            amarela e verde) e, na mesma prioridade, pela data de entrada na
            fila.
          </p>
        </div>
      </div>
      {fila.isPending && <p role="status">Carregando fila…</p>}
      {fila.isError ? (
        <Aviso tipo="erro" titulo="Não foi possível carregar a fila.">
          <Button variant="outline" onClick={() => void fila.refetch()}>
            Tentar novamente
          </Button>
        </Aviso>
      ) : (
        fila.data && (
          <>
            <div className="flex flex-wrap gap-4">
              <p className="rounded-lg border bg-card p-4">
                <strong>{fila.data.inscritos.length}</strong> na fila
              </p>
              <p className="rounded-lg border bg-card p-4">
                <strong>{fila.data.pendentes.length}</strong> com prioridade
                pendente
              </p>
            </div>
            <section
              aria-label="Fila ordenada"
              className="rounded-xl border bg-card"
            >
              <p className="border-b p-4 text-sm text-muted-foreground">
                A posição é calculada pelo sistema. Para quem voltou à fila por
                perda da vaga, vale a data da volta.
              </p>
              {fila.data.inscritos.length === 0 ? (
                <div className="ui-vazio">
                  <span aria-hidden className="ui-vazio-icone">
                    <Check className="size-7" />
                  </span>
                  <h2 className="ui-h2">Não há inscritos na fila de espera.</h2>
                  <p className="ui-subtitulo m-0 max-w-[460px]">
                    Os inscritos entram na fila quando a prioridade clínica é
                    confirmada na triagem.
                  </p>
                </div>
              ) : (
                <div
                  className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-primary"
                  tabIndex={0}
                  role="region"
                  aria-label="Tabela da fila de espera"
                >
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted">
                      <tr>
                        {[
                          "Posição",
                          "Inscrição",
                          "Nome",
                          "Prioridade clínica",
                          "Na fila desde",
                        ].map((t) => (
                          <th className="p-4" key={t} scope="col">
                            {t}
                          </th>
                        ))}
                        <th className="p-4" scope="col">
                          <span className="sr-only">Ações</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {fila.data.inscritos.map((i) => (
                        <tr key={i.inscricaoId} className="border-t">
                          <td className="p-4 font-bold">{i.posicao}</td>
                          <td className="p-4 font-semibold">{i.numero}</td>
                          <td className="p-4 font-semibold">{i.nome}</td>
                          <td className="p-4">
                            <Prioridade cor={i.prioridade} />
                          </td>
                          <td className="p-4">{dataBr(i.entradaEm)}</td>
                          <td className="p-4 text-right">
                            <Link
                              href={`/pacientes/${i.casoId}`}
                              aria-label={`Ver ficha de ${i.nome}`}
                              className={buttonVariants({ variant: "ghost" })}
                            >
                              Ver ficha
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
            <section className="rounded-xl border bg-card">
              <div className="border-b p-4">
                <h2 className="font-semibold">Prioridade pendente</h2>
                <p className="text-sm text-muted-foreground">
                  Inscrições ainda sem prioridade clínica confirmada. Ficam fora
                  da ordenação até a triagem.
                </p>
              </div>
              {fila.data.pendentes.length === 0 ? (
                <p className="p-4">
                  Não há inscrições com prioridade pendente.
                </p>
              ) : (
                <div
                  className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-primary"
                  tabIndex={0}
                  role="region"
                  aria-label="Tabela das inscrições com prioridade pendente"
                >
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted">
                      <tr>
                        {[
                          "Inscrição",
                          "Nome",
                          "Data da inscrição",
                          "Situação",
                        ].map((t) => (
                          <th className="p-4" key={t} scope="col">
                            {t}
                          </th>
                        ))}
                        <th className="p-4" scope="col">
                          <span className="sr-only">Ações</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {fila.data.pendentes.map((i) => (
                        <tr key={i.inscricaoId} className="border-t">
                          <td className="p-4 font-semibold">{i.numero}</td>
                          <td className="p-4">{i.nome}</td>
                          <td className="p-4">{dataBr(i.criadaEm)}</td>
                          <td className="p-4">
                            <span className="ui-selo border-[#f0cf9f] bg-alerta-fundo text-[#8a4600]">
                              <Clock aria-hidden className="size-3.5" />
                              Pendente de triagem
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            {/* A coordenação também tria (RF4 e RF6): a
                                inscrição pendente abre direto na triagem. */}
                            <Link
                              href={`/triagem/${i.inscricaoId}`}
                              aria-label={`Abrir triagem da inscrição ${i.numero}`}
                              className={buttonVariants({ variant: "ghost" })}
                            >
                              Abrir triagem
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )
      )}
    </div>
  );
}
