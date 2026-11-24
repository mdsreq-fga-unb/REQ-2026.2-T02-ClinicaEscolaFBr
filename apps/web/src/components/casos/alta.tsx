"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import {
  cancelamentoAltaSchema,
  LIMITE_MOTIVO_ALTA,
  NOMES_CANCELAMENTO_ALTA,
  pedidoAltaSchema,
  reaberturaCasoSchema,
  recusaAltaSchema,
  type RegistroAlta,
  type ResultadoReabertura,
  type SituacaoAlta,
} from "@clinica/shared";
import { Aviso } from "@/components/comum/aviso";
import {
  Campo,
  classeEntrada,
  classeTextoLongo,
} from "@/components/comum/campo";
import { Dados } from "@/components/comum/dados";
import { Dialogo } from "@/components/comum/dialogo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api, ErroApi } from "@/lib/api";
import { dataBr, dataHoraBr, hojeBr } from "@/lib/formato";

// Encerramento do caso por alta (RF68, prancha 6-5), na ficha do paciente. A API
// diz o que cada perfil pode fazer: o estagiário responsável pede (e cancela o
// próprio pedido), o supervisor do caso confirma ou recusa, e a coordenação
// reabre. A secretaria vê a alta sem o motivo.

// Tira o ponto final do texto digitado, que entra no meio de uma frase.
const semPontoFinal = (texto: string) => texto.trim().replace(/[.!?]+$/, "");

const emHora = (iso: string) => dataHoraBr(iso).replace(", ", ", às ");

// Mensagem do primeiro erro de validação da API (400), pelo campo.
function errosDaApi(erro: unknown): Record<string, string> | null {
  if (!(erro instanceof ErroApi) || erro.status !== 400) return null;
  const lista = erro.corpo?.message;
  if (!Array.isArray(lista)) return null;
  const erros: Record<string, string> = {};
  for (const item of lista as { path?: string[]; message?: string }[]) {
    const campo = item.path?.[0];
    if (campo && item.message) erros[campo] ??= item.message;
  }
  return erros;
}

