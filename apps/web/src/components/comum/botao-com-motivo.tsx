"use client";
import { useId, type MouseEvent, type ReactNode } from "react";
import { useNotificacao } from "@/components/comum/notificacao";

type PropsDoBotao = {
  "aria-disabled"?: true;
  "aria-describedby"?: string;
  onClick?: (evento: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
};

// Botão que fica desativado até a pessoa fazer algo (preencher a etapa, mudar um
// valor). Em vez de um texto fixo na tela, o motivo aparece numa dica ao passar o
// mouse ou ao focar o botão, e num aviso passageiro ao clicar ou tocar nele
// (no celular não há "passar o mouse"). Por isso o botão usa aria-disabled, e
// não disabled: o disabled nativo não recebe o mouse nem o clique. O leitor de
// tela ouve o motivo pela descrição do botão (RNF56).
//
// Quem usa continua conferindo a condição no envio do formulário, porque o Enter
// num campo envia o formulário mesmo com o botão aria-disabled.
export function BotaoComMotivo({
  motivo,
  onClick,
  className,
  children,
}: {
  // Sem motivo, o botão funciona normalmente.
  motivo: string | null | undefined;
  onClick?: (evento: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  children: (props: PropsDoBotao) => ReactNode;
}) {
  const id = useId();
  const { notificar, elemento } = useNotificacao();
  // O invólucro fica sempre, com ou sem motivo: assim o botão não é recriado
  // (e não perde o foco) quando passa de desativado a ativo.
  return (
    <span className="group relative inline-flex max-sm:w-full">
      {children(
        motivo
          ? {
              "aria-disabled": true,
              "aria-describedby": `${id}-motivo`,
              className: `${className ?? ""} cursor-not-allowed opacity-55`,
              onClick: (evento) => {
                evento.preventDefault();
                notificar({ tipo: "info", titulo: motivo });
              },
            }
          : { onClick, className: className || undefined },
      )}
      {motivo && (
        <span
          id={`${id}-motivo`}
          role="tooltip"
          className="pointer-events-none absolute right-0 bottom-full z-40 mb-2 hidden w-max max-w-[280px] rounded-lg bg-[#1d2630] px-3 py-2 text-left text-sm font-normal text-white shadow-lg group-hover:block group-has-[:focus-visible]:block"
        >
          {motivo}
        </span>
      )}
      {elemento}
    </span>
  );
}
