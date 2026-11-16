// Data de hoje (AAAA-MM-DD) no horário de Brasília, qualquer que seja o fuso.
export function hojeEmBrasilia(agora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
}

// Dia do calendário (AAAA-MM-DD) que existe: "2026-02-30" não passa.
const DATA = /^\d{4}-\d{2}-\d{2}$/;
export const dataValida = (valor: string) =>
  DATA.test(valor) &&
  !Number.isNaN(Date.parse(`${valor}T12:00:00Z`)) &&
  new Date(`${valor}T12:00:00Z`).toISOString().slice(0, 10) === valor;
