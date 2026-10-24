import type { ReactNode } from "react";

// Moldura das páginas públicas da equipe (ativação e entrada).
export function PaginaEquipe({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="bg-marca px-4 py-4 text-white md:px-8">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-md bg-white text-sm font-bold text-marca">
            FBr
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold">
              Clínica Escola de Psicologia
            </span>
            <span className="block text-xs text-white/80">
              Sistema da equipe
            </span>
          </span>
        </div>
      </header>
      <main
        id="conteudo"
        className="flex flex-1 items-start justify-center px-4 py-10"
      >
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-sm">
          {children}
        </div>
      </main>
      <footer className="border-t border-border px-4 py-4 text-xs text-muted-foreground md:px-8">
        Clínica Escola de Psicologia da Faculdade Brasília
      </footer>
    </div>
  );
}
