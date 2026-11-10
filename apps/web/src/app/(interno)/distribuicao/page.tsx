"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type {
  CasoAguardando,
  ResultadoDistribuicao,
  VagaLiberada,
} from "@clinica/shared";
import { CartaoVagaLiberada } from "@/components/assiduidade/desligamento";
import { Aviso } from "@/components/comum/aviso";
import { Button, buttonVariants } from "@/components/ui/button";
import { api } from "@/lib/api";
import { dataBr } from "@/lib/formato";
import { useSessao } from "@/lib/sessao";
import { ModalTransferenciaCaso } from "./components/modal-trans";

const ORDEM =
  "Ordenado por prioridade clínica (Vermelha, Amarela, Verde) e, na mesma prioridade, pela data da inscrição.";

// Casos aguardando distribuição (RF18), distribuição a supervisor (RF20)
// e transferência de estagiário responsável pelo caso.
export default function DistribuicaoPage() {
  const { data: sessao } = useSessao();
  const cliente = useQueryClient();

  const [mensagem, setMensagem] = useState<ResultadoDistribuicao | null>(null);

  const [casoTransferencia, setCasoTransferencia] = useState<string | null>(
    null,
  );

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

  const abrirTransferencia = (casoId: string) => {
    setCasoTransferencia(casoId);
  };

  const fecharTransferencia = () => {
    setCasoTransferencia(null);
  };

  const concluirTransferencia = () => {
    setCasoTransferencia(null);

    void cliente.invalidateQueries({
      queryKey: ["casos"],
    });

    void cliente.invalidateQueries({
      queryKey: ["estagiarios"],
    });

    void cliente.invalidateQueries({
      queryKey: ["supervisores"],
    });
  };

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
                      <span>{caso.prioridade}</span>
                    </td>

                    <td>{dataBr(caso.dataInscricao)}</td>

                    {coordena && (
                      <td className="text-right">
                        <Button
                          variant="outline"
                          onClick={() => abrirTransferencia(caso.casoId)}
                        >
                          Transferir caso
                        </Button>
                      </td>
                    )}
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

                    <span>{caso.prioridade}</span>
                  </div>

                  <p className="text-[17px] font-semibold">{caso.nome}</p>

                  <p className="text-sm text-muted-foreground">
                    Inscrição em {dataBr(caso.dataInscricao)}
                  </p>

                  {coordena && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => abrirTransferencia(caso.casoId)}
                    >
                      Transferir caso
                    </Button>
                  )}
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

      {casoTransferencia && (
        <ModalTransferenciaCaso
          casoId={casoTransferencia}
          aberto
          aoFechar={fecharTransferencia}
          aoConcluir={concluirTransferencia}
        />
      )}
    </div>
  );
}
