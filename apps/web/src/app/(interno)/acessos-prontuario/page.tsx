"use client";

import { useQuery } from "@tanstack/react-query";
import { LockKeyhole, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  filtroAcessosSchema,
  NOMES_OPERACAO_ACESSO,
  periodoInicialAcessos,
  type FiltroAcessos,
  type ListaAcessosProntuario,
  type OperacaoAcesso,
} from "@clinica/shared";
import { Aviso } from "@/components/comum/aviso";
import { Campo, classeEntrada } from "@/components/comum/campo";
import { Button } from "@/components/ui/button";
import { api, ErroApi } from "@/lib/api";
import { dataHoraBr } from "@/lib/formato";
import { NOMES_PERFIL, useSessao } from "@/lib/sessao";

function Operacao({ tipo }: { tipo: OperacaoAcesso }) {
  return (
    <span
      className={`ui-selo ${tipo === "acesso_negado" ? "bg-erro-fundo text-destructive" : "bg-muted text-foreground"}`}
    >
      {tipo === "acesso_negado" && <X aria-hidden className="size-4" />}
      {NOMES_OPERACAO_ACESSO[tipo]}
    </span>
  );
}

export default function AcessosProntuarioPage() {
  const { data: sessao } = useSessao();
  const permitido = sessao?.perfil === "coordenacao";
  const [campos, setCampos] = useState(() => ({
    paciente: "",
    usuario: "",
    operacao: "",
    ...periodoInicialAcessos(),
  }));
  const [filtro, setFiltro] = useState<FiltroAcessos>(() => ({
    ...campos,
    operacao: undefined,
    pagina: 1,
  }));
  const [erros, setErros] = useState<Record<string, string>>({});
  const resultado = useRef<HTMLParagraphElement>(null);
  const focarResultado = useRef(false);
  const lista = useQuery({
    queryKey: ["acessos-prontuario", sessao?.id, filtro],
    queryFn: () => {
      const params = new URLSearchParams();
      for (const [chave, valor] of Object.entries(filtro))
        if (valor) params.set(chave, String(valor));
      return api<ListaAcessosProntuario>(`/acessos-prontuario?${params}`, {
        cache: "no-store",
      });
    },
    enabled: permitido,
    retry: false,
    gcTime: 0,
  });
  useEffect(() => {
    if (focarResultado.current && !lista.isFetching) {
      resultado.current?.focus();
      focarResultado.current = false;
    }
  }, [lista.isFetching]);

  if (
    (sessao && !permitido) ||
    (lista.error instanceof ErroApi && lista.error.status === 403)
  ) {
    return (
      <section className="ui-painel mx-auto max-w-2xl space-y-3 p-6">
        <LockKeyhole aria-hidden className="size-6 text-primary" />
        <h1 className="ui-titulo">
          Você não tem acesso ao registro de acessos
        </h1>
        <p>Esta consulta é exclusiva do perfil de coordenação.</p>
      </section>
    );
  }
  if (!sessao) return <p role="status">Carregando sessão…</p>;

  const dados = lista.isSuccess ? lista.data : undefined;
  const pagina = dados?.pagina ?? filtro.pagina;
  const paginas = dados
    ? Math.max(1, Math.ceil(dados.total / dados.tamanhoPagina))
    : 1;
  const mensagem = lista.isFetching
    ? "Carregando acessos…"
    : dados
      ? `${dados.total} ${dados.total === 1 ? "acesso encontrado" : "acessos encontrados"}. Página ${pagina} de ${paginas}.`
      : "Não foi possível carregar os acessos.";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="ui-titulo">Registro de acessos ao prontuário</h1>
        <p className="ui-subtitulo">
          Mostra quem acessou e quando, sem o conteúdo acessado.
        </p>
      </div>
      <form
        noValidate
        className="ui-painel grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-[1.3fr_1.1fr_1fr_1fr_1fr_auto] lg:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          const validacao = filtroAcessosSchema.safeParse({
            ...campos,
            inicio: campos.inicio || undefined,
            fim: campos.fim || undefined,
            operacao: campos.operacao || undefined,
            pagina: 1,
          });
          if (!validacao.success) {
            const mensagens: Record<string, string> = {};
            for (const erro of validacao.error.issues)
              mensagens[String(erro.path[0])] ??= erro.message;
            setErros(mensagens);
            (
              event.currentTarget.elements.namedItem(
                Object.keys(mensagens)[0],
              ) as HTMLInputElement
            )?.focus();
            return;
          }
          setErros({});
          focarResultado.current = true;
          // Reaplicar os mesmos filtros também atualiza o registro.
          if (JSON.stringify(validacao.data) === JSON.stringify(filtro))
            void lista.refetch();
          else setFiltro(validacao.data);
        }}
      >
        {(
          [
            ["paciente", "Paciente"],
            ["usuario", "Usuário"],
            ["inicio", "Data inicial"],
            ["fim", "Data final"],
          ] as const
        ).map(([chave, rotulo]) => (
          <Campo key={chave} rotulo={rotulo} erro={erros[chave]}>
            {(props) => (
              <input
                {...props}
                name={chave}
                type={chave === "inicio" || chave === "fim" ? "date" : "search"}
                autoComplete="off"
                maxLength={150}
                className={classeEntrada}
                value={campos[chave]}
                onChange={(event) =>
                  setCampos({ ...campos, [chave]: event.target.value })
                }
              />
            )}
          </Campo>
        ))}
        <Campo rotulo="Operação" erro={erros.operacao}>
          {(props) => (
            <select
              {...props}
              name="operacao"
              className={classeEntrada}
              value={campos.operacao}
              onChange={(event) =>
                setCampos({ ...campos, operacao: event.target.value })
              }
            >
              <option value="">Todas</option>
              {(
                Object.entries(NOMES_OPERACAO_ACESSO) as [
                  OperacaoAcesso,
                  string,
                ][]
              ).map(([valor, nome]) => (
                <option key={valor} value={valor}>
                  {nome}
                </option>
              ))}
            </select>
          )}
        </Campo>
        <Button type="submit" disabled={lista.isFetching}>
          Filtrar
        </Button>
      </form>
      <p className="ui-dica">
        Paciente e usuário: busque pelo nome ou parte dele. Datas e horários de
        Brasília. As operações de criação e alteração indicam tentativas
        autorizadas; o resultado da operação fica na auditoria geral. Tentativas
        sem paciente identificado aparecem somente quando o filtro de paciente
        está vazio.
      </p>
      <p role="status" ref={resultado} tabIndex={-1} className="ui-meta">
        {mensagem}
      </p>
      {lista.isError && (
        <Aviso
          tipo="erro"
          titulo={
            lista.error instanceof ErroApi && lista.error.status === 401
              ? "Sessão encerrada. Entre novamente para consultar."
              : "Não foi possível carregar os acessos."
          }
        >
          <Button
            variant="outline"
            onClick={() => {
              focarResultado.current = true;
              void lista.refetch();
            }}
          >
            Tentar novamente
          </Button>
        </Aviso>
      )}
      {dados && dados.acessos.length === 0 && (
        <div className="ui-painel space-y-3 p-6">
          <h2 className="ui-h2">Nenhum acesso encontrado</h2>
          <p>Não há acessos registrados com estes filtros.</p>
        </div>
      )}
      {dados && dados.acessos.length > 0 && (
        <div className="ui-painel p-4 sm:p-5">
          <table className="ui-tabela max-lg:hidden">
            <caption className="sr-only">
              Registro de acessos ao prontuário
            </caption>
            <thead>
              <tr>
                {[
                  "Data e hora",
                  "Usuário",
                  "Perfil",
                  "Paciente",
                  "Operação",
                ].map((titulo) => (
                  <th key={titulo} scope="col">
                    {titulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dados.acessos.map((acesso) => (
                <tr key={acesso.id}>
                  <td>
                    <time dateTime={acesso.dataHora}>
                      {dataHoraBr(acesso.dataHora)}
                    </time>
                  </td>
                  <td className="break-words">{acesso.usuario}</td>
                  <td>{NOMES_PERFIL[acesso.perfil]}</td>
                  <td className="break-words">{acesso.paciente ?? "—"}</td>
                  <td>
                    <Operacao tipo={acesso.operacao} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul
            className="divide-y divide-border lg:hidden"
            aria-label="Acessos ao prontuário"
          >
            {dados.acessos.map((acesso) => (
              <li
                key={acesso.id}
                className="space-y-2 py-4 first:pt-0 last:pb-0"
              >
                <p className="break-words font-semibold">{acesso.usuario}</p>
                <p className="ui-meta">
                  {NOMES_PERFIL[acesso.perfil]} ·{" "}
                  <time dateTime={acesso.dataHora}>
                    {dataHoraBr(acesso.dataHora)}
                  </time>
                </p>
                <p className="break-words">
                  Paciente: {acesso.paciente ?? "—"}
                </p>
                <Operacao tipo={acesso.operacao} />
              </li>
            ))}
          </ul>
        </div>
      )}
      {dados && paginas > 1 && (
        <nav
          aria-label="Páginas do registro de acessos"
          className="flex flex-wrap items-center gap-3"
        >
          <Button
            variant="outline"
            disabled={pagina <= 1 || lista.isFetching}
            onClick={() => {
              focarResultado.current = true;
              setFiltro({ ...filtro, pagina: pagina - 1 });
            }}
          >
            Anterior
          </Button>
          <span>
            Página {pagina} de {paginas}
          </span>
          <Button
            variant="outline"
            disabled={pagina >= paginas || lista.isFetching}
            onClick={() => {
              focarResultado.current = true;
              setFiltro({ ...filtro, pagina: pagina + 1 });
            }}
          >
            Próxima
          </Button>
        </nav>
      )}
    </div>
  );
}
