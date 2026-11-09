"use client";

import { Mail } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  conferenciaCodigoSchema,
  pedidoCodigoSchema,
  SEGUNDOS_ENTRE_ENVIOS,
  type VerificacaoAtual,
} from "@clinica/shared";
import { Aviso } from "@/components/comum/aviso";
import base from "@/components/inscricao/inscricao.module.css";
import { api, ErroApi } from "@/lib/api";
import { horaBr } from "@/lib/formato";
import styles from "./verificacao.module.css";

type Etapa = "carregando" | "identificacao" | "codigo" | "confirmada";
type Mensagem = {
  tipo: "sucesso" | "erro" | "alerta" | "info";
  titulo: string;
  texto: string;
  // Muda a cada mensagem, para o aviso receber o foco de novo (RNF24).
  chave: number;
};

const ERRO_CODIGO = "Digite os 6 números do código mais recente.";

// Maior espera que o setTimeout aceita; acima disso, ele dispara na hora.
const MAIOR_ESPERA = 2_147_483_647;

const tempo = (segundos: number) =>
  `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, "0")}`;

// Aviso para quem informou só o celular: o código vai só por e-mail (DF24).
function SoCelular() {
  return (
    <p className={styles.nota}>
      <strong>Informou só o celular na inscrição?</strong> O código vai apenas
      por e-mail. Para consultar a fila ou pedir uma declaração, procure a
      secretaria da clínica.
    </p>
  );
}

