"use client";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { FolderOpen } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  LIMITE_LISTA_PACIENTES,
  situacaoDistribuicao,
  type ListaDePacientes,
  type PacienteDaLista,
} from "@clinica/shared";
import {
  NomeDoResponsavel,
  SeloDistribuicao,
} from "@/components/casos/responsaveis";
import { Aviso } from "@/components/comum/aviso";
import { Campo, classeEntrada } from "@/components/comum/campo";
import { ConsultaSituacaoPelaSecretaria } from "@/components/fila/consulta-secretaria";
import { buttonVariants } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useValorAtrasado } from "@/lib/atraso";
import { useSessao } from "@/lib/sessao";
import { cn } from "@/lib/utils";

// Quantos pacientes a lista mostra, ou o aviso de que ela foi cortada.
function contagem(lista: ListaDePacientes, termo: string) {
  const n = lista.pacientes.length;
  if (lista.cortada)
    return `Mostrando os ${LIMITE_LISTA_PACIENTES} primeiros. Busque pelo nome para encontrar os demais.`;
  if (n === 0) return termo ? "Nenhum paciente encontrado." : "";
  return `Mostrando ${n} ${n === 1 ? "paciente" : "pacientes"}.`;
}

// Lista de Pacientes da secretaria e da coordenação (RF22, prancha 2-3): o nome, os
// responsáveis e a situação de distribuição de cada caso, sem dado clínico
// (RNF17). O número da inscrição aparece só para a coordenação. A secretaria
// também consulta aqui a situação de uma inscrição pelo número (RF8).
export default function PacientesPage() {
  const { data: sessao } = useSessao();
  const permitido =
    sessao?.perfil === "secretaria" || sessao?.perfil === "coordenacao";
  const coordenacao = sessao?.perfil === "coordenacao";
  const [busca, setBusca] = useState("");
  // Consulta a API quando a pessoa para de digitar, e não a cada letra.
  const termo = useValorAtrasado(busca.trim(), 300);

  const lista = useQuery({
    queryKey: ["pacientes", termo],
    queryFn: () =>
      api<ListaDePacientes>(
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

  const verFicha = (paciente: PacienteDaLista, largo = false) => (
    <Link
      href={`/pacientes/${paciente.casoId}`}
      aria-label={`Ver ficha de ${paciente.nome}`}
      className={buttonVariants({
        variant: largo ? "outline" : "ghost",
        className: largo ? "w-full" : undefined,
      })}
    >
      Ver ficha
    </Link>
  );
  const pacientes = lista.data?.pacientes;
  const texto = lista.data ? contagem(lista.data, termo) : "";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="ui-titulo">Pacientes</h1>
        <p className="ui-subtitulo">
          Consulte quem é o estagiário e o supervisor responsáveis por cada
          caso.
        </p>
      </div>

      <div className="ui-painel">
        <div className="border-b border-border p-4 sm:px-5">
          <Campo
            rotulo="Buscar paciente"
            dica="Busca pelo nome do paciente."
            className="max-w-[520px]"
          >
            {(props) => (
              <input
                {...props}
                type="search"
                autoComplete="off"
                placeholder="Digite o nome do paciente"
                className={classeEntrada}
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            )}
          </Campo>
        </div>

        {lista.isPending && permitido && (
          <p role="status" className="p-5">
            Carregando pacientes…
          </p>
        )}
        {lista.isError && (
          <div className="p-4">
            <Aviso
              tipo="erro"
              titulo="Não foi possível carregar os pacientes."
            />
          </div>
        )}
        {pacientes && pacientes.length === 0 && (
          <div className="ui-vazio">
            <span aria-hidden className="ui-vazio-icone">
              <FolderOpen className="size-7" />
            </span>
            <h2 className="ui-h2">
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
        )}
        {/* Tabela só a partir de 1024 px: com o menu, em 768 px as colunas da
            coordenação não cabem, e a lista vira cartões, como no celular. */}
        {pacientes && pacientes.length > 0 && (
          <>
            <table className="ui-tabela max-lg:hidden">
              <caption className="sr-only">Pacientes e responsáveis</caption>
              <thead>
                <tr>
                  {coordenacao && <th scope="col">Nº da inscrição</th>}
                  <th scope="col">Paciente</th>
                  <th scope="col">Estagiário responsável</th>
                  <th scope="col">Supervisor responsável</th>
                  <th scope="col">Situação de distribuição</th>
                  <th scope="col">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pacientes.map((paciente) => (
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
                      <SeloDistribuicao
                        situacao={situacaoDistribuicao(paciente)}
                      />
                    </td>
                    <td className="text-right">{verFicha(paciente)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="ui-lista-celular p-3 lg:hidden">
              {pacientes.map((paciente) => (
                <li key={paciente.casoId} className="ui-item-celular">
                  {coordenacao && (
                    <span className="ui-numero">{paciente.numero}</span>
                  )}
                  <p className="text-[17px] font-semibold">{paciente.nome}</p>
                  <dl className="grid gap-1 text-sm">
                    <div>
                      <dt className="inline text-muted-foreground">
                        Estagiário responsável:{" "}
                      </dt>
                      <dd className="inline">
                        <NomeDoResponsavel nome={paciente.estagiario} />
                      </dd>
                    </div>
                    <div>
                      <dt className="inline text-muted-foreground">
                        Supervisor responsável:{" "}
                      </dt>
                      <dd className="inline">
                        <NomeDoResponsavel nome={paciente.supervisor} />
                      </dd>
                    </div>
                  </dl>
                  <div>
                    <SeloDistribuicao
                      situacao={situacaoDistribuicao(paciente)}
                    />
                  </div>
                  {verFicha(paciente, true)}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* A contagem é anunciada a cada busca, sem tirar o foco do campo. Na lista
          vazia, o texto já está no estado vazio e fica só para o leitor de tela. */}
      <p
        role="status"
        className={cn(
          "ui-dica",
          (!texto || pacientes?.length === 0) && "sr-only",
        )}
      >
        {texto}
      </p>

      {sessao?.perfil === "secretaria" && <ConsultaSituacaoPelaSecretaria />}
    </div>
  );
}
