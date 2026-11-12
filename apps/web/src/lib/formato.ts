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

// Data de hoje em Brasília, no formato AAAA-MM-DD dos campos de data.
export const hojeBr = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(new Date());

// Só a hora (HH:MM), no horário de Brasília.
export const horaBr = (data: Date) =>
  data.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: FUSO,
  });

// "quinta-feira, 05/11/2026", no horário de Brasília.
export const diaDaSemanaBr = (valor: string) =>
  `${new Date(valor).toLocaleDateString("pt-BR", { timeZone: FUSO, weekday: "long" })}, ${dataBr(valor)}`;

// Antecedência mínima por extenso, para o paciente (RF15): "1 hora", "2 horas",
// "1 hora e 30 minutos", "45 minutos".
export function duracaoPorExtenso(minutos: number) {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  const h = horas === 1 ? "1 hora" : `${horas} horas`;
  const m = resto === 1 ? "1 minuto" : `${resto} minutos`;
  if (!horas) return m;
  return resto ? `${h} e ${m}` : h;
}

// Antecedência calculada, na forma curta do protótipo: "40 min", "2 h", "2 h 15 min".
export function duracaoCurta(minutos: number) {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (!horas) return `${resto} min`;
  return resto ? `${horas} h ${resto} min` : `${horas} h`;
}

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
  desligado_por_faltas: "Desligado por faltas",
  aguardando_vaga: "Em atendimento · aguardando vaga",
} as const;

export const NOMES_CANAL = {
  email: "E-mail",
  whatsapp: "WhatsApp",
  ligacao: "Ligação",
} as const;

// Situação da sessão (RF10, RF14, RF15, RF34).
export const NOMES_STATUS_SESSAO = {
  agendada: "Agendada",
  confirmada: "Confirmada",
  cancelada: "Cancelada",
  realizada: "Realizada",
  falta_paciente: "Falta do paciente",
} as const;
