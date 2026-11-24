"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clock, FileText, Undo2 } from "lucide-react";
import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import {
  DESTINATARIOS_RELATORIO,
  entregaRelatorioSchema,
  NOMES_DESTINATARIO_RELATORIO,
  NOMES_ESTADO_RELATORIO,
  type DestinatarioRelatorio,
  type EntregaRegistrada,
  type EstadoRelatorio,
  type RelatorioFinalDoCiclo,
  type VersaoDoRelatorio,
} from "@clinica/shared";
import { Aviso } from "@/components/comum/aviso";
import { Campo, classeEntrada } from "@/components/comum/campo";
import { Button, buttonVariants } from "@/components/ui/button";
import { api, ErroApi } from "@/lib/api";
import { dataBr, dataHoraBr, hojeBr } from "@/lib/formato";
import { cn } from "@/lib/utils";

const quando = (iso: string) => dataHoraBr(iso).replace(", ", ", às ");

export const chaveRelatorioFinal = (casoId: string, ciclo?: number) => [
  "casos",
  casoId,
  "relatorio-final",
  ciclo ?? "atual",
];

export function useRelatorioFinal(casoId: string, ciclo?: number) {
  return useQuery({
    queryKey: chaveRelatorioFinal(casoId, ciclo),
    queryFn: async () =>
      // Sem relatório no ciclo, a API responde sem corpo.
      (await api<RelatorioFinalDoCiclo | "">(
        `/casos/${casoId}/relatorio-final${ciclo ? `?ciclo=${ciclo}` : ""}`,
      ).catch((erro: unknown) => {
        if (erro instanceof SyntaxError) return null;
        throw erro;
      })) || null,
    retry: false,
  });
}

// Endereço da versão para impressão (RF33).
export const enderecoImpressao = (
  casoId: string,
  ciclo: number,
  versao: number,
) => `/relatorio-final/${casoId}/${versao}?ciclo=${ciclo}`;

// Selo da situação da versão, com ícone e texto (RNF1, RNF56).
const SELOS: Record<EstadoRelatorio, { classe: string; Icone: typeof Check }> =
  {
    rascunho: {
      classe: "border-[#c3cfd8] bg-[#eef1f4] text-[#4a5864]",
      Icone: FileText,
    },
    em_revisao: {
      classe: "border-[#f0cf9f] bg-alerta-fundo text-[#8a4600]",
      Icone: Clock,
    },
    devolvido: {
      classe: "border-[#efb4ad] bg-erro-fundo text-destructive",
      Icone: Undo2,
    },
    aprovado: {
      classe: "border-[#a3d4b3] bg-[#e5f4ea] text-[#1b5e33]",
      Icone: Check,
    },
  };

export function SeloRelatorio({
  estado,
  texto,
}: {
  estado: EstadoRelatorio;
  texto?: string;
}) {
  const { classe, Icone } = SELOS[estado];
  return (
    <span className={cn("ui-selo w-fit", classe)}>
      <Icone aria-hidden className="size-3.5 shrink-0" />
      {texto ?? NOMES_ESTADO_RELATORIO[estado]}
    </span>
  );
}

function DescricaoDaVersao({ v }: { v: VersaoDoRelatorio }) {
  if (v.estado === "aprovado" && v.decisao)
    return (
      <p className="ui-dica m-0">
        Aprovada por {v.decisao.por} em {quando(v.decisao.em)}.
      </p>
    );
  if (v.estado === "devolvido" && v.decisao)
    return (
      <p className="ui-dica m-0">
        Devolvida por {v.decisao.por} em {dataBr(v.decisao.em)}.
        {v.decisao.observacoes && ` Observações: ${v.decisao.observacoes}`}
      </p>
    );
  if (v.estado === "em_revisao" && v.enviadaEm)
    return (
      <p className="ui-dica m-0">
        Enviada por {v.autor} em {quando(v.enviadaEm)}.
      </p>
    );
  return <p className="ui-dica m-0">Em elaboração por {v.autor}.</p>;
}

