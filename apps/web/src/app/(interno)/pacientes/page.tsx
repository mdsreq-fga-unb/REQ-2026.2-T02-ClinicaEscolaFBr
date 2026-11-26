"use client";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { FolderOpen } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import {
  SITUACOES_DISTRIBUICAO,
  situacaoDistribuicao,
  type ListaDePacientes,
  type PacienteDaLista,
  type SituacaoDistribuicao,
} from "@clinica/shared";
import {
  NOMES_SITUACAO_DISTRIBUICAO,
  NomeDoResponsavel,
  SeloDistribuicao,
} from "@/components/casos/responsaveis";
import { Aviso } from "@/components/comum/aviso";
import { Campo, classeEntrada } from "@/components/comum/campo";
import { ConsultaSituacaoPelaSecretaria } from "@/components/fila/consulta-secretaria";
import { Button, buttonVariants } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useValorAtrasado } from "@/lib/atraso";
import { useSessao } from "@/lib/sessao";
import { cn } from "@/lib/utils";

// Quantos pacientes a página mostra, dentro do total com os filtros.
function contagem(lista: ListaDePacientes, filtrando: boolean) {
  const n = lista.pacientes.length;
  if (n === 0) return filtrando ? "Nenhum paciente encontrado." : "";
  const inicio = (lista.pagina - 1) * lista.tamanhoPagina + 1;
  const fim = inicio + n - 1;
  const total = `${lista.total} ${lista.total === 1 ? "paciente" : "pacientes"}`;
  return lista.total > n
    ? `Mostrando ${inicio} a ${fim} de ${total}.`
    : `Mostrando ${total}.`;
}

type Filtros = {
  busca: string;
  numero: string;
  estagiario: string;
  supervisor: string;
  situacao: "" | SituacaoDistribuicao;
};
const SEM_FILTROS: Filtros = {
  busca: "",
  numero: "",
  estagiario: "",
  supervisor: "",
  situacao: "",
};

