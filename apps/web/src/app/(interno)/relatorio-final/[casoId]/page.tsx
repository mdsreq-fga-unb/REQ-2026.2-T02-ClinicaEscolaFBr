"use client";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AcessoNegado } from "@/components/comum/acesso-negado";
import { Aviso } from "@/components/comum/aviso";
import { voltarDoPerfil } from "@/components/prontuario/acesso-negado";
import {
  AvisoLacunas,
  FormularioRelatorio,
  ResumoDoCiclo,
  RevisaoDoRelatorio,
  TextoDaVersao,
  useElaboracao,
} from "@/components/relatorio-final/elaboracao";
import {
  SeloRelatorio,
  VersoesDoRelatorio,
} from "@/components/relatorio-final/relatorio-final";
import { ErroApi } from "@/lib/api";
import { useSessao } from "@/lib/sessao";

// Relatório final do ciclo (RF33, prancha 6-6): a elaboração, para o estagiário
// responsável; a revisão, para o supervisor do caso; e a consulta das versões, também
// para a coordenação.
export default function RelatorioFinalPage() {
  const { casoId } = useParams<{ casoId: string }>();
  const ciclo = Number(useSearchParams().get("ciclo")) || undefined;
  const { data: sessao } = useSessao();
  const consulta = useElaboracao(casoId, ciclo);
  const [decisao, setDecisao] = useState<string | null>(null);
  const perfil = sessao?.perfil;
  const voltar = voltarDoPerfil(perfil);

  if (consulta.isPending)
    return <p role="status">Carregando o relatório final…</p>;
  if (consulta.error instanceof ErroApi && consulta.error.status === 403)
    return (
      <AcessoNegado
        titulo="Você não tem acesso a este relatório"
        voltar={voltar.href}
        rotuloVoltar={voltar.rotulo}
      >
        O relatório é elaborado pelo estagiário responsável e revisado pelo
        supervisor do caso. A secretaria acessa só a versão aprovada.
      </AcessoNegado>
    );
  if (consulta.isError || !consulta.data)
    return (
      <Aviso tipo="erro" titulo="Não foi possível carregar o relatório final.">
        Atualize a página para tentar de novo.
      </Aviso>
    );

  const r = consulta.data;
  const [recente] = r.versoes;
  const emRevisao = r.versoes.find((v) => v.estado === "em_revisao");
  // As versões enviadas, para consulta. A que o supervisor decide já tem o texto na
  // revisão.
  const enviadas = r.versoes.filter(
    (v) => v.estado !== "rascunho" && !(r.acoes.decidir && v === emRevisao),
  );
  const proxima =
    recente?.estado === "rascunho"
      ? recente.versao
      : (recente?.versao ?? 0) + 1;
  return (
    <div className="flex flex-col gap-5">
      <nav aria-label="Você está em" className="ui-trilha">
        <Link href={voltar.href}>{voltar.rotulo}</Link>
        <span aria-hidden>›</span>
        <Link href={`/prontuarios/${r.prontuarioId}`}>Prontuário</Link>
        <span aria-hidden>›</span>
        <span aria-current="page">Relatório final</span>
      </nav>
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="ui-titulo">Relatório final · ciclo {r.ciclo}</h1>
          {r.acoes.elaborar ? (
            <SeloRelatorio
              estado="rascunho"
              texto={`Versão ${proxima} · rascunho`}
            />
          ) : (
            recente && (
              <SeloRelatorio
                estado={recente.estado}
                texto={
                  recente.estado === "em_revisao"
                    ? `Versão ${recente.versao} · em revisão`
                    : undefined
                }
              />
            )
          )}
        </div>
        <ResumoDoCiclo r={r} />
      </div>
      {decisao && <Aviso tipo="sucesso" titulo={decisao} focar />}
      {r.semEvolucoes && (
        <Aviso
          tipo="alerta"
          titulo={`Não é possível gerar o relatório: o ciclo ${r.ciclo} não tem evoluções registradas.`}
        />
      )}
      <AvisoLacunas r={r} />
      {recente?.estado === "devolvido" && r.acoes.elaborar && (
        <Aviso
          tipo="alerta"
          titulo={`A versão ${recente.versao} foi devolvida para ajustes.`}
        >
          Observações: {recente.observacoes}
        </Aviso>
      )}
      {perfil === "estagiario" && emRevisao && (
        <Aviso
          tipo="info"
          titulo={`A versão ${emRevisao.versao} está em revisão${r.supervisor ? ` por ${r.supervisor.nome}` : ""}.`}
        >
          Enquanto ela está em revisão, o texto não muda.
        </Aviso>
      )}
      {r.acoes.elaborar && <FormularioRelatorio key={proxima} r={r} />}
      {r.acoes.decidir && emRevisao && (
        <RevisaoDoRelatorio
          key={emRevisao.versao}
          r={r}
          versao={emRevisao}
          aoDecidir={setDecisao}
        />
      )}
      <section
        aria-labelledby="titulo-versoes"
        className="ui-cartao flex flex-col gap-4"
      >
        <h2 id="titulo-versoes" className="ui-h2">
          Versões
        </h2>
        <VersoesDoRelatorio
          casoId={r.casoId}
          ciclo={r.ciclo}
          podeFinalizar={perfil === "estagiario" || perfil === "supervisor"}
          coordenacao={perfil === "coordenacao"}
        />
        {enviadas.map((v) => (
          <details
            key={v.versao}
            className="rounded-lg border border-border p-4"
          >
            <summary className="cursor-pointer font-semibold text-marca">
              Ler a versão {v.versao}
            </summary>
            <div className="mt-3">
              <TextoDaVersao r={r} versao={v} />
            </div>
          </details>
        ))}
      </section>
    </div>
  );
}
