"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, Printer } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import type { RelatorioParaImpressao } from "@clinica/shared";
import { Aviso } from "@/components/comum/aviso";
import { chaveRelatorioFinal } from "@/components/relatorio-final/relatorio-final";
import { Button } from "@/components/ui/button";
import { api, ErroApi } from "@/lib/api";
import { dataBr, dataHoraBr } from "@/lib/formato";

// "28 de novembro de 2026", no horário de Brasília.
const dataPorExtenso = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });

const comPonto = (texto: string) => {
  const t = texto.trim();
  return /[.!?…]$/.test(t) ? t : `${t}.`;
};

// Versão para impressão do relatório final (RF33, prancha 6-6): só a versão
// aprovada, no modelo de relatório psicológico da Clínica Escola (DF42), com os
// campos das assinaturas manuscritas. O PDF é o da impressão do navegador: não
// há download nem envio por e-mail. "Imprimir" registra quem imprimiu e quando.
export default function ImpressaoRelatorioFinalPage() {
  const { casoId, versao } = useParams<{ casoId: string; versao: string }>();
  const ciclo = useSearchParams().get("ciclo");
  const router = useRouter();
  const cliente = useQueryClient();
  const sufixo = ciclo ? `?ciclo=${ciclo}` : "";
  const consulta = useQuery({
    queryKey: ["casos", casoId, "relatorio-final", "impressao", versao, ciclo],
    queryFn: () =>
      api<RelatorioParaImpressao>(
        `/casos/${casoId}/relatorio-final/versoes/${versao}/impressao${sufixo}`,
      ),
    retry: false,
  });
  const impressao = useMutation({
    mutationFn: () =>
      api<{ por: string; em: string }>(
        `/casos/${casoId}/relatorio-final/versoes/${versao}/impressoes${sufixo}`,
        { method: "POST" },
      ),
    onSuccess: () => {
      void cliente.invalidateQueries({
        queryKey: chaveRelatorioFinal(casoId).slice(0, 3),
      });
      window.print();
    },
  });

  if (consulta.isPending)
    return <p role="status">Carregando o relatório final…</p>;
  if (consulta.isError) {
    const negado =
      consulta.error instanceof ErroApi && consulta.error.status === 403;
    return negado ? (
      <div className="mx-auto mt-6 flex max-w-xl flex-col gap-3 rounded-xl border border-border bg-card p-6">
        <Lock aria-hidden className="size-6 text-marca" />
        <h1 className="ui-titulo">Você não tem acesso a este relatório</h1>
        <p className="ui-dica m-0">
          O relatório é elaborado pelo estagiário responsável e revisado pelo
          supervisor do caso. A secretaria acessa só a versão aprovada.
        </p>
        <Button
          variant="outline"
          className="w-fit"
          onClick={() => router.back()}
        >
          Voltar
        </Button>
      </div>
    ) : (
      <Aviso tipo="erro" titulo="Não foi possível carregar o relatório final.">
        Atualize a página para tentar de novo.
      </Aviso>
    );
  }

  const r = consulta.data;
  const crp = r.supervisor.crp ? `CRP ${r.supervisor.crp}` : "CRP ________";
  const identificacao = [
    `Paciente: ${r.paciente}.`,
    `Solicitante: ${r.solicitante ?? r.paciente}.`,
    `Autoria: ${r.estagiario}, estagiário(a) de Psicologia.`,
    `Supervisão: ${r.supervisor.nome}, ${crp}.`,
    `Finalidade: ${comPonto(r.secoes.finalidade)}`,
  ].join(" ");
  const secoes = [
    [
      "2. Descrição da demanda",
      `${r.inicioAcompanhamento ? `Acompanhamento iniciado em ${dataBr(r.inicioAcompanhamento)}. ` : ""}${r.secoes.demanda}`,
    ],
    ["3. Procedimentos", r.secoes.procedimentos],
    ["4. Análise", r.secoes.analise],
    ["5. Conclusão", r.secoes.conclusao],
  ] as const;

  return (
    <div className="flex flex-col gap-5 print:gap-0">
      <div className="flex flex-col gap-3 print:hidden">
        <h1 className="ui-titulo">Relatório final · versão para impressão</h1>
        <p className="ui-dica m-0">
          Versão {r.versao} do ciclo {r.ciclo}, aprovada por {r.supervisor.nome}{" "}
          em {dataHoraBr(r.aprovadaEm).replace(", ", ", às ")}. Imprima em A4 e
          colha as assinaturas à mão; o relatório não é baixado nem enviado por
          e-mail.
        </p>
        {impressao.isError && (
          <Aviso
            tipo="erro"
            focar
            titulo="Não foi possível registrar a impressão."
          >
            {impressao.error instanceof ErroApi &&
            impressao.error.status === 403
              ? "Só a versão aprovada pode ser impressa."
              : "Tente de novo. Se o problema continuar, avise a coordenação."}
          </Aviso>
        )}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => impressao.mutate()}
            disabled={impressao.isPending}
            className="max-sm:w-full"
          >
            <Printer aria-hidden className="size-4" />
            Imprimir
          </Button>
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="max-sm:w-full"
          >
            Voltar
          </Button>
        </div>
      </div>
      <article
        aria-label="Relatório psicológico"
        className="mx-auto w-full max-w-[794px] rounded-sm border border-border bg-white px-6 py-10 font-serif text-[15px] leading-relaxed text-black shadow-sm sm:px-14 print:max-w-none print:border-0 print:p-0 print:shadow-none"
      >
        <h2 className="mb-6 text-center font-sans text-lg font-bold tracking-wide">
          RELATÓRIO PSICOLÓGICO
        </h2>
        <section className="mb-4 break-inside-avoid-page">
          <h3 className="mb-2 font-sans text-[15px] font-bold">
            1. Identificação
          </h3>
          <p className="m-0">{identificacao}</p>
        </section>
        {secoes.map(([titulo, texto]) => (
          <section key={titulo} className="mb-4">
            <h3 className="mb-2 break-after-avoid font-sans text-[15px] font-bold">
              {titulo}
            </h3>
            <p className="m-0 whitespace-pre-line">{texto}</p>
          </section>
        ))}
        <p className="mt-8 mb-16">Brasília, {dataPorExtenso(r.aprovadaEm)}.</p>
        <div className="grid break-inside-avoid gap-12 text-center text-[13px] sm:grid-cols-2 print:grid-cols-2">
          {[
            [r.estagiario, "Estagiário(a) de Psicologia"],
            [r.supervisor.nome, `Psicólogo(a) supervisor(a) · ${crp}`],
          ].map(([nome, papel]) => (
            <div key={papel} className="border-t border-black pt-2">
              <p className="m-0">{nome}</p>
              <p className="m-0">{papel}</p>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}
