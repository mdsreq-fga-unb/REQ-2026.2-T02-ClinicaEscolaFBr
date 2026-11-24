"use client";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, TriangleAlert } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import {
  complementoEvolucaoSchema,
  LIMITE_CAMPO_CLINICO,
  type ComplementoEvolucao,
  type VersaoEvolucao,
} from "@clinica/shared";
import { Aviso } from "@/components/comum/aviso";
import { Campo, classeTextoLongo } from "@/components/comum/campo";
import { Button } from "@/components/ui/button";
import { api, ErroApi } from "@/lib/api";
import { dataHoraBr } from "@/lib/formato";
import { cn } from "@/lib/utils";
import { camposDaFicha } from "./correcao-evolucao";
import { NAO_INFORMADO, type EvolucaoRegistrada } from "./fichas";

const milhar = (n: number) => n.toLocaleString("pt-BR");

type ItemHistorico =
  | { tipo: "original"; em: string; versao: VersaoEvolucao }
  | {
      tipo: "correcao";
      em: string;
      versao: VersaoEvolucao;
      anterior: VersaoEvolucao;
    }
  | ComplementoEvolucao;

// O registro original, as correções (RF29) e os complementos (RF30), do mais antigo
// ao mais recente. As versões vêm da vigente para a original.
export function historicoDaEvolucao(
  evolucao: EvolucaoRegistrada,
): ItemHistorico[] {
  const versoes = [...(evolucao.versoes ?? [])].reverse();
  return [
    ...versoes.map((versao, indice): ItemHistorico =>
      indice === 0
        ? { tipo: "original", em: versao.em, versao }
        : {
            tipo: "correcao",
            em: versao.em,
            versao,
            anterior: versoes[indice - 1],
          },
    ),
    ...(evolucao.complementos ?? []),
  ].sort((a, b) => a.em.localeCompare(b.em));
}

const ETIQUETAS = {
  original: ["Registro original", "bg-muted text-foreground"],
  correcao: ["Correção · revisa o conteúdo", "bg-info-fundo text-marca"],
  complemento: [
    "Complemento · informação adicional",
    "bg-sucesso-fundo text-sucesso",
  ],
} as const;

// Linha do tempo da evolução: uma lista ordenada, com o tipo de cada item escrito, e
// não só pela cor (RNF56).
export function LinhaDoTempoEvolucao({
  evolucao,
}: {
  evolucao: EvolucaoRegistrada;
}) {
  const campos = camposDaFicha(evolucao);
  const texto = (versao: VersaoEvolucao, campo: string) =>
    (versao as Record<string, unknown>)[campo] as string | null;

  const conteudo = (item: ItemHistorico): ReactNode => {
    if (item.tipo === "original")
      return (
        <p className="ui-meta">
          Registrado por {item.versao.autor} em {dataHoraBr(item.em)}.
        </p>
      );
    if (item.tipo === "complemento")
      return (
        <>
          <p className="whitespace-pre-wrap">{item.texto}</p>
          <p className="ui-meta">
            Registrado por {item.autor} em {dataHoraBr(item.em)}.
          </p>
        </>
      );
    const mudancas = campos.filter(
      ([campo]) => texto(item.anterior, campo) !== texto(item.versao, campo),
    );
    return (
      <>
        {mudancas.map(([campo, rotulo]) => (
          <p key={campo} className="whitespace-pre-wrap">
            <span className="font-semibold">{rotulo}:</span> de “
            {texto(item.anterior, campo) ?? NAO_INFORMADO}” para “
            {texto(item.versao, campo) ?? NAO_INFORMADO}”
          </p>
        ))}
        <p className="ui-meta">
          Corrigido por {item.versao.autor} em {dataHoraBr(item.em)}. Motivo:{" "}
          {item.versao.motivo}
        </p>
      </>
    );
  };

  return (
    <ol
      aria-label="Histórico desta evolução"
      className="ml-1.5 flex flex-col border-l-2 border-border"
    >
      {historicoDaEvolucao(evolucao).map((item) => {
        const [rotulo, cor] = ETIQUETAS[item.tipo];
        return (
          <li
            key={
              item.tipo === "complemento"
                ? item.id
                : `versao-${item.versao.versao}`
            }
            className="relative flex flex-col gap-1 pb-4 pl-5 text-[15px] last:pb-0"
          >
            <span
              aria-hidden
              className="absolute top-1 -left-[7px] size-3 rounded-full border-2 border-primary bg-card"
            />
            <span
              className={cn(
                "w-fit rounded-full px-2.5 py-0.5 text-sm font-semibold",
                cor,
              )}
            >
              {rotulo}
            </span>
            {conteudo(item)}
          </li>
        );
      })}
    </ol>
  );
}

