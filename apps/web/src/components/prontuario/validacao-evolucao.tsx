"use client";
import { useQueryClient } from "@tanstack/react-query";
import { TriangleAlert } from "lucide-react";
import { useState } from "react";
import {
  NOMES_SITUACAO_VALIDACAO,
  type ValidacaoEvolucao,
} from "@clinica/shared";
import { Aviso } from "@/components/comum/aviso";
import { Dialogo } from "@/components/comum/dialogo";
import { Button } from "@/components/ui/button";
import { api, ErroApi } from "@/lib/api";
import { dataBr, dataHoraBr } from "@/lib/formato";
import { cn } from "@/lib/utils";
import type { EvolucaoRegistrada } from "./fichas";

// Situação da validação, com o texto, e não só a cor (RF67, RNF56).
export function SeloValidacao({
  situacao,
}: {
  situacao: ValidacaoEvolucao["situacao"];
}) {
  return (
    <span
      className={cn(
        "w-fit rounded-full px-2.5 py-0.5 text-sm font-semibold",
        situacao === "validada"
          ? "bg-sucesso-fundo text-sucesso"
          : "bg-alerta-fundo text-[#8a4500]",
      )}
    >
      {NOMES_SITUACAO_VALIDACAO[situacao]}
    </span>
  );
}

// "com a correção e o complemento já registrados", pelo que a evolução tem.
function oQueJaTem(evolucao: EvolucaoRegistrada) {
  const correcoes = Math.max((evolucao.versoes?.length ?? 1) - 1, 0);
  const complementos = evolucao.complementos?.length ?? 0;
  if (correcoes + complementos === 0) return "";
  const partes = [
    correcoes > 0 && (correcoes === 1 ? "a correção" : "as correções"),
    complementos > 0 &&
      (complementos === 1 ? "o complemento" : "os complementos"),
  ].filter(Boolean);
  const fim =
    correcoes + complementos > 1
      ? complementos > 0
        ? "já registrados"
        : "já registradas"
      : complementos > 0
        ? "já registrado"
        : "já registrada";
  return `, com ${partes.join(" e ")} ${fim}`;
}

// Validação da evolução (RF67): a situação, para todos que consultam, e a ação, só para
// o supervisor do caso.
export function ValidacaoDaEvolucao({
  prontuarioId,
  evolucao,
  numeroNoCiclo,
  supervisor,
}: {
  prontuarioId: string;
  evolucao: EvolucaoRegistrada;
  numeroNoCiclo: number | null;
  supervisor: string | null;
}) {
  const cache = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [validando, setValidando] = useState(false);
  const [validada, setValidada] = useState(false);
  const [erro, setErro] = useState<{ titulo: string; texto?: string } | null>(
    null,
  );
  const validacao = evolucao.validacao;
  if (!validacao) return null;
  const { ultima, mudanca, permitida } = validacao;
  const sessao = `da sessão ${numeroNoCiclo ?? ""}`.trim();

  async function validar() {
    setErro(null);
    setValidando(true);
    try {
      await api(
        `/prontuarios/${prontuarioId}/evolucoes/${evolucao.id}/validacao`,
        { method: "POST" },
      );
      setValidada(true);
    } catch (falha) {
      const status = falha instanceof ErroApi ? falha.status : 0;
      setErro(
        status === 403
          ? {
              titulo: "Você não pode validar esta evolução",
              texto:
                "A validação é feita só pelo supervisor do caso. A coordenação consulta a evolução, sem validar.",
            }
          : {
              titulo: "A evolução não foi validada.",
              texto: falha instanceof Error ? falha.message : undefined,
            },
      );
      // Na recusa por acesso, o prontuário não é lido de novo: a página trocaria o
      // aviso pelo acesso negado.
      if (status === 403) return;
    } finally {
      setAberto(false);
      setValidando(false);
    }
    await cache.invalidateQueries({ queryKey: ["prontuario", prontuarioId] });
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      {validada && validacao.situacao === "validada" && (
        <Aviso tipo="sucesso" titulo="Evolução validada." focar />
      )}
      {erro && (
        <Aviso tipo="erro" titulo={erro.titulo} focar>
          {erro.texto}
        </Aviso>
      )}
      {validacao.situacao === "validada" && ultima ? (
        <p className="ui-meta">
          Validada por {ultima.por} em {dataHoraBr(ultima.em)}.
        </p>
      ) : ultima && mudanca ? (
        <p className="flex items-start gap-2 rounded-lg bg-alerta-fundo px-3 py-2 text-sm">
          <TriangleAlert
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-[#a85400]"
          />
          <span>
            Validada por {ultima.por} em {dataBr(ultima.em)}. Voltou a ficar
            pendente porque recebeu{" "}
            {mudanca.tipo === "correcao" ? "uma correção" : "um complemento"} em{" "}
            {dataHoraBr(mudanca.em)}.
          </span>
        </p>
      ) : (
        !permitida && (
          <p className="ui-meta">
            A validação é feita pelo supervisor do caso
            {supervisor ? `, ${supervisor}` : ""}.
          </p>
        )
      )}
      {permitida && (
        <>
          <div>
            <Button
              type="button"
              className="max-sm:w-full"
              onClick={() => {
                setErro(null);
                setValidada(false);
                setAberto(true);
              }}
              aria-label={
                ultima
                  ? `Validar de novo a evolução ${sessao}`
                  : `Validar evolução ${sessao}`
              }
            >
              {ultima ? "Validar de novo" : "Validar evolução"}
            </Button>
          </div>
          <Dialogo
            aberto={aberto}
            aoFechar={() => setAberto(false)}
            titulo={`Validar a evolução ${sessao}?`}
            rodape={
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAberto(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  data-principal
                  disabled={validando}
                  onClick={() => void validar()}
                >
                  {validando ? "Validando…" : "Validar"}
                </Button>
              </>
            }
          >
            <p>
              A validação confirma que você revisou a evolução
              {oQueJaTem(evolucao)}. Ela não altera o conteúdo.
            </p>
            <p className="ui-dica">
              Se a evolução receber uma nova correção ou um novo complemento,
              ela volta a ficar pendente.
            </p>
          </Dialogo>
        </>
      )}
    </div>
  );
}
