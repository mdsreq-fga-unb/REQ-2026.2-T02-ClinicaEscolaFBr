"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, ListFilter, Lock } from "lucide-react";
import { useState } from "react";
import type {
  CasoAguardando,
  CasoJaDistribuido,
  ResultadoDistribuicao,
  SupervisorDisponivel,
} from "@clinica/shared";
import { Aviso } from "@/components/comum/aviso";
import { Dialogo } from "@/components/comum/dialogo";
import { Prioridade } from "@/components/casos/prioridade";
import { Button } from "@/components/ui/button";
import { api, ErroApi } from "@/lib/api";
import { dataBr } from "@/lib/formato";
import { useSessao } from "@/lib/sessao";

const ORDEM =
  "Ordenado por prioridade clínica (Vermelha, Amarela, Verde) e, na mesma prioridade, pela data da inscrição.";

// Escolha do supervisor responsável pela coordenação (RF20): casos ativos de cada
// um em relação ao limite, sem deixar escolher quem já está no limite.
function DistribuirCaso({
  caso,
  aoConcluir,
  aoFechar,
}: {
  caso: CasoAguardando;
  aoConcluir: (resultado: ResultadoDistribuicao) => void;
  aoFechar: () => void;
}) {
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const supervisores = useQuery({
    queryKey: ["supervisores", "disponibilidade"],
    queryFn: () => api<SupervisorDisponivel[]>("/supervisores/disponibilidade"),
  });
  const distribuicao = useMutation({
    mutationFn: (supervisorId: string) =>
      api<ResultadoDistribuicao>(`/casos/${caso.casoId}/supervisor`, {
        method: "POST",
        body: JSON.stringify({ supervisorId }),
      }),
    onSuccess: aoConcluir,
  });

  const lista = supervisores.data ?? [];
  const todosNoLimite = lista.length > 0 && lista.every((s) => s.noLimite);
  const limite = lista[0]?.limite;
  const erro =
    distribuicao.error instanceof ErroApi ? distribuicao.error : null;
  const jaDistribuido =
    erro?.status === 409 && erro.corpo?.supervisor
      ? (erro.corpo as unknown as CasoJaDistribuido)
      : null;

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-3 rounded-md bg-muted p-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Inscrição</dt>
          <dd className="font-semibold">{caso.numero}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Nome</dt>
          <dd className="font-semibold">{caso.nome}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Prioridade clínica</dt>
          <dd>
            <Prioridade cor={caso.prioridade} />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Data da inscrição</dt>
          <dd className="font-semibold">{dataBr(caso.dataInscricao)}</dd>
        </div>
      </dl>

      {jaDistribuido ? (
        <>
          <Aviso
            tipo="info"
            titulo={`Este caso já tem supervisor: ${jaDistribuido.supervisor}.`}
          >
            Ele foi distribuído em {dataBr(jaDistribuido.desde)}. Para mudar o
            supervisor, use a transferência de caso.
          </Aviso>
          <div className="flex justify-end">
            <Button variant="outline" onClick={aoFechar}>
              Fechar
            </Button>
          </div>
        </>
      ) : (
        <form
          onSubmit={(evento) => {
            evento.preventDefault();
            if (escolhido) distribuicao.mutate(escolhido);
          }}
          className="space-y-4"
        >
          {supervisores.isPending && (
            <p role="status">Carregando supervisores…</p>
          )}
          {supervisores.isError && (
            <Aviso
              tipo="erro"
              titulo="Não foi possível carregar os supervisores."
            />
          )}
          {supervisores.data && lista.length === 0 && (
            <Aviso tipo="alerta" titulo="Não há supervisores ativos.">
              Cadastre ou ative um supervisor em Usuários para distribuir o
              caso.
            </Aviso>
          )}
          {todosNoLimite && (
            <Aviso
              tipo="alerta"
              titulo="Todos os supervisores estão no limite de casos."
            >
              Cada supervisor já tem {limite} casos ativos. O caso continua na
              lista de casos aguardando distribuição até que alguém tenha vaga.
            </Aviso>
          )}
          {lista.length > 0 && (
            <fieldset>
              <legend className="text-sm font-semibold">Supervisor</legend>
              <p className="text-xs text-muted-foreground">
                Casos ativos de cada supervisor. O limite é de {limite} casos.
              </p>
              <div className="mt-2 space-y-2">
                {lista.map((s) => (
                  <label
                    key={s.id}
                    className={
                      s.noLimite
                        ? "flex cursor-not-allowed items-start gap-3 rounded-md border border-dashed border-input bg-muted px-3 py-2 text-sm text-muted-foreground"
                        : "flex cursor-pointer items-start gap-3 rounded-md border border-input px-3 py-2 text-sm has-checked:border-primary has-checked:bg-accent"
                    }
                  >
                    <input
                      type="radio"
                      name="supervisor"
                      value={s.id}
                      className="mt-1"
                      disabled={s.noLimite}
                      checked={escolhido === s.id}
                      onChange={() => setEscolhido(s.id)}
                    />
                    <span className="flex-1">
                      <span className="block font-semibold">{s.nome}</span>
                      {s.noLimite && (
                        <span className="mt-0.5 flex items-center gap-1 text-xs">
                          <Lock aria-hidden className="size-3.5" />
                          Limite de {s.limite} casos atingido
                        </span>
                      )}
                    </span>
                    <span className="font-semibold">
                      {s.casosAtivos} de {s.limite}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          {erro && !jaDistribuido && (
            <Aviso tipo="erro" titulo="Não foi possível distribuir o caso.">
              {erro.status === 422 || erro.status === 409
                ? erro.message
                : "Tente novamente em instantes."}
            </Aviso>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={aoFechar}>
              {todosNoLimite ? "Fechar" : "Cancelar"}
            </Button>
            <Button
              type="submit"
              disabled={!escolhido || todosNoLimite || distribuicao.isPending}
            >
              Confirmar distribuição
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

// Casos aguardando distribuição (RF18) e distribuição a supervisor (RF20). A
// coordenação distribui; o supervisor só consulta.
export default function DistribuicaoPage() {
  const { data: sessao } = useSessao();
  const cliente = useQueryClient();
  const [aberto, setAberto] = useState<CasoAguardando | null>(null);
  const [mensagem, setMensagem] = useState<ResultadoDistribuicao | null>(null);
  const podeVer =
    sessao?.perfil === "coordenacao" || sessao?.perfil === "supervisor";
  const coordena = sessao?.perfil === "coordenacao";

  const lista = useQuery({
    queryKey: ["casos", "aguardando"],
    queryFn: () => api<CasoAguardando[]>("/casos/aguardando-distribuicao"),
    enabled: podeVer,
  });

  if (sessao && !podeVer) {
    return (
      <Aviso
        tipo="erro"
        titulo="Acesso restrito à coordenação e aos supervisores."
      />
    );
  }

  const botao = (caso: CasoAguardando) => (
    <Button
      aria-label={`Distribuir ${caso.nome}`}
      onClick={() => {
        setMensagem(null);
        setAberto(caso);
      }}
    >
      Distribuir
    </Button>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-marca">
          Casos aguardando distribuição
        </h1>
        <p className="text-sm text-muted-foreground">
          Casos com prioridade clínica registrada e ainda sem supervisor.
        </p>
      </div>

      {sessao?.perfil === "supervisor" && (
        <Aviso tipo="info" titulo="Somente consulta.">
          <span className="flex items-start gap-1">
            <Eye aria-hidden className="mt-0.5 size-4 shrink-0" />A distribuição
            dos casos é feita pela coordenação. Os casos atribuídos a você
            aparecem em &quot;Meus casos&quot;.
          </span>
        </Aviso>
      )}
      {mensagem && (
        <Aviso tipo="sucesso" focar titulo="Caso distribuído.">
          {mensagem.numero} · {mensagem.paciente} agora está com{" "}
          {mensagem.supervisor}.
        </Aviso>
      )}

      {lista.isPending && podeVer && <p role="status">Carregando casos…</p>}
      {lista.isError && (
        <Aviso tipo="erro" titulo="Não foi possível carregar os casos." />
      )}
      {lista.data && lista.data.length === 0 && (
        <Aviso tipo="sucesso" titulo="Não há casos aguardando distribuição.">
          Os casos aparecem aqui depois que a prioridade clínica é registrada na
          triagem.
        </Aviso>
      )}
      {lista.data && lista.data.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <p className="flex items-center gap-2 border-b border-border px-4 py-3 text-xs text-muted-foreground">
            <ListFilter aria-hidden className="size-4" />
            {ORDEM}
          </p>
          <table className="hidden w-full text-sm md:table">
            <caption className="sr-only">Casos aguardando distribuição</caption>
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Nº da inscrição
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Nome
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Prioridade clínica
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Data da inscrição
                </th>
                {coordena && (
                  <th scope="col" className="px-4 py-3">
                    <span className="sr-only">Ações</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {lista.data.map((caso) => (
                <tr key={caso.casoId} className="border-t border-border">
                  <td className="px-4 py-3 font-semibold">{caso.numero}</td>
                  <td className="px-4 py-3">{caso.nome}</td>
                  <td className="px-4 py-3">
                    <Prioridade cor={caso.prioridade} />
                  </td>
                  <td className="px-4 py-3">{dataBr(caso.dataInscricao)}</td>
                  {coordena && (
                    <td className="px-4 py-3 text-right">{botao(caso)}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="divide-y divide-border md:hidden">
            {lista.data.map((caso) => (
              <li key={caso.casoId} className="space-y-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{caso.numero}</span>
                  <Prioridade cor={caso.prioridade} />
                </div>
                <p className="font-semibold">{caso.nome}</p>
                <p className="text-xs text-muted-foreground">
                  Inscrição em {dataBr(caso.dataInscricao)}
                </p>
                {coordena && (
                  <div className="[&>button]:w-full">{botao(caso)}</div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Dialogo
        aberto={!!aberto}
        aoFechar={() => setAberto(null)}
        titulo="Distribuir caso"
      >
        {aberto && (
          <DistribuirCaso
            key={aberto.casoId}
            caso={aberto}
            aoFechar={() => setAberto(null)}
            aoConcluir={(resultado) => {
              setAberto(null);
              setMensagem(resultado);
              void cliente.invalidateQueries({ queryKey: ["casos"] });
              void cliente.invalidateQueries({ queryKey: ["supervisores"] });
            }}
          />
        )}
      </Dialogo>
    </div>
  );
}
