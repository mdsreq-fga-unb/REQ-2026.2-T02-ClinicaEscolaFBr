"use client";
import { useMutation } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  MOTIVOS_SEM_DECLARACAO,
  type DeclaracaoComparecimento,
  type RecusaDeclaracao,
} from "@clinica/shared";
import { Aviso } from "@/components/comum/aviso";
import { Button, buttonVariants } from "@/components/ui/button";
import { api, ErroApi } from "@/lib/api";
import { dataBr, dataHoraBr, dataPorExtensoBr, horaBr } from "@/lib/formato";

// Declaração de comparecimento (RF45, prancha 8-3). A API devolve só os dados; o
// texto da declaração é desta tela. O modelo, quem assina e o CRP aguardam a FBr
// (pontos a confirmar do Ciclo 6): até lá, o texto segue a prancha.

// Atributo que marca o botão "Emitir declaração" de cada sessão na lista.
const ATRIBUTO_SESSAO = "data-emitir-sessao";

// Devolve o foco ao botão da sessão depois do "Voltar" da pré-visualização. A
// lista tem a tabela e os cartões do celular, e só um dos dois aparece.
function focarBotaoDaSessao(sessaoId: string) {
  const botoes = Array.from(
    document.querySelectorAll<HTMLElement>(`[${ATRIBUTO_SESSAO}]`),
  ).filter((b) => b.getAttribute(ATRIBUTO_SESSAO) === sessaoId);
  const visivel = botoes.find((b) => b.getClientRects().length > 0);
  (visivel ?? botoes[0])?.focus();
}

type AvisoDaEmissao =
  | { tipo: "recusa"; recusa: RecusaDeclaracao }
  | { tipo: "falha" }
  | { tipo: "sem_verificacao" };

// A emissão a partir da lista de sessões: a chamada à API, a pré-visualização e
// os avisos. A rota muda com quem emite (paciente verificado ou secretaria). Cada
// emissão é um registro novo (RNF39): por isso só um pedido por vez.
export function useEmissaoDeclaracao({
  caminho,
  aoNaoAutenticado,
}: {
  caminho: (sessaoId: string) => string;
  // 401: no paciente, pede a verificação de novo; sem isto, a tela pede o login.
  aoNaoAutenticado?: () => void;
}) {
  const [previa, setPrevia] = useState<DeclaracaoComparecimento | null>(null);
  const [negado, setNegado] = useState(false);
  const [aviso, setAviso] = useState<AvisoDaEmissao | null>(null);
  // Muda a cada pedido, para o aviso receber o foco de novo se se repetir.
  const [tentativa, setTentativa] = useState(0);
  const ultima = useRef<string | null>(null);

  const limparRecusa = useCallback(
    (motivo: RecusaDeclaracao["motivo"]) =>
      setAviso((atual) =>
        atual?.tipo === "recusa" && atual.recusa.motivo === motivo
          ? null
          : atual,
      ),
    [],
  );

  const mutacao = useMutation({
    mutationFn: (sessaoId: string) =>
      api<DeclaracaoComparecimento>(caminho(sessaoId), {
        method: "POST",
        cache: "no-store",
      }),
    onSuccess: setPrevia,
    onError: (erro) => {
      if (erro instanceof ErroApi) {
        if (erro.status === 401) {
          if (aoNaoAutenticado) aoNaoAutenticado();
          else setAviso({ tipo: "sem_verificacao" });
          return;
        }
        if (erro.status === 403) {
          setNegado(true);
          return;
        }
        const motivo = erro.corpo?.motivo;
        if (
          erro.status === 422 &&
          MOTIVOS_SEM_DECLARACAO.some((m) => m === motivo)
        ) {
          setAviso({
            tipo: "recusa",
            recusa: {
              message: erro.message,
              motivo: motivo as RecusaDeclaracao["motivo"],
            },
          });
          return;
        }
      }
      setAviso({ tipo: "falha" });
    },
  });

  return {
    previa,
    negado,
    aviso,
    tentativa,
    // Id da sessão em emissão; enquanto houver uma, os botões ficam desabilitados.
    emitindo: mutacao.isPending ? (mutacao.variables ?? null) : null,
    emitir(sessaoId: string) {
      if (mutacao.isPending) return;
      ultima.current = sessaoId;
      setAviso(null);
      setTentativa((t) => t + 1);
      mutacao.mutate(sessaoId);
    },
    // Tira o aviso da recusa com esse motivo: quando a causa deixa de existir (a
    // autorização foi registrada na mesma ficha), o aviso vermelho não fica mais
    // dizendo que a declaração não sai. Outros avisos continuam.
    limparRecusa,
    voltar() {
      setPrevia(null);
      setNegado(false);
      const sessaoId = ultima.current;
      if (sessaoId) setTimeout(() => focarBotaoDaSessao(sessaoId));
    },
  };
}

export type EmissaoDeclaracao = ReturnType<typeof useEmissaoDeclaracao>;

// Avisos da emissão que não saiu (prancha 8-3): a mensagem da 422 já vem pronta.
// Sessão sem presença é alerta amarelo; menor sem a autorização, aviso vermelho.
export function AvisoDaEmissao({ emissao }: { emissao: EmissaoDeclaracao }) {
  const { aviso, tentativa } = emissao;
  if (!aviso) return null;
  if (aviso.tipo === "recusa") {
    const { motivo, message } = aviso.recusa;
    return motivo === "autorizacao_pendente" ? (
      <Aviso
        key={tentativa}
        tipo="erro"
        focar
        titulo="A declaração não pode ser emitida para o responsável."
      >
        <p>{message}</p>
      </Aviso>
    ) : (
      <Aviso key={tentativa} tipo="alerta" focar titulo={message} />
    );
  }
  if (aviso.tipo === "sem_verificacao")
    return (
      <Aviso
        key={tentativa}
        tipo="erro"
        focar
        titulo="Entre de novo para emitir a declaração."
      >
        <p>Sua sessão expirou.</p>
        <Link
          href="/entrar"
          className={buttonVariants({ variant: "outline", className: "mt-2" })}
        >
          Entrar
        </Link>
      </Aviso>
    );
  return (
    <Aviso
      key={tentativa}
      tipo="erro"
      focar
      titulo="Não foi possível emitir a declaração."
    >
      <p>Tente de novo em instantes.</p>
    </Aviso>
  );
}

