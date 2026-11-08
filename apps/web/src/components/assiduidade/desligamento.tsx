"use client";
import { useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  Clock,
  DoorOpen,
  ListOrdered,
  Undo2,
  UserX,
} from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  LIMITE_FALTAS_CICLO,
  reversaoDesligamentoSchema,
  type AlertasFaltas,
  type DesligamentoDoCaso,
  type Perfil,
  type ResultadoDesligamento,
  type ResultadoReversao,
  type SessaoAReagendar,
  type SituacaoCaso,
  type VagaLiberada,
} from "@clinica/shared";
import { Aviso } from "@/components/comum/aviso";
import { Campo, classeTextoLongo } from "@/components/comum/campo";
import { Dialogo } from "@/components/comum/dialogo";
import { Button, buttonVariants } from "@/components/ui/button";
import { api, ErroApi } from "@/lib/api";
import { dataBr, dataHoraBr, horaBr, NOMES_SITUACAO_CASO } from "@/lib/formato";
import { cn } from "@/lib/utils";
import type { SessaoDoCiclo } from "./faltas";

const NOMES_PERFIL_DECISAO: Partial<Record<Perfil, string>> = {
  secretaria: "Secretaria",
  coordenacao: "Coordenação",
};

const titulo = (falta: NonNullable<SessaoDoCiclo["falta"]>) =>
  `${falta.origem === "cancelamento_fora_do_prazo" ? "Cancelamento fora do prazo" : "Falta do paciente"}${falta.justificada ? " · justificada" : ""}`;

const listaDeDatas = (datas: string[]) =>
  datas.length <= 1
    ? (datas[0] ?? "")
    : `${datas.slice(0, -1).join(", ")} e ${datas.at(-1)}`;

// Faltas que contam no ciclo, na ordem das sessões.
export const faltasQueContam = (sessoes: SessaoDoCiclo[]) =>
  sessoes.filter((s) => s.falta && !s.falta.retiradaDaContagem);

// Situação do caso com ícone e texto, sem depender só da cor (RNF1). O caso que
// aguarda vaga depois da reversão aparece como "Em atendimento · aguardando vaga",
// como no protótipo (prancha 3-5).
const ESTILO_SITUACAO: Record<SituacaoCaso, string> = {
  aguardando_distribuicao: "border-[#c3cfd8] bg-[#eef1f4] text-[#4a5864]",
  aguardando_vinculo: "border-[#c3cfd8] bg-[#eef1f4] text-[#4a5864]",
  em_atendimento: "border-[#a3d4b3] bg-[#e5f4ea] text-[#1b5e33]",
  encerrado: "border-[#c3cfd8] bg-[#eef1f4] text-[#4a5864]",
  desligado_por_faltas: "border-[#efb4ad] bg-erro-fundo text-destructive",
  aguardando_vaga: "border-[#f0cf9f] bg-alerta-fundo text-[#8a4600]",
};
const ICONE_SITUACAO: Partial<Record<SituacaoCaso, typeof Check>> = {
  em_atendimento: Check,
  desligado_por_faltas: UserX,
  aguardando_vaga: Clock,
};

export function SeloSituacaoCaso({ situacao }: { situacao: SituacaoCaso }) {
  const Icone = ICONE_SITUACAO[situacao];
  return (
    <span
      className={cn(
        "ui-selo max-w-full whitespace-normal",
        ESTILO_SITUACAO[situacao],
      )}
    >
      {Icone && <Icone aria-hidden className="size-3.5 shrink-0" />}
      {NOMES_SITUACAO_CASO[situacao]}
    </span>
  );
}

