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
// O limite mínimo (o início do atendimento pelo estagiário no caso, ou o do
// semestre) depende do caso e é conferido na API, que o devolve na situação.
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

// Pedido aberto com um erro: o estagiário que pediu o cancela, ou o supervisor
// do caso o recusa, sempre com o motivo. Depois, um pedido novo pode ser feito.
export const cancelamentoAltaSchema = z.object({
  motivo: motivo("do cancelamento"),
});
export const recusaAltaSchema = z.object({ motivo: motivo("da recusa") });
export type CancelamentoAlta = z.infer<typeof cancelamentoAltaSchema>;

export const FORMAS_CANCELAMENTO_ALTA = [
  "cancelado_pelo_estagiario",
  "recusado_pelo_supervisor",
  "encerrado_pela_transferencia",
  "encerrado_pelo_desligamento",
] as const;
export type FormaCancelamentoAlta = (typeof FORMAS_CANCELAMENTO_ALTA)[number];
export const NOMES_CANCELAMENTO_ALTA: Record<FormaCancelamentoAlta, string> = {
  cancelado_pelo_estagiario: "Pedido cancelado pelo estagiário",
  recusado_pelo_supervisor: "Pedido recusado pelo supervisor",
  encerrado_pela_transferencia: "Pedido encerrado pela transferência do caso",
  encerrado_pelo_desligamento: "Pedido encerrado pelo desligamento do caso",
};

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
  // Pedido que terminou sem a confirmação. O motivo segue a regra do motivo da
  // alta: a secretaria não o vê.
  cancelamento: {
    forma: FormaCancelamentoAlta;
    por: string;
    em: string;
    motivo: string | null;
  } | null;
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
  // Pedidos que terminaram sem a confirmação, do mais recente para o mais antigo.
  cancelados: RegistroAlta[];
  acoes: {
    pedir: boolean;
    confirmar: boolean;
    // O estagiário que pediu cancela o próprio pedido; o supervisor o recusa.
    cancelar: boolean;
    recusar: boolean;
    reabrir: boolean;
  };
  // Primeira data aceita na alta (AAAA-MM-DD): o início do atendimento pelo
  // estagiário atual no caso, ou o início do semestre, o que for mais recente.
  // Nula para quem não pede a alta.
  dataMinimaAlta: string | null;
  supervisor: string | null;
  // Sessões realizadas do ciclo sem evolução: depois da alta, o estagiário não
  // registra mais evolução no caso (RF28). Só para o estagiário e o supervisor.
  sessoesSemEvolucao: number;
  // Por que a coordenação não pode reabrir (outro semestre ou outro ciclo).
  bloqueioReabertura: string | null;
  // Quem pode ter pedido a reabertura: o estagiário cujo atendimento a alta
  // encerrou e o supervisor do caso.
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
