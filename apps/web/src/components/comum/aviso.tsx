"use client";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// Cores dos avisos do protótipo aprovado (sucesso, erro, alerta e informação).
const estilos = {
  sucesso: {
    classe: "bg-sucesso-fundo border-[#a3d4b3]",
    Icone: CheckCircle2,
    cor: "text-sucesso",
  },
  erro: {
    classe: "bg-erro-fundo border-[#efb4ad]",
    Icone: AlertCircle,
    cor: "text-destructive",
  },
  alerta: {
    classe: "bg-alerta-fundo border-[#f0cf9f]",
    Icone: TriangleAlert,
    cor: "text-[#a85400]",
  },
  info: {
    classe: "bg-info-fundo border-[#a9cfe0]",
    Icone: Info,
    cor: "text-primary",
  },
} as const;

// Mensagem de estado com ícone e texto, sem depender só da cor (RNF1 e RNF56).
// Com `focar`, o aviso recebe o foco ao aparecer: o leitor de tela lê o resultado
// de uma ação feita num diálogo, que de outro modo passa em silêncio (RNF24). O
// nome acessível junta o título e o texto, para os dois serem lidos de uma vez:
// sem isso, o VoiceOver lê só o título e diz que há "mais 1 item".
export function Aviso({
  tipo,
  titulo,
  children,
  className,
  focar = false,
}: {
  tipo: keyof typeof estilos;
  titulo: string;
  children?: ReactNode;
  className?: string;
  focar?: boolean;
}) {
  const { classe, Icone, cor } = estilos[tipo];
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (!focar) return;
    // Depois do diálogo fechar, que devolve o foco a quem o abriu.
    const espera = setTimeout(() => ref.current?.focus());
    return () => clearTimeout(espera);
  }, [focar]);
  return (
    <div
      ref={ref}
      tabIndex={focar ? -1 : undefined}
      aria-labelledby={
        focar ? `${id}-titulo${children ? ` ${id}-texto` : ""}` : undefined
      }
      role={tipo === "erro" ? "alert" : "status"}
      className={cn(
        "flex gap-3 rounded-[12px] border px-4 py-3.5 text-[15px] leading-[1.45] text-foreground",
        classe,
        className,
      )}
    >
      <Icone aria-hidden className={cn("mt-px size-5 shrink-0", cor)} />
      <div className="min-w-0">
        <p id={`${id}-titulo`} className="font-bold">
          {titulo}
        </p>
        {children && (
          <div id={`${id}-texto`} className="mt-0.5">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
