export const dataBr = (valor: string | null | undefined) =>
  valor
    ? new Date(
        valor.length === 10 ? `${valor}T12:00:00` : valor,
      ).toLocaleDateString("pt-BR")
    : "—";

export const dataHoraBr = (valor: string | null | undefined) =>
  valor
    ? `${dataBr(valor)}, ${new Date(valor).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
    : "—";

export function idade(nascimento: string) {
  const hoje = new Date();
  const data = new Date(`${nascimento}T12:00:00`);
  let anos = hoje.getFullYear() - data.getFullYear();
  if (hoje < new Date(hoje.getFullYear(), data.getMonth(), data.getDate()))
    anos -= 1;
  return anos;
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
