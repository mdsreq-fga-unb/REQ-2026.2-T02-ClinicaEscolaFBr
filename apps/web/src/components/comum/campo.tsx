import { AlertCircle } from "lucide-react";
import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// Campo com rótulo, dica e erro ligados ao controle por aria-describedby (RNF1).
// Nas páginas públicas (`publico`), o rótulo e o campo seguem o tamanho maior do
// protótipo.
export function Campo({
  id: idExterno,
  rotulo,
  dica,
  dicaClassName,
  erro,
  publico = false,
  className,
  children,
}: {
  // Id do controle, para quando um resumo de erros precisa levar até ele.
  id?: string;
  rotulo: string;
  dica?: string;
  dicaClassName?: string;
  erro?: string;
  publico?: boolean;
  className?: string;
  children: (props: {
    id: string;
    "aria-describedby"?: string;
    "aria-invalid"?: boolean;
  }) => ReactNode;
}) {
  const gerado = useId();
  const id = idExterno ?? gerado;
  const idDica = `${id}-dica`;
  const idErro = `${id}-erro`;
  const descritores = [dica && idDica, erro && idErro]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={id}
        className={cn(
          "font-semibold text-foreground",
          publico ? "text-base" : "text-[15px]",
        )}
      >
        {rotulo}
      </label>
      {dica && (
        <p id={idDica} className={cn("ui-dica", dicaClassName)}>
          {dica}
        </p>
      )}
      {children({
        id,
        "aria-describedby": descritores || undefined,
        "aria-invalid": erro ? true : undefined,
      })}
      {erro && (
        <p
          id={idErro}
          className="flex items-start gap-1.5 text-sm leading-[1.4] font-semibold text-destructive"
        >
          <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
          {erro}
        </p>
      )}
    </div>
  );
}

const base =
  "w-full min-w-0 rounded-lg border-[1.5px] border-input bg-white text-foreground aria-[invalid=true]:border-2 aria-[invalid=true]:border-destructive";

export const classeEntrada = `${base} h-11 px-3 text-[15px]`;
export const classeEntradaPublica = `${base} h-12 px-3.5 text-base`;
export const classeTextoLongo = `${base} min-h-[140px] p-3 text-[15px] leading-[1.55]`;
