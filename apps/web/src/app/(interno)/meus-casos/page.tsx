"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderOpen } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type {
  CasoDoSupervisor,
  ResultadoTransferencia,
  ResultadoVinculo,
  VagaLiberada,
} from "@clinica/shared";
import {
  CartaoVagaLiberada,
  SeloSituacaoCaso,
} from "@/components/assiduidade/desligamento";
import { Aviso } from "@/components/comum/aviso";
import { Prioridade } from "@/components/casos/prioridade";
import {
  AvisoTransferencia,
  DialogoTransferir,
} from "@/components/casos/transferir";
import { DialogoVincular } from "@/components/casos/vincular";
import { Button, buttonVariants } from "@/components/ui/button";
import { api } from "@/lib/api";
import { dataBr } from "@/lib/formato";
import { useSessao } from "@/lib/sessao";

const TODOS = "__todos";
const SEM_ESTAGIARIO = "__sem";

// Casos sob a supervisão de quem está na sessão, com o vínculo do estagiário (RF21)
// e o filtro por estagiário (RF23, prancha 4-1).
// Quantos casos ficaram depois do filtro (RF23, RNF24). A região de status fica
// sempre montada e só o texto muda: esvaziado na troca e escrito um pouco depois,
// quando o leitor de tela já terminou de falar a opção marcada. Escrito no mesmo
// instante, o anúncio competia com essa fala e às vezes não era lido, e duas
// opções com a mesma contagem não eram anunciadas de novo.
function AnuncioAtrasado({ chave, texto }: { chave: string; texto: string }) {
  const [falado, setFalado] = useState("");
  useEffect(() => {
    const limpa = setTimeout(() => setFalado(""), 0);
    const fala = setTimeout(() => setFalado(texto), 400);
    return () => {
      clearTimeout(limpa);
      clearTimeout(fala);
    };
  }, [chave, texto]);
  return (
    <p role="status" className="sr-only">
      {falado}
    </p>
  );
}

