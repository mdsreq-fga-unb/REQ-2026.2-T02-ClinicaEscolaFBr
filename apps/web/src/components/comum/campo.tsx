import { AlertCircle } from "lucide-react";
import { useId, type ReactNode } from "react";

// Campo com rótulo, dica e erro ligados ao controle por aria-describedby (RNF1).
export function Campo({
  rotulo,
  dica,
  erro,
  children,
}: {
  rotulo: string;
  dica?: string;
  erro?: string;
  children: (props: {
    id: string;
    "aria-describedby"?: string;
    "aria-invalid"?: boolean;
  }) => ReactNode;
}) {
  const id = useId();
  const idDica = `${id}-dica`;
  const idErro = `${id}-erro`;
  const descritores = [dica && idDica, erro && idErro]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-foreground"
      >
        {rotulo}
      </label>
      {dica && (
        <p id={idDica} className="text-xs text-muted-foreground">
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
          className="flex items-start gap-1 text-xs font-medium text-destructive"
        >
          <AlertCircle aria-hidden className="mt-px size-3.5 shrink-0" />
          {erro}
        </p>
      )}
    </div>
  );
}

export const classeEntrada =
  "h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground aria-[invalid=true]:border-destructive";
