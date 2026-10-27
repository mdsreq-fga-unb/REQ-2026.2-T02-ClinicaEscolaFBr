"use client";
import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

// Diálogo nativo (<dialog> com showModal): prende o foco, fecha com Esc e
// devolve o foco a quem o abriu.
export function Dialogo({
  aberto,
  aoFechar,
  titulo,
  children,
}: {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (aberto && !dialogo.open) dialogo.showModal();
    if (!aberto && dialogo.open) dialogo.close();
  }, [aberto]);
  return (
    <dialog
      ref={ref}
      onClose={aoFechar}
      aria-labelledby="dialogo-titulo"
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-lg bg-card p-0 text-foreground shadow-xl backdrop:bg-marca/60"
    >
      <div className="flex items-start justify-between border-b border-border p-5">
        <h2 id="dialogo-titulo" className="text-lg font-semibold text-marca">
          {titulo}
        </h2>
        <button
          type="button"
          onClick={aoFechar}
          aria-label="Fechar"
          className="rounded-md p-1 text-muted-foreground hover:bg-muted"
        >
          <X aria-hidden className="size-5" />
        </button>
      </div>
      <div className="p-5">{children}</div>
    </dialog>
  );
}
