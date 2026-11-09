"use client";
import { useQuery } from "@tanstack/react-query";
import type { FilaEspera } from "@clinica/shared";
import { Prioridade } from "@/components/casos/prioridade";
import { Aviso } from "@/components/comum/aviso";
import { Button } from "@/components/ui/button";
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
  )
    return (
      <Aviso tipo="alerta" titulo="Você não tem acesso à fila de espera." focar>
        A fila é consultada pela coordenação. Para informações, fale com a
        coordenação.
      </Aviso>
    );
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
                <div className="p-8 text-center">
                  <h2 className="font-semibold">
                    Não há inscritos na fila de espera.
                  </h2>
                  <p className="mt-2 text-muted-foreground">
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
                      </tr>
                    </thead>
                    <tbody>
                      {fila.data.inscritos.map((i) => (
                        <tr key={i.inscricaoId} className="border-t">
                          <td className="p-4 font-bold">{i.posicao}</td>
                          <td className="p-4">{i.numero}</td>
                          <td className="p-4 font-semibold">{i.nome}</td>
                          <td className="p-4">
                            <Prioridade cor={i.prioridade} />
                          </td>
                          <td className="p-4">{dataBr(i.entradaEm)}</td>
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
                <ul className="divide-y">
                  {fila.data.pendentes.map((i) => (
                    <li
                      key={i.numero}
                      className="flex flex-wrap justify-between gap-3 p-4 text-sm"
                    >
                      <span>
                        {i.numero} · <strong>{i.nome}</strong>
                      </span>
                      <span>{dataBr(i.criadaEm)} · Pendente de triagem</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )
      )}
    </div>
  );
}
