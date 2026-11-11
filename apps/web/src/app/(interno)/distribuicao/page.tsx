"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Lock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type {
  CasoAguardando,
  CasoJaDistribuido,
  ResultadoDistribuicao,
  SupervisorDisponivel,
  VagaLiberada,
} from "@clinica/shared";
import { CartaoVagaLiberada } from "@/components/assiduidade/desligamento";
import { Aviso } from "@/components/comum/aviso";
import { Dialogo } from "@/components/comum/dialogo";
import { Prioridade } from "@/components/casos/prioridade";
import { Button, buttonVariants } from "@/components/ui/button";
import { api, ErroApi } from "@/lib/api";
import { dataBr } from "@/lib/formato";
import { useSessao } from "@/lib/sessao";

const ORDEM =
  "Ordenado por prioridade clínica (Vermelha, Amarela, Verde) e, na mesma prioridade, pela data da inscrição.";

// Escolha do supervisor responsável pela coordenação (RF20): casos ativos de cada
// um em relação ao limite, sem deixar escolher quem já está no limite. Devolve o
// corpo e o rodapé do diálogo, com o botão principal fixo no rodapé.
function useDistribuirCaso({
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

  const formulario = `distribuir-${caso.casoId}`;
  return {
    corpo: (
      <>
        <dl className="ui-resumo-caso max-md:grid-cols-1">
          <div>
            <dt>Inscrição</dt>
            <dd className="ui-numero">{caso.numero}</dd>
          </div>
          <div>
            <dt>Nome</dt>
            <dd>{caso.nome}</dd>
          </div>
          <div>
            <dt>Prioridade clínica</dt>
            <dd>
              <Prioridade cor={caso.prioridade} />
            </dd>
          </div>
          <div>
            <dt>Data da inscrição</dt>
            <dd>{dataBr(caso.dataInscricao)}</dd>
          </div>
        </dl>

        {jaDistribuido ? (
          <Aviso
            tipo="info"
            titulo={`Este caso já tem supervisor: ${jaDistribuido.supervisor}.`}
          >
            Ele foi distribuído em {dataBr(jaDistribuido.desde)}. Para mudar o
            supervisor, use a transferência de caso.
          </Aviso>
        ) : (
          <form
            id={formulario}
            onSubmit={(evento) => {
              evento.preventDefault();
              if (escolhido) distribuicao.mutate(escolhido);
            }}
            className="flex flex-col gap-[18px]"
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
                lista de casos aguardando distribuição até que alguém tenha
                vaga.
              </Aviso>
            )}
            {lista.length > 0 && (
              <fieldset
                disabled={todosNoLimite}
                className="flex min-w-0 flex-col gap-2"
              >
                <legend className="ui-rotulo mb-1.5">Supervisor</legend>
                <p className="ui-dica -mt-1">
                  Casos ativos de cada supervisor. O limite é de {limite} casos.
                </p>
                {lista.map((s) => (
                  <label key={s.id} className="ui-opcao">
                    <input
                      type="radio"
                      name="supervisor"
                      value={s.id}
                      disabled={s.noLimite}
                      aria-describedby={
                        s.noLimite ? `limite-${s.id}` : undefined
                      }
                      checked={escolhido === s.id}
                      onChange={() => setEscolhido(s.id)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex w-full items-center justify-between gap-3">
                        <b>{s.nome}</b>
                        <span className="font-bold whitespace-nowrap text-marca tabular-nums">
                          {s.casosAtivos} de {s.limite}
                          <span className="sr-only"> casos ativos</span>
                        </span>
                      </span>
                      {s.noLimite && (
                        <span
                          id={`limite-${s.id}`}
                          className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold"
                        >
                          <Lock aria-hidden className="size-4" />
                          Limite de {s.limite} casos atingido
                        </span>
                      )}
                    </span>
                  </label>
                ))}
              </fieldset>
            )}
            {erro && !jaDistribuido && (
              <Aviso tipo="erro" titulo="Não foi possível distribuir o caso.">
                {erro.status === 422 || erro.status === 409
                  ? erro.message
                  : "Tente novamente em instantes."}
              </Aviso>
            )}
          </form>
        )}
      </>
    ),
    rodape: jaDistribuido ? (
      <Button variant="outline" onClick={aoFechar}>
        Fechar
      </Button>
    ) : (
      <>
        <Button type="button" variant="outline" onClick={aoFechar}>
          {todosNoLimite ? "Fechar" : "Cancelar"}
        </Button>
        <Button
          type="submit"
          form={formulario}
          data-principal
          disabled={!escolhido || todosNoLimite || distribuicao.isPending}
        >
          Confirmar distribuição
        </Button>
      </>
    ),
  };
}