// Acesso negado (403): sessão de outro paciente ou perfil sem permissão. A API
// registra a tentativa (RNF39), e a tela informa o horário, como no RNF25.
export function DeclaracaoNegada({ aoVoltar }: { aoVoltar: () => void }) {
  const titulo = useId();
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const [registradoEm] = useState(() => new Date().toISOString());
  useEffect(() => tituloRef.current?.focus(), []);
  return (
    <section
      aria-labelledby={titulo}
      className="ui-cartao mx-auto w-full max-w-[640px] gap-2"
    >
      <Lock aria-hidden className="size-5 text-primary" />
      <h2
        id={titulo}
        ref={tituloRef}
        tabIndex={-1}
        className="ui-h2 outline-none"
      >
        Você não pode emitir esta declaração
      </h2>
      <p className="ui-dica">
        A declaração é emitida só para as sessões da própria inscrição, pelo
        paciente ou responsável com identidade confirmada, ou pela secretaria.
      </p>
      <p className="ui-meta">
        Tentativa registrada em {dataHoraBr(registradoEm)}.
      </p>
      <Button
        variant="outline"
        className="w-fit max-sm:w-full"
        onClick={aoVoltar}
      >
        Voltar
      </Button>
    </section>
  );
}

// "CRP 01/12345", ou a linha em branco para preencher à mão quando o supervisor
// ainda não tem o número no cadastro (RF53).
const linhaCrp = (crp: string | null) => `CRP ${crp ?? "____________"}`;

// A folha da declaração, sem dado clínico (RNF6): o nome do paciente, a data, o
// horário e o estagiário, com a indicação de atendimento psicológico. A classe
// `folha-declaracao` é a que o estilo de impressão (globals.css) mantém na página.
export function FolhaDeclaracao({
  declaracao,
}: {
  declaracao: DeclaracaoComparecimento;
}) {
  const titulo = useId();
  const tituloRef = useRef<HTMLHeadingElement>(null);
  // O leitor de tela começa pelo título do documento, e não pelo fim da página.
  useEffect(() => tituloRef.current?.focus(), []);
  const { paciente, sessao, estagiario, psicologoResponsavel, emitidaEm } =
    declaracao;
  return (
    <article
      aria-labelledby={titulo}
      className="folha-declaracao mx-auto flex w-full max-w-[794px] flex-col gap-8 border border-border bg-white px-6 py-10 font-serif text-[16px] leading-[1.7] text-black shadow-sm sm:px-16 sm:py-16"
    >
      <p className="m-0 font-sans text-[14px] font-bold text-marca">
        Clínica Escola de Psicologia · Faculdade Brasília
      </p>
      <h2
        id={titulo}
        ref={tituloRef}
        tabIndex={-1}
        className="m-0 text-center font-sans text-[20px] font-bold uppercase outline-none"
      >
        Declaração de comparecimento
      </h2>
      <p className="m-0">
        Declaramos, para os devidos fins, que <strong>{paciente}</strong>{" "}
        compareceu a atendimento psicológico na Clínica Escola de Psicologia da
        Faculdade Brasília no dia <strong>{dataBr(sessao.inicio)}</strong>, às{" "}
        <strong>{horaBr(new Date(sessao.inicio))}</strong>, realizado pelo(a)
        estagiário(a) de Psicologia <strong>{estagiario}</strong>.
      </p>
      <p className="m-0">Brasília, {dataPorExtensoBr(emitidaEm)}.</p>
      <div className="mt-6 flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1 border-t border-black pt-1.5 text-center text-[14px] leading-[1.5]">
          <p className="m-0">{psicologoResponsavel.nome}</p>
          <p className="m-0">
            Psicólogo(a) responsável · {linhaCrp(psicologoResponsavel.crp)}
          </p>
        </div>
        <div
          aria-hidden
          className="flex h-[100px] w-full items-center justify-center rounded-md border border-dashed border-[#75848f] p-3 text-center font-sans text-[13px] leading-[1.4] text-muted-foreground sm:w-[200px] sm:shrink-0"
        >
          Carimbo do psicólogo responsável
        </div>
      </div>
    </article>
  );
}

// Pré-visualização para imprimir (prancha 8-3): a folha e os botões "Voltar" e
// "Imprimir". Só se imprime: não há download nem envio por e-mail (RF45).
export function PreVisualizacaoDeclaracao({
  declaracao,
  aoVoltar,
}: {
  declaracao: DeclaracaoComparecimento;
  aoVoltar: () => void;
}) {
  return (
    <section
      aria-label="Pré-visualização da declaração de comparecimento"
      className="flex flex-col gap-4"
    >
      <FolhaDeclaracao declaracao={declaracao} />
      <div className="mx-auto flex w-full max-w-[794px] flex-col-reverse gap-3 sm:flex-row sm:justify-end max-sm:[&>*]:w-full">
        <Button variant="outline" onClick={aoVoltar}>
          Voltar
        </Button>
        <Button onClick={() => window.print()}>Imprimir</Button>
      </div>
    </section>
  );
}
