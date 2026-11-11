"use client";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { FolderOpen } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useState } from "react";
import type { PacienteDaLista } from "@clinica/shared";
import { SeloSituacaoCaso } from "@/components/assiduidade/desligamento";
import { NomeDoResponsavel } from "@/components/casos/responsaveis";
import { Aviso } from "@/components/comum/aviso";
import { Campo, classeEntrada } from "@/components/comum/campo";
import { buttonVariants } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useSessao } from "@/lib/sessao";

// Lista de Pacientes da secretaria e da coordenação (RF22): o nome, os responsáveis
// e a situação de cada caso, sem dado clínico (RNF17). O número da inscrição aparece
// só para a coordenação.
export default function PacientesPage() {
  const { data: sessao } = useSessao();
  const permitido =
    sessao?.perfil === "secretaria" || sessao?.perfil === "coordenacao";
  const coordenacao = sessao?.perfil === "coordenacao";
  const [busca, setBusca] = useState("");
  const termo = useDeferredValue(busca.trim());

  const lista = useQuery({
    queryKey: ["pacientes", termo],
    queryFn: () =>
      api<PacienteDaLista[]>(
        `/pacientes${termo ? `?busca=${encodeURIComponent(termo)}` : ""}`,
      ),
    enabled: permitido,
    placeholderData: keepPreviousData,
  });

  if (sessao && !permitido) {
    return (
      <Aviso
        tipo="erro"
        titulo="Acesso restrito à secretaria e à coordenação."
      />
    );
  }

  const abrir = (paciente: PacienteDaLista, largo = false) => (
    <Link
      href={`/pacientes/${paciente.casoId}`}
      aria-label={`Abrir ficha de ${paciente.nome}`}
      className={buttonVariants({
        variant: largo ? "outline" : "ghost",
        className: largo ? "w-full" : undefined,
      })}
    >
      Abrir ficha
    </Link>
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="ui-titulo">Pacientes</h1>
        <p className="ui-subtitulo">
          Estagiário e supervisor responsáveis por cada caso.
        </p>
      </div>

      <Campo rotulo="Buscar paciente" dica="Digite parte do nome.">
        {(props) => (
          <input
            {...props}
            type="search"
            autoComplete="off"
            className={classeEntrada}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        )}
      </Campo>

      {lista.isPending && permitido && (
        <p role="status">Carregando pacientes…</p>
      )}
      {lista.isError && (
        <Aviso tipo="erro" titulo="Não foi possível carregar os pacientes." />
      )}
      {lista.data && lista.data.length === 0 && (
        <div className="ui-painel">
          <div className="ui-vazio">
            <span aria-hidden className="ui-vazio-icone">
              <FolderOpen className="size-7" />
            </span>
            <h2 className="ui-h2" role="status">
              {termo
                ? "Nenhum paciente encontrado."
                : "Ainda não há pacientes."}
            </h2>
            <p className="ui-subtitulo m-0 max-w-[460px]">
              {termo
                ? "Confira o nome digitado ou busque por outra parte dele."
                : "Os pacientes aparecem aqui depois da triagem."}
            </p>
          </div>
        </div>
      )}
      {lista.data && lista.data.length > 0 && (
        <>
          <div className="ui-painel max-md:hidden">
            <table className="ui-tabela">
              <caption className="sr-only">Pacientes e responsáveis</caption>
              <thead>
                <tr>
                  {coordenacao && <th scope="col">Nº da inscrição</th>}
                  <th scope="col">Paciente</th>
                  <th scope="col">Estagiário</th>
                  <th scope="col">Supervisor</th>
                  <th scope="col">Situação</th>
                  <th scope="col">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {lista.data.map((paciente) => (
                  <tr key={paciente.casoId}>
                    {coordenacao && (
                      <td className="ui-numero">{paciente.numero}</td>
                    )}
                    <td className="font-semibold">{paciente.nome}</td>
                    <td>
                      <NomeDoResponsavel nome={paciente.estagiario} />
                    </td>
                    <td>
                      <NomeDoResponsavel nome={paciente.supervisor} />
                    </td>
                    <td>
                      <SeloSituacaoCaso situacao={paciente.situacao} />
                    </td>
                    <td className="text-right">{abrir(paciente)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="ui-lista-celular md:hidden">
            {lista.data.map((paciente) => (
              <li key={paciente.casoId} className="ui-item-celular">
                {coordenacao && (
                  <span className="ui-numero">{paciente.numero}</span>
                )}
                <p className="text-[17px] font-semibold">{paciente.nome}</p>
                <p className="text-sm">
                  Estagiário: <NomeDoResponsavel nome={paciente.estagiario} />
                </p>
                <p className="text-sm">
                  Supervisor: <NomeDoResponsavel nome={paciente.supervisor} />
                </p>
                <div>
                  <SeloSituacaoCaso situacao={paciente.situacao} />
                </div>
                {abrir(paciente, true)}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
