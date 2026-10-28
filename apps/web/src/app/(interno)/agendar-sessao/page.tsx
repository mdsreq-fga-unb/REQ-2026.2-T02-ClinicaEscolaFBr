"use client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MessageCircle, UserRound } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useState } from "react";
import {
  PARAMETROS_PADRAO,
  type BlocoAgenda,
  type ConflitoAgendamento,
  type PacienteAgendavel,
  type ResultadoAgendamento,
} from "@clinica/shared";
import { Aviso } from "@/components/comum/aviso";
import { Campo, classeEntrada } from "@/components/comum/campo";
import { Dados } from "@/components/comum/dados";
import { Button, buttonVariants } from "@/components/ui/button";
import { api, ErroApi } from "@/lib/api";
import { dataBr, dataHoraBr, horaBr } from "@/lib/formato";
import { useSessao } from "@/lib/sessao";
import { cn } from "@/lib/utils";

// A tela mostra o término pela duração padrão; se a pessoa não o alterar, ele não é
// enviado e a API calcula com o parâmetro vigente (RF10).
const DURACAO = PARAMETROS_PADRAO.duracao_sessao_minutos;
const ANOTACOES = PARAMETROS_PADRAO.intervalo_anotacoes_minutos;

const SEM_VINCULO =
  "Não é possível agendar sessão para ele agora. O vínculo é feito pelo supervisor do caso.";

