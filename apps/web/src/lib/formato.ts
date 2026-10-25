// Datas e horas sempre no horário de Brasília, qualquer que seja o fuso do navegador.
const FUSO = "America/Sao_Paulo";

// Datas sem hora (AAAA-MM-DD) são lidas ao meio-dia UTC, para não mudarem de dia no fuso.
export const dataBr = (valor: string | null | undefined) =>
  valor
    ? new Date(
        valor.length === 10 ? `${valor}T12:00:00Z` : valor,
      ).toLocaleDateString("pt-BR", { timeZone: FUSO })
    : "—";

export const dataHoraBr = (valor: string | null | undefined) =>
  valor
    ? `${dataBr(valor)}, ${new Date(valor).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: FUSO })}`
    : "—";

export function idade(nascimento: string) {
  const [ano, mes, dia] = nascimento.split("-").map(Number);
  // Data de hoje em Brasília, no formato AAAA-MM-DD.
  const [anoHoje, mesHoje, diaHoje] = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
  })
    .format(new Date())
    .split("-")
    .map(Number);
  const fezAniversario = mesHoje > mes || (mesHoje === mes && diaHoje >= dia);
  return anoHoje - ano - (fezAniversario ? 0 : 1);
}

export const NOMES_SITUACAO_CASO = {
  aguardando_distribuicao: "Aguardando distribuição",
  aguardando_vinculo: "Aguardando vínculo",
  em_atendimento: "Em atendimento",
  encerrado: "Encerrado",
} as const;

export const NOMES_CANAL = {
  email: "E-mail",
  whatsapp: "WhatsApp",
  ligacao: "Ligação",
} as const;
