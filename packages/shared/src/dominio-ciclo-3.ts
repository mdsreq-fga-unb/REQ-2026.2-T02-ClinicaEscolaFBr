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

// O contrato terapêutico é o "Contrato de Prestação de Serviço" da Clínica Escola,
// assinado em papel na primeira sessão; o prontuário guarda a data de assinatura,
// o aceite do termo de consentimento para pesquisa e a guarda da via (DF41).
export const dadosIniciaisSchema = z.object({
  anamnese: z.string().trim().min(1, "Informe a anamnese."),
  aceiteTclePesquisa: z.boolean().default(false),
  viaContratoGuardada: z.literal(true, {
    error: "Confirme que a via assinada do contrato está guardada na clínica.",
  }),
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

// Status da sessão (RF10). A confirmação (RF14), o cancelamento (RF15 e RF16) e a
// falta do paciente (RF34) entram juntos no Ciclo 4, numa migration só.
export const STATUS_SESSAO = [
  "agendada",
  "confirmada",
  "cancelada",
  "realizada",
  "falta_paciente",
] as const;
export const statusSessaoSchema = z.enum(STATUS_SESSAO);
export type StatusSessao = z.infer<typeof statusSessaoSchema>;

// Status que ocupam o horário na agenda (RNF9): só a sessão cancelada libera o
// horário. A realizada continua ocupando, para não se marcar outra por cima do
// intervalo de anotações.
export const STATUS_QUE_OCUPAM_AGENDA: StatusSessao[] = [
  "agendada",
  "confirmada",
  "realizada",
  "falta_paciente",
];

// Sessão que ainda vai acontecer ou já aconteceu sem registro: pode ser marcada
// como realizada (RF28) ou receber a falta do paciente (RF34).
export const STATUS_SESSAO_EM_ABERTO: StatusSessao[] = [
  "agendada",
  "confirmada",
];

// Parâmetros alterados pela coordenação, com o valor padrão confirmado com a FBr.
export const PARAMETROS_PADRAO = {
  duracao_sessao_minutos: 50, // RF10, DF18
  intervalo_anotacoes_minutos: 10, // RF10, DF18
  limite_casos_supervisor: 50, // RF20, DF17
  validade_convite_horas: 72, // RF53, DF30
} as const;
export type ChaveParametro = keyof typeof PARAMETROS_PADRAO;
