import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";

// O endereço traz o token da sessão: não é indexado nem enviado a outros sites (RNF59).
export const metadata: Metadata = {
  title: "Sua sessão · Clínica Escola FBr",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function LayoutConfirmacao({
  children,
}: {
  children: ReactNode;
}) {
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