// Formulário do complemento, só para o estagiário responsável (RF30).
function FormularioComplemento({
  prontuarioId,
  evolucaoId,
  aoCancelar,
  aoSalvar,
}: {
  prontuarioId: string;
  evolucaoId: string;
  aoCancelar: () => void;
  aoSalvar: () => void;
}) {
  const cache = useQueryClient();
  const [texto, setTexto] = useState("");
  const [erroCampo, setErroCampo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  // Cada tentativa recusada monta o aviso de novo, para ele receber o foco.
  const [tentativa, setTentativa] = useState(0);
  const id = `novo-complemento-${evolucaoId}`;

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (salvando) return;
    setErro(null);
    const resultado = complementoEvolucaoSchema.safeParse({ texto });
    if (!resultado.success) {
      setErroCampo(resultado.error.issues[0].message);
      setTentativa((n) => n + 1);
      return;
    }
    setErroCampo(null);
    setSalvando(true);
    try {
      await api(
        `/prontuarios/${prontuarioId}/evolucoes/${evolucaoId}/complementos`,
        { method: "POST", body: JSON.stringify(resultado.data) },
      );
      aoSalvar();
      await cache.invalidateQueries({ queryKey: ["prontuario", prontuarioId] });
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Tente de novo.");
      setTentativa((n) => n + 1);
      setSalvando(false);
      // O caso pode ter sido encerrado, ou o vínculo, no meio: o prontuário é lido de
      // novo.
      if (falha instanceof ErroApi && [403, 422].includes(falha.status))
        await cache.invalidateQueries({
          queryKey: ["prontuario", prontuarioId],
        });
    }
  }

  return (
    <form
      noValidate
      onSubmit={salvar}
      className="flex flex-col gap-3 border-t border-border pt-3"
    >
      {(erroCampo || erro) && (
        <Aviso
          key={tentativa}
          tipo="erro"
          titulo="O complemento não foi salvo."
          focar
        >
          {erroCampo ? (
            <>
              Corrija o{" "}
              <a
                href={`#${id}`}
                className="font-semibold text-marca underline underline-offset-4"
              >
                novo complemento
              </a>
              .
            </>
          ) : (
            erro
          )}
        </Aviso>
      )}
      <Campo
        id={id}
        rotulo="Novo complemento"
        dica={`${milhar(texto.length)} de ${milhar(LIMITE_CAMPO_CLINICO)} caracteres. O complemento se soma à evolução: o que já foi registrado não muda. Para revisar um conteúdo errado, use “Corrigir evolução”.`}
        dicaClassName={
          texto.length > LIMITE_CAMPO_CLINICO
            ? "font-semibold text-destructive"
            : undefined
        }
        erro={erroCampo ?? undefined}
      >
        {(props) => (
          <textarea
            {...props}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            className={classeTextoLongo}
          />
        )}
      </Campo>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={aoCancelar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar complemento"}
        </Button>
      </div>
    </form>
  );
}

// O foco segue o que abriu ou fechou, depois de a tela mudar (RNF57).
const focarDepois = (id: string) =>
  requestAnimationFrame(() => document.getElementById(id)?.focus());

// Seção "Complementos" de cada evolução do prontuário (RF30): a linha do tempo, para
// todos que consultam, e o formulário, só para o estagiário responsável com o caso em
// atendimento.
export function ComplementosEvolucao({
  prontuarioId,
  evolucao,
  numeroNoCiclo,
}: {
  prontuarioId: string;
  evolucao: EvolucaoRegistrada;
  numeroNoCiclo: number | null;
}) {
  const [aberto, setAberto] = useState(false);
  const [salvo, setSalvo] = useState(false);
  // Estava validada quando o complemento foi salvo (RF67).
  const [voltouAPendente, setVoltouAPendente] = useState(false);
  const complementos = evolucao.complementos ?? [];
  const permitido = evolucao.complemento?.permitido ?? false;
  const aviso = evolucao.complemento?.aviso ?? null;
  if (complementos.length === 0 && !permitido && !aviso && !salvo) return null;
  const idTitulo = `complementos-${evolucao.id}`;
  const idBotao = `adicionar-complemento-${evolucao.id}`;
  return (
    <section
      aria-labelledby={idTitulo}
      className="mt-4 flex flex-col gap-3 rounded-[12px] border border-border p-4"
    >
      <h3 id={idTitulo} className="text-[15px] font-bold text-marca">
        Complementos
      </h3>
      {salvo && (
        <Aviso tipo="sucesso" titulo="Complemento salvo." focar>
          {voltouAPendente &&
            "A evolução volta a ficar pendente de validação pelo supervisor."}
        </Aviso>
      )}
      {complementos.length > 0 ? (
        <LinhaDoTempoEvolucao evolucao={evolucao} />
      ) : (
        <p className="ui-dica">Nenhum complemento registrado.</p>
      )}
      {aviso && (
        <p className="flex items-start gap-2 rounded-lg bg-alerta-fundo px-3 py-2 text-sm">
          <TriangleAlert
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-[#a85400]"
          />
          {aviso}
        </p>
      )}
      {permitido &&
        (aberto ? (
          <FormularioComplemento
            prontuarioId={prontuarioId}
            evolucaoId={evolucao.id}
            aoCancelar={() => {
              setAberto(false);
              focarDepois(idBotao);
            }}
            aoSalvar={() => {
              setAberto(false);
              setSalvo(true);
              setVoltouAPendente(evolucao.validacao?.situacao === "validada");
            }}
          />
        ) : (
          <div>
            <Button
              id={idBotao}
              type="button"
              variant="outline"
              onClick={() => {
                setSalvo(false);
                setAberto(true);
                focarDepois(`novo-complemento-${evolucao.id}`);
              }}
              aria-label={`Adicionar complemento à evolução da sessão ${numeroNoCiclo ?? ""}`.trim()}
            >
              <Plus aria-hidden className="size-4" /> Adicionar complemento
            </Button>
          </div>
        ))}
    </section>
  );
}
