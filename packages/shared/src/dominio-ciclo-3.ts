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

// Limite de cada campo de texto da anamnese e da evolução (RF69, RF28): proposta da
// equipe, nas pendências de validação com a FBr.
export const LIMITE_CAMPO_CLINICO = 1000;
const MENSAGEM_LIMITE = "Use no máximo 1.000 caracteres.";

const textoObrigatorio = (mensagem: string) =>
  z.string().trim().min(1, mensagem).max(LIMITE_CAMPO_CLINICO, MENSAGEM_LIMITE);
// Campo opcional: em branco vira null, para aparecer como "não informado".
const textoOpcional = z
  .string()
  .trim()
  .max(LIMITE_CAMPO_CLINICO, MENSAGEM_LIMITE)
  .nullish()
  .transform((texto) => (texto ? texto : null));

// Anamnese nas seis seções da "Ficha de anamnese" da Clínica Escola (RF69, DF37).
// Só a queixa principal é obrigatória (proposta da equipe).
export const SECOES_ANAMNESE = [
  ["queixaPrincipal", "Queixa principal"],
  ["historiaProblemaAtual", "História do problema atual"],
  ["historicoFamiliar", "Histórico familiar"],
  ["desenvolvimento", "Desenvolvimento (infantil e adolescente)"],
  ["historicoMedico", "Histórico médico"],
  ["aspectosPsicossociais", "Aspectos psicossociais"],
] as const;
export type SecaoAnamnese = (typeof SECOES_ANAMNESE)[number][0];

export const anamneseSchema = z.object({
  queixaPrincipal: textoObrigatorio("Informe a queixa principal."),
  historiaProblemaAtual: textoOpcional,
  historicoFamiliar: textoOpcional,
  desenvolvimento: textoOpcional,
  historicoMedico: textoOpcional,
  aspectosPsicossociais: textoOpcional,
});
export type Anamnese = z.infer<typeof anamneseSchema>;

// O contrato terapêutico é o "Contrato de Prestação de Serviço" da Clínica Escola,
// assinado em papel na primeira sessão; o prontuário guarda a data de assinatura,
// o aceite do termo de consentimento para pesquisa e a guarda da via (DF41).
export const contratoSchema = z.object({
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
export type Contrato = z.infer<typeof contratoSchema>;

// Evolução da sessão realizada, na ficha "Registro de evolução" da Clínica Escola
// (RF28, DF38). Intervenções e encaminhamentos pode ficar em branco; os outros são
// obrigatórios (proposta da equipe).
export const CAMPOS_EVOLUCAO = [
  ["humorAparencia", "Humor e aparência do paciente"],
  ["conteudoTrabalhado", "Conteúdo trabalhado"],
  ["tecnicasUtilizadas", "Técnicas utilizadas"],
  ["intervencoesEncaminhamentos", "Intervenções e encaminhamentos"],
  ["planoProximaSessao", "Plano para a próxima sessão"],
] as const;
export type CampoEvolucao = (typeof CAMPOS_EVOLUCAO)[number][0];

export const evolucaoSchema = z.object({
  humorAparencia: textoObrigatorio(
    "Descreva o humor e a aparência do paciente.",
  ),
  conteudoTrabalhado: textoObrigatorio("Descreva o conteúdo trabalhado."),
  tecnicasUtilizadas: textoObrigatorio("Informe as técnicas utilizadas."),
  intervencoesEncaminhamentos: textoOpcional,
  planoProximaSessao: textoObrigatorio(
    "Escreva o plano para a próxima sessão.",
  ),
});
export type Evolucao = z.infer<typeof evolucaoSchema>;

// A cada 10 sessões realizadas no ciclo, o fechamento avaliativo (RF28, DF23).
export const SESSOES_POR_FECHAMENTO_AVALIATIVO = 10;

// Situação do caso ao longo da distribuição (RF18 a RF21), do desligamento por
// faltas (RF37) e da reversão que encontra a vaga já ocupada (RF38).
export const SITUACOES_CASO = [
  "aguardando_distribuicao",
  "aguardando_vinculo",
  "em_atendimento",
  "encerrado",
  "desligado_por_faltas",
  "aguardando_vaga",
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
  prazo_confirmacao_horas: 24, // RF14, DF45
  antecedencia_minima_cancelamento_minutos: 60, // RF15, DF20
} as const;
export type ChaveParametro = keyof typeof PARAMETROS_PADRAO;
