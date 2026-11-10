"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { transferirCasoSchema, type TransferirCasoDto } from "@clinica/shared";

import { Aviso } from "@/components/comum/aviso";
import { Dialogo } from "@/components/comum/dialogo";
import { Button } from "@/components/ui/button";
import { api, ErroApi } from "@/lib/api";

type EstagiarioDisponivel = {
  id: string;
  nome: string;
};

type Props = {
  casoId: string;
  aberto: boolean;
  aoFechar: () => void;
  aoConcluir: () => void;
};

export function ModalTransferenciaCaso({
  casoId,
  aberto,
  aoFechar,
  aoConcluir,
}: Props) {
  const cliente = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TransferirCasoDto>({
    resolver: zodResolver(transferirCasoSchema),
    defaultValues: {
      casoId,
      estagiarioDestinoId: "",
      motivo: "",
    },
  });

  const estagiarios = useQuery({
    queryKey: ["estagiarios", "disponiveis", casoId],
    queryFn: () =>
      api<EstagiarioDisponivel[]>(`/casos/${casoId}/estagiarios-disponiveis`),
    enabled: aberto,
  });

  const transferencia = useMutation({
    mutationFn: (dados: TransferirCasoDto) =>
      api("/distribuicao/transferir", {
        method: "POST",
        body: JSON.stringify(dados),
      }),

    onSuccess: () => {
      void cliente.invalidateQueries({ queryKey: ["casos"] });
      void cliente.invalidateQueries({ queryKey: ["estagiarios"] });

      reset();
      aoConcluir();
    },
  });

  const onSubmit = (dados: TransferirCasoDto) => {
    transferencia.mutate(dados);
  };

  const erroApi =
    transferencia.error instanceof ErroApi ? transferencia.error : null;

  return (
    <Dialogo
      aberto={aberto}
      lateral
      aoFechar={aoFechar}
      titulo="Transferir caso"
      subtitulo="Escolha o novo estagiário responsável."
      rodape={
        <>
          <Button type="button" variant="outline" onClick={aoFechar}>
            Cancelar
          </Button>

          <Button
            type="submit"
            form="form-transferencia"
            data-principal
            disabled={transferencia.isPending}
          >
            {transferencia.isPending
              ? "Transferindo..."
              : "Confirmar transferência"}
          </Button>
        </>
      }
    >
      <form
        id="form-transferencia"
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-[18px]"
      >
        {estagiarios.isPending && (
          <p role="status">Carregando estagiários...</p>
        )}

        {estagiarios.isError && (
          <Aviso
            tipo="erro"
            titulo="Não foi possível carregar os estagiários."
          />
        )}

        {estagiarios.data && estagiarios.data.length === 0 && (
          <Aviso tipo="alerta" titulo="Não há estagiários disponíveis." />
        )}

        <div>
          <label htmlFor="estagiarioDestinoId" className="ui-rotulo">
            Novo estagiário responsável
          </label>

          <select
            id="estagiarioDestinoId"
            {...register("estagiarioDestinoId")}
            className="ui-campo w-full"
            disabled={estagiarios.isPending || estagiarios.isError}
          >
            <option value="">Selecione um estagiário</option>

            {estagiarios.data?.map((estagiario) => (
              <option key={estagiario.id} value={estagiario.id}>
                {estagiario.nome}
              </option>
            ))}
          </select>

          {errors.estagiarioDestinoId && (
            <p className="text-sm text-destructive">
              {errors.estagiarioDestinoId.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="motivo" className="ui-rotulo">
            Motivo da transferência
          </label>

          <textarea
            id="motivo"
            {...register("motivo")}
            rows={4}
            className="ui-campo w-full"
          />

          {errors.motivo && (
            <p className="text-sm text-destructive">{errors.motivo.message}</p>
          )}
        </div>

        {transferencia.isError && (
          <Aviso tipo="erro" titulo="Não foi possível transferir o caso.">
            {erroApi?.message ?? "Tente novamente em instantes."}
          </Aviso>
        )}
      </form>
    </Dialogo>
  );
}
