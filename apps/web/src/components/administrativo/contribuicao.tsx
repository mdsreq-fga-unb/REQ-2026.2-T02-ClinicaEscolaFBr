"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Check, Clock, History } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  centavosDoCampo,
  centavosParaCampo,
  correcaoContribuicaoSchema,
  FORMAS_PAGAMENTO,
  formatarCentavos,
  NOMES_FORMA_PAGAMENTO,
  PRAZO_CONTRIBUICAO_DIAS,
  registroContribuicaoSchema,
  type CicloAnteriorContribuicao,
  type FormaPagamento,
  type SituacaoContribuicao,
  type VersaoContribuicao,
} from "@clinica/shared";
import { Aviso } from "@/components/comum/aviso";
import { BotaoComMotivo } from "@/components/comum/botao-com-motivo";
import {
  Campo,
  classeEntrada,
  classeTextoLongo,
} from "@/components/comum/campo";
import { Button } from "@/components/ui/button";
import { api, ErroApi } from "@/lib/api";
import { dataBr, dataHoraBr, hojeBr } from "@/lib/formato";
import { cn } from "@/lib/utils";

type Campos = "valorCentavos" | "pagoEm" | "forma" | "motivo";
type Erros = Partial<Record<Campos, string>>;
type Modo = "ver" | "registrar" | "corrigir";
type Retorno =
  | { tipo: "registrado" | "corrigido" }
  | { tipo: "ja_pago"; pagoEm: string | null };

// Selo com ícone e texto, sem depender só da cor (RNF1, RNF56).
const SELOS = {
  pendente: {
    texto: "Pendente",
    classe: "border-[#f0cf9f] bg-alerta-fundo text-[#8a4600]",
    Icone: Clock,
  },
  efetivada: {
    texto: "Efetivada",
    classe: "border-[#a3d4b3] bg-[#e5f4ea] text-[#1b5e33]",
    Icone: Check,
  },
  anterior: {
    texto: "Versão anterior",
    classe: "border-[#c3cfd8] bg-[#eef1f4] text-[#4a5864]",
    Icone: History,
  },
} as const;

export function Selo({
  tipo,
  texto,
}: {
  tipo: keyof typeof SELOS;
  texto?: string;
}) {
  const { classe, Icone, texto: padrao } = SELOS[tipo];
  return (
    <span className={cn("ui-selo w-fit", classe)}>
      <Icone aria-hidden className="size-3.5 shrink-0" />
      {texto ?? padrao}
    </span>
  );
}

const quando = (iso: string) => dataHoraBr(iso).replace(", ", ", às ");

// "Registrado por… em…" na versão 1; "Corrigido por… em…. Motivo: …" nas correções.
function Autoria({ versao }: { versao: VersaoContribuicao }) {
  return (
    <p className="ui-dica m-0">
      {versao.versao === 1
        ? `Registrado por ${versao.registradoPor} em ${quando(versao.registradoEm)}.`
        : `Corrigido por ${versao.registradoPor} em ${quando(versao.registradoEm)}. Motivo: ${versao.motivoCorrecao}`}
    </p>
  );
}

// Erros de validação devolvidos pela API (400), por campo.
function errosDaApi(erro: ErroApi): Erros {
  const erros: Erros = {};
  const lista = erro.corpo?.message;
  if (!Array.isArray(lista)) return erros;
  for (const item of lista as { path?: unknown[]; message?: string }[]) {
    const campo = item.path?.[0] as Campos | undefined;
    if (campo && item.message) erros[campo] ??= item.message;
  }
  return erros;
}

