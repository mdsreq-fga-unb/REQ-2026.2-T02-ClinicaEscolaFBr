"use client";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  RotateCcw,
  X,
  XCircle,
} from "lucide-react";
import { Fragment, useState, type FormEvent, type ReactNode } from "react";
import {
  justificativaFaltaSchema,
  registroFaltaSchema,
  type AcoesCancelamento,
  type CancelamentoDaSessao,
  type ContagemFaltas,
  type FaltaDaSessao,
  type ResultadoCancelamento,
  type StatusSessao,
} from "@clinica/shared";
import {
  aceitaCancelamento,
  DialogoCancelarSessao,
  ResultadoDoCancelamento,
} from "@/components/cancelamento/cancelar-sessao";
import { Aviso } from "@/components/comum/aviso";
import { Campo, classeTextoLongo } from "@/components/comum/campo";
import { Dialogo } from "@/components/comum/dialogo";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { dataBr, dataHoraBr, NOMES_STATUS_SESSAO } from "@/lib/formato";
import { cn } from "@/lib/utils";

// Sessão do ciclo como a API devolve no prontuário e nos dados administrativos.
export type SessaoDoCiclo = {
  id: string;
  inicio: string;
  termino: string;
  estagiario: string;
  status: StatusSessao;
  falta: FaltaDaSessao | null;
  cancelamento?: CancelamentoDaSessao | null;
  // Cancelada pelo desligamento por faltas (RF37).
  canceladaPorDesligamento?: boolean;
};

// O que a lista mostra ao lado de "Cancelada" (RF15, RF16, RF37).
const DETALHE_CANCELAMENTO: Partial<
  Record<CancelamentoDaSessao["classificacao"], string>
> = {
  administrativo: "para remarcar",
  ausencia_estagiario: "ausência do estagiário",
  desligamento: "desligamento por faltas",
};

// Cancelamento feito agora, para o aviso acima da lista.
type Cancelado = { inicio: string; resultado: ResultadoCancelamento };

const FUSO = "America/Sao_Paulo";
const hora = (valor: string) =>
  new Date(valor).toLocaleTimeString("pt-BR", {
    timeZone: FUSO,
    hour: "2-digit",
    minute: "2-digit",
  });
