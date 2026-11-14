import { useEffect, useState } from "react";

// Valor que só muda depois que a pessoa para de mexer nele por `ms`: a busca
// consulta a API quando ela para de digitar, e não a cada tecla.
export function useValorAtrasado<T>(valor: T, ms = 300): T {
  const [atrasado, setAtrasado] = useState(valor);
  useEffect(() => {
    const espera = setTimeout(() => setAtrasado(valor), ms);
    return () => clearTimeout(espera);
  }, [valor, ms]);
  return atrasado;
}
