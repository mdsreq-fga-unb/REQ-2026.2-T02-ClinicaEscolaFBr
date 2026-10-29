import { z } from "zod";
import { hojeEmBrasilia } from "./datas";

// Valores dos tipos enumerados do modelo detalhado do Ciclo 3
// (Projeto das features do Ciclo 3, seção "Modelo detalhado").

// Canal preferencial de contato com o paciente (RF1). O SMS não é usado (DF24):
// WhatsApp e ligação exigem o celular e são feitos pela secretaria.
export const CANAIS = ["email", "whatsapp", "ligacao"] as const;
export const canalSchema = z.enum(CANAIS);
export type Canal = z.infer<typeof canalSchema>;

// Prioridade clínica registrada pela equipe (RF6). Não confundir com prioridade no backlog.
export const CORES = ["vermelha", "amarela", "verde"] as const;
export const corSchema = z.enum(CORES);
export type Cor = z.infer<typeof corSchema>;
export const prioridadeSchema = z.object({ cor: corSchema });

export const dadosIniciaisSchema = z.object({
  anamnese: z.string().trim().min(1, "Informe a anamnese."),
  contrato: z.string().trim().min(1, "Informe o contrato terapêutico."),
  dataAssinaturaContrato: z.iso
    .date("Informe a data de assinatura do contrato.")
    .refine(
      (data) => data <= hojeEmBrasilia(),
      "A data de assinatura não pode estar no futuro.",
    ),
});
export type DadosIniciais = z.infer<typeof dadosIniciaisSchema>;

export const evolucaoSchema = z.object({
  queixa: z
    .string()
    .trim()
    .min(1, "Escreva a evolução da queixa.")
    .max(1000, "Use no máximo 1.000 caracteres.")
    .refine(
      (texto) => texto.split(/\r?\n/).length <= 10,
      "Use no máximo 10 linhas.",
    ),
  planejamento: z
    .string()
    .trim()
    .min(1, "Escreva o planejamento da próxima sessão."),
});
export type Evolucao = z.infer<typeof evolucaoSchema>;

// Situação do caso ao longo da distribuição (RF18 a RF21).
export const SITUACOES_CASO = [
  "aguardando_distribuicao",
  "aguardando_vinculo",
  "em_atendimento",
  "encerrado",
] as const;
export const situacaoCasoSchema = z.enum(SITUACOES_CASO);
export type SituacaoCaso = z.infer<typeof situacaoCasoSchema>;

// Status da sessão (RF10). Os demais status entram com o RF14, o RF15 e o RF16 no Ciclo 4.
export const STATUS_SESSAO = ["agendada", "realizada"] as const;
export const statusSessaoSchema = z.enum(STATUS_SESSAO);
export type StatusSessao = z.infer<typeof statusSessaoSchema>;

// Status que ocupam o horário na agenda (RNF9): a sessão realizada continua ocupando,
// para não se marcar outra por cima do intervalo de anotações.
export const STATUS_QUE_OCUPAM_AGENDA: StatusSessao[] = [
  "agendada",
  "realizada",
];

// Parâmetros alterados pela coordenação, com o valor padrão confirmado com a FBr.
export const PARAMETROS_PADRAO = {
  duracao_sessao_minutos: 50, // RF10, DF18
  intervalo_anotacoes_minutos: 10, // RF10, DF18
  limite_casos_supervisor: 50, // RF20, DF17
  validade_convite_horas: 72, // RF53, DF30
} as const;
export type ChaveParametro = keyof typeof PARAMETROS_PADRAO;
