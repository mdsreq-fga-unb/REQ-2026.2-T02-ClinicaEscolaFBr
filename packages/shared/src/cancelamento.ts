import { z } from "zod";

// Cancelamento de sessão (RF15 e RF16).

// Quem registrou o cancelamento: o paciente, pelo link, sem login, ou o perfil de
// quem estava logado. A coordenação cancela no desligamento (RF37) e na
// transferência (RF25), dos próximos ciclos.
export const ORIGENS_CANCELAMENTO = [
  "link",
  "secretaria",
  "estagiario",
  "supervisor",
  "coordenacao",
] as const;
export type OrigemCancelamento = (typeof ORIGENS_CANCELAMENTO)[number];

// No prazo e fora do prazo: pedido do paciente (RF15), pela antecedência; fora do
// prazo conta como falta (RF35). Administrativo: para remarcar, sem falta para
// ninguém. Ausência do estagiário: conta nas faltas dele (RF16, RF39, RF40).
// Desligamento: RF37.
export const CLASSIFICACOES_CANCELAMENTO = [
  "no_prazo",
  "fora_do_prazo",
  "administrativo",
  "ausencia_estagiario",
  "desligamento",
] as const;
export type ClassificacaoCancelamento =
  (typeof CLASSIFICACOES_CANCELAMENTO)[number];

// O que a equipe escolhe no diálogo "Cancelar sessão" da rota do RF15. A ausência
// do estagiário tem rota própria (RF16).
export const TIPOS_CANCELAMENTO = [
  "pedido_paciente",
  "administrativo",
] as const;
export type TipoCancelamento = (typeof TIPOS_CANCELAMENTO)[number];

// O mesmo limite do motivo da falta (RF34).
export const LIMITE_JUSTIFICATIVA_CANCELAMENTO = 1000;

const justificativa = z
  .string({ error: "Informe o motivo do cancelamento." })
  .trim()
  .min(1, "Informe o motivo do cancelamento.")
  .max(LIMITE_JUSTIFICATIVA_CANCELAMENTO, "Use até 1.000 caracteres.");

export const cancelamentoPeloLinkSchema = z.object({ justificativa });
export type CancelamentoPeloLink = z.infer<typeof cancelamentoPeloLinkSchema>;

export const cancelamentoSchema = z.object({
  tipo: z.enum(TIPOS_CANCELAMENTO, { error: "Escolha o motivo." }),
  justificativa,
});
export type Cancelamento = z.infer<typeof cancelamentoSchema>;

export const ausenciaEstagiarioSchema = z.object({ justificativa });
export type AusenciaEstagiario = z.infer<typeof ausenciaEstagiarioSchema>;

// Aviso ao paciente quando a sessão muda sem o pedido dele (administrativo e
// ausência do estagiário). Sem e-mail, a equipe precisa avisar: o botão do WhatsApp
// fica para o RF17, do Ciclo 5. O pedido do próprio paciente não gera aviso.
export type AvisoAoPaciente =
  "email_enviado" | "email_nao_enviado" | "sem_email";

export type ResultadoCancelamento = {
  classificacao: ClassificacaoCancelamento;
  antecedenciaMinutos: number;
  inicio: string;
  avisoAoPaciente: AvisoAoPaciente | null;
};

// O que a página do link recebe depois do cancelamento: só o necessário para a
// mensagem final (RNF59).
export type SessaoCanceladaPeloLink = {
  primeiroNome: string;
  inicio: string;
  situacao: "cancelada";
  contaComoFalta: boolean;
};

// Opções do diálogo para quem está logado, pela mesma regra das rotas, para a tela
// mostrar só o que a API aceita. A antecedência mínima vem do parâmetro (DF20).
export type AcoesCancelamento = {
  pedidoPaciente: boolean;
  administrativo: boolean;
  ausenciaEstagiario: boolean;
  antecedenciaMinimaMinutos: number;
};

// O que a lista de sessões mostra do cancelamento. A justificativa fica de fora:
// pode trazer informação pessoal e não é necessária na lista (RNF51, CFP art. 9º).
export type CancelamentoDaSessao = {
  classificacao: ClassificacaoCancelamento;
  origem: OrigemCancelamento;
};
