"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderOpen } from "lucide-react";
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
function DialogoVincular({
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

  // No computador, "Abrir prontuário" é um botão discreto; no celular, ocupa a
  // largura do cartão, como no protótipo.
  const acao = (caso: CasoDoSupervisor, largo = false) =>
    caso.prontuarioId ? (
      <Link
        href={`/prontuarios/${caso.prontuarioId}`}
        aria-label={`Abrir prontuário de ${caso.nome}`}
        className={buttonVariants({
          variant: largo ? "outline" : "ghost",
          className: largo ? "w-full" : undefined,
        })}
      >
        Abrir prontuário
      </Link>
    ) : (
      <Button
        aria-label={`Vincular estagiário a ${caso.nome}`}
        className={largo ? "w-full" : undefined}
        onClick={() => {
          setMensagem(null);
          setAberto(caso);
        }}
      >
        Vincular estagiário
      </Button>
    );

  const semEstagiario = (
    <span className="text-muted-foreground italic">Sem estagiário</span>
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="ui-titulo">Meus casos</h1>
        <p className="ui-subtitulo">Casos sob a sua supervisão.</p>
      </div>

      {mensagem && (
        <Aviso
          tipo="sucesso"
          focar
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
        <div className="ui-painel">
          <div className="ui-vazio">
            <span aria-hidden className="ui-vazio-icone">
              <FolderOpen className="size-7" />
            </span>
            <h2 className="ui-h2">Nenhum caso sob a sua supervisão.</h2>
            <p className="ui-subtitulo m-0 max-w-[460px]">
              Os casos aparecem aqui depois que a coordenação os distribui a
              você.
            </p>
          </div>
        </div>
      )}
      {lista.data && lista.data.length > 0 && (
        <>
          <div className="ui-painel max-md:hidden">
            <table className="ui-tabela">
              <caption className="sr-only">Casos sob a sua supervisão</caption>
              <thead>
                <tr>
                  <th scope="col">Nº da inscrição</th>
                  <th scope="col">Paciente</th>
                  <th scope="col">Prioridade clínica</th>
                  <th scope="col">Estagiário</th>
                  <th scope="col">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {lista.data.map((caso) => (
                  <tr key={caso.casoId}>
                    <td className="ui-numero">{caso.numero}</td>
                    <td className="font-semibold">{caso.nome}</td>
                    <td>
                      {caso.prioridade && <Prioridade cor={caso.prioridade} />}
                    </td>
                    <td>{caso.estagiario ?? semEstagiario}</td>
                    <td className="text-right">{acao(caso)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="ui-lista-celular md:hidden">
            {lista.data.map((caso) => (
              <li key={caso.casoId} className="ui-item-celular">
                <div className="flex items-center justify-between gap-2">
                  <span className="ui-numero">{caso.numero}</span>
                  {caso.prioridade && <Prioridade cor={caso.prioridade} />}
                </div>
                <p className="text-[17px] font-semibold">{caso.nome}</p>
                <p className="text-sm text-muted-foreground">
                  {caso.estagiario
                    ? `Estagiário: ${caso.estagiario}`
                    : semEstagiario}
                </p>
                {acao(caso, true)}
              </li>
            ))}
          </ul>
        </>
      )}

      {aberto && (
        <DialogoVincular
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
    </div>
  );
}
