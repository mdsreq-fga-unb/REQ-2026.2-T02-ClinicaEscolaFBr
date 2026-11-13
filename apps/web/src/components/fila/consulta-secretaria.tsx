"use client";
import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import type { SituacaoInscricao } from "@clinica/shared";
import { Aviso } from "@/components/comum/aviso";
import { Campo, classeEntrada } from "@/components/comum/campo";
import { CartaoSituacao } from "@/components/fila/situacao-inscricao";
import { Button } from "@/components/ui/button";
import { api, ErroApi } from "@/lib/api";

// Consulta presencial da situação da inscrição pela secretaria (RF8): para quem
// precisa de apoio na verificação ou recebeu "procure a secretaria". Fica na
// lista de Pacientes, como previsto no projeto da feature. A resposta não traz a
// posição (DF55) nem a cor da prioridade (RNF17).
export function ConsultaSituacaoPelaSecretaria() {
  const [numero, setNumero] = useState("");
  const consulta = useMutation({
    mutationFn: (n: string) =>
      api<SituacaoInscricao>(
        `/fila/situacao?numero=${encodeURIComponent(n.trim())}`,
        { cache: "no-store" },
      ),
    gcTime: 0,
  });

  function consultar(evento: FormEvent) {
    evento.preventDefault();
    if (!consulta.isPending) consulta.mutate(numero);
  }

  return (
    <section
      aria-labelledby="titulo-consulta-situacao"
      className="ui-painel space-y-4 p-4 sm:p-5"
    >
      <h2 id="titulo-consulta-situacao" className="ui-h2">
        Consultar situação da inscrição
      </h2>
      <form onSubmit={consultar} className="flex flex-col gap-3">
        <Campo
          rotulo="Número da inscrição"
          dica="Confira a identidade da pessoa antes de informar a situação."
          className="max-w-[520px]"
        >
          {(props) => (
            <input
              {...props}
              className={classeEntrada}
              value={numero}
              onChange={(e) => {
                setNumero(e.target.value);
                consulta.reset();
              }}
              placeholder="2026-00001"
              required
              pattern="[0-9]{4}-[0-9]{5,}"
              maxLength={40}
              disabled={consulta.isPending}
            />
          )}
        </Campo>
        <div>
          <Button type="submit" disabled={consulta.isPending}>
            {consulta.isPending ? "Consultando…" : "Consultar situação"}
          </Button>
        </div>
      </form>
      {consulta.isError && (
        <Aviso
          tipo="erro"
          focar
          titulo={
            consulta.error instanceof ErroApi && consulta.error.status === 404
              ? "Inscrição não encontrada. Confira o número informado."
              : "Não foi possível consultar. Tente novamente."
          }
        />
      )}
      {consulta.data && <CartaoSituacao dados={consulta.data} />}
    </section>
  );
}
