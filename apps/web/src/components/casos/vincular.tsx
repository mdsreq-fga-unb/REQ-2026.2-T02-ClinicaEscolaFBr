"use client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type {
  CasoDoSupervisor,
  EstagiarioDisponivel,
  ResultadoVinculo,
} from "@clinica/shared";
import { Aviso } from "@/components/comum/aviso";
import { Dialogo } from "@/components/comum/dialogo";
import { Button } from "@/components/ui/button";
import { api, ErroApi } from "@/lib/api";

// O que o diálogo mostra do caso. A prioridade vem de "Meus casos"; a ficha do
// paciente (RF22) não a traz.
export type CasoParaVincular = Pick<
  CasoDoSupervisor,
  "casoId" | "numero" | "nome"
> & { prioridade?: CasoDoSupervisor["prioridade"] };

const pacientes = (n: number) =>
  n === 0
    ? "Nenhum paciente em atendimento"
    : `${n} ${n === 1 ? "paciente" : "pacientes"} em atendimento`;

// Vínculo do estagiário responsável pelo supervisor do caso (RF21). Só aparecem
// estagiários com conta ativa, e o prontuário do caso nasce junto (RF66).
export function DialogoVincular({
  caso,
  aoConcluir,
  aoFechar,
}: {
  caso: CasoParaVincular;
  aoConcluir: (resultado: ResultadoVinculo) => void;
  aoFechar: () => void;
}) {
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const estagiarios = useQuery({
    queryKey: ["estagiarios", "disponiveis"],
    queryFn: () => api<EstagiarioDisponivel[]>("/estagiarios/disponiveis"),
  });
  const vinculo = useMutation({
    mutationFn: (estagiarioId: string) =>
      api<ResultadoVinculo>(`/casos/${caso.casoId}/estagiario`, {
        method: "POST",
        body: JSON.stringify({ estagiarioId }),
      }),
    onSuccess: aoConcluir,
  });
  const lista = estagiarios.data ?? [];
  const erro = vinculo.error instanceof ErroApi ? vinculo.error : null;
  const formulario = `vincular-${caso.casoId}`;

  return (
    <Dialogo
      aberto
      aoFechar={aoFechar}
      titulo="Vincular estagiário"
      rodape={
        <>
          <Button type="button" variant="outline" onClick={aoFechar}>
            {lista.length === 0 ? "Fechar" : "Cancelar"}
          </Button>
          {lista.length > 0 && (
            <Button
              type="submit"
              form={formulario}
              data-principal
              disabled={!escolhido || vinculo.isPending}
            >
              Confirmar vínculo
            </Button>
          )}
        </>
      }
    >
      <p className="rounded-[12px] border border-border bg-muted px-4 py-3.5 text-[15px]">
        <b>
          {caso.numero} · {caso.nome}
        </b>
        {caso.prioridade && (
          <>
            {" "}
            · Prioridade{" "}
            {caso.prioridade.charAt(0).toUpperCase() + caso.prioridade.slice(1)}
          </>
        )}
      </p>

      {estagiarios.isPending && <p role="status">Carregando estagiários…</p>}
      {estagiarios.isError && (
        <Aviso tipo="erro" titulo="Não foi possível carregar os estagiários." />
      )}
      {estagiarios.data && lista.length === 0 && (
        <Aviso
          tipo="alerta"
          titulo="Não há estagiários disponíveis para vínculo."
        >
          Só estagiários com conta ativa podem ser vinculados. Se alguém da
          equipe ainda não ativou a conta, peça que use o convite ou fale com a
          coordenação.
        </Aviso>
      )}
      {lista.length > 0 && (
        <form
          id={formulario}
          onSubmit={(evento) => {
            evento.preventDefault();
            if (escolhido) vinculo.mutate(escolhido);
          }}
          className="flex flex-col gap-4"
        >
          <fieldset className="flex min-w-0 flex-col gap-2">
            <legend className="ui-rotulo mb-1.5">Estagiário ativo</legend>
            {lista.map((e) => (
              <label key={e.id} className="ui-opcao">
                <input
                  type="radio"
                  name="estagiario"
                  value={e.id}
                  checked={escolhido === e.id}
                  onChange={() => setEscolhido(e.id)}
                />
                <span>
                  <b className="block">{e.nome}</b>
                  <span className="text-sm text-muted-foreground">
                    {pacientes(e.pacientesEmAtendimento)}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
          <p className="ui-dica">
            Ao confirmar, o prontuário do caso é criado e o estagiário passa a
            ser o responsável pelo atendimento.
          </p>
        </form>
      )}
      {erro && (
        <Aviso tipo="erro" titulo="Não foi possível vincular o estagiário.">
          {[403, 409, 422].includes(erro.status)
            ? erro.message
            : "Tente novamente em instantes."}
        </Aviso>
      )}
    </Dialogo>
  );
}
