import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Moldura das páginas públicas da equipe, como no protótipo: na entrada, o
// cartão fica no centro da tela; na ativação, no alto, com o rodapé da clínica.
export function PaginaEquipe({
  children,
  centralizada = false,
}: {
  children: ReactNode;
  centralizada?: boolean;
}) {
  return (
    <div className="flex min-h-[calc(100dvh-var(--altura-faixa,0px))] flex-col">
      <header className="flex items-center gap-3 bg-marca px-4 py-3 text-white md:px-12 md:py-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-[10px] bg-white text-[15px] font-extrabold text-primary">
          FBr
        </span>
        <span className="leading-tight">
          <span className="block text-base font-bold">
            Clínica Escola de Psicologia
          </span>
          <span className="block text-[13px] text-[#cfe3ec]">
            Sistema da equipe
          </span>
        </span>
      </header>
      <main
        id="conteudo"
        className={cn(
          "flex flex-1 justify-center px-4",
          centralizada
            ? "items-center py-8"
            : "items-start pt-6 pb-10 md:pt-14 md:pb-[72px]",
        )}
      >
        <div
          className={cn(
            "flex w-full flex-col gap-5 rounded-[12px] border border-border bg-card px-4 py-5 md:p-8",
            centralizada ? "max-w-[440px]" : "max-w-[520px]",
          )}
        >
          {children}
        </div>
      </main>
      {!centralizada && (
        <footer className="border-t border-border px-4 py-4 text-sm text-muted-foreground md:px-12 md:py-5">
          Clínica Escola de Psicologia da Faculdade Brasília
        </footer>
      )}
    </div>
  );
}
