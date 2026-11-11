"use client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, Info, TriangleAlert } from "lucide-react";
import { useId, useState } from "react";
import {
  LIMITE_MOTIVO_TRANSFERENCIA,
  type OpcoesTransferencia,
  type ResultadoTransferencia,
} from "@clinica/shared";
import { Aviso } from "@/components/comum/aviso";
import { Campo, classeTextoLongo } from "@/components/comum/campo";
import { Dialogo } from "@/components/comum/dialogo";
import { Button } from "@/components/ui/button";
import { api, ErroApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { dataHoraBr } from "@/lib/formato";

const casos = (n: number) => `${n} ${n === 1 ? "caso" : "casos"}`;
const pacientes = (n: number) =>
  n === 0
    ? "Nenhum paciente em atendimento"
    : `${n} ${n === 1 ? "paciente" : "pacientes"} em atendimento`;

// Valor do rádio para a coordenação manter o supervisor e trocar só o estagiário.
const MANTER = "manter";

type Erros = { supervisor?: string; estagiario?: string; motivo?: string };

// Transferência de caso (RF25), como na prancha 4-3. O supervisor responsável
// escolhe outro estagiário dele; a coordenação escolhe o novo supervisor e, se
// quiser, o novo estagiário, ou mantém o supervisor e troca só o estagiário. O
// formulário pede o motivo, mostra quem perde o acesso e passa por uma
// confirmação antes de transferir.
export function DialogoTransferir({
  casoId,
  coordenacao,
  aoFechar,
  aoConcluir,
}: {
  casoId: string;
  coordenacao: boolean;
  aoFechar: () => void;
  aoConcluir: (resultado: ResultadoTransferencia) => void;
}) {
  const id = useId();
  const [supervisorId, setSupervisorId] = useState<string | null>(null);
  const [estagiarioId, setEstagiarioId] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [erros, setErros] = useState<Erros>({});
  const [confirmando, setConfirmando] = useState(false);

  const opcoes = useQuery({
    queryKey: ["casos", casoId, "transferencia"],
    queryFn: () => api<OpcoesTransferencia>(`/casos/${casoId}/transferencia`),
    retry: false,
  });
  const transferencia = useMutation({
    mutationFn: () =>
      api<ResultadoTransferencia>(`/casos/${casoId}/transferencia`, {
        method: "POST",
        body: JSON.stringify({
          ...(coordenacao && supervisorId && supervisorId !== MANTER
            ? { supervisorId }
            : {}),
          ...(estagiarioId ? { estagiarioId } : {}),
          motivo,
        }),
      }),
    onSuccess: aoConcluir,
    onError: () => setConfirmando(false),
  });

  const o = opcoes.data;
  const formulario = `${id}-transferir`;
  const idSupervisor = `${id}-supervisor`;
  const idEstagiario = `${id}-estagiario`;
  const idMotivo = `${id}-motivo`;
  const erroApi =
    transferencia.error instanceof ErroApi ? transferencia.error : null;

  const supervisorNovo =
    supervisorId && supervisorId !== MANTER
      ? o?.supervisores.find((s) => s.id === supervisorId)
      : undefined;
  const estagiarioNovo = o?.estagiarios.find((e) => e.id === estagiarioId);

  const validar = (): Erros => {
    const novos: Erros = {};
    if (coordenacao && !supervisorId)
      novos.supervisor = "Escolha o novo supervisor responsável.";
    if ((!coordenacao || supervisorId === MANTER) && !estagiarioId)
      novos.estagiario = "Escolha o novo estagiário responsável.";
    if (!motivo.trim()) novos.motivo = "Informe o motivo da transferência.";
    else if (motivo.trim().length > LIMITE_MOTIVO_TRANSFERENCIA)
      novos.motivo = `Use no máximo ${LIMITE_MOTIVO_TRANSFERENCIA.toLocaleString("pt-BR")} caracteres.`;
    return novos;
  };
  // O erro de um campo some assim que ele é corrigido; o resumo acompanha.
  const corrigir = (chave: keyof Erros) =>
    setErros((atuais) => ({ ...atuais, [chave]: undefined }));
  const listaErros = (
    [
      ["supervisor", idSupervisor],
      ["estagiario", idEstagiario],
      ["motivo", idMotivo],
    ] as const
  ).filter(([chave]) => erros[chave]);

  // Quem perde o acesso e quem passa a ver o histórico (RF25, RF55).
  const anteriores = [
    coordenacao && supervisorNovo ? o?.supervisorAtual?.nome : null,
    (estagiarioNovo || supervisorNovo) && o?.estagiarioAtual?.nome,
  ].filter(Boolean) as string[];
  const novos = [supervisorNovo?.nome, estagiarioNovo?.nome].filter(
    Boolean,
  ) as string[];
  const juntar = (nomes: string[]) => nomes.join(" e ");

  if (confirmando && o) {
    const de = [
      o.supervisorAtual && `${o.supervisorAtual.nome} (supervisor)`,
      o.estagiarioAtual && `${o.estagiarioAtual.nome} (estagiário)`,
    ].filter(Boolean) as string[];
    const supervisorPara = `${(supervisorNovo ?? o.supervisorAtual)?.nome} (supervisor)`;
    const para = estagiarioNovo
      ? `${supervisorPara} e ${estagiarioNovo.nome} (estagiário).`
      : `${supervisorPara}, sem estagiário: o caso aguarda o vínculo.`;
    return (
      <Dialogo
        aberto
        aoFechar={aoFechar}
        titulo="Confirmar a transferência?"
        rodape={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmando(false)}
            >
              Voltar
            </Button>
            <Button
              type="button"
              data-principal
              disabled={transferencia.isPending}
              onClick={() => transferencia.mutate()}
            >
              Confirmar transferência
            </Button>
          </>
        }
      >
        <p className="ui-dica">
          Caso de {o.paciente} · inscrição {o.numero}
        </p>
        <dl className="flex flex-col gap-3">
          {(
            [
              ["De", `${juntar(de)}.`],
              ["Para", para],
              ["Motivo", motivo.trim()],
            ] as const
          ).map(([rotulo, valor]) => (
            <div
              key={rotulo}
              className="rounded-[12px] border border-border bg-muted px-4 py-3"
            >
              <dt className="ui-meta">{rotulo}</dt>
              <dd className="m-0 font-semibold whitespace-pre-line">{valor}</dd>
            </div>
          ))}
        </dl>
        <p className="ui-dica">
          Os responsáveis anteriores perdem o acesso assim que você confirmar.
          Os novos passam a ver todo o histórico do paciente.
        </p>
      </Dialogo>
    );
  }

  return (
    <Dialogo
      aberto
      lateral
      aoFechar={aoFechar}
      titulo="Transferir caso"
      subtitulo={
        coordenacao
          ? "Escolha o novo supervisor e, se quiser, o novo estagiário."
          : "Escolha o novo estagiário responsável."
      }
      rodape={
        o && (
          <>
            <Button type="button" variant="outline" onClick={aoFechar}>
              Cancelar
            </Button>
            <Button type="submit" form={formulario} data-principal>
              Transferir caso
            </Button>
          </>
        )
      }
    >
      {opcoes.isPending && <p role="status">Carregando…</p>}
      {opcoes.isError && (
        <Aviso tipo="erro" titulo="Não foi possível abrir a transferência.">
          {opcoes.error instanceof ErroApi &&
          [403, 422].includes(opcoes.error.status)
            ? opcoes.error.message
            : "Tente novamente em instantes."}
        </Aviso>
      )}
      {o && (
        <form
          id={formulario}
          noValidate
          onSubmit={(evento) => {
            evento.preventDefault();
            const novos = validar();
            setErros(novos);
            if (Object.keys(novos).length === 0) {
              transferencia.reset();
              setConfirmando(true);
            }
          }}
          className="flex flex-col gap-[18px]"
        >
          {listaErros.length > 0 && (
            <Aviso
              tipo="erro"
              focar
              titulo={`Corrija ${listaErros.length === 1 ? "1 item" : `${listaErros.length} itens`} para transferir o caso`}
            >
              <ul className="mt-1 list-disc pl-5">
                {listaErros.map(([chave, alvo]) => (
                  <li key={chave}>
                    <a href={`#${alvo}`} className="font-semibold underline">
                      {erros[chave]}
                    </a>
                  </li>
                ))}
              </ul>
            </Aviso>
          )}

          <dl className="ui-resumo-caso max-md:grid-cols-1">
            <div>
              <dt>Paciente</dt>
              <dd>{o.paciente}</dd>
            </div>
            <div>
              <dt>Nº da inscrição</dt>
              <dd className="ui-numero">{o.numero}</dd>
            </div>
            <div>
              <dt>{coordenacao ? "Supervisor atual" : "Supervisor"}</dt>
              <dd>{o.supervisorAtual?.nome ?? "—"}</dd>
            </div>
            <div>
              <dt>Estagiário atual</dt>
              <dd>{o.estagiarioAtual?.nome ?? "Sem estagiário"}</dd>
            </div>
          </dl>

          <p className="ui-dica">
            {coordenacao
              ? "Todos os campos são obrigatórios, a não ser quando indicado."
              : "Todos os campos são obrigatórios."}
          </p>

          {coordenacao && (
            <fieldset
              className="flex min-w-0 flex-col gap-2"
              aria-describedby={
                erros.supervisor
                  ? `${idSupervisor}-erro`
                  : `${idSupervisor}-dica`
              }
            >
              <legend className="ui-rotulo mb-1.5">
                Novo supervisor responsável
              </legend>
              <p id={`${idSupervisor}-dica`} className="ui-dica -mt-1">
                Casos ativos de cada supervisor. O limite é de{" "}
                {casos(o.supervisores[0]?.limite ?? 50)}.
              </p>
              {erros.supervisor && (
                <p
                  id={`${idSupervisor}-erro`}
                  className="flex items-start gap-1.5 text-sm leading-[1.4] font-semibold text-destructive"
                >
                  <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
                  {erros.supervisor}
                </p>
              )}
              {o.supervisorAtual && (
                <label
                  className={cn(
                    "ui-opcao",
                    erros.supervisor && "border-destructive",
                  )}
                >
                  <input
                    id={idSupervisor}
                    type="radio"
                    name={`${id}-supervisor`}
                    value={MANTER}
                    checked={supervisorId === MANTER}
                    onChange={() => {
                      setSupervisorId(MANTER);
                      corrigir("supervisor");
                    }}
                  />
                  <span className="min-w-0 flex-1">
                    <b>Manter {o.supervisorAtual.nome}</b>
                    <span className="block text-sm text-muted-foreground">
                      Troca só o estagiário
                    </span>
                  </span>
                </label>
              )}
              {o.supervisores.map((s, i) => (
                <label
                  key={s.id}
                  className={cn(
                    "ui-opcao",
                    erros.supervisor && "border-destructive",
                  )}
                >
                  <input
                    id={
                      !o.supervisorAtual && i === 0 ? idSupervisor : undefined
                    }
                    type="radio"
                    name={`${id}-supervisor`}
                    value={s.id}
                    disabled={s.noLimite}
                    checked={supervisorId === s.id}
                    aria-describedby={
                      s.noLimite ? `${id}-limite-${s.id}` : undefined
                    }
                    onChange={() => {
                      setSupervisorId(s.id);
                      corrigir("supervisor");
                    }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex w-full items-center justify-between gap-3">
                      <b>{s.nome}</b>
                      <span className="font-bold whitespace-nowrap text-marca tabular-nums">
                        {s.casosAtivos} de {s.limite}
                        <span className="sr-only"> casos ativos</span>
                      </span>
                    </span>
                    {s.noLimite && (
                      <span
                        id={`${id}-limite-${s.id}`}
                        className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-[#a85400]"
                      >
                        <TriangleAlert aria-hidden className="size-4" />
                        Já está no limite de {casos(s.limite)}
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </fieldset>
          )}

          <fieldset
            className="flex min-w-0 flex-col gap-2"
            aria-describedby={
              erros.estagiario ? `${idEstagiario}-erro` : `${idEstagiario}-dica`
            }
          >
            <legend className="ui-rotulo mb-1.5">
              Novo estagiário responsável
              {coordenacao && supervisorId !== MANTER && (
                <span className="font-normal text-muted-foreground">
                  {" "}
                  (opcional)
                </span>
              )}
            </legend>
            <p id={`${idEstagiario}-dica`} className="ui-dica -mt-1">
              {coordenacao
                ? supervisorId === MANTER
                  ? "Estagiários ativos, com os pacientes em atendimento de cada um."
                  : "Estagiários ativos. Se não escolher agora, o caso fica aguardando o vínculo pelo novo supervisor."
                : "Estagiários ativos que você supervisiona."}
            </p>
            {erros.estagiario && (
              <p
                id={`${idEstagiario}-erro`}
                className="flex items-start gap-1.5 text-sm leading-[1.4] font-semibold text-destructive"
              >
                <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
                {erros.estagiario}
              </p>
            )}
            {o.estagiarios.length === 0 && (
              <Aviso
                tipo="alerta"
                titulo={
                  coordenacao
                    ? "Não há outro estagiário com conta ativa."
                    : "Você não supervisiona outro estagiário."
                }
              />
            )}
            {o.estagiarios.map((e, i) => (
              <label
                key={e.id}
                className={cn(
                  "ui-opcao",
                  erros.estagiario && "border-destructive",
                )}
              >
                <input
                  id={i === 0 ? idEstagiario : undefined}
                  type="radio"
                  name={`${id}-estagiario`}
                  value={e.id}
                  checked={estagiarioId === e.id}
                  onChange={() => {
                    setEstagiarioId(e.id);
                    corrigir("estagiario");
                  }}
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

          {!coordenacao && (
            <p className="flex items-start gap-2 rounded-[10px] border border-dashed border-border px-3 py-2.5 text-sm">
              <Info
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-primary"
              />
              Para passar o caso a um estagiário de outro supervisor, peça a
              transferência à coordenação.
            </p>
          )}

          <Campo
            id={idMotivo}
            rotulo="Motivo da transferência"
            erro={erros.motivo}
          >
            {(props) => (
              <textarea
                {...props}
                value={motivo}
                maxLength={LIMITE_MOTIVO_TRANSFERENCIA}
                onChange={(e) => {
                  setMotivo(e.target.value);
                  if (e.target.value.trim()) corrigir("motivo");
                }}
                className={classeTextoLongo}
              />
            )}
          </Campo>

          {anteriores.length > 0 && novos.length > 0 && (
            <Aviso tipo="info" titulo="Quem passa a ter acesso ao caso">
              Depois da transferência, {juntar(anteriores)}{" "}
              {anteriores.length > 1 ? "perdem" : "perde"} o acesso ao caso, e{" "}
              {juntar(novos)} {novos.length > 1 ? "passam" : "passa"} a ver todo
              o histórico do paciente.
            </Aviso>
          )}

          {erroApi && (
            <Aviso
              tipo="erro"
              focar
              titulo="Não foi possível transferir o caso."
            >
              {[400, 403, 409, 422].includes(erroApi.status)
                ? erroApi.message
                : "Tente novamente em instantes."}
            </Aviso>
          )}
        </form>
      )}
    </Dialogo>
  );
}

// Resultado da transferência, com os novos responsáveis e as sessões futuras do
// estagiário anterior que foram canceladas e precisam ser remarcadas (RF25).
export function AvisoTransferencia({
  resultado,
}: {
  resultado: ResultadoTransferencia;
}) {
  const responsaveis = [resultado.supervisor, resultado.estagiario].filter(
    Boolean,
  ) as string[];
  const n = resultado.sessoesCanceladas;
  return (
    <Aviso tipo="sucesso" focar titulo="Caso transferido.">
      {responsaveis.join(" e ")}{" "}
      {responsaveis.length > 1
        ? "agora são os responsáveis"
        : "agora é o responsável"}{" "}
      pelo caso de {resultado.paciente} ({resultado.numero}).
      {!resultado.estagiario &&
        " O caso aguarda o vínculo de um estagiário pelo supervisor."}
      {n > 0 && (
        <>
          {n === 1
            ? " A sessão futura do estagiário anterior foi cancelada, sem falta para ninguém, e precisa ser reagendada:"
            : ` As ${n} sessões futuras do estagiário anterior foram canceladas, sem falta para ninguém, e precisam ser reagendadas:`}
          <ul className="mt-1 list-disc pl-5">
            {resultado.sessoesAReagendar.map((inicio) => (
              <li key={inicio}>{dataHoraBr(inicio)}</li>
            ))}
          </ul>
          A secretaria reagenda em “Agendar sessão”.
        </>
      )}
    </Aviso>
  );
}
