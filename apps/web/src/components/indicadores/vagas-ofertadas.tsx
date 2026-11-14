"use client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useId, useState, type FormEvent } from "react";
import {
  semestreParaUrl,
  vagasOfertadasSchema,
  type VagasOfertadas,
} from "@clinica/shared";
import { Aviso } from "@/components/comum/aviso";
import { Campo, classeEntrada } from "@/components/comum/campo";
import { Dialogo } from "@/components/comum/dialogo";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { dataHoraBr } from "@/lib/formato";

// Registro das vagas ofertadas no semestre (RF48), com a última alteração: o valor
// anterior, o novo, o autor e a data/hora.
export function VagasOfertadasDialogo({
  aberto,
  semestre,
  aoFechar,
  aoSalvar,
}: {
  aberto: boolean;
  semestre: string;
  aoFechar: () => void;
  aoSalvar: () => void;
}) {
  const formulario = useId();
  const caminho = `/vagas-ofertadas/${semestreParaUrl(semestre)}`;
  const atual = useQuery({
    queryKey: ["vagas-ofertadas", semestre],
    queryFn: () => api<VagasOfertadas>(caminho),
    enabled: aberto,
    staleTime: 0,
  });
  // O campo começa com o total já registrado; o que a pessoa digita fica em
  // `editado` até salvar ou fechar.
  const [editado, setEditado] = useState<string | null>(null);
  const [erro, setErro] = useState<string>();
  const total = editado ?? atual.data?.total?.toString() ?? "";
  const fechar = () => {
    setEditado(null);
    setErro(undefined);
    aoFechar();
  };

  const salvar = useMutation({
    mutationFn: (valor: number) =>
      api<VagasOfertadas>(caminho, {
        method: "PUT",
        body: JSON.stringify({ total: valor }),
      }),
    onSuccess: () => {
      setEditado(null);
      aoSalvar();
    },
  });

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    const r = vagasOfertadasSchema.safeParse({
      total: total.trim() === "" ? undefined : Number(total),
    });
    if (!r.success) {
      setErro(r.error.issues[0].message);
      return;
    }
    setErro(undefined);
    salvar.mutate(r.data.total);
  }

  const ultima = atual.data?.ultimaAlteracao;
  return (
    <Dialogo
      aberto={aberto}
      aoFechar={fechar}
      titulo={`Vagas ofertadas no semestre ${semestre}`}
      rodape={
        <>
          <Button type="button" variant="outline" onClick={fechar}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form={formulario}
            data-principal
            disabled={salvar.isPending}
          >
            {salvar.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </>
      }
    >
      <form
        id={formulario}
        onSubmit={enviar}
        noValidate
        className="flex flex-col gap-4"
      >
        <Campo
          rotulo="Total de vagas ofertadas"
          erro={erro}
          className="max-w-[220px]"
        >
          {(props) => (
            <input
              {...props}
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={total}
              onChange={(e) => setEditado(e.target.value)}
              className={classeEntrada}
            />
          )}
        </Campo>
        {ultima && (
          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="font-semibold">Última alteração</p>
            <p>
              {ultima.valorAnterior === null
                ? `Registrado ${ultima.valorNovo} vagas`
                : `De ${ultima.valorAnterior} para ${ultima.valorNovo} vagas`}
              , por {ultima.por}, em{" "}
              {dataHoraBr(ultima.em).replace(", ", ", às ")}.
            </p>
          </div>
        )}
        {salvar.isError && (
          <Aviso tipo="erro" titulo="Não foi possível salvar as vagas." focar>
            Tente de novo.
          </Aviso>
        )}
      </form>
    </Dialogo>
  );
}
