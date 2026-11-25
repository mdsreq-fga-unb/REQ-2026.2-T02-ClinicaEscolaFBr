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
      {/* min-w-0 e overflow-wrap: anywhere deixam a coluna da grade encolher e
          quebram um valor longo sem espaço (um e-mail, por exemplo) só quando ele
          não cabe, sem rolagem lateral em 320 px (RNF56). */}
      {itens.map(([rotulo, valor]) => (
        <div key={rotulo} className="min-w-0">
          <dt className="text-[13px] font-semibold text-muted-foreground">
            {rotulo}
          </dt>
          <dd className="mt-0.5 text-[15px] font-semibold [overflow-wrap:anywhere]">
            {valor ?? "—"}
          </dd>
        </div>
      ))}
    </dl>
  );
}
