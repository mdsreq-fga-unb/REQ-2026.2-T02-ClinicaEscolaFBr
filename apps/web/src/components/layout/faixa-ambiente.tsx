// Faixa no topo de todas as páginas do ambiente de validação, para ninguém
// confundir com o sistema em uso nem cadastrar dados reais. O valor de
// NEXT_PUBLIC_AMBIENTE entra na imagem da web no build de cada ambiente.
export function FaixaAmbiente({
  ambiente = process.env.NEXT_PUBLIC_AMBIENTE,
}: {
  ambiente?: string;
}) {
  if (ambiente !== "validacao") return null;
  return (
    <div
      role="note"
      className="border-b border-alerta/30 bg-alerta-fundo px-4 py-2 text-center text-sm font-medium text-alerta"
    >
      Ambiente de validação: use só dados fictícios. Nada do que for registrado
      aqui vale para a Clínica Escola.
    </div>
  );
}