// Cartão "Contribuição social · Ciclo N" da ficha do paciente, para a secretaria
// (RF41, prancha 8-1): a situação no ciclo atual, com o prazo quando pendente, e o
// registro e a correção do pagamento, que abrem no lugar do cartão. A versão
// anterior fica abaixo da vigente. O sistema só registra o pagamento já recebido
// pela secretaria; ele não cobra nem transita valores. A coordenação vê o mesmo
// cartão só para leitura (RNF36), sem registrar nem corrigir. Abaixo, os
// pagamentos dos ciclos anteriores do caso, só para consulta.
export function CartaoContribuicao({
  casoId,
  nome,
  somenteLeitura = false,
}: {
  casoId: string;
  nome: string;
  somenteLeitura?: boolean;
}) {
  const chave = ["casos", casoId, "contribuicao"];
  const cliente = useQueryClient();
  const titulo = useId();
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const [modo, setModo] = useState<Modo>("ver");
  const [retorno, setRetorno] = useState<Retorno | null>(null);
  const consulta = useQuery({
    queryKey: chave,
    queryFn: () => api<SituacaoContribuicao>(`/casos/${casoId}/contribuicao`),
    retry: false,
  });

  // Ao abrir ou fechar o formulário sem aviso, o foco vai para o título, para o
  // leitor de tela não ficar num botão que sumiu.
  const primeiro = useRef(true);
  useEffect(() => {
    if (primeiro.current) {
      primeiro.current = false;
      return;
    }
    if (modo !== "ver" || !retorno) tituloRef.current?.focus();
  }, [modo, retorno]);

  const abrir = (novo: Modo) => {
    setRetorno(null);
    setModo(novo);
  };
  const concluir = (dados: SituacaoContribuicao, tipo: Retorno) => {
    cliente.setQueryData(chave, dados);
    setRetorno(tipo);
    setModo("ver");
  };

  const s = consulta.data;
  if (consulta.isPending)
    return (
      <section className="ui-cartao" aria-busy>
        <p role="status">Carregando a contribuição social…</p>
      </section>
    );
  if (!s)
    return (
      <section className="ui-cartao">
        <Aviso
          tipo="erro"
          titulo="Não foi possível carregar a contribuição social."
        >
          Atualize a página para tentar de novo.
        </Aviso>
      </section>
    );

  const cabecalho = (texto: string) => (
    <h2
      id={titulo}
      ref={tituloRef}
      tabIndex={-1}
      className="ui-h2 outline-none"
    >
      {texto}
    </h2>
  );

  const atualizar = () => void cliente.invalidateQueries({ queryKey: chave });

  if (modo === "registrar" && !somenteLeitura)
    return (
      <section aria-labelledby={titulo} className="ui-cartao">
        {cabecalho(`Registrar pagamento de ${nome}`)}
        <FormularioPagamento
          casoId={casoId}
          situacao={s}
          aoCancelar={() => setModo("ver")}
          aoConcluir={(dados) => concluir(dados, { tipo: "registrado" })}
          aoJaPago={(pagoEm) => {
            setRetorno({ tipo: "ja_pago", pagoEm });
            setModo("ver");
            atualizar();
          }}
          aoMudar={atualizar}
        />
      </section>
    );

  if (modo === "corrigir" && s.vigente && !somenteLeitura)
    return (
      <section aria-labelledby={titulo} className="ui-cartao">
        {cabecalho("Corrigir pagamento")}
        <FormularioPagamento
          casoId={casoId}
          situacao={s}
          vigente={s.vigente}
          aoCancelar={() => setModo("ver")}
          aoConcluir={(dados) => concluir(dados, { tipo: "corrigido" })}
          aoJaPago={() => undefined}
          aoMudar={atualizar}
        />
      </section>
    );

  const v = s.vigente;
  const hoje = hojeBr();
  return (
    <section aria-labelledby={titulo} className="ui-cartao gap-4">
      {cabecalho(`Contribuição social · Ciclo ${s.cicloAtendimento}`)}
      {retorno?.tipo === "ja_pago" && (
        <Aviso
          tipo="erro"
          focar
          titulo="Este ciclo já tem pagamento registrado."
        >
          A contribuição foi paga em {dataBr(retorno.pagoEm)}. Se houver erro no
          registro, use “Corrigir pagamento”.
        </Aviso>
      )}
      {retorno?.tipo === "registrado" && (
        <Aviso tipo="sucesso" focar titulo="Pagamento registrado.">
          A contribuição social do ciclo {s.cicloAtendimento} está efetivada.
        </Aviso>
      )}
      {retorno?.tipo === "corrigido" && (
        <Aviso tipo="sucesso" focar titulo="Correção registrada.">
          A versão anterior continua guardada e aparece abaixo da atual.
        </Aviso>
      )}
      {!v ? (
        <>
          <Selo tipo="pendente" />
          {s.prazo ? (
            <p className="m-0 text-[15px]">
              Prazo para pagar: {s.prazo.ate < hoje ? "encerrado em " : "até "}
              {dataBr(s.prazo.ate)} ({PRAZO_CONTRIBUICAO_DIAS} dias corridos a
              partir do vínculo com o estagiário, em{" "}
              {dataBr(s.prazo.vinculadoEm)}).
            </p>
          ) : (
            <p className="m-0 text-[15px]">
              A contribuição só é devida depois do vínculo do paciente com um
              estagiário.
            </p>
          )}
          {s.prazo && !somenteLeitura && (
            <Button
              className="w-fit max-sm:w-full"
              onClick={() => abrir("registrar")}
            >
              Registrar pagamento
            </Button>
          )}
        </>
      ) : (
        <>
          <Selo tipo="efetivada" />
          <dl className="grid gap-x-6 gap-y-3.5 sm:grid-cols-3">
            {(
              [
                ["Valor", formatarCentavos(v.valorCentavos)],
                ["Data do pagamento", dataBr(v.pagoEm)],
                ["Forma de pagamento", NOMES_FORMA_PAGAMENTO[v.forma]],
              ] as const
            ).map(([rotulo, valor]) => (
              <div key={rotulo}>
                <dt className="text-[13px] font-semibold text-muted-foreground">
                  {rotulo}
                </dt>
                <dd className="mt-0.5 text-[15px] font-semibold">{valor}</dd>
              </div>
            ))}
          </dl>
          <Autoria versao={v} />
          {s.anteriores.length > 0 && (
            <VersoesAnteriores
              versoes={s.anteriores}
              rotulo="Versões anteriores do pagamento"
              className="border-t border-border pt-4"
            />
          )}
          {!somenteLeitura && (
            <Button
              variant="outline"
              className="w-fit max-sm:w-full"
              onClick={() => abrir("corrigir")}
            >
              Corrigir pagamento
            </Button>
          )}
        </>
      )}
      {s.cicloAtendimento > 1 && (
        <CiclosAnteriores ciclos={s.ciclosAnteriores} />
      )}
    </section>
  );
}

