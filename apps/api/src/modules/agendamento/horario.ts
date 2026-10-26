// Datas exibidas no horário de Brasília. Desde 2019 não há horário de verão, então o
// dia em Brasília começa sempre às 00:00 de UTC−3.
const FUSO = 'America/Sao_Paulo';
export const MINUTO = 60_000;

// "22/10/2026" ou, com 'iso', "2026-10-22".
export function dataBrasilia(d: Date, formato: 'br' | 'iso' = 'br') {
  const br = d.toLocaleDateString('pt-BR', { timeZone: FUSO });
  if (formato === 'br') return br;
  const [dia, mes, ano] = br.split('/');
  return `${ano}-${mes}-${dia}`;
}

export const horaBrasilia = (d: Date) =>
  d.toLocaleTimeString('pt-BR', {
    timeZone: FUSO,
    hour: '2-digit',
    minute: '2-digit',
  });

export const diaDaSemana = (d: Date) =>
  d.toLocaleDateString('pt-BR', { timeZone: FUSO, weekday: 'long' });

// "2026-10-22" → 22/10/2026 00:00 em Brasília.
export const inicioDoDia = (data: string) => new Date(`${data}T00:00:00-03:00`);

// O RF1 guarda o celular como digitado, com ou sem +55, parênteses e traço.
const onzeDigitos = (celular: string) => celular.replace(/\D/g, '').slice(-11);

export const celularParaWhatsapp = (celular: string) =>
  `55${onzeDigitos(celular)}`;

export function formatarCelular(celular: string) {
  const d = onzeDigitos(celular);
  return d.length === 11
    ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
    : celular;
}
