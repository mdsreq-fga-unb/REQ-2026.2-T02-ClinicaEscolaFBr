"use client";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const estilos = {
  sucesso: {
    classe: "bg-sucesso-fundo border-sucesso/30",
    Icone: CheckCircle2,
    cor: "text-sucesso",
  },
  erro: {
    classe: "bg-erro-fundo border-destructive/40",
    Icone: AlertCircle,
    cor: "text-destructive",
  },
  alerta: {
    classe: "bg-alerta-fundo border-alerta/30",
    Icone: TriangleAlert,
    cor: "text-alerta",
  },
  info: {
    classe: "bg-info-fundo border-primary/30",
    Icone: Info,
    cor: "text-primary",
  },
} as const;

// Mensagem de estado com ícone e texto, sem depender só da cor (RNF1 e RNF56).
// Com `focar`, o aviso recebe o foco ao aparecer: o leitor de tela lê o resultado
// de uma ação feita num diálogo, que de outro modo passa em silêncio (RNF24).
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
      role={tipo === "erro" ? "alert" : "status"}
      className={cn(
        "flex gap-3 rounded-lg border p-4 text-sm",
        classe,
        className,
      )}
    >
      <Icone aria-hidden className={cn("mt-0.5 size-5 shrink-0", cor)} />
      <div>
        <p className="font-semibold text-foreground">{titulo}</p>
        {children && <div className="mt-1 text-foreground">{children}</div>}
      </div>
    </div>
  );
}
