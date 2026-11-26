"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { PerdaVagaDoCaso, ResultadoPerdaVaga } from "@clinica/shared";
import { Aviso } from "@/components/comum/aviso";
import { Dialogo } from "@/components/comum/dialogo";
import { Button, buttonVariants } from "@/components/ui/button";
import { api } from "@/lib/api";
import { dataBr, dataHoraBr, hojeBr } from "@/lib/formato";

// Perda da vaga pela contribuição pendente (RF43, prancha 8-2): o aviso do prazo
// vencido, o diálogo com as consequências e a confirmação, só da secretaria e da
// coordenação. O estagiário e o supervisor veem o aviso sem a confirmação.

const sessoesCanceladas = (n: number) =>
  n === 0
    ? "Nenhuma sessão futura cancelada."
    : n === 1
      ? "1 sessão futura cancelada."
      : `${n} sessões futuras canceladas.`;

// Aviso ao estagiário e ao supervisor, sem ação (prancha 8-2).
export function AvisoPrazoVencidoSemAcao({ nome }: { nome: string }) {
  return (
    <Aviso tipo="alerta" titulo={`O prazo da contribuição de ${nome} venceu.`}>
      A confirmação da perda da vaga é feita pela secretaria ou pela
      coordenação.
    </Aviso>
  );
}

// Para a secretaria e a coordenação: o aviso com "Confirmar perda da vaga". O
// resultado fica na página, porque o caso volta à fila e a ficha muda.
export function PerdaVaga({
  casoId,
  nome,
  podeRegistrarPagamento,
  aoConfirmar,
}: {
  casoId: string;
  nome: string;
  podeRegistrarPagamento: boolean;
  aoConfirmar: (resultado: ResultadoPerdaVaga) => void;
}) {
  const chave = ["casos", casoId, "perda-vaga"];
  const consulta = useQuery({
    queryKey: chave,
    queryFn: () => api<PerdaVagaDoCaso>(`/casos/${casoId}/perda-vaga`),
    retry: false,
  });
  const [confirmando, setConfirmando] = useState(false);
  const previa = consulta.data?.previa;
  if (!previa) return null;

  return (
    <section aria-label="Prazo da contribuição vencido" className="ui-cartao">
      <Aviso tipo="alerta" titulo="Prazo da contribuição vencido.">
        {nome} foi vinculado(a) a {previa.estagiario} em{" "}
        {dataBr(previa.vinculadoEm)}, e o prazo de 10 dias corridos terminou em{" "}
        {dataBr(previa.ate)} sem pagamento registrado.
      </Aviso>
      <div className="flex flex-wrap gap-3 max-sm:[&>*]:w-full">
        <Button variant="destructive" onClick={() => setConfirmando(true)}>
          Confirmar perda da vaga
        </Button>
        {podeRegistrarPagamento && (
          <a
            href="#contribuicao"
            className={buttonVariants({ variant: "outline" })}
          >
            Registrar pagamento
          </a>
        )}
      </div>
      {confirmando && (
        <DialogoPerdaVaga
          casoId={casoId}
          nome={nome}
          previa={previa}
          aoFechar={() => setConfirmando(false)}
          aoConcluir={(dados) => {
            setConfirmando(false);
            aoConfirmar(dados);
          }}
        />
      )}
    </section>
  );
}

function DialogoPerdaVaga({
  casoId,
  nome,
  previa,
  aoFechar,
  aoConcluir,
}: {
  casoId: string;
  nome: string;
  previa: NonNullable<PerdaVagaDoCaso["previa"]>;
  aoFechar: () => void;
  aoConcluir: (resultado: ResultadoPerdaVaga) => void;
}) {
  const cache = useQueryClient();
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function confirmar() {
    setErro(null);
    setSalvando(true);
    try {
      const resultado = await api<ResultadoPerdaVaga>(
        `/casos/${casoId}/perda-vaga`,
        { method: "POST" },
      );
      await Promise.all([
        cache.invalidateQueries({ queryKey: ["casos", casoId] }),
        cache.invalidateQueries({ queryKey: ["paciente", casoId] }),
      ]);
      aoConcluir(resultado);
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível confirmar a perda da vaga.",
      );
      setSalvando(false);
    }
  }

  const futuras = previa.sessoesFuturas;
  return (
    <Dialogo
      aberto
      alerta
      aoFechar={aoFechar}
      titulo={`Confirmar a perda da vaga de ${nome}?`}
      rodape={
        <>
          <Button type="button" variant="outline" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            data-principal
            disabled={salvando}
            onClick={confirmar}
          >
            Confirmar perda da vaga
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {erro && <Aviso tipo="erro" titulo={erro} />}
        {/* As consequências vêm antes dos botões (RNF56 a RNF58). */}
        <ul className="list-disc pl-5 text-[15px] leading-relaxed">
          <li>
            O vínculo com {previa.estagiario} é encerrado e a vaga é liberada.
          </li>
          <li>
            {futuras.length === 0
              ? "Não há sessões futuras para cancelar."
              : futuras.length === 1
                ? `A sessão futura de ${dataHoraBr(futuras[0]).replace(", ", ", às ")}, é cancelada.`
                : `As ${futuras.length} sessões futuras (${futuras
                    .map((s) => dataHoraBr(s).replace(", ", " às "))
                    .join("; ")}) são canceladas.`}
          </li>
          <li>
            O paciente volta à fila de espera com a mesma prioridade clínica. No
            desempate, conta a data de hoje, {dataBr(hojeBr())}, e não a da
            inscrição.
          </li>
        </ul>
      </div>
    </Dialogo>
  );
}

// Ficha do caso que voltou à fila pela perda da vaga: "Na fila de espera desde …"
// e quem confirmou (prancha 8-2).
export function VagaPerdida({ casoId }: { casoId: string }) {
  const consulta = useQuery({
    queryKey: ["casos", casoId, "perda-vaga"],
    queryFn: () => api<PerdaVagaDoCaso>(`/casos/${casoId}/perda-vaga`),
    retry: false,
  });
  const d = consulta.data;
  if (!d?.confirmada) return null;
  const c = d.confirmada;
  return (
    <section aria-label="Vaga perdida" className="ui-cartao gap-2">
      <p>
        <span className="inline-flex rounded-full border border-border bg-muted px-2.5 py-0.5 text-[13px] font-semibold">
          Na fila de espera desde {dataBr(d.naFilaDesde)}
        </span>
      </p>
      <p className="ui-dica m-0">
        Vaga perdida por falta de pagamento da contribuição, confirmada por{" "}
        {c.confirmadaPor} em {dataHoraBr(c.confirmadaEm).replace(", ", ", às ")}
        . {sessoesCanceladas(c.sessoesCanceladas)}
      </p>
    </section>
  );
}