export function AltaDoCaso({ casoId, nome }: { casoId: string; nome: string }) {
  const chave = ["casos", casoId, "alta"];
  const cliente = useQueryClient();
  const consulta = useQuery({
    queryKey: chave,
    queryFn: () => api<SituacaoAlta>(`/casos/${casoId}/alta`),
    retry: false,
  });
  const [concluido, setConcluido] = useState<string | null>(null);

  // A alta e a reabertura mudam a situação do caso e as sessões: a ficha toda
  // é consultada de novo.
  const atualizar = (mensagem: string) => {
    setConcluido(mensagem);
    void cliente.invalidateQueries({
      predicate: (q) => q.queryKey[0] !== "sessao",
    });
  };

  if (consulta.isPending) return null;
  if (consulta.isError) {
    if (
      consulta.error instanceof ErroApi &&
      [403, 404].includes(consulta.error.status)
    )
      return null;
    return (
      <Aviso tipo="erro" titulo="Não foi possível carregar a alta do caso.">
        <Button variant="outline" onClick={() => void consulta.refetch()}>
          Tentar novamente
        </Button>
      </Aviso>
    );
  }
  const alta = consulta.data;
  const vigente =
    alta.situacao === "encerrado_por_alta"
      ? (alta.historico.find((r) => !r.reabertura) ?? null)
      : null;
  const reabertas = alta.historico.filter((r) => r.reabertura);
  const nada =
    !alta.acoes.pedir &&
    !alta.pedidoAberto &&
    !vigente &&
    !reabertas.length &&
    !alta.cancelados.length;
  if (nada && !concluido) return null;

  // O título segue a prancha 6-5 para cada situação: o pedido do estagiário, a
  // alta aguardando o supervisor, a confirmação e o caso encerrado.
  const plural = (n: number) =>
    n === 1 ? "1 sessão realizada" : `${n} sessões realizadas`;
  const cabecalho = alta.acoes.pedir ? (
    <>
      <h2 id="alta-do-caso" className="ui-h2">
        Encerrar caso por alta
      </h2>
      <p className="ui-dica m-0">
        {nome} · ciclo {alta.ciclo} · {plural(alta.sessoesRealizadas)}
      </p>
    </>
  ) : alta.pedidoAberto && alta.acoes.confirmar ? (
    <h2 id="alta-do-caso" className="ui-h2">
      Alta de {nome}
    </h2>
  ) : (
    <h2
      id="alta-do-caso"
      className="ui-h2 flex flex-wrap items-center gap-x-3 gap-y-1"
    >
      {nome}
      {alta.pedidoAberto ? (
        <Selo tom="alerta">Alta aguardando confirmação do supervisor</Selo>
      ) : vigente ? (
        <Selo tom="neutro">
          Encerrado por alta em {dataBr(vigente.dataAlta)}
        </Selo>
      ) : null}
    </h2>
  );

  return (
    <section aria-labelledby="alta-do-caso" className="ui-cartao gap-4">
      <div className="flex flex-col gap-1">{cabecalho}</div>
      {concluido && <Aviso tipo="sucesso" focar titulo={concluido} />}
      {alta.acoes.pedir && (
        <PedidoDeAlta
          casoId={casoId}
          alta={alta}
          aoPedir={() =>
            atualizar("Alta enviada para a confirmação do supervisor.")
          }
        />
      )}
      {alta.pedidoAberto && (
        <PedidoAberto
          casoId={casoId}
          pedido={alta.pedidoAberto}
          ciclo={alta.ciclo}
          relatorioPendente={alta.relatorioPendente}
          podeConfirmar={alta.acoes.confirmar}
          podeCancelar={alta.acoes.cancelar}
          podeRecusar={alta.acoes.recusar}
          aoConfirmar={(canceladas) =>
            atualizar(
              canceladas
                ? `Alta confirmada. O caso foi encerrado, a vaga foi liberada e ${canceladas === 1 ? "1 sessão futura foi cancelada" : `${canceladas} sessões futuras foram canceladas`}.`
                : "Alta confirmada. O caso foi encerrado e a vaga foi liberada.",
            )
          }
          aoFechar={(recusado) =>
            atualizar(
              recusado
                ? "Alta recusada. O caso continua em atendimento, e o estagiário pode fazer um novo pedido."
                : "Pedido de alta cancelado. O caso continua em atendimento.",
            )
          }
        />
      )}
      {vigente && (
        <CasoEncerrado
          casoId={casoId}
          nome={nome}
          alta={alta}
          registro={vigente}
          aoReabrir={(r) =>
            atualizar(
              r.situacao === "em_atendimento"
                ? `Caso reaberto. ${nome} volta ao atendimento com ${r.estagiario}, com o mesmo prontuário.`
                : `Caso reaberto. O estagiário da alta não está mais ativo: o caso aguarda vínculo com outro estagiário, com ${r.supervisor ?? "o supervisor"} mantido.`,
            )
          }
        />
      )}
      {reabertas.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="ui-rotulo">Altas anteriores, reabertas</h3>
          <ul className="flex flex-col gap-1.5 text-sm">
            {reabertas.map((r) => (
              <li key={r.id}>
                Alta de {dataBr(r.dataAlta)}, confirmada por {r.confirmadaPor}.
                Reaberta por {r.reabertura!.reabertaPor} em{" "}
                {emHora(r.reabertura!.reabertaEm)}, a pedido de{" "}
                {r.reabertura!.pedidaPor}
                {r.reabertura!.motivo
                  ? `: ${semPontoFinal(r.reabertura!.motivo)}`
                  : ""}
                .
              </li>
            ))}
          </ul>
        </div>
      )}
      {alta.cancelados.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="ui-rotulo">Pedidos de alta não confirmados</h3>
          <ul className="flex flex-col gap-1.5 text-sm">
            {alta.cancelados.map((r) => (
              <li key={r.id}>
                {NOMES_CANCELAMENTO_ALTA[r.cancelamento!.forma]} (
                {r.cancelamento!.por}, {emHora(r.cancelamento!.em)}): alta de{" "}
                {dataBr(r.dataAlta)}, pedida por {r.pedidaPor}
                {r.cancelamento!.motivo
                  ? `. Motivo: ${semPontoFinal(r.cancelamento!.motivo)}`
                  : ""}
                .
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Selo({
  tom,
  children,
}: {
  tom: "alerta" | "neutro";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "ui-selo text-[13px] font-semibold",
        tom === "alerta"
          ? "border-[#f0cf9f] bg-alerta-fundo text-[#8a4600]"
          : "border-[#c3cfd8] bg-[#eef1f4] text-[#4a5864]",
      )}
    >
      {children}
    </span>
  );
}

// Pedido do estagiário responsável (prancha 6-5, "Registrar a alta").
function PedidoDeAlta({
  casoId,
  alta,
  aoPedir,
}: {
  casoId: string;
  alta: SituacaoAlta;
  aoPedir: () => void;
}) {
  const id = useId();
  const [aberto, setAberto] = useState(false);
  const [dataAlta, setDataAlta] = useState(hojeBr());
  const [motivo, setMotivo] = useState("");
  const [erros, setErros] = useState<Record<string, string>>({});
  const envio = useMutation({
    mutationFn: (dados: { dataAlta: string; motivo: string }) =>
      api(`/casos/${casoId}/alta`, {
        method: "POST",
        body: JSON.stringify(dados),
      }),
    onSuccess: aoPedir,
    onError: (erro) => {
      const campos = errosDaApi(erro);
      if (campos) setErros(campos);
    },
  });

  if (!aberto)
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="ui-dica m-0">
          Quando o acompanhamento terminar, registre a alta. Ela só encerra o
          caso depois da confirmação do supervisor.
        </p>
        <Button variant="outline" onClick={() => setAberto(true)}>
          Registrar alta
        </Button>
      </div>
    );

  const minima = alta.dataMinimaAlta;
  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    const resultado = pedidoAltaSchema.safeParse({ dataAlta, motivo });
    // A primeira data aceita vem da API; a API confere de novo.
    const antesDoInicio = !!minima && !!dataAlta && dataAlta < minima;
    if (!resultado.success || antesDoInicio) {
      const novos: Record<string, string> = {};
      if (antesDoInicio)
        novos.dataAlta = `A data da alta não pode ser anterior a ${dataBr(minima)}.`;
      for (const p of resultado.error?.issues ?? [])
        novos[String(p.path[0])] ??= p.message;
      setErros(novos);
      document
        .getElementById(`${id}-${novos.dataAlta ? "data" : "motivo"}`)
        ?.focus();
      return;
    }
    setErros({});
    envio.mutate(resultado.data);
  };

  return (
    <form noValidate onSubmit={enviar} className="flex flex-col gap-4">
      <Campo
        id={`${id}-data`}
        rotulo="Data da alta"
        dica={minima ? `A partir de ${dataBr(minima)}.` : undefined}
        erro={erros.dataAlta}
        className="sm:max-w-[240px]"
      >
        {(props) => (
          <input
            {...props}
            type="date"
            min={minima ?? undefined}
            max={hojeBr()}
            className={classeEntrada}
            value={dataAlta}
            onChange={(e) => setDataAlta(e.target.value)}
          />
        )}
      </Campo>
      <Campo id={`${id}-motivo`} rotulo="Motivo da alta" erro={erros.motivo}>
        {(props) => (
          <textarea
            {...props}
            maxLength={LIMITE_MOTIVO_ALTA}
            className={`${classeTextoLongo} min-h-[96px]`}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        )}
      </Campo>
      {alta.sessoesSemEvolucao > 0 && (
        <Aviso
          tipo="alerta"
          titulo={
            alta.sessoesSemEvolucao === 1
              ? "Há 1 sessão realizada sem evolução neste ciclo."
              : `Há ${alta.sessoesSemEvolucao} sessões realizadas sem evolução neste ciclo.`
          }
        >
          Depois da alta, não é mais possível registrar evolução neste caso.
          Registre antes de enviar.
        </Aviso>
      )}
      {alta.relatorioPendente && (
        <Aviso
          tipo="alerta"
          titulo={`O relatório final do ciclo ${alta.ciclo} ainda não foi aprovado.`}
        >
          O supervisor só confirma a alta depois de aprovar o relatório, porque
          depois da alta você não consegue mais corrigi-lo.{" "}
          <Link
            href={`/relatorio-final/${casoId}?ciclo=${alta.ciclo}`}
            className="underline"
          >
            Abrir o relatório final
          </Link>
        </Aviso>
      )}
      {/* Frase única, sem negrito, como na prancha 6-5. */}
      <Aviso
        tipo="info"
        className="[&_p]:font-normal"
        titulo={`A alta só é concluída depois da confirmação do supervisor do caso${alta.supervisor ? `, ${alta.supervisor}` : ""}. O histórico do caso, as sessões e o prontuário ficam guardados.`}
      />
      {envio.isError && !errosDaApi(envio.error) && (
        <Aviso tipo="erro" titulo="Não foi possível enviar a alta.">
          {envio.error instanceof ErroApi && envio.error.status !== 500
            ? envio.error.message
            : "Tente novamente em instantes."}
        </Aviso>
      )}
      <div className="flex flex-wrap justify-end gap-3 max-sm:[&>*]:w-full">
        <Button
          type="button"
          variant="outline"
          onClick={() => setAberto(false)}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={envio.isPending}>
          {envio.isPending ? "Enviando…" : "Enviar para confirmação"}
        </Button>
      </div>
    </form>
  );
}

// Pedido aberto: o supervisor do caso confirma; os outros veem a etiqueta.
function PedidoAberto({
  casoId,
  pedido,
  ciclo,
  relatorioPendente,
  podeConfirmar,
  podeCancelar,
  podeRecusar,
  aoConfirmar,
  aoFechar,
}: {
  casoId: string;
  pedido: RegistroAlta;
  ciclo: number;
  relatorioPendente: boolean;
  podeConfirmar: boolean;
  podeCancelar: boolean;
  podeRecusar: boolean;
  aoConfirmar: (sessoesCanceladas: number) => void;
  aoFechar: (recusado: boolean) => void;
}) {
  const [fechando, setFechando] = useState<"cancelar" | "recusar" | null>(null);
  const confirmacao = useMutation({
    mutationFn: () =>
      api<{ sessoesCanceladas: number }>(`/casos/${casoId}/alta/confirmacao`, {
        method: "POST",
      }),
    onSuccess: (r) => aoConfirmar(r.sessoesCanceladas),
  });
  return (
    <div className="flex flex-col gap-3">
      {!podeConfirmar && (
        <p className="ui-dica m-0">
          Pedida por {pedido.pedidaPor} em {emHora(pedido.pedidaEm)}, com a data
          de {dataBr(pedido.dataAlta)}. Enquanto isso, o caso continua em
          atendimento.
        </p>
      )}
      {podeCancelar && (
        <div className="flex flex-col items-start gap-2">
          <p className="ui-dica m-0">
            Se a data ou o motivo estiverem errados, cancele o pedido e registre
            a alta de novo.
          </p>
          <Button
            variant="outline"
            className="max-sm:w-full"
            onClick={() => setFechando("cancelar")}
          >
            Cancelar pedido de alta
          </Button>
        </div>
      )}
      {fechando && (
        <DialogoMotivo
          casoId={casoId}
          acao={fechando}
          aoFechar={() => setFechando(null)}
          aoConcluir={() => {
            setFechando(null);
            aoFechar(fechando === "recusar");
          }}
        />
      )}
      {podeConfirmar && (
        <>
          <Dados
            colunas={2}
            itens={[
              ["Data da alta", dataBr(pedido.dataAlta)],
              ["Pedida por", pedido.pedidaPor],
            ]}
          />
          {pedido.motivo && (
            <div>
              <p className="ui-meta m-0">Motivo</p>
              <p className="m-0">{pedido.motivo}</p>
            </div>
          )}
          <p className="ui-dica m-0">
            Ao confirmar, o caso é encerrado, a vaga é liberada e não há novos
            agendamentos nem evoluções. As sessões futuras são canceladas, sem
            contar falta.
          </p>
          {relatorioPendente && (
            <Aviso
              tipo="alerta"
              titulo={`Aprove o relatório final do ciclo ${ciclo} antes de confirmar a alta.`}
            >
              <span id="alta-relatorio-pendente">
                Depois da confirmação, o estagiário perde o acesso ao caso e não
                consegue mais corrigir o relatório.
              </span>{" "}
              <Link
                href={`/relatorio-final/${casoId}?ciclo=${ciclo}`}
                className="underline"
              >
                Revisar o relatório final
              </Link>
            </Aviso>
          )}
          {confirmacao.isError && (
            <Aviso tipo="erro" titulo="Não foi possível confirmar a alta.">
              {confirmacao.error instanceof ErroApi &&
              confirmacao.error.status !== 500
                ? confirmacao.error.message
                : "Tente novamente em instantes."}
            </Aviso>
          )}
          <div className="flex flex-wrap justify-end gap-3 max-sm:[&>*]:w-full">
            {podeRecusar && (
              <Button
                variant="outline"
                disabled={confirmacao.isPending}
                onClick={() => setFechando("recusar")}
              >
                Recusar alta
              </Button>
            )}
            {/* Indisponível com o motivo ligado ao botão (RNF56), como o
                agendamento do caso encerrado. */}
            <Button
              disabled={confirmacao.isPending}
              aria-disabled={relatorioPendente || undefined}
              aria-describedby={
                relatorioPendente ? "alta-relatorio-pendente" : undefined
              }
              onClick={() => {
                if (!relatorioPendente) confirmacao.mutate();
              }}
            >
              {confirmacao.isPending ? "Confirmando…" : "Confirmar alta"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// Caso encerrado por alta: o registro, a vaga liberada e a reabertura pela
// coordenação. O agendamento fica indisponível na própria agenda (RF10).
function CasoEncerrado({
  casoId,
  nome,
  alta,
  registro,
  aoReabrir,
}: {
  casoId: string;
  nome: string;
  alta: SituacaoAlta;
  registro: RegistroAlta;
  aoReabrir: (r: ResultadoReabertura) => void;
}) {
  const [reabrindo, setReabrindo] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      {/* Linha do tempo da prancha 6-5: marcadores redondos ligados por uma
          linha vertical. */}
      <ol className="relative flex flex-col gap-3 before:absolute before:top-2 before:bottom-2 before:left-[7px] before:w-0.5 before:bg-border">
        {[
          {
            titulo: `Alta confirmada por ${registro.confirmadaPor}`,
            texto: `${emHora(registro.confirmadaEm!)} · pedida por ${registro.pedidaPor}${registro.motivo ? ` · motivo: ${semPontoFinal(registro.motivo)}` : ""}`,
          },
          {
            titulo: "Vaga liberada",
            texto: `O caso deixa de contar como atendimento ativo nos indicadores a partir de ${dataBr(registro.confirmadaEm!)}.`,
          },
        ].map((item) => (
          <li key={item.titulo} className="relative pl-7">
            <span
              aria-hidden
              className="absolute top-1 left-0 size-4 rounded-full border-2 border-primary bg-card"
            />
            <p className="m-0 font-semibold">{item.titulo}</p>
            <p className="ui-meta m-0">{item.texto}</p>
          </li>
        ))}
      </ol>
      {/* Como na prancha 6-5: o agendamento aparece indisponível, com o motivo
          ligado ao botão (RNF56). */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          aria-disabled
          aria-describedby="alta-sem-agendamento"
          className="max-sm:w-full"
          onClick={(e) => e.preventDefault()}
        >
          Agendar sessão
        </Button>
        <p id="alta-sem-agendamento" className="ui-dica m-0">
          Caso encerrado por alta. Para um novo agendamento, a coordenação
          precisa reabrir o caso.
        </p>
      </div>
      {alta.bloqueioReabertura && (
        <Aviso
          tipo="alerta"
          className="[&_p]:font-normal"
          titulo={alta.bloqueioReabertura}
        />
      )}
      {alta.acoes.reabrir && (
        <Button
          variant="outline"
          className="w-fit max-sm:w-full"
          onClick={() => setReabrindo(true)}
        >
          Reabrir caso
        </Button>
      )}
      {reabrindo && (
        <DialogoReabertura
          casoId={casoId}
          nome={nome}
          opcoes={alta.pedidoPorOpcoes}
          aoFechar={() => setReabrindo(false)}
          aoReabrir={(r) => {
            setReabrindo(false);
            aoReabrir(r);
          }}
        />
      )}
    </div>
  );
}

const FORMULARIO_MOTIVO = "motivo-pedido-alta";

// Cancelamento do pedido pelo estagiário que o fez ou recusa pelo supervisor,
// sempre com o motivo. O caso continua em atendimento.
function DialogoMotivo({
  casoId,
  acao,
  aoFechar,
  aoConcluir,
}: {
  casoId: string;
  acao: "cancelar" | "recusar";
  aoFechar: () => void;
  aoConcluir: () => void;
}) {
  const recusa = acao === "recusar";
  const [motivo, setMotivo] = useState("");
  const [erros, setErros] = useState<Record<string, string>>({});
  const envio = useMutation({
    mutationFn: (dados: { motivo: string }) =>
      api(`/casos/${casoId}/alta/${recusa ? "recusa" : "cancelamento"}`, {
        method: "POST",
        body: JSON.stringify(dados),
      }),
    onSuccess: aoConcluir,
    onError: (erro) => {
      const campos = errosDaApi(erro);
      if (campos) setErros(campos);
    },
  });
  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    const resultado = (
      recusa ? recusaAltaSchema : cancelamentoAltaSchema
    ).safeParse({ motivo });
    if (!resultado.success) {
      setErros({ motivo: resultado.error.issues[0].message });
      return;
    }
    setErros({});
    envio.mutate(resultado.data);
  };
  return (
    <Dialogo
      aberto
      aoFechar={aoFechar}
      titulo={recusa ? "Recusar a alta?" : "Cancelar o pedido de alta?"}
      rodape={
        <>
          <Button type="button" variant="outline" onClick={aoFechar}>
            Voltar
          </Button>
          <Button
            type="submit"
            form={FORMULARIO_MOTIVO}
            data-principal
            disabled={envio.isPending}
          >
            {recusa ? "Recusar alta" : "Cancelar pedido"}
          </Button>
        </>
      }
    >
      <form
        id={FORMULARIO_MOTIVO}
        noValidate
        onSubmit={enviar}
        className="flex flex-col gap-4"
      >
        <Campo
          rotulo={recusa ? "Motivo da recusa" : "Motivo do cancelamento"}
          erro={erros.motivo}
        >
          {(props) => (
            <textarea
              {...props}
              maxLength={LIMITE_MOTIVO_ALTA}
              className={`${classeTextoLongo} min-h-[96px]`}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          )}
        </Campo>
        <p className="ui-dica m-0">
          {recusa
            ? "O caso continua em atendimento, e o estagiário pode fazer um novo pedido. A recusa fica no histórico do caso."
            : "O caso continua em atendimento, e você pode registrar a alta de novo. O cancelamento fica no histórico do caso."}
        </p>
        {envio.isError && !errosDaApi(envio.error) && (
          <Aviso
            tipo="erro"
            titulo={
              recusa
                ? "Não foi possível recusar a alta."
                : "Não foi possível cancelar o pedido."
            }
          >
            {envio.error instanceof ErroApi && envio.error.status !== 500
              ? envio.error.message
              : "Tente novamente em instantes."}
          </Aviso>
        )}
      </form>
    </Dialogo>
  );
}

const FORMULARIO_REABERTURA = "reabertura-caso";

function DialogoReabertura({
  casoId,
  nome,
  opcoes,
  aoFechar,
  aoReabrir,
}: {
  casoId: string;
  nome: string;
  opcoes: SituacaoAlta["pedidoPorOpcoes"];
  aoFechar: () => void;
  aoReabrir: (r: ResultadoReabertura) => void;
}) {
  const [pedidaPor, setPedidaPor] = useState(opcoes[0]?.id ?? "");
  const [motivo, setMotivo] = useState("");
  const [erros, setErros] = useState<Record<string, string>>({});
  const envio = useMutation({
    mutationFn: (dados: { pedidaPor: string; motivo: string }) =>
      api<ResultadoReabertura>(`/casos/${casoId}/reabertura`, {
        method: "POST",
        body: JSON.stringify(dados),
      }),
    onSuccess: aoReabrir,
    onError: (erro) => {
      const campos = errosDaApi(erro);
      if (campos) setErros(campos);
    },
  });
  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    const resultado = reaberturaCasoSchema.safeParse({ pedidaPor, motivo });
    if (!resultado.success) {
      const novos: Record<string, string> = {};
      for (const p of resultado.error.issues)
        novos[String(p.path[0])] ??= p.message;
      setErros(novos);
      return;
    }
    setErros({});
    envio.mutate(resultado.data);
  };
  return (
    <Dialogo
      aberto
      aoFechar={aoFechar}
      titulo={`Reabrir o caso de ${nome}?`}
      rodape={
        <>
          <Button type="button" variant="outline" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form={FORMULARIO_REABERTURA}
            data-principal
            disabled={envio.isPending}
          >
            Reabrir caso
          </Button>
        </>
      }
    >
      <form
        id={FORMULARIO_REABERTURA}
        noValidate
        onSubmit={enviar}
        className="flex flex-col gap-4"
      >
        <Campo rotulo="Pedido por" erro={erros.pedidaPor}>
          {(props) => (
            <select
              {...props}
              className={classeEntrada}
              value={pedidaPor}
              onChange={(e) => setPedidaPor(e.target.value)}
            >
              {opcoes.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome} (
                  {o.papel === "estagiario"
                    ? "estagiário(a) responsável"
                    : "supervisor(a) do caso"}
                  )
                </option>
              ))}
            </select>
          )}
        </Campo>
        <Campo rotulo="Motivo da reabertura" erro={erros.motivo}>
          {(props) => (
            <textarea
              {...props}
              maxLength={LIMITE_MOTIVO_ALTA}
              className={`${classeTextoLongo} min-h-[96px]`}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          )}
        </Campo>
        <p className="ui-dica m-0">
          O caso volta a &quot;Em atendimento&quot;, com o mesmo prontuário, e
          ocupa uma vaga. O registro da alta continua no histórico.
        </p>
        {envio.isError && !errosDaApi(envio.error) && (
          <Aviso tipo="erro" titulo="Não foi possível reabrir o caso.">
            {envio.error instanceof ErroApi && envio.error.status !== 500
              ? envio.error.message
              : "Tente novamente em instantes."}
          </Aviso>
        )}
      </form>
    </Dialogo>
  );
}
