import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import { FaixaAmbiente } from "@/components/layout/faixa-ambiente";
import "./globals.css";
import { Providers } from "./providers";

// Fonte do protótipo aprovado; a variável --font-sans alimenta o tema.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Clínica Escola FBr",
  description: "Sistema da Clínica Escola de Psicologia da Faculdade Brasília",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body>
        <FaixaAmbiente />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
