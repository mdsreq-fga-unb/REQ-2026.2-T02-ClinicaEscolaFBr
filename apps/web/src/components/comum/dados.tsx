import type { ReactNode } from "react";

// Lista de rótulos e valores em grade, como a identificação do protótipo.
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
          ? "grid gap-x-6 gap-y-3.5 sm:grid-cols-2 lg:grid-cols-4"
          : "grid gap-x-6 gap-y-3.5 sm:grid-cols-2"
      }
    >
      {itens.map(([rotulo, valor]) => (
        <div key={rotulo}>
          <dt className="text-[13px] font-semibold text-muted-foreground">
            {rotulo}
          </dt>
          <dd className="mt-0.5 text-[15px] font-semibold break-words">
            {valor ?? "—"}
          </dd>
        </div>
      ))}
    </dl>
  );
}
