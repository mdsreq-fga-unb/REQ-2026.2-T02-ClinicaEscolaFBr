"use client";
import { useEffect, useRef } from "react";

// Faixa no topo de todas as páginas do ambiente de validação, para ninguém
// confundir com o sistema em uso nem cadastrar dados reais. O valor de
// NEXT_PUBLIC_AMBIENTE entra na imagem da web no build de cada ambiente. No
// computador, a faixa fica presa no topo, e a altura dela vai para
// --altura-faixa, para o menu lateral caber inteiro na tela abaixo dela.
export function FaixaAmbiente({
  ambiente = process.env.NEXT_PUBLIC_AMBIENTE,
}: {
  ambiente?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const faixa = ref.current;
    if (!faixa) return;
    const raiz = document.documentElement;
    const medir = () => {
      const presa = getComputedStyle(faixa).position === "sticky";
      raiz.style.setProperty(
        "--altura-faixa",
        presa ? `${faixa.offsetHeight}px` : "0px",
      );
    };
    medir();
    if (typeof ResizeObserver === "undefined") return;
    const observador = new ResizeObserver(medir);
    observador.observe(faixa);
    return () => {
      observador.disconnect();
      raiz.style.removeProperty("--altura-faixa");
    };
  }, []);
  if (ambiente !== "validacao") return null;
  return (
    <div
      ref={ref}
      role="note"
      className="z-40 border-b border-alerta/30 bg-alerta-fundo px-4 py-2 text-center text-sm font-medium text-alerta md:sticky md:top-0"
    >
      Ambiente de validação: use só dados fictícios. Nada do que for registrado
      aqui vale para a Clínica Escola.
    </div>
  );
}
