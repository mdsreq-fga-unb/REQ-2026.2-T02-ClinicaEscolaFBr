import { Suspense, type ReactNode } from "react";
import { AreaInterna } from "@/components/layout/area-interna";

// A área interna lê a URL e a sessão no navegador, por isso fica dentro de Suspense.
export default function LayoutInterno({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <p role="status" className="p-6 text-sm">
          Carregando…
        </p>
      }
    >
      <AreaInterna>{children}</AreaInterna>
    </Suspense>
  );
}
