import { z } from "zod";
import { LIMITE_CAMPO_CLINICO, type SituacaoCaso } from "./dominio-ciclo-3";

// Complemento de evolução (RF30): informação adicional, que se soma ao registro sem
// mudar o que já foi salvo. Texto livre, com o limite dos campos da evolução (RF28).
const milhar = (n: number) => n.toLocaleString("pt-BR");

export const complementoEvolucaoSchema = z.object({
  texto: z
    .string("Escreva o complemento.")
    .trim()
    .min(1, "Escreva o complemento.")
    .max(LIMITE_CAMPO_CLINICO, {
      error: (problema) =>
        `Use até ${milhar(LIMITE_CAMPO_CLINICO)} caracteres (agora são ${milhar(
          String(problema.input).length,
        )}).`,
    }),
});
export type ComplementoEvolucaoEntrada = z.infer<
  typeof complementoEvolucaoSchema
>;

// Complemento como o prontuário mostra, separado das versões da correção (RF29).
export type ComplementoEvolucao = {
  tipo: "complemento";
  id: string;
  texto: string;
  autor: string;
  em: string;
};

// Só o caso em atendimento aceita complemento.
export const aceitaComplemento = (situacao: SituacaoCaso) =>
  situacao === "em_atendimento";

const ENCERRAMENTOS: Record<string, (quando: string) => string> = {
  encerrado_por_alta: (quando) =>
    `O caso foi encerrado por alta${quando}. A evolução pode ser consultada, mas não aceita novos complementos.`,
  desligado_por_faltas: (quando) =>
    `O paciente foi desligado por faltas${quando}. A evolução não aceita novos complementos.`,
};

// Aviso do caso que não aceita complemento, com a data do encerramento quando ela é
// conhecida, ou null se o caso aceita.
export function avisoSemComplemento(
  situacao: SituacaoCaso,
  encerradoEm: string | null = null,
): string | null {
  if (aceitaComplemento(situacao)) return null;
  const quando = encerradoEm
    ? ` em ${encerradoEm.slice(0, 10).split("-").reverse().join("/")}`
    : "";
  return (
    ENCERRAMENTOS[situacao]?.(quando) ??
    "O caso não está em atendimento. A evolução não aceita novos complementos."
  );
}
