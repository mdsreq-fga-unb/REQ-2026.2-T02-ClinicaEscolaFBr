import type { Cor } from "@clinica/shared";
import { cn } from "@/lib/utils";

const ESTILOS: Record<Cor, { rotulo: string; classe: string; ponto: string }> =
  {
    vermelha: {
      rotulo: "Vermelha",
      classe: "bg-erro-fundo text-destructive",
      ponto: "bg-destructive",
    },
    amarela: {
      rotulo: "Amarela",
      classe: "bg-alerta-fundo text-alerta",
      ponto: "bg-alerta",
    },
    verde: {
      rotulo: "Verde",
      classe: "bg-sucesso-fundo text-sucesso",
      ponto: "bg-sucesso",
    },
  };

// Prioridade clínica com o nome da cor escrito, não só a cor (RNF56).
export function Prioridade({ cor }: { cor: Cor }) {
  const estilo = ESTILOS[cor];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold",
        estilo.classe,
      )}
    >
      <span aria-hidden className={cn("size-2 rounded-full", estilo.ponto)} />
      {estilo.rotulo}
    </span>
  );
}
