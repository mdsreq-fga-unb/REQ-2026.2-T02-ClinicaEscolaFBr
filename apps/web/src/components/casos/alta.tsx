"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useId, useState, type FormEvent } from "react";
import {
  LIMITE_MOTIVO_ALTA,
  pedidoAltaSchema,
  reaberturaCasoSchema,
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
import { api, ErroApi } from "@/lib/api";
import { dataBr, dataHoraBr, hojeBr } from "@/lib/formato";

// Encerramento do caso por alta (RF68, prancha 6-5), na ficha do paciente. A API
// diz o que cada perfil pode fazer: o estagiário responsável pede, o supervisor
// do caso confirma e a coordenação reabre. A secretaria vê a alta sem o motivo.

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
    !alta.acoes.pedir && !alta.pedidoAberto && !vigente && !reabertas.length;
  if (nada && !concluido) return null;

  return (
    <section aria-labelledby="alta-do-caso" className="ui-cartao gap-4">
      <h2 id="alta-do-caso" className="ui-h2">
        Alta
      </h2>
      {concluido && <Aviso tipo="sucesso" focar titulo={concluido} />}
      {alta.acoes.pedir && (
        <PedidoDeAlta
          casoId={casoId}
          alta={alta}
          aoPedir={() =>
            atualizar(
              "Alta enviada para a confirmação do supervisor. Enquanto isso, o caso continua em atendimento.",
            )
          }
        />
      )}
      {alta.pedidoAberto && (
        <PedidoAberto
          casoId={casoId}
          nome={nome}
          pedido={alta.pedidoAberto}
          podeConfirmar={alta.acoes.confirmar}
          aoConfirmar={(canceladas) =>
            atualizar(
              canceladas
                ? `Alta confirmada. O caso foi encerrado, a vaga foi liberada e ${canceladas === 1 ? "1 sessão futura foi cancelada" : `${canceladas} sessões futuras foram canceladas`}.`
                : "Alta confirmada. O caso foi encerrado e a vaga foi liberada.",
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
                {r.reabertura!.motivo ? `: ${r.reabertura!.motivo}` : ""}.
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
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
          Encerrar caso por alta
        </Button>
      </div>
    );

  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    const resultado = pedidoAltaSchema.safeParse({ dataAlta, motivo });
    if (!resultado.success) {
      const novos: Record<string, string> = {};
      for (const p of resultado.error.issues)
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
        erro={erros.dataAlta}
        className="sm:max-w-[240px]"
      >
        {(props) => (
          <input
            {...props}
            type="date"
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
      <Aviso tipo="info" titulo="A alta só é concluída depois da confirmação.">
        Quem confirma é o supervisor do caso
        {alta.supervisor ? `, ${alta.supervisor}` : ""}. O histórico do caso, as
        sessões e o prontuário ficam guardados.
      </Aviso>
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
  nome,
  pedido,
  podeConfirmar,
  aoConfirmar,
}: {
  casoId: string;
  nome: string;
  pedido: RegistroAlta;
  podeConfirmar: boolean;
  aoConfirmar: (sessoesCanceladas: number) => void;
}) {
  const confirmacao = useMutation({
    mutationFn: () =>
      api<{ sessoesCanceladas: number }>(`/casos/${casoId}/alta/confirmacao`, {
        method: "POST",
      }),
    onSuccess: (r) => aoConfirmar(r.sessoesCanceladas),
  });
  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 flex flex-wrap items-center gap-2">
        <span className="ui-selo border-[#f0cf9f] bg-alerta-fundo text-[#8a4600]">
          Alta aguardando confirmação do supervisor
        </span>
      </p>
      <p className="ui-dica m-0">
        Pedida por {pedido.pedidaPor} em {emHora(pedido.pedidaEm)}. Enquanto
        isso, o caso continua em atendimento.
      </p>
      {podeConfirmar && (
        <>
          <h3 className="ui-h2 text-[17px]">Alta de {nome}</h3>
          <Dados
            colunas={2}
            itens={[
              ["Data da alta", dataBr(pedido.dataAlta)],
              ["Pedida por", pedido.pedidaPor],
              ...(pedido.motivo
                ? ([["Motivo", pedido.motivo]] as [string, string][])
                : []),
            ]}
          />
          <p className="ui-dica m-0">
            Ao confirmar, o caso é encerrado, a vaga é liberada e não há novos
            agendamentos nem evoluções. As sessões futuras são canceladas, sem
            contar falta.
          </p>
          {confirmacao.isError && (
            <Aviso tipo="erro" titulo="Não foi possível confirmar a alta.">
              {confirmacao.error instanceof ErroApi &&
              confirmacao.error.status !== 500
                ? confirmacao.error.message
                : "Tente novamente em instantes."}
            </Aviso>
          )}
          <Button
            className="self-end max-sm:w-full"
            disabled={confirmacao.isPending}
            onClick={() => confirmacao.mutate()}
          >
            {confirmacao.isPending ? "Confirmando…" : "Confirmar alta"}
          </Button>
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
      <p className="m-0">
        <span className="ui-selo border-[#c3cfd8] bg-[#eef1f4] text-[#4a5864]">
          Encerrado por alta em {dataBr(registro.dataAlta)}
        </span>
      </p>
      <ol className="flex flex-col gap-3 border-l-2 border-border pl-4">
        <li>
          <p className="m-0 font-semibold">
            Alta confirmada por {registro.confirmadaPor}
          </p>
          <p className="ui-meta m-0">
            {emHora(registro.confirmadaEm!)} · pedida por {registro.pedidaPor}
            {registro.motivo ? ` · motivo: ${registro.motivo}` : ""}
          </p>
        </li>
        <li>
          <p className="m-0 font-semibold">Vaga liberada</p>
          <p className="ui-meta m-0">
            O caso deixa de contar como atendimento ativo nos indicadores a
            partir de {dataBr(registro.confirmadaEm!)}. Para um novo
            agendamento, a coordenação precisa reabrir o caso.
          </p>
        </li>
      </ol>
      {alta.bloqueioReabertura && (
        <Aviso tipo="alerta" titulo={alta.bloqueioReabertura} />
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
                    ? "estagiário da alta"
                    : "supervisor do caso"}
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
