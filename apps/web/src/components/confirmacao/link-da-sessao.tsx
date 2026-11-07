"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Check,
  Clock,
  Link2Off,
  MapPin,
  Phone,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  cancelamentoPeloLinkSchema,
  LIMITE_FALTAS_CICLO,
  LIMITE_JUSTIFICATIVA_CANCELAMENTO,
  type SessaoCanceladaPeloLink,
  type SessaoDoLink,
} from "@clinica/shared";
import { Aviso } from "@/components/comum/aviso";
import { Campo, classeTextoLongo } from "@/components/comum/campo";
import { Button } from "@/components/ui/button";
import { api, ErroApi } from "@/lib/api";
import {
  dataBr,
  diaDaSemanaBr,
  duracaoPorExtenso,
  horaBr,
} from "@/lib/formato";

const quando = (valor: string) =>
  `${diaDaSemanaBr(valor)}, às ${horaBr(new Date(valor))}`;
const comInicialMaiuscula = (texto: string) =>
  `${texto.charAt(0).toUpperCase()}${texto.slice(1)}`;

// Moldura pública da página do link: cabeçalho da clínica, contatos de emergência e
// rodapé, de 320 a 1920 pixels (RNF58).
function Moldura({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[calc(100dvh-var(--altura-faixa,0px))] flex-col">
      <header className="flex items-center gap-3 bg-marca px-4 py-3 text-white md:px-12 md:py-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-[10px] bg-white text-[15px] font-extrabold text-primary">
          FBr
        </span>
        <span className="leading-tight">
          <span className="block text-base font-bold">
            Clínica Escola de Psicologia
          </span>
          <span className="block text-[13px] text-[#cfe3ec]">
            Faculdade Brasília
          </span>
        </span>
      </header>
      <aside
        aria-label="Contatos de emergência"
        className="flex items-center gap-3 border-b border-[#f0cf9f] bg-alerta-fundo px-4 py-2.5 text-[15px] md:px-12"
      >
        <span
          aria-hidden
          className="grid size-7 shrink-0 place-items-center rounded-full bg-[#a85400] text-white"
        >
          <Phone className="size-3.5" />
        </span>
        <p>
          Em situação de crise ou risco, ligue para o{" "}
          <a href="tel:188" className="font-bold underline">
            CVV (188)
          </a>{" "}
          ou para o{" "}
          <a href="tel:192" className="font-bold underline">
            SAMU (192)
          </a>
          .
        </p>
      </aside>
      <main
        id="conteudo"
        className="flex w-full flex-1 justify-center px-4 pt-6 pb-10 md:pt-10"
      >
        <div className="flex w-full max-w-[520px] flex-col gap-5">
          {children}
        </div>
      </main>
      <footer className="border-t border-border px-4 py-4 text-sm text-muted-foreground md:px-12">
        Clínica Escola de Psicologia da Faculdade Brasília · Atendimento
        presencial
      </footer>
    </div>
  );
}

const cartao =
  "flex flex-col gap-4 rounded-[12px] border border-border bg-card px-4 py-5 md:p-6";

function DadosDaSessao({ inicio }: { inicio: string }) {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="flex items-start gap-2.5 font-bold text-marca">
        <CalendarDays aria-hidden className="mt-0.5 size-5 shrink-0" />
        {comInicialMaiuscula(quando(inicio))}
      </p>
      <p className="flex items-start gap-2.5 text-[15px]">
        <MapPin aria-hidden className="mt-0.5 size-5 shrink-0" />
        Atendimento presencial na Clínica Escola FBr
      </p>
    </div>
  );
}

// "Não vou poder ir": vale até o início da sessão, também depois de confirmar ou
// de o prazo de confirmação acabar (RF15).
function BotaoCancelar({ aoCancelar }: { aoCancelar: () => void }) {
  return (
    <Button
      type="button"
      size="lg"
      variant="outline"
      className="w-full sm:w-fit"
      onClick={aoCancelar}
    >
      Não vou poder ir: cancelar sessão
    </Button>
  );
}