const diaDaSemana = (valor: string) => {
  const dia = new Date(valor).toLocaleDateString("pt-BR", {
    timeZone: FUSO,
    weekday: "long",
  });
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)}, ${dataBr(valor)}`;
};
const horario = (s: Pick<SessaoDoCiclo, "inicio" | "termino">) =>
  `${hora(s.inicio)} às ${hora(s.termino)}`;

// Sessão que já começou, agendada ou confirmada, sem cancelamento nem realização:
// a única que aceita a falta (RF34).
export const aceitaFalta = (s: SessaoDoCiclo, agora: number) =>
  (s.status === "agendada" || s.status === "confirmada") &&
  new Date(s.inicio).getTime() <= agora;

const ESTILO_STATUS: Record<
  StatusSessao,
  { classe: string; Icone: typeof Check }
> = {
  agendada: {
    classe: "border-[#c3cfd8] bg-[#eef1f4] text-[#4a5864]",
    Icone: Clock,
  },
  confirmada: {
    classe: "border-[#a9cfe0] bg-info-fundo text-marca",
    Icone: Check,
  },
  cancelada: {
    classe: "border-dashed border-[#8a98a4] bg-white text-[#4a5864]",
    Icone: X,
  },
  realizada: {
    classe: "border-[#a3d4b3] bg-[#e5f4ea] text-[#1b5e33]",
    Icone: CheckCircle2,
  },
  falta_paciente: {
    classe: "border-[#efb4ad] bg-erro-fundo text-destructive",
    Icone: XCircle,
  },
};

// Situação da sessão com ícone e texto, sem depender só da cor (RNF1).
export function SeloSessao({
  status,
  justificada = false,
  cancelamento,
  porDesligamento = false,
}: {
  status: StatusSessao;
  justificada?: boolean;
  cancelamento?: CancelamentoDaSessao | null;
  porDesligamento?: boolean;
}) {
  const { classe, Icone } = ESTILO_STATUS[status];
  const detalhe = porDesligamento
    ? DETALHE_CANCELAMENTO.desligamento
    : status === "cancelada" && cancelamento
      ? DETALHE_CANCELAMENTO[cancelamento.classificacao]
      : undefined;
  return (
    <span className={cn("ui-selo", classe)}>
      <Icone aria-hidden className="size-3.5" />
      {NOMES_STATUS_SESSAO[status]}
      {justificada && " · justificada"}
      {detalhe && ` · ${detalhe}`}
    </span>
  );
}

// Barrinhas da contagem, uma por falta do limite. A informação está no texto ao
// lado; as barras são só visuais.
function Medidor({ faltas, limite }: { faltas: number; limite: number }) {
  const cor = faltas >= limite ? "bg-destructive" : "bg-[#a85400]";
  return (
    <span aria-hidden className="flex gap-1">
      {Array.from({ length: limite }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-2 w-7 rounded-full border",
            i < faltas
              ? `${cor} border-transparent`
              : "border-[#8a98a4] bg-white",
          )}
        />
      ))}
    </span>
  );
}

function SeloLimite() {
  return (
    <span className="ui-selo border-[#efb4ad] bg-erro-fundo text-destructive">
      <AlertTriangle aria-hidden className="size-3.5" />
      Limite atingido
    </span>
  );
}

// "N de 2" enquanto não passa do limite. Acima dele (uma falta registrada antes do
// desligamento, pelo RF34 ou pelo cancelamento fora do prazo do RF15), mostra o
// total e o limite à parte, para não ler "3 de 2".
function Contador({ contagem }: { contagem: ContagemFaltas }) {
  const acima = contagem.faltas > contagem.limite;
  return (
    <p className="flex flex-wrap items-center gap-3">
      <span className="text-[22px] font-bold text-marca">
        {acima
          ? `${contagem.faltas} faltas`
          : `${contagem.faltas} de ${contagem.limite}`}
      </span>
      <Medidor faltas={contagem.faltas} limite={contagem.limite} />
      {contagem.aviso === "limite_atingido" && <SeloLimite />}
      {acima && (
        <span className="ui-meta w-full">
          Acima do limite de {contagem.limite} faltas no ciclo
        </span>
      )}
    </p>
  );
}

// Contagem de faltas do ciclo nos dados do paciente (RF35), com o aviso da 1ª falta
// e do limite. Fica fora da agenda, que só mostra paciente, data, horário e status
// (RNF13).
export function ResumoFaltas({
  contagem,
  nome,
  linkHistorico,
  semAviso = false,
}: {
  contagem: ContagemFaltas;
  nome: string;
  linkHistorico?: string;
  // Fora do atendimento, como no caso desligado (RF37), só a contagem.
  semAviso?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[12px] border border-border bg-muted px-4 py-3.5">
      <div>
        <p className="ui-meta font-semibold">Faltas no ciclo</p>
        <Contador contagem={contagem} />
      </div>
      {!semAviso && contagem.aviso === "primeira_falta" && (
        <Aviso
          tipo="alerta"
          titulo={`${nome} tem 1 falta neste ciclo. Uma nova falta leva ao desligamento por faltas.`}
        />
      )}
      {!semAviso && contagem.aviso === "limite_atingido" && (
        <Aviso
          tipo="erro"
          titulo={
            contagem.faltas > contagem.limite
              ? `${nome} tem ${contagem.faltas} faltas neste ciclo, acima do limite de ${contagem.limite}.`
              : `${nome} atingiu o limite de ${contagem.limite} faltas neste ciclo.`
          }
        >
          O desligamento por faltas é avaliado pela secretaria ou pela
          coordenação.
        </Aviso>
      )}
      {linkHistorico && contagem.faltas > 0 && (
        <a
          href={linkHistorico}
          className="w-fit text-[15px] font-semibold text-primary underline underline-offset-2"
        >
          Ver histórico de faltas
        </a>
      )}
    </div>
  );
}

// Histórico das faltas do ciclo (RF35): o que conta, em que ordem, e o que deixou
// de contar na reversão (RF38), que continua visível. O rodapé recebe a ação de
// desligar por faltas e o registro do desligamento (RF37).
export function HistoricoFaltas({
  id,
  contagem,
  ciclo,
  sessoes,
  rodape,
}: {
  id?: string;
  contagem: ContagemFaltas;
  ciclo: number;
  sessoes: SessaoDoCiclo[];
  rodape?: ReactNode;
}) {
  const faltas = sessoes.filter((s) => s.falta);
  // Posição de cada falta que conta (1ª, 2ª...), sem as desconsideradas.
  const ordens = new Map(
    faltas
      .filter((s) => !s.falta!.retiradaDaContagem)
      .map((s, i) => [s.id, i + 1]),
  );
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className="ui-cartao">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id={`${id}-titulo`} className="ui-h2">
            Faltas no ciclo
          </h2>
          <p className="ui-meta">Ciclo {ciclo}</p>
        </div>
        <Contador contagem={contagem} />
      </div>
      {faltas.length ? (
        <ol className="flex flex-col">
          {faltas.map((s) => {
            const falta = s.falta!;
            const titulo =
              falta.origem === "cancelamento_fora_do_prazo"
                ? "Cancelamento fora do prazo"
                : "Falta do paciente";
            return (
              <li
                key={falta.id}
                className="grid grid-cols-[1fr_auto] items-start gap-x-4 gap-y-1 border-b border-border py-4 first:pt-0 last:border-b-0 last:pb-0 lg:grid-cols-[6rem_1fr_auto] lg:gap-x-6"
              >
                <span
                  className={cn(
                    "col-start-1 row-start-1 font-bold",
                    falta.retiradaDaContagem && "line-through",
                  )}
                >
                  {dataBr(s.inicio)}
                </span>
                <div className="col-span-2 min-w-0 lg:col-span-1 lg:col-start-2 lg:row-start-1">
                  <p
                    className={cn(
                      "font-semibold",
                      falta.retiradaDaContagem && "line-through",
                    )}
                  >
                    {titulo}
                    {falta.justificada &&
                      ` · justificada${falta.motivo ? ` (${falta.motivo})` : ""}`}
                  </p>
                  <p className="ui-meta">
                    {falta.registradaPeloPaciente
                      ? `Registrada pelo paciente, pelo link da sessão, em ${dataHoraBr(falta.registradaEm)}.`
                      : `Registrada por ${falta.registradaPor ?? "responsável não identificado"} em ${dataHoraBr(falta.registradaEm)}.`}
                    {falta.justificada &&
                      ` Justificada por ${falta.justificadaPor} em ${dataHoraBr(falta.justificadaEm)}.`}
                  </p>
                </div>
                {falta.retiradaDaContagem ? (
                  <span className="ui-selo col-start-2 row-start-1 w-fit max-w-64 justify-self-end border-[#c3cfd8] whitespace-normal bg-[#eef1f4] text-[#4a5864] lg:col-start-3">
                    <RotateCcw aria-hidden className="size-3.5 shrink-0" />
                    Desconsiderada na reversão
                    {falta.retiradaEm &&
                      ` de ${dataBr(falta.retiradaEm)}${falta.retiradaPor ? ` por ${falta.retiradaPor}` : ""}`}
                  </span>
                ) : (
                  <span className="ui-selo col-start-2 row-start-1 w-fit justify-self-end border-[#efb4ad] bg-erro-fundo text-destructive lg:col-start-3">
                    <XCircle aria-hidden className="size-3.5" />
                    Conta · {ordens.get(s.id)}ª falta
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="ui-dica">Nenhuma falta neste ciclo.</p>
      )}
      {rodape}
      <p className="ui-dica border-t border-border pt-4">
        Contam como falta: a falta registrada na sessão e o cancelamento com
        menos de 1 hora de antecedência. Não contam: a falta de confirmação de
        presença, o cancelamento no prazo e o cancelamento para remarcar. A
        contagem vale para o ciclo inteiro, com faltas seguidas ou não; sessão
        realizada não zera a contagem.
      </p>
    </section>
  );
}

// Detalhe da situação abaixo do selo: quem registrou a falta e a justificativa.
export function DetalheFalta({ falta }: { falta: FaltaDaSessao }) {
  return (
    <p className="ui-meta mt-1">
      {falta.registradaPeloPaciente
        ? `Registrada pelo paciente, pelo link, em ${dataHoraBr(falta.registradaEm)}`
        : `Registrada por ${falta.registradaPor ?? "responsável não identificado"} em ${dataHoraBr(falta.registradaEm)}`}
      {falta.justificada && (
        <>
          <br />
          Justificada por {falta.justificadaPor} em{" "}
          {dataHoraBr(falta.justificadaEm)}
          {falta.motivo && `. Motivo: ${falta.motivo}`}
        </>
      )}
    </p>
  );
}

const avisoContinuaContando = (limite: number) =>
  `A falta continua contando para o limite de ${limite} faltas no ciclo.`;

// Justificativa feita depois do registro (RF34), na própria linha da sessão.
function FormularioJustificativa({
  faltaId,
  limite,
  chave,
  aoConcluir,
  aoCancelar,
}: {
  faltaId: string;
  limite: number;
  chave: QueryKey;
  aoConcluir: () => void;
  aoCancelar: () => void;
}) {
  const cache = useQueryClient();
  const [motivo, setMotivo] = useState("");
  const [erroCampo, setErroCampo] = useState<string>();
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    const resultado = justificativaFaltaSchema.safeParse({ motivo });
    if (!resultado.success) {
      setErroCampo(resultado.error.issues[0]?.message);
      return;
    }
    setErroCampo(undefined);
    setSalvando(true);
    try {
      await api(`/faltas/${faltaId}/justificativa`, {
        method: "POST",
        body: JSON.stringify(resultado.data),
      });
      await cache.invalidateQueries({ queryKey: chave });
      aoConcluir();
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível justificar a falta.",
      );
      setSalvando(false);
    }
  }

  return (
    <form
      noValidate
      onSubmit={salvar}
      className="flex max-w-[560px] flex-col gap-4"
    >
      {erro && <Aviso tipo="erro" titulo={erro} />}
      <MotivoJustificativa
        valor={motivo}
        aoMudar={setMotivo}
        erro={erroCampo}
        focar
      />
      <Aviso tipo="alerta" titulo={avisoContinuaContando(limite)} />
      <div className="flex flex-wrap gap-3 max-md:[&>*]:w-full">
        <Button type="submit" disabled={salvando}>
          Salvar justificativa
        </Button>
        <Button type="button" variant="outline" onClick={aoCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

// Sessões do ciclo, com a falta (RF34): no computador, uma tabela; no celular,
// um cartão por sessão. Registrar a falta abre o diálogo; justificar abre o
// formulário na própria linha.
export function SessoesComFaltas({
  nome,
  sessoes,
  limite,
  agora,
  podeRegistrar,
  podeJustificar,
  chave,
  acoesCancelamento,
  casoId,
}: {
  nome: string;
  sessoes: SessaoDoCiclo[];
  limite: number;
  agora: number;
  podeRegistrar: boolean;
  podeJustificar: boolean;
  chave: QueryKey;
  acoesCancelamento?: AcoesCancelamento;
  casoId?: string;
}) {
  const [justificando, setJustificando] = useState<string | null>(null);
  const [registrando, setRegistrando] = useState<SessaoDoCiclo | null>(null);
  const [cancelando, setCancelando] = useState<SessaoDoCiclo | null>(null);
  const [cancelado, setCancelado] = useState<Cancelado | null>(null);
  const [sucesso, setSucesso] = useState<{
    titulo: string;
    texto: string;
  } | null>(null);

  const acao = (s: SessaoDoCiclo, celular = false) => {
    // Sessão futura: cancelar (RF15, RF16). Depois do início, só a falta (RF34).
    if (aceitaCancelamento(s, acoesCancelamento, agora)) {
      return (
        <Button
          type="button"
          variant={celular ? "outline" : "link"}
          className={celular ? "w-full" : undefined}
          onClick={() => {
            setSucesso(null);
            setCancelado(null);
            setCancelando(s);
          }}
        >
          Cancelar sessão
        </Button>
      );
    }
    if (s.falta && !s.falta.justificada && podeJustificar) {
      return (
        <Button
          type="button"
          variant="outline"
          className={celular ? "w-full" : undefined}
          aria-expanded={justificando === s.id}
          onClick={() => {
            setSucesso(null);
            setJustificando(justificando === s.id ? null : s.id);
          }}
        >
          Marcar como justificada
        </Button>
      );
    }
    if (!s.falta && podeRegistrar && aceitaFalta(s, agora)) {
      return (
        <Button
          type="button"
          variant={celular ? "outline" : "link"}
          className={celular ? "w-full" : undefined}
          onClick={() => {
            setSucesso(null);
            setCancelado(null);
            setRegistrando(s);
          }}
        >
          Registrar falta do paciente
        </Button>
      );
    }
    return null;
  };

  const formulario = (s: SessaoDoCiclo) =>
    justificando === s.id && s.falta ? (
      <FormularioJustificativa
        faltaId={s.falta.id}
        limite={limite}
        chave={chave}
        aoCancelar={() => setJustificando(null)}
        aoConcluir={() => {
          setJustificando(null);
          setSucesso({
            titulo: "Justificativa registrada.",
            texto: avisoContinuaContando(limite),
          });
        }}
      />
    ) : null;

  return (
    <div className="flex flex-col gap-4">
      {sucesso && (
        <Aviso tipo="sucesso" titulo={sucesso.titulo} focar>
          {sucesso.texto}
        </Aviso>
      )}
      {cancelado && (
        <ResultadoDoCancelamento nome={nome} casoId={casoId} {...cancelado} />
      )}
      {sessoes.length ? (
        <div className="ui-painel max-[1359px]:border-0 max-[1359px]:bg-transparent">
          {/* Com a ação e o detalhe da falta, a tabela precisa de uns 900 px ao
              lado do menu: abaixo de 1360 px de tela, a lista vira cartões. Se um
              nome longo ainda passar da largura, ela rola dentro do cartão. */}
          <div className="overflow-x-auto max-[1359px]:hidden">
            <table className="ui-tabela [&_td]:px-3.5 [&_th]:px-3.5">
              <caption className="sr-only">Sessões do ciclo de {nome}</caption>
              <thead>
                <tr>
                  <th scope="col">Data</th>
                  <th scope="col">Horário</th>
                  <th scope="col">Estagiário</th>
                  <th scope="col">Situação</th>
                  <th scope="col">
                    <span className="sr-only">Ação</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sessoes.map((s) => (
                  <Fragment key={s.id}>
                    <tr className={cn(s.falta && "bg-muted/60")}>
                      <td className="whitespace-nowrap">{dataBr(s.inicio)}</td>
                      <td className="whitespace-nowrap">{horario(s)}</td>
                      <td className="min-w-32">{s.estagiario}</td>
                      <td>
                        <SeloSessao
                          status={s.status}
                          justificada={s.falta?.justificada}
                          cancelamento={s.cancelamento}
                          porDesligamento={s.canceladaPorDesligamento}
                        />
                        {s.falta && <DetalheFalta falta={s.falta} />}
                      </td>
                      <td className="text-right whitespace-nowrap">
                        {acao(s)}
                      </td>
                    </tr>
                    {justificando === s.id && (
                      <tr className="bg-muted/60">
                        <td colSpan={5}>{formulario(s)}</td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="ui-lista-celular min-[1360px]:hidden">
            {sessoes.map((s) => (
              <li key={s.id} className="ui-item-celular">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold">
                    {dataBr(s.inicio)} · {horario(s)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{s.estagiario}</p>
                <div>
                  <SeloSessao
                    status={s.status}
                    justificada={s.falta?.justificada}
                    cancelamento={s.cancelamento}
                    porDesligamento={s.canceladaPorDesligamento}
                  />
                  {s.falta && <DetalheFalta falta={s.falta} />}
                </div>
                {acao(s, true)}
                {formulario(s)}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="ui-dica">Não há sessões registradas neste ciclo.</p>
      )}
      {registrando && (
        <DialogoRegistrarFalta
          nome={nome}
          sessao={registrando}
          limite={limite}
          chave={chave}
          aoFechar={() => setRegistrando(null)}
          aoConcluir={() => {
            setSucesso({
              titulo: "Falta registrada.",
              texto: `A sessão de ${nome} em ${dataBr(registrando.inicio)}, às ${hora(registrando.inicio)}, passou para “Falta do paciente”.`,
            });
            setRegistrando(null);
          }}
        />
      )}
      {cancelando && acoesCancelamento && (
        <DialogoCancelarSessao
          nome={nome}
          sessao={cancelando}
          acoes={acoesCancelamento}
          chave={chave}
          aoFechar={() => setCancelando(null)}
          aoConcluir={(resultado) => {
            setCancelado({ inicio: cancelando.inicio, resultado });
            setCancelando(null);
          }}
        />
      )}
    </div>
  );
}

// Ações da falta numa sessão do prontuário (RF34): registrar, pelo diálogo, ou
// justificar, na própria sessão, com o aviso de sucesso logo acima.
export function AcoesFaltaDaSessao({
  nome,
  sessao,
  limite,
  agora,
  podeRegistrar,
  podeJustificar,
  chave,
  acoesCancelamento,
  casoId,
  children,
}: {
  nome: string;
  sessao: SessaoDoCiclo;
  limite: number;
  agora: number;
  podeRegistrar: boolean;
  podeJustificar: boolean;
  chave: QueryKey;
  acoesCancelamento?: AcoesCancelamento;
  casoId?: string;
  children?: ReactNode;
}) {
  const [registrando, setRegistrando] = useState(false);
  const [justificando, setJustificando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [cancelado, setCancelado] = useState<Cancelado | null>(null);
  const [sucesso, setSucesso] = useState<{
    titulo: string;
    texto: string;
  } | null>(null);
  const registrar =
    !sessao.falta && podeRegistrar && aceitaFalta(sessao, agora);
  const justificar =
    !!sessao.falta && !sessao.falta.justificada && podeJustificar;
  const cancelar = aceitaCancelamento(sessao, acoesCancelamento, agora);
  if (
    !registrar &&
    !justificar &&
    !cancelar &&
    !sucesso &&
    !cancelado &&
    !children
  )
    return null;
  return (
    <div className="mt-3 flex flex-col gap-3">
      {sucesso && (
        <Aviso tipo="sucesso" titulo={sucesso.titulo} focar>
          {sucesso.texto}
        </Aviso>
      )}
      {cancelado && (
        <ResultadoDoCancelamento nome={nome} casoId={casoId} {...cancelado} />
      )}
      <div className="flex flex-wrap gap-3 max-md:[&>*]:w-full">
        {children}
        {cancelar && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSucesso(null);
              setCancelado(null);
              setCancelando(true);
            }}
          >
            Cancelar sessão
          </Button>
        )}
        {registrar && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSucesso(null);
              setRegistrando(true);
            }}
          >
            Registrar falta do paciente
          </Button>
        )}
        {justificar && !justificando && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSucesso(null);
              setJustificando(true);
            }}
          >
            Marcar como justificada
          </Button>
        )}
      </div>
      {justificando && sessao.falta && (
        <FormularioJustificativa
          faltaId={sessao.falta.id}
          limite={limite}
          chave={chave}
          aoCancelar={() => setJustificando(false)}
          aoConcluir={() => {
            setJustificando(false);
            setSucesso({
              titulo: "Justificativa registrada.",
              texto: avisoContinuaContando(limite),
            });
          }}
        />
      )}
      {registrando && (
        <DialogoRegistrarFalta
          nome={nome}
          sessao={sessao}
          limite={limite}
          chave={chave}
          aoFechar={() => setRegistrando(false)}
          aoConcluir={() => {
            setSucesso({
              titulo: "Falta registrada.",
              texto: `A sessão de ${nome} em ${dataBr(sessao.inicio)}, às ${hora(sessao.inicio)}, passou para “Falta do paciente”.`,
            });
            setRegistrando(false);
          }}
        />
      )}
      {cancelando && acoesCancelamento && (
        <DialogoCancelarSessao
          nome={nome}
          sessao={sessao}
          acoes={acoesCancelamento}
          chave={chave}
          aoFechar={() => setCancelando(false)}
          aoConcluir={(resultado) => {
            setCancelado({ inicio: sessao.inicio, resultado });
            setCancelando(false);
          }}
        />
      )}
    </div>
  );
}

// Registro da falta (RF34), pela secretaria ou pelo estagiário responsável, com o
// resumo da sessão, como na prancha 3-1.
function DialogoRegistrarFalta({
  nome,
  sessao,
  limite,
  chave,
  aoFechar,
  aoConcluir,
}: {
  nome: string;
  sessao: SessaoDoCiclo;
  limite: number;
  chave: QueryKey;
  aoFechar: () => void;
  aoConcluir: () => void;
}) {
  const cache = useQueryClient();
  const [justificada, setJustificada] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [erroCampo, setErroCampo] = useState<string>();
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    const resultado = registroFaltaSchema.safeParse({
      justificada,
      motivo: justificada ? motivo : undefined,
    });
    if (!resultado.success) {
      setErroCampo(resultado.error.issues[0]?.message);
      return;
    }
    setErroCampo(undefined);
    setSalvando(true);
    try {
      await api(`/sessoes/${sessao.id}/falta`, {
        method: "POST",
        body: JSON.stringify(resultado.data),
      });
      await cache.invalidateQueries({ queryKey: chave });
      aoConcluir();
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível registrar a falta.",
      );
      setSalvando(false);
    }
  }

  const idFormulario = `falta-${sessao.id}`;
  return (
    <Dialogo
      aberto
      aoFechar={aoFechar}
      titulo="Registrar falta do paciente"
      rodape={
        <>
          <Button type="button" variant="outline" onClick={aoFechar}>
            Voltar
          </Button>
          <Button
            type="submit"
            form={idFormulario}
            data-principal
            disabled={salvando}
          >
            Registrar falta
          </Button>
        </>
      }
    >
      <form
        id={idFormulario}
        noValidate
        onSubmit={salvar}
        className="flex flex-col gap-4"
      >
        {erro && <Aviso tipo="erro" titulo={erro} />}
        <dl className="ui-resumo-caso">
          <div>
            <dt>Paciente</dt>
            <dd>{nome}</dd>
          </div>
          <div>
            <dt>Estagiário</dt>
            <dd>{sessao.estagiario}</dd>
          </div>
          <div>
            <dt>Data</dt>
            <dd>{diaDaSemana(sessao.inicio)}</dd>
          </div>
          <div>
            <dt>Horário</dt>
            <dd>{horario(sessao)}</dd>
          </div>
          <div>
            <dt>Situação atual</dt>
            <dd>
              <SeloSessao status={sessao.status} />
            </dd>
          </div>
        </dl>
        <p className="text-[15px]">
          O paciente não compareceu e não cancelou a sessão.
        </p>
        <label className="flex cursor-pointer items-start gap-3 text-[15px]">
          <input
            type="checkbox"
            checked={justificada}
            aria-describedby={`${idFormulario}-dica`}
            onChange={(e) => setJustificada(e.target.checked)}
            className="mt-0.5 size-5 shrink-0 accent-primary"
          />
          <span>
            <span className="font-semibold">Falta justificada</span>{" "}
            <span className="text-muted-foreground">(opcional)</span>
            <span id={`${idFormulario}-dica`} className="ui-dica block">
              Marque se o paciente apresentou um motivo. Você também pode marcar
              depois, na ficha do paciente.
            </span>
          </span>
        </label>
        {justificada && (
          <MotivoJustificativa
            valor={motivo}
            aoMudar={setMotivo}
            erro={erroCampo}
          />
        )}
        <Aviso
          tipo="info"
          titulo={`A falta entra na contagem de faltas do ciclo, mesmo quando justificada. O limite é de ${limite} faltas no ciclo.`}
        />
      </form>
    </Dialogo>
  );
}

function MotivoJustificativa({
  valor,
  aoMudar,
  erro,
  focar = false,
}: {
  valor: string;
  aoMudar: (valor: string) => void;
  erro?: string;
  focar?: boolean;
}) {
  return (
    <Campo
      rotulo="Motivo da justificativa (obrigatório)"
      dica="Descreva o comprovante, sem anexar o documento."
      erro={erro}
    >
      {(props) => (
        <textarea
          {...props}
          autoFocus={focar}
          value={valor}
          maxLength={1000}
          onChange={(e) => aoMudar(e.target.value)}
          className={classeTextoLongo}
        />
      )}
    </Campo>
  );
}
