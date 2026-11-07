import { z } from "zod";
import type { Cor } from "./dominio-ciclo-3";

// Controle de assiduidade (CP9): falta do paciente (RF34), contagem no ciclo (RF35),
// alerta do limite (RF36), desligamento por faltas (RF37) e reversão (RF38).

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
  // Quem desconsiderou a falta na reversão do desligamento (RF38) e quando.
  retiradaPor: string | null;
  retiradaEm: string | null;
};

// Alerta do limite de faltas (RF36) e aviso da 1ª falta (RF35), na faixa do topo da
// área interna. Sem o motivo das faltas.
export type AlertaFaltas = {
  casoId: string;
  nome: string;
  faltas: number;
  ultimaFalta: string;
  // Para o estagiário, que abre o paciente pelo prontuário.
  prontuarioId: string | null;
};
export type AlertasFaltas = {
  limite: AlertaFaltas[];
  primeiraFalta: AlertaFaltas[];
};

// Resultado do desligamento por faltas (RF37).
export type ResultadoDesligamento = {
  desligamentoId: string;
  estagiario: string | null;
  sessoesCanceladas: number;
};

// Vaga liberada pelo desligamento, aguardando realocação (RF37). O próximo inscrito
// elegível vem da fila de espera do RF7; enquanto ela não existe, vem vazio.
export type VagaLiberada = {
  id: string;
  estagiario: string;
  supervisor: string;
  liberadaEm: string;
  proximoInscrito: {
    numero: string;
    nome: string;
    prioridade: Cor;
    naFilaDesde: string;
  } | null;
};

// Reversão do desligamento pela coordenação (RF38): o motivo é obrigatório e as
// faltas indicadas deixam de contar. Se a contagem que sobra ainda atinge o limite,
// a reversão pede a confirmação em manterContagem.
export const reversaoDesligamentoSchema = z.object({
  motivo: z
    .string()
    .trim()
    .min(1, "Informe o motivo da reversão.")
    .max(1000, "Use até 1.000 caracteres."),
  faltasRetiradas: z.array(z.uuid()).default([]),
  manterContagem: z.boolean().default(false),
});
export type ReversaoDesligamento = z.infer<typeof reversaoDesligamentoSchema>;

export type ResultadoReversao = {
  situacao: "em_atendimento" | "aguardando_vaga";
  estagiario: string | null;
  sessoesAReagendar: number;
};

// Desligamento do ciclo, com a reversão quando houver, no histórico do caso.
export type DesligamentoDoCaso = {
  id: string;
  decididoPor: string;
  decididoEm: string;
  dataDecisao: string;
  faltas: string[];
  revertidoPor: string | null;
  revertidoEm: string | null;
  // Só para a coordenação, que reverte (RF38).
  motivoReversao: string | null;
  pendenteDeVaga: boolean;
};

// Sessão cancelada pelo desligamento que ficou para reagendar depois da reversão.
export type SessaoAReagendar = {
  id: string;
  inicio: string;
  termino: string;
  estagiario: string;
};
