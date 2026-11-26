"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export const ITENS_POR_PAGINA = 100;

// Paginação na tela, para listas que a API devolve inteiras: mostra 100 por vez.
// Quando a lista muda de tamanho (um filtro), volta à primeira página.
export function usePaginacao<T>(
  itens: readonly T[] | undefined,
  tamanho = ITENS_POR_PAGINA,
) {
  const [pagina, setPagina] = useState(1);
  const total = itens?.length ?? 0;
  const paginas = Math.max(1, Math.ceil(total / tamanho));
  // Lista de outro tamanho (um filtro): volta à primeira página, no próprio
  // render, como o React recomenda para estado derivado de props.
  const [totalAnterior, setTotalAnterior] = useState(total);
  if (total !== totalAnterior) {
    setTotalAnterior(total);
    setPagina(1);
  }
  const atual = Math.min(pagina, paginas);
  return {
    pagina: atual,
    paginas,
    total,
    visiveis: itens?.slice((atual - 1) * tamanho, atual * tamanho) ?? [],
    inicio: total ? (atual - 1) * tamanho + 1 : 0,
    fim: Math.min(atual * tamanho, total),
    irPara: setPagina,
  };
}

// Botões de página, só quando há mais de uma.
export function Paginacao({
  rotulo,
  pagina,
  paginas,
  irPara,
}: {
  rotulo: string;
  pagina: number;
  paginas: number;
  irPara: (pagina: number) => void;
}) {
  if (paginas <= 1) return null;
  return (
    <nav aria-label={rotulo} className="flex flex-wrap items-center gap-3">
      <Button
        variant="outline"
        disabled={pagina <= 1}
        onClick={() => irPara(pagina - 1)}
      >
        Anterior
      </Button>
      <span>
        Página {pagina} de {paginas}
      </span>
      <Button
        variant="outline"
        disabled={pagina >= paginas}
        onClick={() => irPara(pagina + 1)}
      >
        Próxima
      </Button>
    </nav>
  );
}
