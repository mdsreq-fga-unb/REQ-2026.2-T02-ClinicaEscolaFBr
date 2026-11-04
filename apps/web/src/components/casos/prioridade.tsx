import type { Cor } from "@clinica/shared";
import { cn } from "@/lib/utils";

export const ESTILOS_PRIORIDADE: Record<
  Cor,
  { rotulo: string; classe: string; ponto: string }
> = {
  vermelha: {
    rotulo: "Vermelha",
    classe: "border-[#f0b4b4] bg-[#fdecec] text-[#8f1d1d]",
    ponto: "bg-[#c62828]",
  },
  amarela: {
    rotulo: "Amarela",
    classe: "border-[#e6c977] bg-[#fdf4d8] text-[#664600]",
    ponto: "bg-[#d9a300]",
  },
  verde: {
    rotulo: "Verde",
    classe: "border-[#a3d4b3] bg-[#e5f4ea] text-[#1b5e33]",
    ponto: "bg-[#2e7d32]",
  },
};

// Prioridade clínica com o nome da cor escrito, não só a cor (RNF56).
export function Prioridade({ cor }: { cor: Cor }) {
  const estilo = ESTILOS_PRIORIDADE[cor];
  return (
    <span className={cn("ui-selo", estilo.classe)}>
      <span
        aria-hidden
        className={cn("size-2.5 shrink-0 rounded-full", estilo.ponto)}
      />
      {estilo.rotulo}
    </span>
  );
}