// Casos aguardando distribuição (RF18) e distribuição a supervisor (RF20). A
// coordenação distribui; o supervisor só consulta. Para a coordenação, também as
// vagas liberadas por desligamento (RF37) e as reversões que aguardam estagiário
// (RF38).
export default function DistribuicaoPage() {
  const { data: sessao } = useSessao();
  const cliente = useQueryClient();
  const [aberto, setAberto] = useState<CasoAguardando | null>(null);
  const [mensagem, setMensagem] = useState<ResultadoDistribuicao | null>(null);
  const podeVer =
    sessao?.perfil === "coordenacao" || sessao?.perfil === "supervisor";
  const coordena = sessao?.perfil === "coordenacao";

  const vagas = useQuery({
    queryKey: ["vagas", "liberadas"],
    queryFn: () => api<VagaLiberada[]>("/vagas/liberadas"),
    enabled: coordena,
  });
  const reversoes = useQuery({
    queryKey: ["casos", "aguardando-vaga"],
    queryFn: () =>
      api<
        {
          casoId: string;
          numero: string;
          nome: string;
          supervisor: string | null;
        }[]
      >("/casos/aguardando-vaga"),
    enabled: coordena,
  });

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

  const botao = (caso: CasoAguardando, largo = false) => (
    <Button
      aria-label={`Distribuir ${caso.nome}`}
      className={largo ? "w-full" : undefined}
      onClick={() => {
        setMensagem(null);
        setAberto(caso);
      }}
    >
      Distribuir
    </Button>
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="ui-titulo">Casos aguardando distribuição</h1>
        <p className="ui-subtitulo">
          Casos com prioridade clínica registrada e ainda sem supervisor.
        </p>
      </div>

      {sessao?.perfil === "supervisor" && (
        <Aviso tipo="info" titulo="Somente consulta.">
          A distribuição dos casos é feita pela coordenação. Os casos atribuídos
          a você aparecem em “Meus casos”.
        </Aviso>
      )}
      {mensagem && (
        <Aviso tipo="sucesso" focar titulo="Caso distribuído.">
          {mensagem.numero} · {mensagem.paciente} agora está com{" "}
          {mensagem.supervisor}.
        </Aviso>
      )}

      {vagas.data?.map((vaga) => (
        <CartaoVagaLiberada key={vaga.id} vaga={vaga} supervisor={false} />
      ))}

      {lista.isPending && podeVer && <p role="status">Carregando casos…</p>}
      {lista.isError && (
        <Aviso tipo="erro" titulo="Não foi possível carregar os casos." />
      )}
      {lista.data && lista.data.length === 0 && (
        <div className="ui-painel">
          <div className="ui-vazio">
            <span aria-hidden className="ui-vazio-icone">
              <Check className="size-7" />
            </span>
            <h2 className="ui-h2">Não há casos aguardando distribuição.</h2>
            <p className="ui-subtitulo m-0 max-w-[460px]">
              Os casos aparecem aqui depois que a prioridade clínica é
              registrada na triagem.
            </p>
          </div>
        </div>
      )}
      {lista.data && lista.data.length > 0 && (
        <>
          <div className="ui-painel max-md:hidden">
            <p className="ui-ordem">{ORDEM}</p>
            <table className="ui-tabela">
              <caption className="sr-only">
                Casos aguardando distribuição
              </caption>
              <thead>
                <tr>
                  <th scope="col">Nº da inscrição</th>
                  <th scope="col">Nome</th>
                  <th scope="col">Prioridade clínica</th>
                  <th scope="col">Data da inscrição</th>
                  {coordena && (
                    <th scope="col">
                      <span className="sr-only">Ações</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {lista.data.map((caso) => (
                  <tr key={caso.casoId}>
                    <td className="ui-numero">{caso.numero}</td>
                    <td className="font-semibold">{caso.nome}</td>
                    <td>
                      <Prioridade cor={caso.prioridade} />
                    </td>
                    <td>{dataBr(caso.dataInscricao)}</td>
                    {coordena && <td className="text-right">{botao(caso)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-3.5 md:hidden">
            <p className="ui-dica">
              Por prioridade clínica e data da inscrição.
            </p>
            <ul className="ui-lista-celular">
              {lista.data.map((caso) => (
                <li key={caso.casoId} className="ui-item-celular">
                  <div className="flex items-center justify-between gap-2">
                    <span className="ui-numero">{caso.numero}</span>
                    <Prioridade cor={caso.prioridade} />
                  </div>
                  <p className="text-[17px] font-semibold">{caso.nome}</p>
                  <p className="text-sm text-muted-foreground">
                    Inscrição em {dataBr(caso.dataInscricao)}
                  </p>
                  {coordena && botao(caso, true)}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {reversoes.data && reversoes.data.length > 0 && (
        <section aria-labelledby="reversoes" className="ui-cartao">
          <h2 id="reversoes" className="ui-h2">
            Reversões aguardando estagiário
          </h2>
          <p className="ui-dica">
            Desligamentos revertidos com a vaga já ocupada ou o estagiário
            desativado. O supervisor do caso vincula um estagiário em “Meus
            casos”; se o supervisor também precisar mudar, use a transferência
            de caso.
          </p>
          <ul className="flex flex-col gap-2">
            {reversoes.data.map((caso) => (
              <li
                key={caso.casoId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3.5 py-2.5"
              >
                <span className="text-[15px]">
                  <span className="ui-numero">{caso.numero}</span> ·{" "}
                  <span className="font-semibold">{caso.nome}</span>
                  <span className="ui-meta block">
                    Supervisor: {caso.supervisor ?? "—"}
                  </span>
                </span>
                <Link
                  href={`/pacientes/${caso.casoId}`}
                  aria-label={`Abrir ficha de ${caso.nome}`}
                  className={buttonVariants({
                    variant: "outline",
                    className: "max-sm:w-full",
                  })}
                >
                  Abrir ficha
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {aberto && (
        <DialogoDistribuir
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
    </div>
  );
}

function DialogoDistribuir(props: {
  caso: CasoAguardando;
  aoConcluir: (resultado: ResultadoDistribuicao) => void;
  aoFechar: () => void;
}) {
  const { corpo, rodape } = useDistribuirCaso(props);
  return (
    <Dialogo
      aberto
      lateral
      aoFechar={props.aoFechar}
      titulo="Distribuir caso"
      subtitulo="Escolha o supervisor responsável."
      rodape={rodape}
    >
      {corpo}
    </Dialogo>
  );
}