// Link inexistente, vencido ou de sessão cancelada: nenhum dado da sessão (RNF59).
function LinkInvalido() {
  return (
    <div className={`${cartao} items-center py-8 text-center md:py-10`}>
      <span
        aria-hidden
        className="grid size-14 place-items-center rounded-full border border-border bg-muted"
      >
        <Link2Off className="size-6" />
      </span>
      <h1 className="text-2xl font-bold text-marca">
        Este link não é mais válido
      </h1>
      <p>
        Para falar sobre a sua sessão, procure a secretaria da Clínica Escola.
      </p>
    </div>
  );
}

function PresencaConfirmada({
  inicio,
  focar,
  aoCancelar,
}: {
  inicio: string;
  focar: boolean;
  aoCancelar: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Depois de confirmar, o botão some: o foco vai para o resultado, e o leitor de
  // tela o anuncia (RNF24).
  useEffect(() => {
    if (focar) ref.current?.focus();
  }, [focar]);
  return (
    <div ref={ref} tabIndex={-1} className={cartao}>
      <span className="ui-selo w-fit border-[#a9cfe0] bg-info-fundo text-marca">
        <Check aria-hidden className="size-3.5" />
        Presença confirmada
      </span>
      <p>
        Obrigado! Sua presença na sessão de {quando(inicio)} está confirmada.
      </p>
      <DadosDaSessao inicio={inicio} />
      <BotaoCancelar aoCancelar={aoCancelar} />
    </div>
  );
}

function PrazoEncerrado({
  sessao,
  aoCancelar,
}: {
  sessao: SessaoDoLink;
  aoCancelar: () => void;
}) {
  const prazo = new Date(sessao.prazoConfirmacao);
  return (
    <div className={cartao}>
      <DadosDaSessao inicio={sessao.inicio} />
      <div className="flex items-start gap-2.5 rounded-[10px] border border-[#f0cf9f] bg-alerta-fundo p-3.5 text-[15px]">
        <Clock aria-hidden className="mt-0.5 size-5 shrink-0 text-[#a85400]" />
        <p>
          <strong className="block">Prazo de confirmação encerrado.</strong>O
          prazo para confirmar a presença pelo site terminou às {horaBr(prazo)}{" "}
          de {dataBr(sessao.prazoConfirmacao)}. Se você vai à sessão, procure a
          secretaria da Clínica Escola.
        </p>
      </div>
      <BotaoCancelar aoCancelar={aoCancelar} />
    </div>
  );
}

function ConfirmarPresenca({
  sessao,
  confirmando,
  erro,
  aoConfirmar,
  aoCancelar,
}: {
  sessao: SessaoDoLink;
  confirmando: boolean;
  erro: string | null;
  aoConfirmar: () => void;
  aoCancelar: () => void;
}) {
  return (
    <div className={cartao}>
      <DadosDaSessao inicio={sessao.inicio} />
      <hr className="border-border" />
      <p className="flex items-start gap-2.5 text-[15px]">
        <Clock aria-hidden className="mt-0.5 size-5 shrink-0" />
        <span>
          Confirme a sua presença até{" "}
          <strong>{quando(sessao.prazoConfirmacao)}</strong>.
        </span>
      </p>
      {erro && <Aviso tipo="erro" titulo={erro} />}
      {/* Um clique basta para confirmar (RNF15). */}
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          size="lg"
          className="w-full sm:w-fit"
          disabled={confirmando}
          onClick={aoConfirmar}
        >
          <Check aria-hidden className="size-4" />
          Confirmar presença
        </Button>
        <BotaoCancelar aoCancelar={aoCancelar} />
      </div>
    </div>
  );
}

const SEM_JUSTIFICATIVA = "Escreva o motivo do cancelamento.";

// Cancelamento pelo paciente (RF15), com a justificativa obrigatória. O aviso da
// falta usa a antecedência mínima vigente (DF20).
function CancelarSessao({
  caminho,
  sessao,
  aoConcluir,
  aoVoltar,
  aoMudarSituacao,
}: {
  caminho: string;
  sessao: SessaoDoLink;
  aoConcluir: (resultado: SessaoCanceladaPeloLink) => void;
  aoVoltar: () => void;
  aoMudarSituacao: () => void;
}) {
  const campo = useRef<HTMLTextAreaElement>(null);
  const [justificativa, setJustificativa] = useState("");
  const [erroCampo, setErroCampo] = useState<string>();
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // O formulário toma o lugar do botão que o abriu: o foco vai para o campo.
  useEffect(() => {
    campo.current?.focus();
  }, []);

  const indicarCampo = () => {
    setErroCampo(SEM_JUSTIFICATIVA);
    campo.current?.focus();
  };

  async function cancelar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    const dados = cancelamentoPeloLinkSchema.safeParse({ justificativa });
    if (!dados.success) {
      indicarCampo();
      return;
    }
    setErroCampo(undefined);
    setEnviando(true);
    try {
      aoConcluir(
        await api<SessaoCanceladaPeloLink>(`${caminho}/cancelar`, {
          method: "POST",
          body: JSON.stringify(dados.data),
        }),
      );
    } catch (falha) {
      setEnviando(false);
      // Link usado, vencido ou sessão já começada: a página mostra a situação atual.
      if (falha instanceof ErroApi && falha.status === 404) {
        aoMudarSituacao();
      } else if (falha instanceof ErroApi && falha.status === 400) {
        indicarCampo();
      } else {
        setErro(
          "Não foi possível cancelar a sessão. Verifique a sua conexão e tente de novo.",
        );
      }
    }
  }

  return (
    <form noValidate onSubmit={cancelar} className={cartao}>
      {erro && <Aviso tipo="erro" titulo={erro} />}
      <Campo
        publico
        rotulo="Por que você precisa cancelar? (obrigatório)"
        dica="Exemplo: consulta médica marcada no mesmo horário."
        erro={erroCampo}
      >
        {(props) => (
          <textarea
            {...props}
            ref={campo}
            value={justificativa}
            maxLength={LIMITE_JUSTIFICATIVA_CANCELAMENTO}
            onChange={(e) => setJustificativa(e.target.value)}
            className={`${classeTextoLongo} min-h-[120px] text-base`}
          />
        )}
      </Campo>
      <Aviso
        tipo="alerta"
        titulo={`Cancelamentos feitos com menos de ${duracaoPorExtenso(sessao.antecedenciaMinimaMinutos)} de antecedência contam como falta. ${LIMITE_FALTAS_CICLO} faltas no ciclo de atendimento levam ao desligamento.`}
      />
      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          size="lg"
          variant="destructive"
          className="w-full sm:w-fit"
          disabled={enviando}
        >
          Confirmar cancelamento
        </Button>
        <Button
          type="button"
          size="lg"
          variant="outline"
          className="w-full sm:w-fit"
          onClick={aoVoltar}
        >
          Voltar
        </Button>
      </div>
    </form>
  );
}

