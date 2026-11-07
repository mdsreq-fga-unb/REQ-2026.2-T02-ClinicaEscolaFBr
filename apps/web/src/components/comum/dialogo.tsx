"use client";
import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// Diálogo nativo (<dialog> com showModal): prende o foco, fecha com Esc e
// devolve o foco a quem o abriu, também quando ele é fechado pelo X, pelo
// Cancelar ou sai da página junto com quem o montou. Como no protótipo, o
// `lateral` abre do lado direito da tela, e no celular os dois ocupam a tela
// inteira, com o botão principal fixo no rodapé; no `alerta`, que confirma uma
// ação destrutiva, o rodapé mostra também o Cancelar.
export function Dialogo({
  aberto,
  aoFechar,
  titulo,
  subtitulo,
  rodape,
  lateral = false,
  alerta = false,
  children,
}: {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  subtitulo?: string;
  rodape?: ReactNode;
  lateral?: boolean;
  alerta?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  // O fechamento feito pelo próprio componente, ao sair da tela, também dispara o
  // evento "close", depois de a limpeza terminar. No desenvolvimento, o React
  // monta, desmonta e monta de novo o efeito: sem esta marca, o "close" da
  // primeira montagem chegaria com o diálogo já reaberto e o fecharia.
  const fechadoPeloComponente = useRef(false);
  const idTitulo = useId();
  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo || !aberto) return;
    const origem =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (!dialogo.open) dialogo.showModal();
    return () => {
      if (dialogo.open) {
        fechadoPeloComponente.current = true;
        dialogo.close();
      }
      if (origem?.isConnected) origem.focus();
    };
  }, [aberto]);
  return (
    <dialog
      ref={ref}
      onClose={() => {
        if (fechadoPeloComponente.current) {
          fechadoPeloComponente.current = false;
          return;
        }
        aoFechar();
      }}
      role={alerta ? "alertdialog" : undefined}
      aria-labelledby={idTitulo}
      className={cn(
        "flex-col bg-card p-0 text-foreground backdrop:bg-[rgba(0,26,38,0.55)] open:flex",
        "max-md:m-0 max-md:h-dvh max-md:max-h-none max-md:w-full max-md:max-w-none",
        lateral
          ? "md:mt-0 md:mr-0 md:mb-0 md:ml-auto md:h-dvh md:max-h-none md:w-[520px] md:max-w-full"
          : "md:m-auto md:w-[540px] md:max-w-[calc(100%-2rem)] md:rounded-[12px] md:shadow-[0_24px_64px_rgba(0,26,38,0.35)]",
      )}
    >
      <div
        className={cn(
          "flex items-start justify-between gap-3 max-md:items-center max-md:border-b max-md:border-border max-md:py-1.5 max-md:pr-1.5 max-md:pl-4",
          lateral
            ? "md:border-b md:border-border md:px-6 md:pt-5 md:pb-4"
            : "md:px-6 md:pt-6 md:pb-1",
        )}
      >
        <div>
          <h2
            id={idTitulo}
            className="text-lg leading-[1.3] font-bold text-marca md:text-[21px]"
          >
            {titulo}
          </h2>
          {subtitulo && (
            <p className="text-[15px] text-muted-foreground max-md:hidden">
              {subtitulo}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={aoFechar}
          aria-label="Fechar"
          className="grid size-11 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted md:-mt-2 md:-mr-2.5"
        >
          <X aria-hidden className="size-5" />
        </button>
      </div>
      <div
        className={cn(
          "flex flex-1 flex-col gap-4 overflow-y-auto p-4",
          lateral ? "md:px-6 md:py-5" : "md:px-6 md:pt-3 md:pb-5",
        )}
      >
        {children}
      </div>
      {rodape && (
        <div
          className={cn(
            "sticky bottom-0 flex justify-end gap-3 border-t border-border bg-card px-4 pt-3 pb-4 max-md:[&>*]:w-full",
            !alerta &&
              "max-md:[&:has([data-principal])>:not([data-principal])]:hidden",
            lateral ? "md:px-6 md:py-4" : "md:px-6 md:pt-4 md:pb-5",
          )}
        >
          {rodape}
        </div>
      )}
    </dialog>
  );
}