// Lista de Pacientes da secretaria e da coordenação (RF22, prancha 2-3): o nome, os
// responsáveis e a situação de distribuição de cada caso, sem dado clínico
// (RNF17). O número da inscrição aparece só para a coordenação. A secretaria
// também consulta aqui a situação de uma inscrição pelo número (RF8).
export default function PacientesPage() {
  const { data: sessao } = useSessao();
  const permitido =
    sessao?.perfil === "secretaria" || sessao?.perfil === "coordenacao";
  const coordenacao = sessao?.perfil === "coordenacao";
  const [filtros, setFiltros] = useState<Filtros>(SEM_FILTROS);
  const [pagina, setPagina] = useState(1);
  const topoDaLista = useRef<HTMLDivElement>(null);
  // Consulta a API quando a pessoa para de digitar, e não a cada letra.
  const atrasados = useValorAtrasado(filtros, 300);
  const consulta = new URLSearchParams();
  for (const [nome, valor] of Object.entries(atrasados))
    if (valor.trim()) consulta.set(nome, valor.trim());
  const filtrando = consulta.size > 0;
  if (pagina > 1) consulta.set("pagina", String(pagina));
  const mudarFiltro = (nome: keyof Filtros, valor: string) => {
    setFiltros((antes) => ({ ...antes, [nome]: valor }));
    setPagina(1);
  };

  const lista = useQuery({
    queryKey: ["pacientes", consulta.toString()],
    queryFn: () =>
      api<ListaDePacientes>(`/pacientes${consulta.size ? `?${consulta}` : ""}`),
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
  const texto = lista.data ? contagem(lista.data, filtrando) : "";
  const paginas = lista.data
    ? Math.max(1, Math.ceil(lista.data.total / lista.data.tamanhoPagina))
    : 1;
  const irPara = (proxima: number) => {
    setPagina(proxima);
    topoDaLista.current?.scrollIntoView?.({ block: "start" });
    topoDaLista.current?.focus();
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="ui-titulo">Pacientes</h1>
        <p className="ui-subtitulo">
          Consulte quem é o estagiário e o supervisor responsáveis por cada
          caso.
        </p>
      </div>

      <div
        className={cn(
          "grid gap-4",
          sessao?.perfil === "secretaria" &&
            "xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]",
        )}
      >
        <section
          aria-labelledby="titulo-filtros"
          className="ui-painel space-y-4 p-4 sm:p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="titulo-filtros" className="ui-h2">
              Buscar e filtrar
            </h2>
            {Object.values(filtros).some(Boolean) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setFiltros(SEM_FILTROS);
                  setPagina(1);
                }}
              >
                Limpar filtros
              </Button>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo rotulo="Paciente" dica="Busca pelo nome do paciente.">
              {(props) => (
                <input
                  {...props}
                  type="search"
                  autoComplete="off"
                  placeholder="Digite o nome do paciente"
                  className={classeEntrada}
                  value={filtros.busca}
                  maxLength={120}
                  onChange={(e) => mudarFiltro("busca", e.target.value)}
                />
              )}
            </Campo>
            {coordenacao && (
              <Campo rotulo="Nº da inscrição" dica="Exemplo: 2026-00375.">
                {(props) => (
                  <input
                    {...props}
                    type="search"
                    autoComplete="off"
                    inputMode="numeric"
                    className={classeEntrada}
                    value={filtros.numero}
                    maxLength={20}
                    onChange={(e) => mudarFiltro("numero", e.target.value)}
                  />
                )}
              </Campo>
            )}
            <Campo
              rotulo="Estagiário responsável"
              dica="Busca pelo nome do estagiário."
            >
              {(props) => (
                <input
                  {...props}
                  type="search"
                  autoComplete="off"
                  placeholder="Nome do estagiário"
                  className={classeEntrada}
                  value={filtros.estagiario}
                  maxLength={120}
                  onChange={(e) => mudarFiltro("estagiario", e.target.value)}
                />
              )}
            </Campo>
            <Campo
              rotulo="Supervisor responsável"
              dica="Busca pelo nome do supervisor."
            >
              {(props) => (
                <input
                  {...props}
                  type="search"
                  autoComplete="off"
                  placeholder="Nome do supervisor"
                  className={classeEntrada}
                  value={filtros.supervisor}
                  maxLength={120}
                  onChange={(e) => mudarFiltro("supervisor", e.target.value)}
                />
              )}
            </Campo>
            <Campo
              rotulo="Situação de distribuição"
              dica="Como na coluna da tabela."
            >
              {(props) => (
                <select
                  {...props}
                  className={classeEntrada}
                  value={filtros.situacao}
                  onChange={(e) => mudarFiltro("situacao", e.target.value)}
                >
                  <option value="">Todas</option>
                  {SITUACOES_DISTRIBUICAO.map((s) => (
                    <option key={s} value={s}>
                      {NOMES_SITUACAO_DISTRIBUICAO[s]}
                    </option>
                  ))}
                </select>
              )}
            </Campo>
          </div>
        </section>
        {/* A consulta da situação pelo número fica junto da busca (RF8): a
            secretaria não vê o número na lista (RNF17). */}
        {sessao?.perfil === "secretaria" && <ConsultaSituacaoPelaSecretaria />}
      </div>

      <div className="ui-painel" ref={topoDaLista} tabIndex={-1}>
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
              {filtrando
                ? "Nenhum paciente encontrado."
                : "Ainda não há pacientes."}
            </h2>
            <p className="ui-subtitulo m-0 max-w-[460px]">
              {filtrando
                ? "Confira o que foi digitado ou limpe os filtros."
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

      {lista.data && paginas > 1 && (
        <nav
          aria-label="Páginas da lista de pacientes"
          className="flex flex-wrap items-center gap-3"
        >
          <Button
            variant="outline"
            disabled={pagina <= 1 || lista.isFetching}
            onClick={() => irPara(pagina - 1)}
          >
            Anterior
          </Button>
          <span>
            Página {pagina} de {paginas}
          </span>
          <Button
            variant="outline"
            disabled={pagina >= paginas || lista.isFetching}
            onClick={() => irPara(pagina + 1)}
          >
            Próxima
          </Button>
        </nav>
      )}

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
    </div>
  );
}
