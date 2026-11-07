import { z } from "zod";

// Controle de assiduidade (CP9): falta do paciente (RF34) e contagem no ciclo (RF35).

// Limite de faltas no ciclo que leva ao alerta e ao desligamento (RF36, RF37, DF20).
export const LIMITE_FALTAS_CICLO = 2;

export const ORIGENS_FALTA = ["falta", "cancelamento_fora_do_prazo"] as const;
export type OrigemFalta = (typeof ORIGENS_FALTA)[number];

const motivo = z
  .string()
  .trim()
  .min(1, "Informe o motivo da justificativa.")
  .max(1000, "Use até 1.000 caracteres.");

// Registro da falta (RF34): a justificativa é opcional, para quem já tem o
// comprovante na hora, e exige o motivo quando marcada.
export const registroFaltaSchema = z
  .object({
    justificada: z.boolean().default(false),
    motivo: z.string().trim().max(1000, "Use até 1.000 caracteres.").optional(),
  })
  .superRefine((dados, ctx) => {
    if (dados.justificada && !dados.motivo) {
      ctx.addIssue({
        code: "custom",
        path: ["motivo"],
        message: "Informe o motivo da justificativa.",
      });
    }
  });
export type RegistroFalta = z.infer<typeof registroFaltaSchema>;

// Justificativa feita depois do registro (RF34).
export const justificativaFaltaSchema = z.object({ motivo });
export type JustificativaFalta = z.infer<typeof justificativaFaltaSchema>;

// Aviso devolvido depois de uma falta (RF35): na 1ª, uma nova falta leva ao
// desligamento; a partir da 2ª, o limite foi atingido (alerta do RF36).
export type AvisoFaltas = "primeira_falta" | "limite_atingido" | null;

export type ContagemFaltas = {
  faltas: number;
  limite: number;
  aviso: AvisoFaltas;
};

// Falta na lista de sessões do prontuário e dos dados administrativos. O motivo só
// vai para quem pode justificar a falta e para a coordenação.
export type FaltaDaSessao = {
  id: string;
  origem: OrigemFalta;
  registradaPor: string | null;
  registradaPeloPaciente: boolean;
  registradaEm: string;
  justificada: boolean;
  motivo: string | null;
  justificadaPor: string | null;
  justificadaEm: string | null;
  retiradaDaContagem: boolean;
};