// Depois do cancelamento, nenhum botão: o link não permite outra operação (RNF59).
// O foco vai para o resultado, que o leitor de tela anuncia (RNF24).
function SessaoCancelada({
  resultado,
}: {
  resultado: SessaoCanceladaPeloLink;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <div ref={ref} tabIndex={-1} className={cartao}>
      <span className="ui-selo w-fit border-dashed border-[#8a98a4] bg-white text-[#4a5864]">
        <X aria-hidden className="size-3.5" />
        Sessão cancelada
      </span>
      <p>
        Sua sessão de {quando(resultado.inicio)} foi cancelada. Para marcar
        outro horário, fale com a secretaria.
      </p>
      {resultado.contaComoFalta && (
        <Aviso
          tipo="alerta"
          titulo="Como o cancelamento foi feito com menos antecedência que o mínimo, ele conta como falta."
        />
      )}
    </div>
  );
}

function Titulo({
  titulo,
  subtitulo,
  focar = false,
}: {
  titulo: string;
  subtitulo: string;
  focar?: boolean;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focar) ref.current?.focus();
  }, [focar]);
  return (
    <div>
      <h1
        ref={ref}
        tabIndex={focar ? -1 : undefined}
        className="text-2xl leading-[1.25] font-bold text-marca md:text-[28px]"
      >
        {titulo}
      </h1>
      <p className="text-muted-foreground">{subtitulo}</p>
    </div>
  );
}

