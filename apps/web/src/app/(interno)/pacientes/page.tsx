"use client";
import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import type { SituacaoInscricao } from "@clinica/shared";
import { CartaoSituacao } from "@/components/fila/situacao-inscricao";
import { Aviso } from "@/components/comum/aviso";
import { Button } from "@/components/ui/button";
import { api, ErroApi } from "@/lib/api";
import { useSessao } from "@/lib/sessao";
export default function PacientesPage() {
  const { data: usuario } = useSessao();
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
    if (!consulta.isPending && usuario?.perfil === "secretaria")
      consulta.mutate(numero);
  }
  if (!usuario) return <p role="status">Carregando…</p>;
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Pacientes</h1>
      {usuario.perfil !== "secretaria" ? (
        <Aviso tipo="info" titulo="Consulta de situação pela secretaria.">
          A coordenação pode acompanhar a fila pela opção Fila de espera.
        </Aviso>
      ) : (
        <>
          <form
            onSubmit={consultar}
            className="space-y-3 rounded-xl border bg-card p-6"
          >
            <h2 className="text-xl font-semibold">
              Consultar situação da inscrição
            </h2>
            <label htmlFor="numero-inscricao" className="block">
              Número da inscrição
            </label>
            <input
              id="numero-inscricao"
              className="w-full rounded-md border p-3"
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
            <Button type="submit" disabled={consulta.isPending}>
              {consulta.isPending ? "Consultando…" : "Consultar situação"}
            </Button>
          </form>
          {consulta.isError && (
            <Aviso
              tipo="erro"
              focar
              titulo={
                consulta.error instanceof ErroApi &&
                consulta.error.status === 404
                  ? "Inscrição não encontrada. Confira o número informado."
                  : "Não foi possível consultar. Tente novamente."
              }
            />
          )}
          {consulta.data && <CartaoSituacao dados={consulta.data} />}
        </>
      )}
    </div>
  );
}
