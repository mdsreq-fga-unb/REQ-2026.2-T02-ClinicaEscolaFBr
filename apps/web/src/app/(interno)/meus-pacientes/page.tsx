"use client";
import { useQuery } from "@tanstack/react-query";
import { User } from "lucide-react";
import Link from "next/link";
import type { CasoSobResponsabilidade, SituacaoCaso } from "@clinica/shared";
import { SeloSituacaoCaso } from "@/components/assiduidade/desligamento";
import { Prioridade } from "@/components/casos/prioridade";
import { Aviso } from "@/components/comum/aviso";
import { buttonVariants } from "@/components/ui/button";
import { api } from "@/lib/api";
import { NOMES_SITUACAO_CASO } from "@/lib/formato";
import { useSessao } from "@/lib/sessao";

// Quantos casos há em cada situação, na ordem em que aparecem na lista.
function resumo(casos: CasoSobResponsabilidade[]) {
  const contagem = new Map<SituacaoCaso, number>();
  for (const c of casos)
    contagem.set(c.situacao, (contagem.get(c.situacao) ?? 0) + 1);
  return [...contagem];
}

// "Meus pacientes" do estagiário (RF23, prancha 4-1): só os casos com vínculo
// vigente dele, com o paciente, a prioridade clínica, a situação e o supervisor.
// A prioridade é a exceção do RNF17 para os próprios casos; a queixa e os dados
// de triagem não aparecem.
export default function MeusPacientesPage() {
  const { data: sessao } = useSessao();
  const estagiario = sessao?.perfil === "estagiario";
  const lista = useQuery({
    queryKey: ["casos", "meus"],
    queryFn: () => api<CasoSobResponsabilidade[]>("/casos/meus"),
    enabled: estagiario,
  });

  if (sessao && !estagiario) {
    return <Aviso tipo="erro" titulo="Acesso restrito aos estagiários." />;
  }

  const prontuario = (caso: CasoSobResponsabilidade, largo = false) =>
    caso.prontuarioId && (
      <Link
        href={`/prontuarios/${caso.prontuarioId}`}
        aria-label={`Abrir prontuário de ${caso.nome}`}
        className={buttonVariants({
          variant: "outline",
          className: largo ? "w-full" : undefined,
        })}
      >
        Abrir prontuário
      </Link>
    );
  const casos = lista.data;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="ui-titulo">Meus pacientes</h1>
        <p className="ui-subtitulo">Casos vinculados a você.</p>
      </div>

      {lista.isPending && estagiario && (
        <p role="status">Carregando pacientes…</p>
      )}
      {lista.isError && (
        <Aviso tipo="erro" titulo="Não foi possível carregar os pacientes." />
      )}
      {casos && casos.length === 0 && (
        <div className="ui-painel">
          <div className="ui-vazio">
            <span aria-hidden className="ui-vazio-icone">
              <User className="size-7" />
            </span>
            <h2 className="ui-h2">Você ainda não tem pacientes vinculados.</h2>
            <p className="ui-subtitulo m-0 max-w-[460px]">
              Os casos aparecem aqui quando o supervisor faz o vínculo.
            </p>
          </div>
        </div>
      )}
      {casos && casos.length > 0 && (
        <>
          <ul
            aria-label="Resumo dos seus casos"
            className="flex flex-wrap gap-3"
          >
            {resumo(casos).map(([situacao, n]) => (
              <li
                key={situacao}
                className="flex items-baseline gap-2.5 rounded-[12px] border border-border bg-white px-5 py-3.5"
              >
                <b className="text-[22px]">{n}</b>
                <span className="text-[15px] text-muted-foreground">
                  {NOMES_SITUACAO_CASO[situacao].toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
          <div className="ui-painel">
            <table className="ui-tabela max-lg:hidden">
              <caption className="sr-only">Pacientes vinculados a você</caption>
              <thead>
                <tr>
                  <th scope="col">Paciente</th>
                  <th scope="col">Prioridade clínica</th>
                  <th scope="col">Situação do caso</th>
                  <th scope="col">Supervisor</th>
                  <th scope="col">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {casos.map((caso) => (
                  <tr key={caso.casoId}>
                    <td className="font-semibold">{caso.nome}</td>
                    <td>
                      {caso.prioridade && <Prioridade cor={caso.prioridade} />}
                    </td>
                    <td>
                      <SeloSituacaoCaso situacao={caso.situacao} />
                    </td>
                    <td>{caso.supervisor ?? "—"}</td>
                    <td className="text-right">{prontuario(caso)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="ui-lista-celular p-3 lg:hidden">
              {casos.map((caso) => (
                <li key={caso.casoId} className="ui-item-celular">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[17px] font-semibold">{caso.nome}</p>
                    {caso.prioridade && <Prioridade cor={caso.prioridade} />}
                  </div>
                  <div>
                    <SeloSituacaoCaso situacao={caso.situacao} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Supervisor: {caso.supervisor ?? "—"}
                  </p>
                  {prontuario(caso, true)}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