// Faixa do topo da área interna (RF36, e o aviso da 1ª falta do RF35), em toda
// página, sem botão de fechar: o alerta só sai quando o desligamento é registrado.
// Ela não acompanha a rolagem: com vários pacientes, cobriria o conteúdo.
// O texto é anunciado pelo leitor de tela sem tirar o foco de onde a pessoa está
// (role="status"). Nunca mostra o motivo das faltas.
export function FaixaAlertas({ perfil }: { perfil: Perfil }) {
  const consulta = useQuery({
    queryKey: ["faltas", "alertas"],
    queryFn: () => api<AlertasFaltas>("/faltas/alertas"),
    enabled: perfil !== "supervisor",
    staleTime: 30_000,
  });
  const alertas = consulta.data;
  if (!alertas) return null;
  const estagiario = perfil === "estagiario";
  const destino = (a: AlertasFaltas["limite"][number]) =>
    estagiario
      ? a.prontuarioId
        ? `/prontuarios/${a.prontuarioId}`
        : null
      : `/pacientes/${a.casoId}`;
  const rotulo = estagiario ? "Ver paciente" : "Avaliar desligamento";
  const botao = (a: AlertasFaltas["limite"][number]) => {
    const href = destino(a);
    return href ? (
      <Link
        href={href}
        aria-label={`${rotulo}: ${a.nome}`}
        className={buttonVariants({
          variant: "outline",
          className: "shrink-0 border-white max-sm:w-full",
        })}
      >
        {rotulo}
      </Link>
    ) : null;
  };
  const { limite, primeiraFalta } = alertas;
  if (limite.length === 0 && primeiraFalta.length === 0) return null;
  const orientacao = estagiario
    ? "A secretaria ou a coordenação vai avaliar o desligamento."
    : "Avalie o desligamento.";

  return (
    <div role="status" className="flex flex-col">
      {limite.length === 1 && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b-4 border-[#8f1a10] bg-destructive px-4 py-3 text-white md:px-10">
          <AlertTriangle aria-hidden className="size-5 shrink-0" />
          <p className="min-w-0 flex-1">
            <span className="block font-bold">
              Limite de faltas atingido: {limite[0].nome}
            </span>
            <span className="block text-[15px]">
              {limite[0].faltas} faltas no ciclo. {orientacao}
            </span>
          </p>
          {botao(limite[0])}
        </div>
      )}
      {limite.length > 1 && (
        <div className="flex flex-col gap-3 border-b-4 border-[#8f1a10] bg-destructive px-4 py-3 text-white md:px-10">
          <div className="flex items-start gap-3">
            <AlertTriangle aria-hidden className="mt-0.5 size-5 shrink-0" />
            <p>
              <span className="block font-bold">
                Limite de faltas atingido: {limite.length} pacientes
              </span>
              <span className="block text-[15px]">
                Cada um tem {LIMITE_FALTAS_CICLO} faltas ou mais no ciclo.{" "}
                {orientacao}
              </span>
            </p>
          </div>
          <ul className="flex flex-col gap-2 md:pl-8">
            {limite.map((a) => (
              <li
                key={a.casoId}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-white/30 bg-[#9c1d12] px-3.5 py-2.5"
              >
                <span className="min-w-0 flex-1 text-[15px]">
                  <span className="font-bold">{a.nome}</span> · {a.faltas}{" "}
                  faltas no ciclo
                </span>
                {botao(a)}
              </li>
            ))}
          </ul>
        </div>
      )}
      {primeiraFalta.map((a) => {
        const href = destino(a);
        return (
          <div
            key={a.casoId}
            className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-[#f0cf9f] bg-alerta-fundo px-4 py-2.5 text-[#5c3200] md:px-10"
          >
            <AlertTriangle
              aria-hidden
              className="size-5 shrink-0 text-[#a85400]"
            />
            <p className="min-w-0 flex-1 text-[15px]">
              <span className="font-bold">
                1 falta no ciclo: uma nova falta resulta em desligamento.
              </span>{" "}
              {a.nome}
            </p>
            {href && (
              <Link
                href={href}
                aria-label={`Ver paciente: ${a.nome}`}
                className="text-[15px] font-semibold text-[#5c3200] underline underline-offset-2"
              >
                Ver paciente
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Confirmação do desligamento por faltas (RF37), aberta pelo paciente com o alerta.
// A data da decisão é o dia do registro, sem edição. Nenhum inscrito da fila é
// vinculado sozinho, e o sistema não avisa o paciente: a tela lembra quem decide.
export function DialogoDesligar({
  casoId,
  nome,
  numero,
  ciclo,
  desde,
  sessoes,
  estagiario,
  responsavel,
  chave,
  aoFechar,
  aoConcluir,
}: {
  casoId: string;
  nome: string;
  numero: string;
  ciclo: number;
  desde: string | null;
  sessoes: SessaoDoCiclo[];
  estagiario: string | null;
  responsavel: { nome: string; perfil: Perfil };
  chave: QueryKey;
  aoFechar: () => void;
  aoConcluir: (resultado: ResultadoDesligamento) => void;
}) {
  const cache = useQueryClient();
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const faltas = faltasQueContam(sessoes);
  // Momento em que o diálogo abriu: as sessões depois dele serão canceladas.
  const [agora] = useState(() => Date.now());
  const futuras = sessoes.filter(
    (s) =>
      (s.status === "agendada" || s.status === "confirmada") &&
      new Date(s.inicio).getTime() > agora,
  );

  async function confirmar() {
    setErro(null);
    setSalvando(true);
    try {
      const resultado = await api<ResultadoDesligamento>(
        `/casos/${casoId}/desligamento`,
        { method: "POST" },
      );
      await Promise.all([
        cache.invalidateQueries({ queryKey: chave }),
        cache.invalidateQueries({ queryKey: ["faltas", "alertas"] }),
      ]);
      aoConcluir(resultado);
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível registrar o desligamento.",
      );
      setSalvando(false);
    }
  }

  return (
    <Dialogo
      aberto
      alerta
      aoFechar={aoFechar}
      titulo="Desligar paciente por faltas"
      rodape={
        <>
          <Button type="button" variant="outline" onClick={aoFechar}>
            Voltar
          </Button>
          <Button
            type="button"
            variant="destructive"
            data-principal
            disabled={salvando}
            onClick={confirmar}
          >
            Confirmar desligamento
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {erro && <Aviso tipo="erro" titulo={erro} />}
        <p className="rounded-[10px] border border-border bg-muted px-3.5 py-2.5 text-[15px]">
          <span className="font-bold">{nome}</span> · inscrição {numero} · ciclo{" "}
          {ciclo}
          {desde && ` desde ${dataBr(desde)}`}
        </p>
        <div className="flex flex-col gap-2">
          <h3 className="text-[15px] font-bold">
            Faltas no ciclo (
            {faltas.length > LIMITE_FALTAS_CICLO
              ? `${faltas.length} faltas, limite de ${LIMITE_FALTAS_CICLO}`
              : `${faltas.length} de ${LIMITE_FALTAS_CICLO}`}
            )
          </h3>
          <ul className="flex flex-col gap-2">
            {faltas.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-2.5 rounded-lg border border-border bg-muted px-3 py-2 text-[15px]"
              >
                <AlertTriangle
                  aria-hidden
                  className="size-4 shrink-0 text-[#a85400]"
                />
                <span>
                  <span className="font-bold">{dataBr(s.inicio)}</span> ·{" "}
                  {titulo(s.falta!)}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <dl className="ui-resumo-caso">
          <div>
            <dt>Data da decisão</dt>
            <dd>{dataBr(new Date(agora).toISOString())} (hoje)</dd>
          </div>
          <div>
            <dt>Responsável pela decisão</dt>
            <dd>
              {responsavel.nome}
              {NOMES_PERFIL_DECISAO[responsavel.perfil] &&
                ` (${NOMES_PERFIL_DECISAO[responsavel.perfil]})`}
            </dd>
          </div>
        </dl>
        <div className="flex flex-col gap-1.5">
          <h3 className="text-[15px] font-bold">O que vai acontecer</h3>
          <ul className="list-disc pl-5 text-[15px] leading-relaxed">
            <li>
              O vínculo com {estagiario ?? "o estagiário"} será encerrado.
            </li>
            <li>
              {futuras.length === 0
                ? "Não há sessões futuras para cancelar."
                : `${futuras.length === 1 ? "A sessão futura será cancelada" : `As ${futuras.length} sessões futuras serão canceladas`} (${listaDeDatas(
                    futuras.map(
                      (s) =>
                        `${dataBr(s.inicio)}, às ${horaBr(new Date(s.inicio))}`,
                    ),
                  )}).`}
            </li>
            <li>A vaga ficará como vaga liberada aguardando realocação.</li>
          </ul>
        </div>
        <Aviso
          tipo="info"
          titulo="Nenhum inscrito da fila é vinculado automaticamente. A coordenação distribui o caso e o supervisor registra o novo vínculo."
        />
        {futuras.length > 0 && (
          <Aviso
            tipo="alerta"
            titulo="Avise o paciente sobre o desligamento e as sessões canceladas: o sistema não envia mensagem."
          />
        )}
      </div>
    </Dialogo>
  );
}

// Reversão do desligamento pela coordenação (RF38): motivo obrigatório e a escolha
// das faltas que deixam de contar. Se a contagem que sobra ainda atinge o limite, a
// reversão pede a confirmação de que o paciente volta com o limite atingido.
export function DialogoReverter({
  nome,
  numero,
  desligamento,
  sessoes,
  vaga,
  chave,
  aoFechar,
  aoConcluir,
}: {
  nome: string;
  numero: string;
  desligamento: DesligamentoDoCaso;
  sessoes: SessaoDoCiclo[];
  vaga: { estagiario: string; livre: boolean } | null;
  chave: QueryKey;
  aoFechar: () => void;
  aoConcluir: (resultado: ResultadoReversao) => void;
}) {
  const cache = useQueryClient();
  const faltas = faltasQueContam(sessoes);
  const [retiradas, setRetiradas] = useState<string[]>([]);
  const [motivo, setMotivo] = useState("");
  const [manter, setManter] = useState(false);
  const [erroMotivo, setErroMotivo] = useState<string>();
  const [erroManter, setErroManter] = useState<string>();
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const resultante = faltas.length - retiradas.length;
  const voltaNoLimite = resultante >= LIMITE_FALTAS_CICLO;

  const alternar = (id: string, marcada: boolean) =>
    setRetiradas((atuais) =>
      marcada ? [...atuais, id] : atuais.filter((r) => r !== id),
    );

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    const resultado = reversaoDesligamentoSchema.safeParse({
      motivo,
      faltasRetiradas: retiradas,
      manterContagem: voltaNoLimite && manter,
    });
    setErroMotivo(
      resultado.success ? undefined : resultado.error.issues[0]?.message,
    );
    const faltaConfirmar = voltaNoLimite && !manter;
    setErroManter(
      faltaConfirmar
        ? "Confirme que o paciente volta com o limite atingido, ou desconsidere uma falta."
        : undefined,
    );
    if (!resultado.success || faltaConfirmar) return;
    setSalvando(true);
    try {
      const resposta = await api<ResultadoReversao>(
        `/desligamentos/${desligamento.id}/reversao`,
        { method: "POST", body: JSON.stringify(resultado.data) },
      );
      await Promise.all([
        cache.invalidateQueries({ queryKey: chave }),
        cache.invalidateQueries({ queryKey: ["faltas", "alertas"] }),
        cache.invalidateQueries({ queryKey: ["vagas"] }),
      ]);
      aoConcluir(resposta);
    } catch (falha) {
      setErro(
        falha instanceof ErroApi || falha instanceof Error
          ? falha.message
          : "Não foi possível reverter o desligamento.",
      );
      setSalvando(false);
    }
  }

  const idFormulario = `reverter-${desligamento.id}`;
  return (
    <Dialogo
      aberto
      aoFechar={aoFechar}
      titulo="Reverter desligamento"
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
            Reverter desligamento
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
        <p className="rounded-[10px] border border-border bg-muted px-3.5 py-2.5 text-[15px]">
          <span className="font-bold">{nome}</span> · inscrição {numero}
          <span className="block">
            Desligado por faltas em {dataBr(desligamento.dataDecisao)} por{" "}
            {desligamento.decididoPor}
          </span>
        </p>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-[15px] font-bold">Faltas do ciclo</legend>
          <p className="ui-dica mb-1">
            Marque a falta que não deve contar. Ela continua no histórico,
            marcada como desconsiderada.
          </p>
          {faltas.map((s) => {
            const marcada = retiradas.includes(s.falta!.id);
            return (
              <div
                key={s.id}
                className={cn(
                  "flex flex-col gap-1.5 rounded-lg border px-3 py-2.5 text-[15px]",
                  marcada
                    ? "border-primary bg-info-fundo"
                    : "border-border bg-muted",
                )}
              >
                <span>
                  <span className="font-bold">{dataBr(s.inicio)}</span> ·{" "}
                  {titulo(s.falta!)}
                </span>
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={marcada}
                    onChange={(e) => alternar(s.falta!.id, e.target.checked)}
                    aria-label={`Desconsiderar a falta de ${dataBr(s.inicio)} na contagem`}
                    className="size-5 shrink-0 accent-primary"
                  />
                  Desconsiderar esta falta na contagem
                </label>
              </div>
            );
          })}
        </fieldset>
        <Campo rotulo="Motivo da reversão (obrigatório)" erro={erroMotivo}>
          {(props) => (
            <textarea
              {...props}
              value={motivo}
              maxLength={1000}
              onChange={(e) => setMotivo(e.target.value)}
              className={classeTextoLongo}
            />
          )}
        </Campo>
        {voltaNoLimite && (
          <div className="flex flex-col gap-2">
            <Aviso
              tipo="alerta"
              titulo={`Sem desconsiderar faltas, o paciente volta com ${resultante} faltas no ciclo, com o limite atingido, e o alerta aparece de novo.`}
            />
            <label className="flex cursor-pointer items-start gap-2.5 text-[15px]">
              <input
                type="checkbox"
                checked={manter}
                aria-invalid={erroManter ? true : undefined}
                aria-describedby={
                  erroManter ? `${idFormulario}-manter` : undefined
                }
                onChange={(e) => setManter(e.target.checked)}
                className="mt-0.5 size-5 shrink-0 accent-primary"
              />
              O paciente volta com o limite de faltas atingido
            </label>
            {erroManter && (
              <p
                id={`${idFormulario}-manter`}
                className="flex items-start gap-1.5 text-sm leading-[1.4] font-semibold text-destructive"
              >
                <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
                {erroManter}
              </p>
            )}
          </div>
        )}
        {vaga &&
          (vaga.livre ? (
            <Aviso
              tipo="info"
              titulo={`A vaga liberada ainda não foi ocupada. Ao reverter, o paciente volta para ${vaga.estagiario} e as sessões canceladas ficam para reagendar.`}
            />
          ) : (
            <Aviso
              tipo="alerta"
              titulo={`A vaga de ${vaga.estagiario} não está mais disponível. Ao reverter, o caso fica aguardando vaga, e o supervisor vincula um estagiário.`}
            />
          ))}
      </form>
    </Dialogo>
  );
}

// Sessões canceladas pelo desligamento que ficaram para reagendar depois da
// reversão (RF38). A secretaria e o estagiário abrem o agendamento (RF10).
export function SessoesAReagendar({
  casoId,
  sessoes,
  desligamento,
  podeAgendar,
}: {
  casoId: string;
  sessoes: SessaoAReagendar[];
  desligamento: DesligamentoDoCaso | undefined;
  podeAgendar: boolean;
}) {
  if (sessoes.length === 0) return null;
  return (
    <section aria-labelledby="sessoes-a-reagendar" className="ui-cartao">
      <h2 id="sessoes-a-reagendar" className="ui-h2">
        Sessões a reagendar
      </h2>
      <p className="ui-dica">
        {desligamento
          ? `Canceladas pelo desligamento de ${dataBr(desligamento.dataDecisao)}${desligamento.revertidoEm ? `, que foi revertido em ${dataBr(desligamento.revertidoEm)}` : ""}.`
          : "Canceladas pelo desligamento por faltas, que foi revertido."}
        {!podeAgendar &&
          " A secretaria e o estagiário reagendam em “Agendar sessão”."}
      </p>
      <ul className="flex flex-col gap-2">
        {sessoes.map((s) => (
          <li
            key={s.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3.5 py-2.5"
          >
            <span className="text-[15px]">
              <span className="font-bold">{dataHoraBr(s.inicio)}</span> ·{" "}
              {s.estagiario}
            </span>
            {podeAgendar ? (
              <Link
                href={`/agendar-sessao?caso=${casoId}`}
                aria-label={`Agendar sessão para reagendar a de ${dataHoraBr(s.inicio)}`}
                className={buttonVariants({
                  variant: "outline",
                  className: "max-sm:w-full",
                })}
              >
                Agendar sessão
              </Link>
            ) : (
              <span className="ui-selo border-dashed border-[#8a98a4] bg-white text-[#4a5864]">
                Cancelada · desligamento por faltas
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

// Histórico do caso: o desligamento e a reversão, com autor, data/hora e as faltas
// que fundamentaram a decisão (RF37, RF38). O motivo da reversão só aparece para a
// coordenação.
export function HistoricoDoCaso({
  desligamentos,
}: {
  desligamentos: DesligamentoDoCaso[];
}) {
  if (desligamentos.length === 0) return null;
  const faltas = (d: DesligamentoDoCaso) =>
    d.faltas.length ? ` Faltas: ${listaDeDatas(d.faltas.map(dataBr))}.` : "";
  return (
    <section aria-labelledby="historico-caso" className="ui-cartao">
      <h2 id="historico-caso" className="ui-h2">
        Histórico do caso
      </h2>
      <ol className="flex flex-col">
        {desligamentos.flatMap((d) => [
          d.revertidoEm ? (
            <li
              key={`${d.id}-reversao`}
              className="flex gap-2.5 border-b border-border py-3 text-[15px] first:pt-0 last:border-b-0 last:pb-0"
            >
              <Undo2
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-primary"
              />
              <p>
                <span className="font-bold">
                  Desligamento de {dataBr(d.dataDecisao)} · revertido
                </span>{" "}
                por {d.revertidoPor} em {dataHoraBr(d.revertidoEm)}
                {d.pendenteDeVaga && " · pendente de tratamento manual da vaga"}
                .{d.motivoReversao && ` Motivo: ${d.motivoReversao}`}
              </p>
            </li>
          ) : null,
          <li
            key={d.id}
            className="flex gap-2.5 border-b border-border py-3 text-[15px] first:pt-0 last:border-b-0 last:pb-0"
          >
            <UserX
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-primary"
            />
            <p>
              <span className="font-bold">Desligado por faltas</span> por{" "}
              {d.decididoPor} em {dataHoraBr(d.decididoEm)}.{faltas(d)}
            </p>
          </li>,
        ])}
      </ol>
    </section>
  );
}

// Vaga liberada pelo desligamento, aguardando um paciente novo (RF37), na
// Distribuição (coordenação) e em "Meus casos" (supervisor). Nenhum inscrito é
// vinculado sozinho.
export function CartaoVagaLiberada({
  vaga,
  supervisor,
}: {
  vaga: VagaLiberada;
  supervisor: boolean;
}) {
  return (
    <section
      aria-label={`Vaga liberada de ${vaga.estagiario}`}
      className="flex flex-col gap-4 rounded-[14px] border border-[#f0cf9f] border-l-4 border-l-[#a85400] bg-white p-4 shadow-[0_1px_2px_rgba(0,26,38,0.06)] md:p-5"
    >
      <div className="flex flex-wrap items-center gap-3">
        <span
          aria-hidden
          className="grid size-9 place-items-center rounded-lg border border-[#f0cf9f] bg-alerta-fundo text-[#a85400]"
        >
          <DoorOpen className="size-5" />
        </span>
        <h2 className="ui-h2 m-0">Vaga liberada aguardando realocação</h2>
        <span className="ui-selo border-[#f0cf9f] bg-alerta-fundo text-[#8a4600]">
          <Clock aria-hidden className="size-3.5" />
          Pendente
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[15px] md:grid-cols-4">
        {[
          ["Estagiário", vaga.estagiario],
          ["Supervisor", vaga.supervisor],
          ["Liberada em", dataBr(vaga.liberadaEm)],
          ["Origem", "Desligamento por faltas"],
        ].map(([rotulo, valor]) => (
          <div key={rotulo}>
            <dt className="ui-meta">{rotulo}</dt>
            <dd className="font-semibold">{valor}</dd>
          </div>
        ))}
      </dl>
      <div className="flex gap-3 rounded-[10px] border border-border bg-muted px-4 py-3">
        <ListOrdered
          aria-hidden
          className="mt-0.5 size-5 shrink-0 text-muted-foreground"
        />
        <div className="text-[15px]">
          <p className="ui-meta font-semibold">
            Próximo inscrito elegível da fila
          </p>
          <p className="font-semibold">
            A fila de espera ainda não está disponível no sistema.
          </p>
          <p className="ui-dica">
            {supervisor
              ? "Enquanto isso, a coordenação distribui o próximo caso, e você registra o vínculo dele com o estagiário."
              : "Enquanto isso, distribua o próximo caso pela lista de casos aguardando distribuição."}
          </p>
        </div>
      </div>
      <p className="ui-dica">
        Nenhum inscrito é vinculado automaticamente. A vaga deixa de ficar
        pendente quando{" "}
        {supervisor ? "você registrar" : "o supervisor registrar"} o vínculo do
        novo paciente com o estagiário.
      </p>
    </section>
  );
}
