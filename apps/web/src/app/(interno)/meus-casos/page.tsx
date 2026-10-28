"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import type {
  CasoDoSupervisor,
  EstagiarioDisponivel,
  ResultadoVinculo,
} from "@clinica/shared";
import { Aviso } from "@/components/comum/aviso";
import { Dialogo } from "@/components/comum/dialogo";
import { Prioridade } from "@/components/casos/prioridade";
import { Button, buttonVariants } from "@/components/ui/button";
import { api, ErroApi } from "@/lib/api";
import { useSessao } from "@/lib/sessao";

const pacientes = (n: number) =>
  n === 0
    ? "Nenhum paciente em atendimento"
    : `${n} ${n === 1 ? "paciente" : "pacientes"} em atendimento`;

// Vínculo do estagiário responsável pelo supervisor do caso (RF21). Só aparecem
// estagiários com conta ativa, e o prontuário do caso nasce junto (RF66).
function VincularEstagiario({
  caso,
  aoConcluir,
  aoFechar,
}: {
  caso: CasoDoSupervisor;
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

  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault();
        if (escolhido) vinculo.mutate(escolhido);
      }}
      className="space-y-4"
    >
      <p className="rounded-md bg-muted p-3 text-sm">
        <span className="font-semibold">
          {caso.numero} · {caso.nome}
        </span>
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
        <>
          <fieldset>
            <legend className="text-sm font-semibold">Estagiário ativo</legend>
            <div className="mt-2 space-y-2">
              {lista.map((e) => (
                <label
                  key={e.id}
                  className="flex cursor-pointer items-start gap-3 rounded-md border border-input px-3 py-2 text-sm has-checked:border-primary has-checked:bg-accent"
                >
                  <input
                    type="radio"
                    name="estagiario"
                    value={e.id}
                    className="mt-1"
                    checked={escolhido === e.id}
                    onChange={() => setEscolhido(e.id)}
                  />
                  <span>
                    <span className="block font-semibold">{e.nome}</span>
                    <span className="text-xs text-muted-foreground">
                      {pacientes(e.pacientesEmAtendimento)}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <p className="text-xs text-muted-foreground">
            Ao confirmar, o prontuário do caso é criado e o estagiário passa a
            ser o responsável pelo atendimento.
          </p>
        </>
      )}
      {erro && (
        <Aviso tipo="erro" titulo="Não foi possível vincular o estagiário.">
          {[403, 409, 422].includes(erro.status)
            ? erro.message
            : "Tente novamente em instantes."}
        </Aviso>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={aoFechar}>
          {lista.length === 0 ? "Fechar" : "Cancelar"}
        </Button>
        {lista.length > 0 && (
          <Button type="submit" disabled={!escolhido || vinculo.isPending}>
            Confirmar vínculo
          </Button>
        )}
      </div>
    </form>
  );
}

// Casos sob a supervisão de quem está na sessão, com o vínculo do estagiário (RF21).
export default function MeusCasosPage() {
  const { data: sessao } = useSessao();
  const cliente = useQueryClient();
  const [aberto, setAberto] = useState<CasoDoSupervisor | null>(null);
  const [mensagem, setMensagem] = useState<ResultadoVinculo | null>(null);
  const supervisor = sessao?.perfil === "supervisor";

  const lista = useQuery({
    queryKey: ["casos", "meus"],
    queryFn: () => api<CasoDoSupervisor[]>("/casos/meus"),
    enabled: supervisor,
  });

  if (sessao && !supervisor) {
    return <Aviso tipo="erro" titulo="Acesso restrito aos supervisores." />;
  }

  const acao = (caso: CasoDoSupervisor) =>
    caso.prontuarioId ? (
      <Link
        href={`/prontuarios/${caso.prontuarioId}`}
        aria-label={`Abrir prontuário de ${caso.nome}`}
        className={buttonVariants({ variant: "outline" })}
      >
        Abrir prontuário
      </Link>
    ) : (
      <Button
        aria-label={`Vincular estagiário a ${caso.nome}`}
        onClick={() => {
          setMensagem(null);
          setAberto(caso);
        }}
      >
        Vincular estagiário
      </Button>
    );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-marca">Meus casos</h1>
        <p className="text-sm text-muted-foreground">
          Casos sob a sua supervisão.
        </p>
      </div>

      {mensagem && (
        <Aviso
          tipo="sucesso"
          titulo={`${mensagem.estagiario} agora é responsável pelo caso ${mensagem.numero}.`}
        >
          O prontuário do caso foi criado.
        </Aviso>
      )}

      {lista.isPending && supervisor && <p role="status">Carregando casos…</p>}
      {lista.isError && (
        <Aviso tipo="erro" titulo="Não foi possível carregar os casos." />
      )}
      {lista.data && lista.data.length === 0 && (
        <Aviso tipo="info" titulo="Nenhum caso sob a sua supervisão.">
          Os casos aparecem aqui depois que a coordenação os distribui a você.
        </Aviso>
      )}
      {lista.data && lista.data.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="hidden w-full text-sm md:table">
            <caption className="sr-only">Casos sob a sua supervisão</caption>
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Nº da inscrição
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Paciente
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Prioridade clínica
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Estagiário
                </th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {lista.data.map((caso) => (
                <tr key={caso.casoId} className="border-t border-border">
                  <td className="px-4 py-3 font-semibold">{caso.numero}</td>
                  <td className="px-4 py-3">{caso.nome}</td>
                  <td className="px-4 py-3">
                    {caso.prioridade && <Prioridade cor={caso.prioridade} />}
                  </td>
                  <td className="px-4 py-3">
                    {caso.estagiario ?? (
                      <span className="italic text-muted-foreground">
                        Sem estagiário
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">{acao(caso)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="divide-y divide-border md:hidden">
            {lista.data.map((caso) => (
              <li key={caso.casoId} className="space-y-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{caso.numero}</span>
                  {caso.prioridade && <Prioridade cor={caso.prioridade} />}
                </div>
                <p className="font-semibold">{caso.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {caso.estagiario
                    ? `Estagiário: ${caso.estagiario}`
                    : "Sem estagiário"}
                </p>
                <div className="[&>*]:w-full">{acao(caso)}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Dialogo
        aberto={!!aberto}
        aoFechar={() => setAberto(null)}
        titulo="Vincular estagiário"
      >
        {aberto && (
          <VincularEstagiario
            key={aberto.casoId}
            caso={aberto}
            aoFechar={() => setAberto(null)}
            aoConcluir={(resultado) => {
              setAberto(null);
              setMensagem(resultado);
              void cliente.invalidateQueries({ queryKey: ["casos"] });
              void cliente.invalidateQueries({ queryKey: ["estagiarios"] });
            }}
          />
        )}
      </Dialogo>
    </div>
  );
}