export default function MeusCasosPage() {
  const { data: sessao } = useSessao();
  const cliente = useQueryClient();
  const [aberto, setAberto] = useState<CasoDoSupervisor | null>(null);
  const [mensagem, setMensagem] = useState<ResultadoVinculo | null>(null);
  // Caso aberto na transferência para outro estagiário (RF25) e o resultado dela.
  const [transferindo, setTransferindo] = useState<CasoDoSupervisor | null>(
    null,
  );
  const [transferido, setTransferido] = useState<ResultadoTransferencia | null>(
    null,
  );
  const supervisor = sessao?.perfil === "supervisor";
  const [filtro, setFiltro] = useState<string>(TODOS);

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
  // O caso em atendimento passa a outro estagiário do supervisor (RF25).
  const transfere = (caso: CasoDoSupervisor) =>
    Boolean(caso.estagiario) && caso.situacao === "em_atendimento";
  const acao = (caso: CasoDoSupervisor, largo = false) => (
    <div
      className={
        largo
          ? "flex flex-col gap-2"
          : "flex flex-wrap items-center justify-end gap-1"
      }
    >
      {acaoPrincipal(caso, largo)}
      {transfere(caso) && (
        <Button
          variant={largo ? "outline" : "ghost"}
          aria-label={`Transferir o caso de ${caso.nome}`}
          className={largo ? "w-full" : undefined}
          onClick={() => {
            setMensagem(null);
            setTransferido(null);
            setTransferindo(caso);
          }}
        >
          Transferir caso
        </Button>
      )}
    </div>
  );
  const acaoPrincipal = (caso: CasoDoSupervisor, largo: boolean) =>
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
          setTransferido(null);
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
  // O caso desligado por faltas (RF37) mostra o último estagiário, e a data do
  // desligamento fica abaixo da situação (prancha 4-1).
  const estagiarioDo = (caso: CasoDoSupervisor) =>
    caso.estagiario ??
    caso.estagiarioAnterior ??
    (caso.vinculoEncerradoEm ? (
      <span className="text-muted-foreground">
        Vínculo encerrado em {dataBr(caso.vinculoEncerradoEm)}
      </span>
    ) : (
      semEstagiario
    ));
  const situacaoDo = (caso: CasoDoSupervisor) => (
    <div className="flex flex-col items-start gap-1">
      <SeloSituacaoCaso situacao={caso.situacao} />
      {caso.vinculoEncerradoEm && (
        <span className="ui-meta">Em {dataBr(caso.vinculoEncerradoEm)}</span>
      )}
    </div>
  );

  // Filtro por estagiário (RF23): os estagiários dos casos da lista, e "Sem
  // estagiário" para os que aguardam o vínculo. A opção é o id do estagiário, e o
  // nome é só o rótulo: dois estagiários com o mesmo nome são duas opções.
  const todos = lista.data ?? [];
  const idDoEstagiario = (caso: CasoDoSupervisor) =>
    caso.estagiarioId ?? caso.estagiarioAnteriorId;
  const opcoes = [
    ...new Map(
      todos.flatMap((c) => {
        const id = idDoEstagiario(c);
        const nome = c.estagiario ?? c.estagiarioAnterior;
        return id && nome ? [[id, nome] as const] : [];
      }),
    ),
  ].sort(([, a], [, b]) => a.localeCompare(b, "pt-BR"));
  const temSemEstagiario = todos.some((c) => !idDoEstagiario(c));
  // Se a opção escolhida sai da lista (o caso foi transferido, por exemplo), volta
  // para "Todos", em vez de deixar uma lista vazia sem opção marcada.
  const escolha =
    filtro === TODOS ||
    (filtro === SEM_ESTAGIARIO && temSemEstagiario) ||
    opcoes.some(([id]) => id === filtro)
      ? filtro
      : TODOS;
  const visiveis = todos.filter((c) =>
    escolha === TODOS
      ? true
      : escolha === SEM_ESTAGIARIO
        ? !idDoEstagiario(c)
        : idDoEstagiario(c) === escolha,
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="ui-titulo">Meus casos</h1>
        <p className="ui-subtitulo">
          Casos sob a sua responsabilidade e os dos seus estagiários.
        </p>
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

      {transferido && <AvisoTransferencia resultado={transferido} />}

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
        <div className="ui-painel">
          {(opcoes.length > 1 || (opcoes.length > 0 && temSemEstagiario)) && (
            <fieldset className="flex min-w-0 flex-col gap-2 border-b border-border p-4 sm:px-5">
              <legend className="ui-rotulo float-left mb-2 w-full">
                Estagiário
              </legend>
              <div className="flex flex-wrap gap-2">
                {[
                  [TODOS, "Todos"],
                  ...opcoes.map(([id, nome]) => [id, nome]),
                  ...(temSemEstagiario
                    ? [[SEM_ESTAGIARIO, "Sem estagiário"]]
                    : []),
                ].map(([valor, rotulo]) => (
                  <label key={valor} className="ui-opcao w-auto">
                    <input
                      type="radio"
                      name="filtro-estagiario"
                      value={valor}
                      checked={escolha === valor}
                      onChange={() => setFiltro(valor)}
                    />
                    <span>{rotulo}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <AnuncioAtrasado
            chave={escolha}
            texto={
              escolha === TODOS
                ? ""
                : `${visiveis.length} ${visiveis.length === 1 ? "caso" : "casos"}.`
            }
          />
          <table className="ui-tabela max-lg:hidden">
            <caption className="sr-only">
              Casos sob a sua responsabilidade e os dos seus estagiários
            </caption>
            <thead>
              <tr>
                <th scope="col">Paciente</th>
                <th scope="col">Prioridade clínica</th>
                <th scope="col">Situação do caso</th>
                <th scope="col">Estagiário responsável</th>
                <th scope="col">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((caso) => (
                <tr key={caso.casoId}>
                  <td className="font-semibold">{ficha(caso)}</td>
                  <td>
                    {caso.prioridade && <Prioridade cor={caso.prioridade} />}
                  </td>
                  <td>{situacaoDo(caso)}</td>
                  <td>{estagiarioDo(caso)}</td>
                  <td className="text-right">{acao(caso)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="ui-lista-celular p-3 lg:hidden">
            {visiveis.map((caso) => (
              <li key={caso.casoId} className="ui-item-celular">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[17px] font-semibold">{ficha(caso)}</p>
                  {caso.prioridade && <Prioridade cor={caso.prioridade} />}
                </div>
                <p className="text-sm text-muted-foreground">
                  Estagiário responsável: {estagiarioDo(caso)}
                </p>
                {situacaoDo(caso)}
                {acao(caso, true)}
              </li>
            ))}
          </ul>
        </div>
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
      {transferindo && (
        <DialogoTransferir
          key={transferindo.casoId}
          casoId={transferindo.casoId}
          coordenacao={false}
          aoFechar={() => setTransferindo(null)}
          aoConcluir={(resultado) => {
            setTransferindo(null);
            setTransferido(resultado);
            void cliente.invalidateQueries({ queryKey: ["casos"] });
            void cliente.invalidateQueries({ queryKey: ["estagiarios"] });
          }}
        />
      )}
    </div>
  );
}
