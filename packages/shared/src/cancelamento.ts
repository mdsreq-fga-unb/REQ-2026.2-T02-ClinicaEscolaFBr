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
