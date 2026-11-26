"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import {
  decisaoRelatorioSchema,
  envioRelatorioSchema,
  LIMITE_OBSERVACOES_RELATORIO,
  LIMITE_SECAO_RELATORIO,
  rascunhoRelatorioSchema,
  SECOES_RELATORIO,
  type ElaboracaoDoRelatorio,
  type SecaoRelatorio,
  type VersaoComTexto,
} from "@clinica/shared";
import { Aviso } from "@/components/comum/aviso";
import { Campo, classeTextoLongo } from "@/components/comum/campo";
import { Dados } from "@/components/comum/dados";
import { Dialogo } from "@/components/comum/dialogo";
import { errosPorCampo } from "@/components/prontuario/fichas";
import { Button } from "@/components/ui/button";
import { api, ErroApi } from "@/lib/api";
import { dataBr, dataHoraBr } from "@/lib/formato";
import { SeloRelatorio } from "./relatorio-final";

const milhar = (n: number) => n.toLocaleString("pt-BR");
const quando = (iso: string) => dataHoraBr(iso).replace(", ", ", às ");

const chaveElaboracao = (casoId: string, ciclo?: number) => [
  "casos",
  casoId,
  "relatorio-final",
  "elaboracao",
  ciclo ?? "atual",
];

export function useElaboracao(casoId: string, ciclo?: number) {
  return useQuery({
    queryKey: chaveElaboracao(casoId, ciclo),
    queryFn: () =>
      api<ElaboracaoDoRelatorio>(
        `/casos/${casoId}/relatorio-final/elaboracao${ciclo ? `?ciclo=${ciclo}` : ""}`,
      ),
    retry: false,
  });
}

// A lista de versões e a elaboração são lidas de novo depois de cada gravação.
const useAtualizar = (casoId: string) => {
  const cache = useQueryClient();
  return () =>
    cache.invalidateQueries({ queryKey: ["casos", casoId, "relatorio-final"] });
};

const rota = (r: ElaboracaoDoRelatorio, caminho: string) =>
  `/casos/${r.casoId}/relatorio-final/${caminho}?ciclo=${r.ciclo}`;

const mensagemDe = (falha: unknown) =>
  falha instanceof Error ? falha.message : "Tente de novo.";

// Erros por campo do 400 da API, quando ela os devolve.
function errosDaApi(falha: unknown): Record<string, string> {
  const lista = falha instanceof ErroApi ? falha.corpo?.message : null;
  return Array.isArray(lista)
    ? (errosPorCampo<Record<string, string>>(lista) as Record<string, string>)
    : {};
}

// Sessões realizadas sem evolução, para revisão humana: o sistema não completa o
// prontuário (RF33). Depois da aprovação não há mais o que revisar, e o aviso sai.
export function AvisoLacunas({ r }: { r: ElaboracaoDoRelatorio }) {
  const lacunas = r.sessoes.filter((s) => !s.temEvolucao);
  const aprovado = r.versoes.some((v) => v.estado === "aprovado");
  if (lacunas.length === 0 || r.semEvolucoes || aprovado) return null;
  const fim =
    "Revise antes de seguir: o sistema não completa lacunas do prontuário.";
  return lacunas.length === 1 ? (
    <Aviso
      tipo="alerta"
      titulo={`A sessão ${lacunas[0].numero} (${dataBr(lacunas[0].data)}) não tem evolução registrada.`}
    >
      {fim}
    </Aviso>
  ) : (
    <Aviso
      tipo="alerta"
      titulo={`${lacunas.length} sessões não têm evolução registrada.`}
    >
      <ul className="my-1 list-disc pl-5">
        {lacunas.map((s) => (
          <li key={s.id}>
            Sessão {s.numero} ({dataBr(s.data)})
          </li>
        ))}
      </ul>
      {fim}
    </Aviso>
  );
}

export function ResumoDoCiclo({ r }: { r: ElaboracaoDoRelatorio }) {
  const total = r.sessoes.length;
  const evolucoes = r.sessoes.filter((s) => s.temEvolucao).length;
  return (
    <p className="ui-dica m-0">
      {r.paciente} · {total}{" "}
      {total === 1 ? "sessão realizada" : "sessões realizadas"}
      {total > 0 &&
        `, de ${dataBr(r.sessoes[0].data)} a ${dataBr(r.sessoes[total - 1].data)}`}{" "}
      · {evolucoes}{" "}
      {evolucoes === 1 ? "evolução registrada" : "evoluções registradas"}
    </p>
  );
}

// Identificação do modelo (DF42): vem do caso, e não é digitada.
function Identificacao({ r }: { r: ElaboracaoDoRelatorio }) {
  return (
    <Dados
      colunas={2}
      itens={[
        ["Paciente", r.paciente],
        ["Solicitante", r.solicitante ?? "Próprio paciente"],
        ["Autoria (estágio)", r.estagiario],
        ["Supervisão", r.supervisor?.nome],
      ]}
    />
  );
}

