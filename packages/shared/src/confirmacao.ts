import type { Canal } from "./dominio-ciclo-3";

// Confirmação de presença na sessão (RF14).

// Por onde a presença foi confirmada: pelo link, pelo próprio paciente, ou pela
// secretaria, quando o paciente confirma por telefone (RNF10).
export const MEIOS_CONFIRMACAO = ["link", "secretaria"] as const;
export type MeioConfirmacao = (typeof MEIOS_CONFIRMACAO)[number];

// O que a página pública do link recebe: só a data e o horário da sessão, o primeiro
// nome do paciente, a situação, o prazo para confirmar e a antecedência mínima para
// cancelar sem falta (RF15, RNF59).
export type SessaoDoLink = {
  primeiroNome: string;
  inicio: string;
  situacao: "agendada" | "confirmada";
  prazoConfirmacao: string;
  podeConfirmar: boolean;
  antecedenciaMinimaMinutos: number;
};

// Sessão cujo prazo de confirmação terminou sem resposta do paciente, para a
// secretaria. Telefone e e-mail não entram na lista (RNF13): ficam na ficha do
// paciente, aberta pelo casoId.
export type SessaoSemConfirmacao = {
  id: string;
  casoId: string;
  paciente: string;
  responsavelLegal: string | null;
  estagiario: string;
  inicio: string;
  termino: string;
  canalPreferencial: Canal;
};

export type SessoesSemConfirmacao = {
  prazoHoras: number;
  sessoes: SessaoSemConfirmacao[];
};
