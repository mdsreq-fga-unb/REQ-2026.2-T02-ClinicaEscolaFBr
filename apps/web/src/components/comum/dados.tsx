import type { ReactNode } from "react";

// Lista de rótulos e valores em grade.
export function Dados({
  itens,
  colunas = 4,
}: {
  itens: [string, ReactNode][];
  colunas?: 2 | 4;
}) {
  return (
    <dl
      className={
        colunas === 4
          ? "grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4"
          : "grid gap-x-6 gap-y-3 sm:grid-cols-2"
      }
    >
      {itens.map(([rotulo, valor]) => (
        <div key={rotulo}>
          <dt className="text-xs text-muted-foreground">{rotulo}</dt>
          <dd className="text-sm font-semibold break-words">{valor ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