// Versões do relatório final no prontuário (RF33, prancha 6-6): da mais recente
// para a mais antiga, com a situação de cada uma. A versão aprovada tem
// "Finalizar em PDF" para o estagiário responsável e o supervisor do caso; a
// coordenação só consulta. A elaboração e a revisão ficam acima desta lista.
export function VersoesDoRelatorio({
  casoId,
  ciclo,
  podeFinalizar,
  coordenacao = false,
}: {
  casoId: string;
  ciclo: number;
  podeFinalizar: boolean;
  coordenacao?: boolean;
}) {
  const consulta = useRelatorioFinal(casoId, ciclo);
  if (consulta.isPending)
    return <p role="status">Carregando o relatório final…</p>;
  if (consulta.isError)
    return (
      <Aviso tipo="erro" titulo="Não foi possível carregar o relatório final.">
        Atualize a página para tentar de novo.
      </Aviso>
    );
  const r = consulta.data;
  if (!r || r.versoes.length === 0)
    return <p className="ui-dica">Sem registro neste ciclo.</p>;
  return (
    <div className="flex flex-col gap-3">
      <ul
        aria-label="Versões do relatório final"
        className="m-0 flex list-none flex-col divide-y divide-border rounded-lg border border-border p-0"
      >
        {r.versoes.map((v) => (
          <li key={v.versao} className="flex flex-col gap-1.5 p-4">
            <p className="m-0 flex flex-wrap items-center gap-2 font-bold">
              Versão {v.versao}
              <SeloRelatorio estado={v.estado} />
            </p>
            <DescricaoDaVersao v={v} />
            {v.estado === "aprovado" && podeFinalizar && (
              <Link
                href={enderecoImpressao(casoId, r.ciclo, v.versao)}
                className={cn(buttonVariants(), "mt-1 w-fit max-sm:w-full")}
              >
                Finalizar em PDF
              </Link>
            )}
          </li>
        ))}
      </ul>
      {coordenacao && (
        <p className="ui-dica m-0">
          A coordenação consulta as versões, sem alterá-las.
        </p>
      )}
    </div>
  );
}

type Campos = "viaAssinada" | "entregueA" | "entregueEm";
type Erros = Partial<Record<Campos, string>>;

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

const textoEntrega = (e: EntregaRegistrada, r: RelatorioFinalDoCiclo) =>
  `Entregue ${
    e.entregueA === "paciente"
      ? `a ${r.paciente}`
      : `ao responsável legal${r.responsavelLegal ? `, ${r.responsavelLegal},` : ""}`
  } em ${dataBr(e.entregueEm)}. Registrado por ${e.registradaPor} em ${quando(e.registradaEm)}.`;

// Impressão e entrega do relatório final na ficha do paciente, para a
// secretaria (RF33, prancha 6-6): só a versão aprovada, sem as versões
// anteriores, sem download nem e-mail. A entrega pede a confirmação de que a via
// impressa foi assinada, a quem foi entregue e a data.
export function ImpressaoEEntregaDoRelatorio({ casoId }: { casoId: string }) {
  const titulo = useId();
  const consulta = useRelatorioFinal(casoId);
  const r = consulta.data;

  if (consulta.isPending)
    return (
      <section className="ui-cartao" aria-busy>
        <p role="status">Carregando o relatório final…</p>
      </section>
    );
  if (consulta.isError)
    return (
      <section className="ui-cartao">
        <Aviso
          tipo="erro"
          titulo="Não foi possível carregar o relatório final."
        >
          Atualize a página para tentar de novo.
        </Aviso>
      </section>
    );
  if (!r)
    return (
      <section aria-labelledby={titulo} className="ui-cartao gap-2">
        <h2 id={titulo} className="ui-h2">
          Relatório final
        </h2>
        <p className="ui-dica m-0">Sem relatório final neste ciclo.</p>
      </section>
    );

  const aprovada = r.aprovada;
  const versao = r.versoes.find((v) => v.versao === aprovada?.versao);
  return (
    <section aria-labelledby={titulo} className="ui-cartao gap-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 id={titulo} className="ui-h2">
          Relatório final de {r.paciente}
        </h2>
        {aprovada && (
          <SeloRelatorio
            estado="aprovado"
            texto={`Aprovado em ${dataBr(aprovada.aprovadaEm)}`}
          />
        )}
      </div>
      {!aprovada ? (
        <Aviso
          tipo="alerta"
          className="[&_p]:font-normal"
          titulo="Relatório ainda não aprovado: a secretaria só imprime a versão aprovada pelo supervisor."
        />
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <Link
              href={enderecoImpressao(casoId, r.ciclo, aprovada.versao)}
              className={cn(buttonVariants(), "w-fit max-sm:w-full")}
            >
              Imprimir
            </Link>
            <p className="ui-dica m-0">
              {r.impressoes[0]
                ? `Impresso por ${r.impressoes[0].por} em ${quando(r.impressoes[0].em)}.`
                : "Ainda não impresso."}
            </p>
          </div>
          {r.entrega ? (
            <Aviso tipo="sucesso" titulo="Entrega registrada.">
              {textoEntrega(r.entrega, r)}
            </Aviso>
          ) : r.impressoes.length > 0 ? (
            <FormularioEntrega
              casoId={casoId}
              relatorio={r}
              estagiario={versao?.autor ?? "estagiário"}
              supervisor={aprovada.aprovadaPor}
            />
          ) : (
            <p className="ui-dica m-0">
              Depois de imprimir e colher as assinaturas, registre aqui a
              entrega.
            </p>
          )}
        </>
      )}
    </section>
  );
}

