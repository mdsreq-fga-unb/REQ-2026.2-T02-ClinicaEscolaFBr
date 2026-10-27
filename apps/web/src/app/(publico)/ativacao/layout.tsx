import { Suspense, type ReactNode } from "react";

export default function LayoutAtivacao({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <p role="status" className="p-6 text-sm">
          Carregando…
        </p>
      }
    >
      {children}
    </Suspense>
  );
}