function CampoLongo({
  id,
  rotulo,
  dica,
  limite,
  valor,
  erro,
  aoMudar,
}: {
  id: string;
  rotulo: string;
  dica?: string;
  limite: number;
  valor: string;
  erro?: string;
  aoMudar: (valor: string) => void;
}) {
  return (
    <Campo
      id={id}
      rotulo={rotulo}
      dica={`${dica ? `${dica} ` : ""}${milhar(valor.length)} de ${milhar(limite)} caracteres`}
      dicaClassName={
        valor.length > limite ? "font-semibold text-destructive" : undefined
      }
      erro={erro}
    >
      {(props) => (
        <textarea
          {...props}
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
          className={classeTextoLongo}
        />
      )}
    </Campo>
  );
}

type CampoDoRelatorio = SecaoRelatorio | "justificativaExcecao";
const idDo = (campo: string) => `relatorio-${campo}`;
const ROTULOS: Record<CampoDoRelatorio, string> = {
  finalidade: "Finalidade do relatório",
  demanda: "2. Descrição da demanda",
  procedimentos: "3. Procedimentos",
  analise: "4. Análise",
  conclusao: "5. Conclusão",
  justificativaExcecao: "Justificativa do encerramento fora de 8 a 10 sessões",
};

// Rascunho em seções, só para o estagiário responsável (RF33, prancha 6-6). Depois da
// devolução, o rascunho novo começa com o texto devolvido.
export function FormularioRelatorio({ r }: { r: ElaboracaoDoRelatorio }) {
  const atualizar = useAtualizar(r.casoId);
  const base = r.versoes.find(
    (v) => v.estado === "rascunho" || v.estado === "devolvido",
  );
  const [dados, setDados] = useState<Record<CampoDoRelatorio, string>>(() => ({
    ...(Object.fromEntries(
      SECOES_RELATORIO.map(([secao]) => [secao, base?.secoes[secao] ?? ""]),
    ) as Record<SecaoRelatorio, string>),
    justificativaExcecao: base?.justificativaExcecao ?? "",
  }));
  const [erros, setErros] = useState<Partial<Record<string, string>>>({});
  const [erro, setErro] = useState<{ titulo: string; texto?: string } | null>(
    null,
  );
  const [salvo, setSalvo] = useState(0);
  const [tentativa, setTentativa] = useState(0);
  const [enviando, setEnviando] = useState<"rascunho" | "envio" | null>(null);
  const [alterado, setAlterado] = useState(false);

  // Sair da página com texto ainda não salvo pede a confirmação do navegador.
  useEffect(() => {
    if (!alterado) return;
    const avisar = (evento: BeforeUnloadEvent) => evento.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [alterado]);

  const mudar = (campo: CampoDoRelatorio) => (valor: string) => {
    setAlterado(true);
    setDados((atual) => ({ ...atual, [campo]: valor }));
  };

  async function gravar(acao: "rascunho" | "envio") {
    if (enviando) return;
    const envio = acao === "envio";
    const titulo = envio
      ? "O relatório não foi enviado."
      : "O rascunho não foi salvo.";
    setErro(null);
    setSalvo(0);
    const resultado = (
      envio ? envioRelatorioSchema : rascunhoRelatorioSchema
    ).safeParse(dados);
    const novos: Record<string, string> = resultado.success
      ? {}
      : (errosPorCampo<Record<string, string>>(
          resultado.error.issues,
        ) as Record<string, string>);
    if (
      envio &&
      r.exigeJustificativa &&
      !dados.justificativaExcecao.trim() &&
      !novos.justificativaExcecao
    )
      novos.justificativaExcecao = "Informe a justificativa.";
    setErros(novos);
    if (!resultado.success || Object.keys(novos).length) {
      setErro({ titulo });
      setTentativa((n) => n + 1);
      return;
    }
    setEnviando(acao);
    try {
      await api(rota(r, acao), {
        method: envio ? "POST" : "PUT",
        body: JSON.stringify(resultado.data),
      });
      setAlterado(false);
      setSalvo((n) => n + 1);
      await atualizar();
    } catch (falha) {
      const daApi = errosDaApi(falha);
      setErros(daApi);
      setErro({
        titulo,
        texto: Object.keys(daApi).length ? undefined : mensagemDe(falha),
      });
      setTentativa((n) => n + 1);
      // Outra pessoa pode ter mudado a situação: a página é lida de novo.
      if (falha instanceof ErroApi && [409, 422].includes(falha.status))
        await atualizar();
    } finally {
      setEnviando(null);
    }
  }

  const campos: CampoDoRelatorio[] = [
    "finalidade",
    "demanda",
    "procedimentos",
    "analise",
    "conclusao",
    ...(r.exigeJustificativa ? (["justificativaExcecao"] as const) : []),
  ];
  const comErro = campos.filter((campo) => erros[campo]);
  return (
    <form
      noValidate
      onSubmit={(evento: FormEvent) => {
        evento.preventDefault();
        void gravar("envio");
      }}
      className="flex flex-col gap-5"
    >
      {erro && (
        <Aviso key={tentativa} tipo="erro" titulo={erro.titulo} focar>
          {erro.texto ?? (
            <>
              {erros.justificativaExcecao &&
                `O ciclo teve ${r.sessoes.length} ${r.sessoes.length === 1 ? "sessão" : "sessões"}. `}
              Corrija:{" "}
              {comErro.map((campo, indice) => (
                <span key={campo}>
                  {indice > 0 && ", "}
                  <a
                    href={`#${idDo(campo)}`}
                    className="font-semibold text-marca underline underline-offset-4"
                  >
                    {campo === "justificativaExcecao"
                      ? "justificativa"
                      : ROTULOS[campo].replace(/^\d\. /, "").toLowerCase()}
                  </a>
                </span>
              ))}
              .
            </>
          )}
        </Aviso>
      )}
      {salvo > 0 && (
        <Aviso
          key={`salvo-${salvo}`}
          tipo="sucesso"
          titulo="Rascunho salvo."
          focar
        />
      )}
      <section
        aria-labelledby="relatorio-identificacao"
        className="ui-cartao flex flex-col gap-4"
      >
        <h2 id="relatorio-identificacao" className="ui-h2">
          1. Identificação
        </h2>
        <Identificacao r={r} />
        {campos.map((campo) => (
          <CampoLongo
            key={campo}
            id={idDo(campo)}
            rotulo={ROTULOS[campo]}
            dica={
              campo === "demanda" && r.sessoes[0]
                ? `Início do acompanhamento: ${dataBr(r.sessoes[0].data)}.`
                : undefined
            }
            limite={
              campo === "justificativaExcecao"
                ? LIMITE_OBSERVACOES_RELATORIO
                : LIMITE_SECAO_RELATORIO
            }
            valor={dados[campo]}
            erro={erros[campo]}
            aoMudar={mudar(campo)}
          />
        ))}
        <p className="ui-dica m-0">
          Local e data: Brasília, na data da aprovação. As assinaturas são
          feitas à mão, na via impressa.
        </p>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={enviando !== null}
            onClick={() => void gravar("rascunho")}
          >
            {enviando === "rascunho" ? "Salvando…" : "Salvar rascunho"}
          </Button>
          <Button type="submit" disabled={enviando !== null}>
            {enviando === "envio" ? "Enviando…" : "Enviar para revisão"}
          </Button>
        </div>
      </section>
    </form>
  );
}

// Texto de uma versão, com os registros de origem fixados no envio, para conferir com o
// prontuário (RF33).
export function TextoDaVersao({
  r,
  versao,
}: {
  r: ElaboracaoDoRelatorio;
  versao: VersaoComTexto;
}) {
  const titulos: [SecaoRelatorio, string][] = [
    ["finalidade", "1. Identificação · finalidade do relatório"],
    ["demanda", ROTULOS.demanda],
    ["procedimentos", ROTULOS.procedimentos],
    ["analise", ROTULOS.analise],
    ["conclusao", ROTULOS.conclusao],
  ];
  const origem = versao.origem;
  const consideradas = origem
    ? r.sessoes.filter((s) => origem.sessoes.includes(s.id))
    : [];
  const depois = origem ? r.sessoes.length - consideradas.length : 0;
  return (
    <div className="flex flex-col gap-4">
      {titulos.map(([secao, titulo]) => (
        <div key={secao} className="flex flex-col gap-1">
          <h3 className="m-0 text-[15px] font-bold text-marca">{titulo}</h3>
          <p className="m-0 text-[15px] leading-[1.55] whitespace-pre-wrap">
            {versao.secoes[secao]}
          </p>
        </div>
      ))}
      {versao.justificativaExcecao && (
        <div className="flex flex-col gap-1">
          <h3 className="m-0 text-[15px] font-bold text-marca">
            {ROTULOS.justificativaExcecao}
          </h3>
          <p className="m-0 text-[15px] whitespace-pre-wrap">
            {versao.justificativaExcecao}
          </p>
        </div>
      )}
      {origem && (
        <details className="rounded-lg border border-border p-3">
          <summary className="cursor-pointer font-semibold text-marca">
            Registros de origem: {origem.sessoes.length}{" "}
            {origem.sessoes.length === 1 ? "sessão" : "sessões"} e{" "}
            {origem.evolucoes.length}{" "}
            {origem.evolucoes.length === 1 ? "evolução" : "evoluções"}
          </summary>
          <ul className="my-2 list-disc pl-5 text-[15px]">
            {consideradas.map((s) => (
              <li key={s.id}>
                Sessão {s.numero} · {dataBr(s.data)}
                {!s.temEvolucao && " · sem evolução registrada"}
              </li>
            ))}
          </ul>
          <Link
            href={`/prontuarios/${r.prontuarioId}#evolucoes`}
            className="font-semibold text-marca underline underline-offset-4"
          >
            Conferir com as evoluções do prontuário
          </Link>
        </details>
      )}
      {depois > 0 && (
        <p className="flex items-start gap-2 rounded-lg bg-alerta-fundo px-3 py-2 text-sm">
          <TriangleAlert
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-[#a85400]"
          />
          Depois do envio desta versão, o ciclo teve mais {depois}{" "}
          {depois === 1 ? "sessão realizada" : "sessões realizadas"}.
        </p>
      )}
    </div>
  );
}

// Revisão pelo supervisor do caso (RF33, prancha 6-6): devolver, com as observações, ou
// aprovar, com a confirmação, porque a versão aprovada não muda mais.
export function RevisaoDoRelatorio({
  r,
  versao,
  aoDecidir,
}: {
  r: ElaboracaoDoRelatorio;
  versao: VersaoComTexto;
  aoDecidir: (mensagem: string) => void;
}) {
  const atualizar = useAtualizar(r.casoId);
  const [observacoes, setObservacoes] = useState("");
  const [erroCampo, setErroCampo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  // Valida e devolve o corpo, ou mostra o erro no campo, com o foco nele.
  function validar(decisao: "aprovar" | "devolver") {
    setErro(null);
    const resultado = decisaoRelatorioSchema.safeParse({
      decisao,
      observacoes,
    });
    setErroCampo(resultado.success ? null : resultado.error.issues[0].message);
    if (resultado.success) return resultado.data;
    document.getElementById(idDo("observacoes"))?.focus();
    return null;
  }

  async function decidir(decisao: "aprovar" | "devolver") {
    const corpo = validar(decisao);
    if (!corpo) return;
    setEnviando(true);
    try {
      await api(rota(r, `versoes/${versao.versao}/decisao`), {
        method: "POST",
        body: JSON.stringify(corpo),
      });
      aoDecidir(
        decisao === "aprovar"
          ? `Versão ${versao.versao} aprovada.`
          : `Versão ${versao.versao} devolvida para ajustes.`,
      );
      await atualizar();
    } catch (falha) {
      setErro(mensagemDe(falha));
      if (falha instanceof ErroApi && falha.status === 409) await atualizar();
    } finally {
      setConfirmando(false);
      setEnviando(false);
    }
  }

  return (
    <section
      aria-labelledby="titulo-revisao"
      className="ui-cartao flex flex-col gap-4"
    >
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="titulo-revisao" className="ui-h2">
          Revisão da versão {versao.versao}
        </h2>
        <SeloRelatorio estado={versao.estado} />
      </div>
      {versao.enviadaEm && (
        <p className="ui-dica m-0">
          Enviada por {versao.autor} em {quando(versao.enviadaEm)}.
        </p>
      )}
      <TextoDaVersao r={r} versao={versao} />
      {erro && (
        <Aviso tipo="erro" titulo="A decisão não foi registrada." focar>
          {erro}
        </Aviso>
      )}
      <CampoLongo
        id={idDo("observacoes")}
        rotulo="Observações para o estagiário"
        dica="Obrigatórias para devolver."
        limite={LIMITE_OBSERVACOES_RELATORIO}
        valor={observacoes}
        erro={erroCampo ?? undefined}
        aoMudar={setObservacoes}
      />
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          disabled={enviando}
          onClick={() => void decidir("devolver")}
        >
          Devolver para ajustes
        </Button>
        <Button
          type="button"
          disabled={enviando}
          onClick={() => {
            if (validar("aprovar")) setConfirmando(true);
          }}
        >
          Aprovar relatório
        </Button>
      </div>
      <Dialogo
        aberto={confirmando}
        aoFechar={() => setConfirmando(false)}
        titulo={`Aprovar a versão ${versao.versao} do relatório?`}
        rodape={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmando(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              data-principal
              disabled={enviando}
              onClick={() => void decidir("aprovar")}
            >
              {enviando ? "Aprovando…" : "Aprovar"}
            </Button>
          </>
        }
      >
        <p>
          Depois de aprovada, a versão não muda mais e fica disponível para a
          secretaria imprimir e entregar ao paciente.
        </p>
      </Dialogo>
    </section>
  );
}