// Verificação de identidade do paciente ou do responsável (RF52): CPF ou
// número da inscrição e o código enviado ao e-mail cadastrado. Depois da
// verificação, mostra o conteúdo da feature que a usa (posição na fila, RF8;
// declarações, CP10), recebido em `children`.
export function VerificacaoIdentidade({
  children,
}: {
  children?: (verificacao: VerificacaoAtual) => ReactNode;
}) {
  const [etapa, setEtapa] = useState<Etapa>("carregando");
  const [identificador, setIdentificador] = useState("");
  const [codigo, setCodigo] = useState("");
  const [erroCampo, setErroCampo] = useState("");
  const [mensagem, setMensagem] = useState<Mensagem | null>(null);
  const [reenvioEm, setReenvioEm] = useState<number | null>(null);
  const [bloqueadoAte, setBloqueadoAte] = useState<Date | null>(null);
  const [verificacao, setVerificacao] = useState<VerificacaoAtual | null>(null);
  const [enviando, setEnviando] = useState(false);
  // O relógio só é usado depois de um pedido, quando é acertado: começar em 0
  // deixa a página ser pré-renderizada sem a hora do build.
  const [agora, setAgora] = useState(0);
  const campo = useRef<HTMLInputElement>(null);
  const titulo = useRef<HTMLHeadingElement>(null);
  const focarCampo = useRef(false);

  const avisar = (m: Omit<Mensagem, "chave">) =>
    setMensagem({ ...m, chave: Date.now() });

  // Quem já confirmou a identidade e volta à página continua liberado até o
  // fim do prazo da verificação.
  useEffect(() => {
    let ativo = true;
    api<VerificacaoAtual>("/verificacao")
      .then((atual) => {
        if (!ativo) return;
        setVerificacao(atual);
        setEtapa("confirmada");
      })
      .catch(() => ativo && setEtapa("identificacao"));
    return () => {
      ativo = false;
    };
  }, []);

  // A tela encerra a consulta sozinha quando a verificação vence. O servidor já
  // recusa o acesso depois do prazo, mas os dados não podem continuar à vista
  // numa aba esquecida aberta, num computador compartilhado (RNF6).
  useEffect(() => {
    if (etapa !== "confirmada" || !verificacao) return;
    const expira = new Date(verificacao.expiraEm).getTime();
    let espera: ReturnType<typeof setTimeout>;
    const expirar = () => {
      setVerificacao(null);
      setIdentificador("");
      setCodigo("");
      setReenvioEm(null);
      setEtapa("identificacao");
      setMensagem({
        tipo: "alerta",
        titulo: "A consulta expirou.",
        texto:
          "Por segurança, a consulta fica liberada por 15 minutos. Para consultar de novo, peça um novo código.",
        chave: Date.now(),
      });
    };
    const agendar = () => {
      const restante = expira - Date.now();
      espera =
        restante <= 0
          ? setTimeout(expirar)
          : setTimeout(agendar, Math.min(restante, MAIOR_ESPERA));
    };
    agendar();
    return () => clearTimeout(espera);
  }, [etapa, verificacao]);

  // Contagem do reenvio e do bloqueio, segundo a segundo.
  const esperando =
    (reenvioEm !== null && reenvioEm > agora) ||
    (bloqueadoAte !== null && bloqueadoAte.getTime() > agora);
  useEffect(() => {
    if (!esperando) return;
    const relogio = setInterval(() => setAgora(Date.now()), 1_000);
    return () => clearInterval(relogio);
  }, [esperando]);

  useEffect(() => {
    if (!focarCampo.current) return;
    focarCampo.current = false;
    campo.current?.focus();
  });

  const bloqueado = bloqueadoAte !== null && bloqueadoAte.getTime() > agora;
  const segundosReenvio =
    reenvioEm === null
      ? 0
      : Math.max(0, Math.ceil((reenvioEm - agora) / 1_000));

  // Respostas 429 da API: o intervalo de 60 segundos ou o bloqueio de 60
  // minutos depois de 3 códigos.
  function tratarLimite(erro: ErroApi) {
    const ate = erro.corpo?.bloqueadoAte;
    if (typeof ate === "string") {
      const fim = new Date(ate);
      setBloqueadoAte(fim);
      setAgora(Date.now());
      setEtapa("identificacao");
      avisar({
        tipo: "alerta",
        titulo: "Muitos pedidos de código.",
        texto: `Por segurança, novos pedidos para este CPF ou número ficam suspensos até as ${horaBr(fim)}. Se precisar antes, procure a secretaria.`,
      });
      return;
    }
    const segundos = Number(erro.corpo?.segundosRestantes) || 1;
    setReenvioEm(Date.now() + segundos * 1_000);
    setAgora(Date.now());
    setEtapa("codigo");
    avisar({
      tipo: "info",
      titulo: "Aguarde para pedir um novo código.",
      texto: `O último código foi enviado há pouco. Você pode pedir outro em ${tempo(segundos)}.`,
    });
  }

  async function pedirCodigo() {
    setEnviando(true);
    try {
      await api("/verificacao/codigo", {
        method: "POST",
        body: JSON.stringify({ identificador }),
      });
      setEtapa("codigo");
      setCodigo("");
      setErroCampo("");
      setReenvioEm(Date.now() + SEGUNDOS_ENTRE_ENVIOS * 1_000);
      setAgora(Date.now());
      avisar({
        tipo: "sucesso",
        titulo: "Pedido recebido.",
        texto:
          "Se a inscrição tiver e-mail cadastrado, enviamos para ele um código de 6 dígitos. O código vale por 10 minutos.",
      });
      focarCampo.current = true;
    } catch (erro) {
      if (erro instanceof ErroApi && erro.status === 429) tratarLimite(erro);
      else
        avisar({
          tipo: "erro",
          titulo: "Não foi possível pedir o código.",
          texto: "Tente de novo em instantes.",
        });
    } finally {
      setEnviando(false);
    }
  }

  async function enviarIdentificador(event: FormEvent) {
    event.preventDefault();
    if (enviando || bloqueado) return;
    const lido = pedidoCodigoSchema.safeParse({ identificador });
    if (!lido.success) {
      setErroCampo(lido.error.issues[0].message);
      campo.current?.focus();
      return;
    }
    setErroCampo("");
    setMensagem(null);
    await pedirCodigo();
  }

  async function conferir(event: FormEvent) {
    event.preventDefault();
    if (enviando) return;
    if (!conferenciaCodigoSchema.safeParse({ identificador, codigo }).success) {
      setErroCampo(ERRO_CODIGO);
      campo.current?.focus();
      return;
    }
    setEnviando(true);
    try {
      const atual = await api<VerificacaoAtual>("/verificacao/conferir", {
        method: "POST",
        body: JSON.stringify({ identificador, codigo }),
      });
      setVerificacao(atual);
      setMensagem(null);
      setEtapa("confirmada");
      setTimeout(() => titulo.current?.focus());
    } catch {
      setCodigo("");
      setErroCampo(ERRO_CODIGO);
      avisar({
        tipo: "erro",
        titulo: "Código inválido ou expirado.",
        texto: "Confira o código no e-mail ou peça um novo.",
      });
    } finally {
      setEnviando(false);
    }
  }

  // Só diz que a consulta foi encerrada quando o servidor confirma. Se a
  // chamada falhar, a verificação continua valendo, e a pessoa precisa saber
  // disso para tentar de novo antes de deixar o computador.
  async function encerrar() {
    if (enviando || !verificacao) return;
    setEnviando(true);
    try {
      await api("/verificacao/encerrar", { method: "POST" });
    } catch {
      avisar({
        tipo: "erro",
        titulo: "Não foi possível encerrar a consulta.",
        texto: `Tente de novo em instantes. Até lá, a consulta continua liberada neste navegador até as ${horaBr(new Date(verificacao.expiraEm))}.`,
      });
      return;
    } finally {
      setEnviando(false);
    }
    setVerificacao(null);
    setIdentificador("");
    setCodigo("");
    setReenvioEm(null);
    setEtapa("identificacao");
    avisar({
      tipo: "info",
      titulo: "Consulta encerrada.",
      texto: "Para consultar de novo, peça um novo código.",
    });
  }

  function usarOutro() {
    setEtapa("identificacao");
    setCodigo("");
    setErroCampo("");
    setMensagem(null);
    focarCampo.current = true;
  }

  // Os avisos de erro e de alerta recebem o foco (RNF24). O de código enviado
  // não: o foco vai para o campo do código, como no protótipo, e o aviso é lido
  // junto com o campo.
  const aviso = mensagem && (
    <div id="aviso-verificacao">
      <Aviso
        key={mensagem.chave}
        tipo={mensagem.tipo}
        titulo={mensagem.titulo}
        focar={mensagem.tipo !== "sucesso"}
      >
        {mensagem.texto}
      </Aviso>
    </div>
  );
  const descricaoCodigo = [
    mensagem?.tipo === "sucesso" ? "aviso-verificacao" : "",
    "codigo-dica",
    erroCampo ? "codigo-erro" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const naEtapaCodigo = etapa === "codigo";

  return (
    <div className={base.pagina}>
      <a href="#conteudo-consulta" className={base.pular}>
        Ir para o conteúdo
      </a>
      <header className={base.cabecalho}>
        <span className={base.marca} aria-hidden="true">
          FBr
        </span>
        <div>
          <strong>Clínica Escola de Psicologia</strong>
          <span>Faculdade Brasília</span>
        </div>
      </header>
      <aside className={base.emergencia} aria-label="Contatos de emergência">
        <span className={base.icone} aria-hidden="true">
          !
        </span>
        <p>
          Em situação de crise ou risco, ligue para o{" "}
          <a href="tel:188">CVV (188)</a> ou para o{" "}
          <a href="tel:192">SAMU (192)</a>.
        </p>
      </aside>
      <main
        id="conteudo-consulta"
        className={`${base.conteudo} ${styles.estreito}`}
      >
        {etapa === "carregando" ? (
          <p role="status">Carregando…</p>
        ) : etapa === "confirmada" && verificacao ? (
          <>
            <h1 ref={titulo} tabIndex={-1}>
              Consultar minha inscrição
            </h1>
            <Aviso tipo="sucesso" titulo="Identidade confirmada.">
              Inscrição {verificacao.numero}. A consulta fica liberada até as{" "}
              {horaBr(new Date(verificacao.expiraEm))}; depois disso, peça um
              novo código.
            </Aviso>
            {children?.(verificacao)}
            {aviso}
            <div className={styles.botoes}>
              <button
                type="button"
                className={base.secundario}
                onClick={encerrar}
                disabled={enviando}
              >
                Encerrar consulta
              </button>
            </div>
          </>
        ) : (
          <>
            <div>
              <ol className={styles.passos} aria-label="Etapas da consulta">
                <li aria-current={naEtapaCodigo ? undefined : "step"}>
                  1. Identificação
                </li>
                <li aria-current={naEtapaCodigo ? "step" : undefined}>
                  2. Código
                </li>
              </ol>
              <h1>
                {naEtapaCodigo
                  ? "Informe o código"
                  : "Consultar minha inscrição"}
              </h1>
              {!naEtapaCodigo && (
                <p className={base.lead}>
                  Para proteger seus dados, pedimos um código enviado ao e-mail
                  informado na inscrição. Se você é o responsável legal, use os
                  dados do paciente.
                </p>
              )}
            </div>
            {aviso}
            {naEtapaCodigo ? (
              <form className={base.cartao} onSubmit={conferir} noValidate>
                <div className={base.campo}>
                  <label htmlFor="codigo">Código de 6 dígitos</label>
                  <p className={base.dica} id="codigo-dica">
                    Confira também a caixa de spam.
                  </p>
                  <input
                    ref={campo}
                    id="codigo"
                    name="codigo"
                    className={styles.campoCodigo}
                    value={codigo}
                    onChange={(e) =>
                      setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                    aria-invalid={!!erroCampo}
                    aria-describedby={descricaoCodigo}
                  />
                  {erroCampo && (
                    <p className={base.erroCampo} id="codigo-erro">
                      {erroCampo}
                    </p>
                  )}
                </div>
                <div className={styles.botoes}>
                  <button
                    type="submit"
                    className={base.primario}
                    disabled={enviando}
                  >
                    Confirmar
                  </button>
                  <button
                    type="button"
                    className={base.secundario}
                    onClick={pedirCodigo}
                    disabled={enviando || segundosReenvio > 0}
                  >
                    {segundosReenvio > 0
                      ? `Reenviar código (em ${tempo(segundosReenvio)})`
                      : "Reenviar código"}
                  </button>
                </div>
                <button
                  type="button"
                  className={styles.link}
                  onClick={usarOutro}
                >
                  Usar outro CPF ou número
                </button>
                <SoCelular />
              </form>
            ) : (
              <form
                className={base.cartao}
                onSubmit={enviarIdentificador}
                noValidate
              >
                <div className={base.campo}>
                  <label htmlFor="identificador">
                    CPF ou número da inscrição
                  </label>
                  <p className={base.dica} id="identificador-dica">
                    Exemplos: 000.000.000-00 ou 2026-00487
                  </p>
                  <input
                    ref={campo}
                    id="identificador"
                    name="identificador"
                    value={identificador}
                    onChange={(e) => {
                      setIdentificador(e.target.value);
                      if (bloqueadoAte) setBloqueadoAte(null);
                    }}
                    autoComplete="off"
                    maxLength={40}
                    required
                    aria-invalid={!!erroCampo}
                    aria-describedby={
                      erroCampo
                        ? "identificador-dica identificador-erro"
                        : "identificador-dica"
                    }
                  />
                  {erroCampo && (
                    <p className={base.erroCampo} id="identificador-erro">
                      {erroCampo}
                    </p>
                  )}
                </div>
                <div className={styles.botoes}>
                  <button
                    type="submit"
                    className={base.primario}
                    disabled={enviando || bloqueado}
                  >
                    <Mail
                      aria-hidden
                      className="mr-2 inline size-4 align-[-2px]"
                    />
                    {bloqueado && bloqueadoAte
                      ? `Enviar código (disponível às ${horaBr(bloqueadoAte)})`
                      : "Enviar código"}
                  </button>
                </div>
                <SoCelular />
              </form>
            )}
          </>
        )}
      </main>
      <footer className={base.rodape}>
        Clínica Escola de Psicologia da Faculdade Brasília · Atendimento
        presencial
      </footer>
    </div>
  );
}
