"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderOpen } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type {
  CasoDoSupervisor,
  ResultadoVinculo,
  VagaLiberada,
} from "@clinica/shared";
import {
  CartaoVagaLiberada,
  SeloSituacaoCaso,
} from "@/components/assiduidade/desligamento";
import { Aviso } from "@/components/comum/aviso";
import { Prioridade } from "@/components/casos/prioridade";
import { DialogoVincular } from "@/components/casos/vincular";
import { Button, buttonVariants } from "@/components/ui/button";
import { api } from "@/lib/api";
import { dataBr } from "@/lib/formato";
import { useSessao } from "@/lib/sessao";

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
  // Vagas liberadas por desligamento nos casos que o supervisor acompanhava (RF37).
  const vagas = useQuery({
    queryKey: ["vagas", "liberadas"],
    queryFn: () => api<VagaLiberada[]>("/vagas/liberadas"),
    enabled: supervisor,
  });

  if (sessao && !supervisor) {
    return <Aviso tipo="erro" titulo="Acesso restrito aos supervisores." />;
  }

  // No computador, "Abrir prontuário" é um botão discreto; no celular, ocupa a
  // largura do cartão, como no protótipo.
  // O caso que aguarda vínculo, ou que aguarda vaga depois da reversão (RF38),
  // recebe o estagiário; os outros abrem o prontuário.
  const vincula = (caso: CasoDoSupervisor) =>
    !caso.estagiario &&
    (caso.situacao === "aguardando_vinculo" ||
      caso.situacao === "aguardando_vaga");
  const acao = (caso: CasoDoSupervisor, largo = false) =>
    !vincula(caso) && caso.prontuarioId ? (
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

  // O nome abre a ficha do paciente, com os responsáveis pelo caso (RF22).
  const ficha = (caso: CasoDoSupervisor) => (
    <Link
      href={`/pacientes/${caso.casoId}`}
      className="text-primary underline underline-offset-2"
    >
      {caso.nome}
    </Link>
  );

  const semEstagiario = (
    <span className="text-muted-foreground italic">Sem estagiário</span>
  );
  const estagiarioDo = (caso: CasoDoSupervisor) =>
    caso.estagiario ??
    (caso.vinculoEncerradoEm ? (
      <span className="text-muted-foreground">
        Vínculo encerrado em {dataBr(caso.vinculoEncerradoEm)}
      </span>
    ) : (
      semEstagiario
    ));

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

      {vagas.data?.map((vaga) => (
        <CartaoVagaLiberada key={vaga.id} vaga={vaga} supervisor />
      ))}

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
                  <th scope="col">Situação</th>
                  <th scope="col">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {lista.data.map((caso) => (
                  <tr key={caso.casoId}>
                    <td className="ui-numero">{caso.numero}</td>
                    <td className="font-semibold">{ficha(caso)}</td>
                    <td>
                      {caso.prioridade && <Prioridade cor={caso.prioridade} />}
                    </td>
                    <td>{estagiarioDo(caso)}</td>
                    <td>
                      <SeloSituacaoCaso situacao={caso.situacao} />
                    </td>
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
                <p className="text-[17px] font-semibold">{ficha(caso)}</p>
                <p className="text-sm text-muted-foreground">
                  {caso.estagiario
                    ? `Estagiário: ${caso.estagiario}`
                    : estagiarioDo(caso)}
                </p>
                <div>
                  <SeloSituacaoCaso situacao={caso.situacao} />
                </div>
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
            void cliente.invalidateQueries({ queryKey: ["vagas"] });
          }}
        />
      )}
    </div>
  );
}
