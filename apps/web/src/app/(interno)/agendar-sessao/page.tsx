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
      <div className="flex flex-col gap-1.5">
        <p className="ui-rotulo">Paciente</p>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border-[1.5px] border-input bg-white py-1 pr-1 pl-3">
          <span className="text-[15px] font-semibold">{selecionado.nome}</span>
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
    <div className="flex flex-col gap-2">
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
        <p role="status" className="ui-dica">
          Nenhum paciente encontrado.
        </p>
      )}
      {lista.data && lista.data.length > 0 && (
        <ul
          aria-label="Pacientes encontrados"
          className="max-h-60 divide-y divide-border overflow-y-auto rounded-lg border border-[#c3cfd8] bg-white shadow-[0_8px_24px_rgba(0,42,61,0.12)]"
        >
          {lista.data.map((p) => (
            <li key={p.casoId}>
              <button
                type="button"
                onClick={() => aoSelecionar(p)}
                className="min-h-11 w-full px-3.5 py-2 text-left text-[15px] hover:bg-muted focus-visible:bg-muted"
              >
                <span className="block font-semibold">{p.nome}</span>
                <span className="block text-[13px] text-muted-foreground">
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
    <aside aria-label={titulo} className="ui-cartao gap-3.5">
      <h2 className="ui-h2">{titulo}</h2>
      {agenda.isPending && <p role="status">Carregando a agenda…</p>}
      {agenda.isError && (
        <Aviso tipo="erro" titulo="Não foi possível carregar a agenda." />
      )}
      {agenda.data && (
        <ul className="flex flex-col gap-2">
          {agenda.data.length === 0 && !nova && (
            <li className="ui-dica">Nenhuma sessão agendada neste dia.</li>
          )}
          {agenda.data.map((b) => {
            const inicio = horaBr(new Date(b.inicio));
            const fim = horaBr(new Date(b.fimIntervaloAnotacoes));
            return (
              <li
                key={b.inicio}
                className="flex items-center gap-3 rounded-lg border border-border bg-muted px-3 py-2.5 text-sm"
              >
                <b className="min-w-24 tabular-nums">
                  {inicio}–{fim}
                </b>
                <span>
                  Sessão agendada
                  <span className="block text-[13px] text-muted-foreground">
                    Sessão {inicio}–{horaBr(new Date(b.termino))} · anotações
                    até {fim}
                  </span>
                </span>
              </li>
            );
          })}
          {nova && (
            <li className="flex items-center gap-3 rounded-lg border border-primary bg-accent px-3 py-2.5 text-sm font-semibold">
              <b className="min-w-24 tabular-nums">
                {nova.inicio}–{somarMinutos(nova.termino, ANOTACOES)}
              </b>
              <span>
                Nova sessão ({primeiroNome(nova.paciente)})
                <span className="block text-[13px] font-normal text-muted-foreground">
                  Sessão {nova.inicio}–{nova.termino} · anotações até{" "}
                  {somarMinutos(nova.termino, ANOTACOES)}
                </span>
              </span>
            </li>
          )}
        </ul>
      )}
      <p className="ui-dica">
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
    <section aria-label="Sessão agendada" className="ui-cartao max-w-[640px]">
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
          <p className="mb-1.5 text-[13px] font-semibold text-muted-foreground">
            Mensagem pronta
          </p>
          <p className="rounded-[10px] border border-border bg-muted px-4 py-3.5 text-sm leading-[1.55] whitespace-pre-line [overflow-wrap:anywhere]">
            {whatsapp.mensagem}
          </p>
        </div>
      )}
      {registro.isError && (
        <Aviso tipo="alerta" titulo="Não foi possível registrar o envio.">
          A mensagem foi aberta, mas o horário do envio não ficou registrado.
        </Aviso>
      )}
      <div className="flex flex-wrap gap-3">
        {whatsapp && (
          <a
            href={whatsapp.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => registro.mutate()}
            className={cn(
              buttonVariants({
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
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Ver na agenda
        </Link>
        <Button variant="outline" onClick={aoAgendarOutra}>
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
      <div className="flex flex-col gap-6">
        <h1 className="ui-titulo">Agendar sessão</h1>
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
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="ui-titulo">Agendar sessão</h1>
        <p className="ui-subtitulo">
          Atendimento presencial na clínica: {DURACAO} minutos de sessão e{" "}
          {ANOTACOES} minutos de anotações. O paciente recebe um link para
          confirmar a sessão pelo canal preferencial.
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <form noValidate onSubmit={enviar} className="ui-cartao">
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
            <div className="flex flex-col gap-1.5">
              <p className="ui-rotulo">Estagiário responsável</p>
              <p className="flex h-11 items-center gap-2 rounded-lg border border-dashed border-[#c3cfd8] bg-muted px-3 text-[15px] font-semibold">
                <UserRound
                  aria-hidden
                  className="size-4 text-muted-foreground"
                />
                {paciente.estagiario.nome}
              </p>
              <p className="ui-dica">Preenchido pelo vínculo do caso.</p>
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
          <p className="ui-dica -mt-2">
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

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={recomecar}>
              Cancelar
            </Button>
            <Button
              type="submit"
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