// Página do link da sessão: o paciente confirma com um clique (RF14) ou cancela com
// a justificativa (RF15), e a página informa cada situação.
export function LinkDaSessao({ token }: { token: string }) {
  const cache = useQueryClient();
  const chave = ["link-da-sessao", token];
  const caminho = `/confirmacao/${encodeURIComponent(token)}`;
  const [acabouDeConfirmar, setAcabouDeConfirmar] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [voltouDoCancelamento, setVoltouDoCancelamento] = useState(false);
  const [cancelada, setCancelada] = useState<SessaoCanceladaPeloLink | null>(
    null,
  );

  const consulta = useQuery({
    queryKey: chave,
    queryFn: () => api<SessaoDoLink>(caminho),
    retry: false,
    // Depois do cancelamento, o link não vale mais: a página fica com o resultado.
    enabled: !cancelada,
  });
  const confirmacao = useMutation({
    mutationFn: () =>
      api<SessaoDoLink>(`${caminho}/confirmar`, { method: "POST" }),
    onSuccess: (sessao) => {
      cache.setQueryData(chave, sessao);
      setAcabouDeConfirmar(true);
    },
    // A situação mudou desde que a página abriu (já confirmada, prazo encerrado ou
    // link inválido): a página passa a mostrar a situação atual, em vez do erro.
    onError: (erro) => {
      if (erro instanceof ErroApi && [404, 409, 422].includes(erro.status)) {
        void cache.invalidateQueries({ queryKey: chave });
      }
    },
  });

  if (cancelada) {
    return (
      <Moldura>
        <Titulo
          titulo="Sua sessão na Clínica Escola"
          subtitulo={`Olá, ${cancelada.primeiroNome}.`}
        />
        <SessaoCancelada resultado={cancelada} />
      </Moldura>
    );
  }
  if (consulta.isPending) {
    return (
      <Moldura>
        <p role="status">Carregando…</p>
      </Moldura>
    );
  }
  // Só a resposta do servidor diz que o link é inválido; uma falha de conexão não pode
  // dizer isso ao paciente, nem esconder os dados que a página já tem.
  if (consulta.error instanceof ErroApi && consulta.error.status === 404) {
    return (
      <Moldura>
        <LinkInvalido />
      </Moldura>
    );
  }
  if (!consulta.data) {
    return (
      <Moldura>
        <h1 className="text-2xl font-bold text-marca">
          Sua sessão na Clínica Escola
        </h1>
        <Aviso tipo="erro" titulo="Não foi possível abrir os dados da sessão.">
          Verifique a sua conexão e tente de novo.
        </Aviso>
        <Button
          type="button"
          size="lg"
          className="w-full sm:w-fit"
          onClick={() => void consulta.refetch()}
        >
          Tentar de novo
        </Button>
      </Moldura>
    );
  }

  const sessao = consulta.data;
  const abrirCancelamento = () => {
    confirmacao.reset();
    setAcabouDeConfirmar(false);
    setCancelando(true);
  };
  if (cancelando) {
    return (
      <Moldura>
        <Titulo
          titulo="Cancelar a sua sessão"
          subtitulo={`Olá, ${sessao.primeiroNome}. Sessão de ${quando(sessao.inicio)}.`}
        />
        <CancelarSessao
          caminho={caminho}
          sessao={sessao}
          aoConcluir={setCancelada}
          aoVoltar={() => {
            setCancelando(false);
            setVoltouDoCancelamento(true);
          }}
          aoMudarSituacao={() => {
            setCancelando(false);
            void cache.invalidateQueries({ queryKey: chave });
          }}
        />
      </Moldura>
    );
  }

  const situacaoMudou =
    confirmacao.error instanceof ErroApi &&
    [404, 409, 422].includes(confirmacao.error.status);
  return (
    <Moldura>
      <Titulo
        titulo="Sua sessão na Clínica Escola"
        subtitulo={`Olá, ${sessao.primeiroNome}.`}
        focar={voltouDoCancelamento}
      />
      {sessao.situacao === "confirmada" ? (
        <PresencaConfirmada
          inicio={sessao.inicio}
          focar={acabouDeConfirmar}
          aoCancelar={abrirCancelamento}
        />
      ) : sessao.podeConfirmar ? (
        <ConfirmarPresenca
          sessao={sessao}
          confirmando={confirmacao.isPending || consulta.isFetching}
          erro={
            confirmacao.isError && !situacaoMudou
              ? "Não foi possível confirmar a presença. Verifique a sua conexão e tente de novo."
              : null
          }
          aoConfirmar={() => confirmacao.mutate()}
          aoCancelar={abrirCancelamento}
        />
      ) : (
        <PrazoEncerrado sessao={sessao} aoCancelar={abrirCancelamento} />
      )}
    </Moldura>
  );
}