// "R$ 35,00 · 09/11/2026 · Pix".
const resumo = (v: VersaoContribuicao) =>
  `${formatarCentavos(v.valorCentavos)} · ${dataBr(v.pagoEm)} · ${NOMES_FORMA_PAGAMENTO[v.forma]}`;

// Versões anteriores de um pagamento, da mais recente para a mais antiga, cada
// uma com quem registrou ou corrigiu e quando.
function VersoesAnteriores({
  versoes,
  rotulo,
  className,
}: {
  versoes: VersaoContribuicao[];
  rotulo: string;
  className?: string;
}) {
  return (
    <ul
      aria-label={rotulo}
      className={cn("m-0 flex list-none flex-col gap-4 p-0", className)}
    >
      {versoes.map((a) => (
        <li key={a.versao} className="flex flex-col gap-1.5">
          <Selo
            tipo="anterior"
            texto={versoes.length === 1 ? undefined : `Versão ${a.versao}`}
          />
          <p className="m-0 text-[15px]">{resumo(a)}</p>
          <Autoria versao={a} />
        </li>
      ))}
    </ul>
  );
}

// Pagamentos dos ciclos anteriores do caso, só para consulta, para a secretaria e
// a coordenação (RNF36): a versão vigente de cada ciclo e, ao abrir, as
// anteriores. Nenhum registro é apagado nem escondido por data.
function CiclosAnteriores({ ciclos }: { ciclos: CicloAnteriorContribuicao[] }) {
  const titulo = useId();
  return (
    <section
      aria-labelledby={titulo}
      className="flex flex-col gap-3 border-t border-border pt-4"
    >
      <h3 id={titulo} className="text-[15px] font-bold">
        Ciclos anteriores
      </h3>
      {ciclos.length === 0 ? (
        <p className="ui-dica m-0">
          Nenhum pagamento registrado nos ciclos anteriores.
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-4 p-0">
          {ciclos.map((c) => (
            <li
              key={c.cicloAtendimento}
              className="flex flex-col gap-1.5 rounded-lg border border-border p-4"
            >
              <h4 className="m-0 text-[15px] font-semibold">
                Ciclo {c.cicloAtendimento}
              </h4>
              <Selo tipo="efetivada" />
              <p className="m-0 text-[15px]">{resumo(c.vigente)}</p>
              <Autoria versao={c.vigente} />
              {c.anteriores.length > 0 && (
                <details className="mt-1">
                  <summary className="cursor-pointer font-semibold text-marca underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                    Ver versões anteriores ({c.anteriores.length})
                  </summary>
                  <VersoesAnteriores
                    versoes={c.anteriores}
                    rotulo={`Versões anteriores do pagamento do ciclo ${c.cicloAtendimento}`}
                    className="mt-3"
                  />
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Formulário do registro (sem o valor, que vem do parâmetro) e da correção (com o
// valor e o motivo obrigatório). Os erros ficam ligados a cada campo; o erro da
// API aparece no topo e recebe o foco.
function FormularioPagamento({
  casoId,
  situacao,
  vigente,
  aoCancelar,
  aoConcluir,
  aoJaPago,
  aoMudar,
}: {
  casoId: string;
  situacao: SituacaoContribuicao;
  vigente?: VersaoContribuicao;
  aoCancelar: () => void;
  aoConcluir: (dados: SituacaoContribuicao) => void;
  aoJaPago: (pagoEm: string | null) => void;
  // O pagamento ou o valor mudou no servidor: o cartão busca a situação de novo.
  aoMudar: () => void;
}) {
  const correcao = Boolean(vigente);
  const id = useId();
  const [valor, setValor] = useState(
    vigente ? centavosParaCampo(vigente.valorCentavos) : "",
  );
  const [pagoEm, setPagoEm] = useState(vigente?.pagoEm ?? hojeBr());
  const [forma, setForma] = useState<FormaPagamento | null>(
    vigente?.forma ?? null,
  );
  const [motivo, setMotivo] = useState("");
  // O valor mostrado no registro e a versão aberta na correção vão no pedido. Se
  // mudaram no servidor, a API recusa (409): o valor novo aparece na tela para a
  // secretaria confirmar de novo, e a correção pede para conferir a versão atual.
  const [valorEsperado, setValorEsperado] = useState(
    situacao.valorAtualCentavos,
  );
  const [versaoEsperada] = useState(vigente?.versao ?? 1);
  // Na correção, sem mudar valor, data ou forma não há o que salvar.
  const semMudanca =
    !!vigente &&
    centavosDoCampo(valor) === vigente.valorCentavos &&
    pagoEm === vigente.pagoEm &&
    forma === vigente.forma;
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const envio = useMutation({
    mutationFn: (corpo: object) =>
      api<SituacaoContribuicao>(
        `/casos/${casoId}/contribuicao${correcao ? "/correcao" : ""}`,
        { method: "POST", body: JSON.stringify(corpo) },
      ),
    onSuccess: aoConcluir,
    onError: (erro) => {
      if (erro instanceof ErroApi && erro.status === 409) {
        const conflito = erro.corpo as {
          codigo?: string;
          valorAtualCentavos?: number;
        } | null;
        if (conflito?.codigo === "valor_alterado") {
          setValorEsperado(conflito.valorAtualCentavos ?? valorEsperado);
          setErroGeral(erro.message);
          aoMudar();
          return;
        }
        if (conflito?.codigo === "versao_desatualizada") {
          setErroGeral(
            `${erro.message} Cancele e abra a correção de novo para ver a versão atual.`,
          );
          aoMudar();
          return;
        }
        if (!correcao) {
          aoJaPago(
            typeof erro.corpo?.pagoEm === "string" ? erro.corpo.pagoEm : null,
          );
          return;
        }
      }
      if (erro instanceof ErroApi && erro.status === 400) {
        const porCampo = errosDaApi(erro);
        if (Object.keys(porCampo).length) {
          setErros(porCampo);
          focarPrimeiroErro(porCampo);
          return;
        }
      }
      setErroGeral(
        erro instanceof ErroApi && [409, 422].includes(erro.status)
          ? erro.message
          : "Tente de novo. Se o problema continuar, avise a coordenação.",
      );
    },
  });

  const idDoCampo = (campo: Campos) => `${id}-${campo}`;
  function focarPrimeiroErro(lista: Erros) {
    const ordem: Campos[] = ["valorCentavos", "pagoEm", "forma", "motivo"];
    const campo = ordem.find((c) => lista[c]);
    if (!campo) return;
    const alvo =
      campo === "forma"
        ? document.querySelector<HTMLInputElement>(`input[name="${id}-forma"]`)
        : document.getElementById(idDoCampo(campo));
    alvo?.focus();
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErroGeral(null);
    const centavos = correcao ? centavosDoCampo(valor) : undefined;
    const r = correcao
      ? correcaoContribuicaoSchema.safeParse({
          versaoEsperada,
          valorCentavos: centavos ?? undefined,
          pagoEm,
          forma: forma ?? undefined,
          motivo,
        })
      : registroContribuicaoSchema.safeParse({
          pagoEm,
          forma: forma ?? undefined,
          valorEsperadoCentavos: valorEsperado,
        });
    const novos: Erros = {};
    if (correcao && centavos === null && valor.trim() !== "")
      novos.valorCentavos = "Informe o valor em reais, como 35,00.";
    if (!r.success) {
      for (const issue of r.error.issues) {
        const campo = issue.path[0] as Campos;
        novos[campo] ??= issue.message;
      }
    }
    setErros(novos);
    if (Object.keys(novos).length || !r.success) {
      focarPrimeiroErro(novos);
      return;
    }
    envio.mutate(r.data);
  }

  const idErroForma = `${id}-forma-erro`;
  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
      {erroGeral && (
        <Aviso
          tipo="erro"
          focar
          titulo={
            correcao
              ? "Não foi possível salvar a correção."
              : "Não foi possível registrar o pagamento."
          }
        >
          {erroGeral}
        </Aviso>
      )}
      {correcao ? (
        <Campo
          id={idDoCampo("valorCentavos")}
          rotulo="Valor (R$)"
          erro={erros.valorCentavos}
          className="max-w-[240px] max-sm:max-w-none"
        >
          {(props) => (
            <input
              {...props}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              className={classeEntrada}
              value={valor}
              onChange={(e) => {
                setValor(e.target.value.replace(/[^\d.,]/g, ""));
                setErros({ ...erros, valorCentavos: undefined });
              }}
              // Ao sair do campo, o valor fica no formato do real: 35 → 35,00.
              onBlur={() => {
                const centavos = centavosDoCampo(valor);
                if (centavos !== null) setValor(centavosParaCampo(centavos));
              }}
            />
          )}
        </Campo>
      ) : (
        <div>
          <p className="m-0 text-[13px] font-semibold text-muted-foreground">
            Valor da contribuição
          </p>
          <p className="m-0 text-[22px] font-bold">
            {formatarCentavos(valorEsperado)}
          </p>
        </div>
      )}
      <Campo
        id={idDoCampo("pagoEm")}
        rotulo="Data do pagamento"
        erro={erros.pagoEm}
        className="max-w-[240px] max-sm:max-w-none"
      >
        {(props) => (
          <input
            {...props}
            type="date"
            // O calendário não oferece dias que ainda não chegaram.
            max={hojeBr()}
            className={classeEntrada}
            value={pagoEm}
            onChange={(e) => {
              setPagoEm(e.target.value);
              setErros({ ...erros, pagoEm: undefined });
            }}
          />
        )}
      </Campo>
      <fieldset
        aria-describedby={erros.forma ? idErroForma : undefined}
        aria-invalid={erros.forma ? true : undefined}
        className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0"
      >
        <legend className="ui-rotulo mb-1.5">Forma de pagamento</legend>
        <div className="flex flex-col gap-2 sm:max-w-[320px]">
          {FORMAS_PAGAMENTO.map((f) => (
            <label key={f} className="ui-opcao py-2.5">
              <input
                type="radio"
                name={`${id}-forma`}
                value={f}
                checked={forma === f}
                onChange={() => {
                  setForma(f);
                  setErros({ ...erros, forma: undefined });
                }}
              />
              {NOMES_FORMA_PAGAMENTO[f]}
            </label>
          ))}
        </div>
        {erros.forma && (
          <p
            id={idErroForma}
            className="m-0 flex items-start gap-1.5 text-sm leading-[1.4] font-semibold text-destructive"
          >
            <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
            {erros.forma}
          </p>
        )}
      </fieldset>
      {correcao && (
        <Campo
          id={idDoCampo("motivo")}
          rotulo="Motivo da correção"
          dica="Obrigatório. A versão anterior continua guardada."
          erro={erros.motivo}
        >
          {(props) => (
            <textarea
              {...props}
              maxLength={500}
              className={cn(classeTextoLongo, "min-h-[88px]")}
              value={motivo}
              onChange={(e) => {
                setMotivo(e.target.value);
                setErros({ ...erros, motivo: undefined });
              }}
            />
          )}
        </Campo>
      )}
      <Rodape>
        <Button type="button" variant="outline" onClick={aoCancelar}>
          Cancelar
        </Button>
        <BotaoComMotivo
          motivo={
            semMudanca
              ? "Altere o valor, a data ou a forma de pagamento para salvar a correção."
              : null
          }
        >
          {(props) => (
            <Button {...props} type="submit" disabled={envio.isPending}>
              {envio.isPending
                ? "Salvando…"
                : correcao
                  ? "Salvar correção"
                  : "Confirmar pagamento"}
            </Button>
          )}
        </BotaoComMotivo>
      </Rodape>
    </form>
  );
}

// No celular, os botões ficam em largura total, com a ação principal em cima.
function Rodape({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end max-sm:[&>*]:w-full">
      {children}
    </div>
  );
}
