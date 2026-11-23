import { z } from "zod";
import { dataValida, hojeEmBrasilia } from "./datas";
import type { SituacaoCaso } from "./dominio-ciclo-3";

// Encerramento do caso por alta (RF68): o estagiário responsável pede, o
// supervisor do caso confirma e só a coordenação reabre. O motivo é cifrado.
export const LIMITE_MOTIVO_ALTA = 1000;

const motivo = (rotulo: string) =>
  z
    .string()
    .trim()
    .min(1, `Informe o motivo ${rotulo}.`)
    .max(LIMITE_MOTIVO_ALTA, `Use no máximo ${LIMITE_MOTIVO_ALTA} caracteres.`);

// A data da alta não pode ser futura: o pedido registra uma alta que aconteceu.
export const pedidoAltaSchema = z.object({
  dataAlta: z
    .string()
    .refine(dataValida, "Informe a data da alta.")
    .refine(
      (data) => !dataValida(data) || data <= hojeEmBrasilia(),
      "A data da alta não pode ser futura.",
    ),
  motivo: motivo("da alta"),
});
export type PedidoAlta = z.infer<typeof pedidoAltaSchema>;

// Quem pediu a reabertura: o estagiário da alta ou o supervisor do caso.
export const reaberturaCasoSchema = z.object({
  pedidaPor: z.uuid("Escolha quem pediu a reabertura."),
  motivo: motivo("da reabertura"),
});
export type ReaberturaCaso = z.infer<typeof reaberturaCasoSchema>;

// Alta registrada. O motivo só vai para o estagiário, o supervisor e a
// coordenação; a secretaria vê a alta sem o motivo (RNF17).
export type RegistroAlta = {
  id: string;
  dataAlta: string;
  motivo: string | null;
  pedidaPor: string;
  pedidaEm: string;
  confirmadaPor: string | null;
  confirmadaEm: string | null;
  reabertura: {
    pedidaPor: string;
    reabertaPor: string;
    reabertaEm: string;
    motivo: string | null;
  } | null;
};

// Situação da alta na ficha do caso (RF68, prancha 6-5).
export type SituacaoAlta = {
  situacao: SituacaoCaso;
  // Ciclo de atendimento e sessões realizadas nele, para o subtítulo do pedido.
  ciclo: number;
  sessoesRealizadas: number;
  // O pedido aberto, aguardando a confirmação do supervisor.
  pedidoAberto: RegistroAlta | null;
  // Todas as altas confirmadas do caso, da mais recente para a mais antiga, com
  // a reabertura quando houve.
  historico: RegistroAlta[];
  acoes: { pedir: boolean; confirmar: boolean; reabrir: boolean };
  supervisor: string | null;
  // Sessões realizadas do ciclo sem evolução: depois da alta, o estagiário não
  // registra mais evolução no caso (RF28). Só para o estagiário e o supervisor.
  sessoesSemEvolucao: number;
  // Por que a coordenação não pode reabrir (outro semestre ou outro ciclo).
  bloqueioReabertura: string | null;
  // Quem pode ter pedido a reabertura: o estagiário da alta e o supervisor.
  pedidoPorOpcoes: {
    id: string;
    nome: string;
    papel: "estagiario" | "supervisor";
  }[];
};

export type ResultadoReabertura = {
  situacao: "em_atendimento" | "aguardando_vinculo";
  estagiario: string | null;
  supervisor: string | null;
};
