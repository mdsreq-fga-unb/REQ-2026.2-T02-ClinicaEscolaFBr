"use client";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type TipoNotificacao = "sucesso" | "info" | "alerta" | "erro";
export type Notificacao = {
  tipo: TipoNotificacao;
  titulo: string;
  texto?: string;
};

const ICONES = {
  sucesso: CheckCircle2,
  info: Info,
  alerta: TriangleAlert,
  erro: TriangleAlert,
};
const CORES: Record<TipoNotificacao, string> = {
  sucesso: "border-[#a3d4b3] bg-[#e5f4ea] text-[#1b5e33]",
  info: "border-[#a9cfe0] bg-[#e4f2f8] text-[#0b4a66]",
  alerta: "border-[#f0cf9f] bg-[#fff4e6] text-[#7a4a00]",
  erro: "border-[#efb4ad] bg-[#fdf1f0] text-[#8f1a10]",
};
const DURACAO_MS = 6000;

// Aviso passageiro do resultado de uma ação (toast). A região viva fica sempre
// na página e só o texto muda, para o leitor de tela anunciar (RNF56); o erro usa
// "alert". Some sozinho depois de alguns segundos, mas não enquanto o mouse ou o
// foco estiverem nele, e pode ser fechado.
export function useNotificacao() {
  const [atual, setAtual] = useState<(Notificacao & { id: number }) | null>(
    null,
  );
  const pausada = useRef(false);
  const notificar = useCallback((n: Notificacao) => {
    setAtual({ ...n, id: Date.now() });
  }, []);
  const fechar = useCallback(() => setAtual(null), []);

  useEffect(() => {
    if (!atual) return;
    const espera = setInterval(() => {
      if (!pausada.current) setAtual(null);
    }, DURACAO_MS);
    return () => clearInterval(espera);
  }, [atual]);

  const Icone = atual ? ICONES[atual.tipo] : null;
  const elemento = (
    <div
      className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex justify-end sm:left-auto sm:w-[420px]"
      onMouseEnter={() => (pausada.current = true)}
      onMouseLeave={() => (pausada.current = false)}
      onFocus={() => (pausada.current = true)}
      onBlur={() => (pausada.current = false)}
    >
      <div
        role={atual?.tipo === "erro" ? "alert" : "status"}
        aria-live={atual?.tipo === "erro" ? "assertive" : "polite"}
        className="w-full"
      >
        {atual && Icone && (
          <div
            key={atual.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-xl border-[1.5px] p-4 shadow-lg",
              CORES[atual.tipo],
            )}
          >
            <Icone aria-hidden className="mt-0.5 size-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{atual.titulo}</p>
              {atual.texto && <p className="mt-0.5 text-sm">{atual.texto}</p>}
            </div>
            <button
              type="button"
              onClick={fechar}
              aria-label="Fechar aviso"
              className="rounded p-1 hover:bg-black/5"
            >
              <X aria-hidden className="size-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
  return { notificar, fechar, elemento };
}