// "15:00" + 50 → "15:50", sem passar da meia-noite.
function somarMinutos(hora: string, minutos: number) {
  const [h, m] = hora.split(":").map(Number);
  const total = Math.min(h * 60 + m + minutos, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

// Data e hora digitadas, no horário de Brasília (UTC−3, sem horário de verão).
const emBrasilia = (data: string, hora: string) => `${data}T${hora}:00-03:00`;

const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0];

type Erros = Partial<
  Record<"paciente" | "data" | "inicio" | "termino", string>
>;

function BuscaPaciente({
  selecionado,
  aoSelecionar,
  erro,
}: {
  selecionado: PacienteAgendavel | null;
  aoSelecionar: (paciente: PacienteAgendavel | null) => void;
  erro?: string;
}) {
  const [busca, setBusca] = useState("");
  const termo = useDeferredValue(busca.trim());
  const lista = useQuery({
    queryKey: ["sessoes", "pacientes", termo],
    queryFn: () =>
      api<PacienteAgendavel[]>(
        `/sessoes/pacientes${termo ? `?busca=${encodeURIComponent(termo)}` : ""}`,
      ),
    enabled: !selecionado,
  });

  if (selecionado) {
    return (
      <div className="space-y-1">
        <p className="text-sm font-semibold">Paciente</p>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-input bg-card px-3 py-2">
          <span className="text-sm font-semibold">{selecionado.nome}</span>
          <Button
            type="button"
            variant="outline"
            onClick={() => aoSelecionar(null)}
          >
            Trocar paciente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Campo
        rotulo="Paciente"
        dica="Digite o nome para buscar. Só é possível agendar para pacientes com estagiário vinculado."
        erro={erro}
      >
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
      {lista.isError && (
        <Aviso tipo="erro" titulo="Não foi possível buscar os pacientes." />
      )}
      {lista.data && lista.data.length === 0 && (
        <p role="status" className="text-sm text-muted-foreground">
          Nenhum paciente encontrado.
        </p>
      )}
      {lista.data && lista.data.length > 0 && (
        <ul
          aria-label="Pacientes encontrados"
          className="max-h-60 divide-y divide-border overflow-y-auto rounded-md border border-border bg-card"
        >
          {lista.data.map((p) => (
            <li key={p.casoId}>
              <button
                type="button"
                onClick={() => aoSelecionar(p)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted focus-visible:bg-muted"
              >
                <span className="block font-semibold">{p.nome}</span>
                <span className="block text-xs text-muted-foreground">
                  {p.estagiario
                    ? `Estagiário: ${p.estagiario.nome}`
                    : "Sem estagiário vinculado"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Agenda do estagiário no dia: cada sessão ocupa o bloco com as anotações, sem o
// nome dos outros pacientes.
function AgendaDoDia({
  estagiario,
  data,
  nova,
}: {
  estagiario: { id: string; nome: string };
  data: string;
  nova: { paciente: string; inicio: string; termino: string } | null;
}) {
  const agenda = useQuery({
    queryKey: ["sessoes", "agenda", estagiario.id, data],
    queryFn: () =>
      api<BlocoAgenda[]>(
        `/sessoes/agenda?estagiarioId=${estagiario.id}&data=${data}`,
      ),
  });
  const titulo = `Agenda de ${estagiario.nome} em ${dataBr(data).slice(0, 5)}`;

  return (
    <aside
      aria-label={titulo}
      className="space-y-3 rounded-lg border border-border bg-card p-5"
    >
      <h2 className="text-lg font-semibold text-marca">{titulo}</h2>
      {agenda.isPending && <p role="status">Carregando a agenda…</p>}
      {agenda.isError && (
        <Aviso tipo="erro" titulo="Não foi possível carregar a agenda." />
      )}
      {agenda.data && (
        <ul className="space-y-2">
          {agenda.data.length === 0 && !nova && (
            <li className="text-sm text-muted-foreground">
              Nenhuma sessão agendada neste dia.
            </li>
          )}
          {agenda.data.map((b) => {
            const inicio = horaBr(new Date(b.inicio));
            const fim = horaBr(new Date(b.fimIntervaloAnotacoes));
            return (
              <li
                key={b.inicio}
                className="flex gap-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm"
              >
                <b className="min-w-24 tabular-nums">
                  {inicio}–{fim}
                </b>
                <span>
                  Sessão agendada
                  <span className="block text-xs text-muted-foreground">
                    Sessão {inicio}–{horaBr(new Date(b.termino))} · anotações
                    até {fim}
                  </span>
                </span>
              </li>
            );
          })}
          {nova && (
            <li className="flex gap-3 rounded-md border border-primary bg-info-fundo px-3 py-2 text-sm font-semibold">
              <b className="min-w-24 tabular-nums">
                {nova.inicio}–{somarMinutos(nova.termino, ANOTACOES)}
              </b>
              <span>
                Nova sessão ({primeiroNome(nova.paciente)})
                <span className="block text-xs font-normal text-muted-foreground">
                  Sessão {nova.inicio}–{nova.termino} · anotações até{" "}
                  {somarMinutos(nova.termino, ANOTACOES)}
                </span>
              </span>
            </li>
          )}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">
        Cada sessão ocupa a agenda até o fim das anotações. Os nomes de outros
        pacientes não são exibidos aqui.
      </p>
    </aside>
  );
}

function SessaoAgendada({
  resultado,
  aoAgendarOutra,
}: {
  resultado: ResultadoAgendamento;
  aoAgendarOutra: () => void;
}) {
  const [enviadaEm, setEnviadaEm] = useState<string | null>(null);
  const registro = useMutation({
    mutationFn: () =>
      api<{ mensagemWhatsappEm: string }>(`/sessoes/${resultado.id}/whatsapp`, {
        method: "POST",
      }),
    onSuccess: ({ mensagemWhatsappEm }) => setEnviadaEm(mensagemWhatsappEm),
  });
  const { whatsapp } = resultado;
  const nomeCanal = resultado.canal === "ligacao" ? "ligação" : "WhatsApp";

  return (
    <section
      aria-label="Sessão agendada"
      className="max-w-2xl space-y-5 rounded-lg border border-border bg-card p-6"
    >
      {resultado.canal === "email" &&
        (resultado.linkEnviadoPorEmail ? (
          <Aviso tipo="sucesso" titulo="Sessão agendada.">
            Link de confirmação enviado por e-mail.
          </Aviso>
        ) : (
          <Aviso tipo="alerta" titulo="Sessão agendada.">
            O e-mail com o link de confirmação não pôde ser enviado agora. Entre
            em contato com o paciente para confirmar a sessão.
          </Aviso>
        ))}
      {whatsapp &&
        (enviadaEm ? (
          <Aviso tipo="sucesso" titulo="Sessão agendada.">
            Mensagem aberta no WhatsApp em{" "}
            {dataHoraBr(enviadaEm).replace(", ", " às ")}.
          </Aviso>
        ) : (
          <Aviso tipo="info" titulo="Sessão agendada.">
            O canal preferencial de {primeiroNome(resultado.paciente)} é{" "}
            {nomeCanal}. Envie o link de confirmação para o celular{" "}
            {whatsapp.celular}.
          </Aviso>
        ))}
      <Dados
        colunas={2}
        itens={[
          ["Paciente", resultado.paciente],
          ["Estagiário", resultado.estagiario],
          ["Data", dataBr(resultado.inicio)],
          [
            "Horário",
            `${horaBr(new Date(resultado.inicio))} às ${horaBr(new Date(resultado.termino))}`,
          ],
        ]}
      />
      {whatsapp && (
        <div>
          <p className="mb-1 text-xs font-semibold text-muted-foreground">
            Mensagem pronta
          </p>
          <p className="rounded-md border border-border bg-muted/40 p-3 text-sm whitespace-pre-line [overflow-wrap:anywhere]">
            {whatsapp.mensagem}
          </p>
        </div>
      )}
      {registro.isError && (
        <Aviso tipo="alerta" titulo="Não foi possível registrar o envio.">
          A mensagem foi aberta, mas o horário do envio não ficou registrado.
        </Aviso>
      )}
      <div className="flex flex-wrap gap-2">
        {whatsapp && (
          <a
            href={whatsapp.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => registro.mutate()}
            className={cn(
              buttonVariants({
                size: "lg",
                variant: enviadaEm ? "outline" : "default",
              }),
            )}
          >
            <MessageCircle aria-hidden />
            {enviadaEm
              ? "Enviar pelo WhatsApp de novo"
              : "Enviar pelo WhatsApp"}
            <span className="sr-only"> (abre em nova aba)</span>
          </a>
        )}
        <Link
          href="/agenda"
          className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
        >
          Ver na agenda
        </Link>
        <Button size="lg" variant="outline" onClick={aoAgendarOutra}>
          Agendar outra sessão
        </Button>
      </div>
    </section>
  );
}

// Agendamento de sessão pela secretaria ou pelo estagiário responsável (RF10).
export default function AgendarSessaoPage() {
  const { data: sessao } = useSessao();
  const [paciente, setPaciente] = useState<PacienteAgendavel | null>(null);
  const [data, setData] = useState("");
  const [inicio, setInicio] = useState("");
  const [termino, setTermino] = useState("");
  const [terminoEditado, setTerminoEditado] = useState(false);
  const [erros, setErros] = useState<Erros>({});
  const [conflito, setConflito] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoAgendamento | null>(null);

  const agendamento = useMutation({
    mutationFn: (corpo: { casoId: string; inicio: string; termino?: string }) =>
      api<ResultadoAgendamento>("/sessoes", {
        method: "POST",
        body: JSON.stringify(corpo),
      }),
    onSuccess: setResultado,
    onError: (erro) => {
      if (!(erro instanceof ErroApi)) return;
      if (erro.status === 409) {
        const corpo = erro.corpo as ConflitoAgendamento | null;
        setConflito(erro.message.replace(/^Conflito de horário\.\s*/, ""));
        const livre = corpo?.primeiroHorarioLivre
          ? ` Primeiro horário livre: ${horaBr(new Date(corpo.primeiroHorarioLivre))}.`
          : " Não há horário livre neste dia.";
        let motivo = "Este horário está ocupado.";
        if (corpo?.blocoOcupado) {
          const de = horaBr(new Date(corpo.blocoOcupado.inicio));
          const ate = horaBr(new Date(corpo.blocoOcupado.fim));
          const bloco = `bloco ocupado das ${de} às ${ate} (${corpo.conflito === "estagiario" ? "sessão + anotações" : "sessão do paciente"})`;
          motivo =
            inicio >= de && inicio < ate
              ? `O início às ${inicio} cai no ${bloco}.`
              : `A sessão das ${inicio} às ${termino} invade o ${bloco}.`;
        }
        setErros({ inicio: `${motivo}${livre}` });
      } else if (erro.status === 422 && erro.message.startsWith("O término")) {
        setErros({ termino: erro.message });
      }
    },
  });

  if (
    sessao &&
    sessao.perfil !== "secretaria" &&
    sessao.perfil !== "estagiario"
  ) {
    return (
      <Aviso
        tipo="erro"
        titulo="Acesso restrito à secretaria e aos estagiários."
      />
    );
  }

  const recomecar = () => {
    setResultado(null);
    setPaciente(null);
    setData("");
    setInicio("");
    setTermino("");
    setTerminoEditado(false);
    setErros({});
    setConflito(null);
    agendamento.reset();
  };

  if (resultado) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <h1 className="text-2xl font-semibold text-marca">Agendar sessão</h1>
        <SessaoAgendada resultado={resultado} aoAgendarOutra={recomecar} />
      </div>
    );
  }

  const limparRetorno = () => {
    setConflito(null);
    agendamento.reset();
  };

  const mudarInicio = (valor: string) => {
    setInicio(valor);
    if (!terminoEditado && valor) setTermino(somarMinutos(valor, DURACAO));
    setErros({ ...erros, inicio: undefined });
    limparRetorno();
  };

  const enviar = (evento: React.FormEvent) => {
    evento.preventDefault();
    const novos: Erros = {};
    if (!paciente) novos.paciente = "Escolha o paciente.";
    if (!data) novos.data = "Informe a data.";
    if (!inicio) novos.inicio = "Informe o início.";
    if (!termino) {
      novos.termino = "Informe o término.";
    } else if (inicio && termino <= inicio) {
      novos.termino = `O término precisa ser depois do início (${inicio}). Exemplo: ${somarMinutos(inicio, DURACAO)}.`;
    }
    setErros(novos);
    setConflito(null);
    if (Object.keys(novos).length > 0 || !paciente?.estagiario) return;
    agendamento.mutate({
      casoId: paciente.casoId,
      inicio: emBrasilia(data, inicio),
      ...(terminoEditado ? { termino: emBrasilia(data, termino) } : {}),
    });
  };

  const semVinculo = paciente !== null && !paciente.estagiario;
  // Conflito e término inválido já aparecem junto dos campos.
  const erroNosCampos =
    agendamento.error instanceof ErroApi &&
    (agendamento.error.status === 409 || !!erros.termino);
  const erroGeral = erroNosCampos ? null : agendamento.error;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-marca">Agendar sessão</h1>
        <p className="text-sm text-muted-foreground">
          Atendimento presencial na clínica: {DURACAO} minutos de sessão e{" "}
          {ANOTACOES} minutos de anotações. O paciente recebe um link para
          confirmar a sessão pelo canal preferencial.
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <form
          noValidate
          onSubmit={enviar}
          className="space-y-5 rounded-lg border border-border bg-card p-6"
        >
          <BuscaPaciente
            selecionado={paciente}
            erro={erros.paciente}
            aoSelecionar={(p) => {
              setPaciente(p);
              setErros({ ...erros, paciente: undefined });
              limparRetorno();
            }}
          />

          {semVinculo && (
            <Aviso
              tipo="alerta"
              titulo={`${paciente.nome} ainda não tem estagiário vinculado.`}
            >
              {SEM_VINCULO}
            </Aviso>
          )}

          {paciente?.estagiario && (
            <div className="space-y-1">
              <p className="text-sm font-semibold">Estagiário responsável</p>
              <p className="flex items-center gap-2 rounded-md border border-dashed border-input bg-muted/40 px-3 py-2 text-sm font-semibold">
                <UserRound
                  aria-hidden
                  className="size-4 text-muted-foreground"
                />
                {paciente.estagiario.nome}
              </p>
              <p className="text-xs text-muted-foreground">
                Preenchido pelo vínculo do caso.
              </p>
            </div>
          )}

          {conflito && (
            <Aviso tipo="erro" titulo="Conflito de horário.">
              {conflito}
            </Aviso>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <Campo rotulo="Data" erro={erros.data}>
              {(props) => (
                <input
                  {...props}
                  type="date"
                  className={classeEntrada}
                  value={data}
                  onChange={(e) => {
                    setData(e.target.value);
                    setErros({ ...erros, data: undefined });
                    limparRetorno();
                  }}
                />
              )}
            </Campo>
            <Campo rotulo="Início" erro={erros.inicio}>
              {(props) => (
                <input
                  {...props}
                  type="time"
                  className={classeEntrada}
                  value={inicio}
                  onChange={(e) => mudarInicio(e.target.value)}
                />
              )}
            </Campo>
            <Campo rotulo="Término" erro={erros.termino}>
              {(props) => (
                <input
                  {...props}
                  type="time"
                  className={classeEntrada}
                  aria-invalid={
                    props["aria-invalid"] ?? (conflito ? true : undefined)
                  }
                  value={termino}
                  onChange={(e) => {
                    setTermino(e.target.value);
                    setTerminoEditado(true);
                    setErros({ ...erros, termino: undefined });
                    limparRetorno();
                  }}
                />
              )}
            </Campo>
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">
            O término é calculado automaticamente (início + {DURACAO} minutos).
            Você pode alterá-lo. Depois do término, a agenda reserva mais{" "}
            {ANOTACOES} minutos para as anotações do estagiário.
          </p>

          {erroGeral && (
            <Aviso tipo="erro" titulo="Não foi possível agendar a sessão.">
              {erroGeral instanceof ErroApi
                ? erroGeral.message
                : "Verifique a conexão e tente novamente."}
            </Aviso>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="lg"
              variant="outline"
              onClick={recomecar}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="lg"
              disabled={agendamento.isPending || semVinculo}
            >
              {agendamento.isPending ? "Agendando…" : "Agendar sessão"}
            </Button>
          </div>
        </form>

        {paciente?.estagiario && data && (
          <AgendaDoDia
            estagiario={paciente.estagiario}
            data={data}
            nova={
              inicio && termino && termino > inicio
                ? { paciente: paciente.nome, inicio, termino }
                : null
            }
          />
        )}
      </div>
    </div>
  );
}