function FormularioEntrega({
  casoId,
  relatorio,
  estagiario,
  supervisor,
}: {
  casoId: string;
  relatorio: RelatorioFinalDoCiclo;
  estagiario: string;
  supervisor: string;
}) {
  const id = useId();
  const cliente = useQueryClient();
  const [viaAssinada, setViaAssinada] = useState(false);
  const [entregueA, setEntregueA] = useState<DestinatarioRelatorio>("paciente");
  const [entregueEm, setEntregueEm] = useState(hojeBr());
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const idDoCampo = (campo: Campos) => `${id}-${campo}`;

  const envio = useMutation({
    mutationFn: (corpo: object) =>
      api<EntregaRegistrada>(
        `/casos/${casoId}/relatorio-final/entrega?ciclo=${relatorio.ciclo}`,
        { method: "POST", body: JSON.stringify(corpo) },
      ),
    onSuccess: (entrega) => {
      cliente.setQueryData(chaveRelatorioFinal(casoId), {
        ...relatorio,
        entrega,
      });
    },
    onError: (erro) => {
      if (erro instanceof ErroApi && erro.status === 400) {
        const porCampo = errosDaApi(erro);
        if (Object.keys(porCampo).length) {
          setErros(porCampo);
          focar(porCampo);
          return;
        }
      }
      if (erro instanceof ErroApi && erro.status === 409)
        void cliente.invalidateQueries({
          queryKey: chaveRelatorioFinal(casoId),
        });
      setErroGeral(
        erro instanceof ErroApi && [400, 409].includes(erro.status)
          ? erro.message
          : "Tente de novo. Se o problema continuar, avise a coordenação.",
      );
    },
  });

  function focar(lista: Erros) {
    const campo = (["viaAssinada", "entregueA", "entregueEm"] as const).find(
      (c) => lista[c],
    );
    if (campo) document.getElementById(idDoCampo(campo))?.focus();
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErroGeral(null);
    const r = entregaRelatorioSchema.safeParse({
      viaAssinada,
      entregueA,
      entregueEm,
    });
    const novos: Erros = {};
    if (!r.success)
      for (const issue of r.error.issues)
        novos[issue.path[0] as Campos] ??= issue.message;
    setErros(novos);
    if (!r.success) {
      focar(novos);
      return;
    }
    envio.mutate(r.data);
  }

  const opcoes = DESTINATARIOS_RELATORIO.filter(
    (d) => d === "paciente" || relatorio.responsavelLegal,
  );
  const idErroVia = `${idDoCampo("viaAssinada")}-erro`;
  return (
    <form
      onSubmit={enviar}
      noValidate
      aria-labelledby={`${id}-titulo`}
      className="flex flex-col gap-4 border-t border-border pt-4"
    >
      <h3 id={`${id}-titulo`} className="m-0 text-[15px] font-bold">
        Registrar a entrega
      </h3>
      {erroGeral && (
        <Aviso tipo="erro" focar titulo="Não foi possível registrar a entrega.">
          {erroGeral}
        </Aviso>
      )}
      <div className="flex flex-col gap-1.5">
        <label className="flex items-start gap-2.5 text-[15px]">
          <input
            id={idDoCampo("viaAssinada")}
            type="checkbox"
            checked={viaAssinada}
            onChange={(e) => setViaAssinada(e.target.checked)}
            aria-invalid={erros.viaAssinada ? true : undefined}
            aria-describedby={erros.viaAssinada ? idErroVia : undefined}
            className="mt-0.5 size-5 shrink-0 accent-primary"
          />
          A via impressa foi assinada por {estagiario} e por {supervisor}
        </label>
        {erros.viaAssinada && (
          <p id={idErroVia} className="text-sm text-destructive">
            {erros.viaAssinada}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <Campo
          id={idDoCampo("entregueA")}
          rotulo="Entregue a"
          erro={erros.entregueA}
          className="w-[240px] max-sm:w-full"
        >
          {(props) => (
            <select
              {...props}
              className={classeEntrada}
              value={entregueA}
              onChange={(e) =>
                setEntregueA(e.target.value as DestinatarioRelatorio)
              }
            >
              {opcoes.map((d) => (
                <option key={d} value={d}>
                  {d === "responsavel_legal" && relatorio.responsavelLegal
                    ? `${NOMES_DESTINATARIO_RELATORIO[d]} (${relatorio.responsavelLegal})`
                    : NOMES_DESTINATARIO_RELATORIO[d]}
                </option>
              ))}
            </select>
          )}
        </Campo>
        <Campo
          id={idDoCampo("entregueEm")}
          rotulo="Data da entrega"
          erro={erros.entregueEm}
          className="w-[180px] max-sm:w-full"
        >
          {(props) => (
            <input
              {...props}
              type="date"
              max={hojeBr()}
              className={classeEntrada}
              value={entregueEm}
              onChange={(e) => setEntregueEm(e.target.value)}
            />
          )}
        </Campo>
        <Button
          type="submit"
          disabled={envio.isPending}
          className="max-sm:w-full"
        >
          {envio.isPending ? "Registrando…" : "Registrar entrega"}
        </Button>
      </div>
    </form>
  );
}
