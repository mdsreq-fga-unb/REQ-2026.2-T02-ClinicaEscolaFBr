import { z } from "zod";
import type { Cor, SituacaoCaso } from "./dominio-ciclo-3";

// Distribuição de casos (RF18, RF20 e RF21).

// Caso triado e ainda sem supervisor (RF18): só o número, o nome, a prioridade
// clínica e a data da inscrição, sem a queixa nem as demais informações de triagem.
export type CasoAguardando = {
  casoId: string;
  numero: string;
  nome: string;
  prioridade: Cor;
  dataInscricao: string;
};

// Supervisor ativo com os casos ativos em relação ao limite (RF20, DF17).
export type SupervisorDisponivel = {
  id: string;
  nome: string;
  casosAtivos: number;
  limite: number;
  noLimite: boolean;
};

// Distribuição de um caso a um supervisor, pela coordenação (RF20).
export const distribuicaoSchema = z.object({
  supervisorId: z.uuid("Escolha o supervisor."),
});
export type Distribuicao = z.infer<typeof distribuicaoSchema>;

export type ResultadoDistribuicao = {
  casoId: string;
  numero: string;
  paciente: string;
  supervisor: string;
};

// Corpo do 409 quando o caso já tem supervisor: a troca é pela transferência (RF25).
export type CasoJaDistribuido = {
  message: string;
  supervisor: string;
  desde: string;
};

// Caso sob a responsabilidade do supervisor ("Meus casos", RF21).
export type CasoDoSupervisor = {
  casoId: string;
  numero: string;
  nome: string;
  prioridade: Cor | null;
  estagiario: string | null;
  prontuarioId: string | null;
  situacao: SituacaoCaso;
  // Fim do vínculo encerrado pelo desligamento (RF37), quando não há estagiário.
  vinculoEncerradoEm: string | null;
};

// Estagiário com conta ativa, com os pacientes em atendimento (RF21).
export type EstagiarioDisponivel = {
  id: string;
  nome: string;
  pacientesEmAtendimento: number;
};

// Vínculo do estagiário responsável pelo supervisor do caso (RF21).
export const vinculoEstagiarioSchema = z.object({
  estagiarioId: z.uuid("Escolha o estagiário."),
});
export type VinculoEstagiario = z.infer<typeof vinculoEstagiarioSchema>;

// O prontuário do ciclo nasce na mesma transação do vínculo (RF66).
export type ResultadoVinculo = {
  casoId: string;
  numero: string;
  paciente: string;
  estagiario: string;
  prontuarioId: string;
};

// Consulta de responsáveis (RF22). Só nomes e a situação do caso: nunca a queixa,
// a prioridade clínica nem o prontuário (RNF17).

// Quantos pacientes a lista devolve de uma vez (RNF21). Com mais que isso, a lista
// vem cortada, e a tela pede para buscar pelo nome.
export const LIMITE_LISTA_PACIENTES = 200;

// Busca da lista de Pacientes pelo nome.
export const buscaListaPacientesSchema = z.object({
  busca: z.string().trim().max(120).optional(),
});
export type BuscaListaPacientes = z.infer<typeof buscaListaPacientesSchema>;

// Responsáveis vigentes do caso. O campo que falta vem como null, e a tela mostra
// "—" e o selo da situação de distribuição, sem nome. O número da inscrição não vem
// para a secretaria (RNF17).
export type ResponsaveisDoCaso = {
  casoId: string;
  nome: string;
  numero?: string;
  situacao: SituacaoCaso;
  supervisor: string | null;
  estagiario: string | null;
};

// Linha da lista de Pacientes (secretaria e coordenação).
export type PacienteDaLista = ResponsaveisDoCaso;

export type ListaDePacientes = {
  pacientes: PacienteDaLista[];
  // Há mais pacientes do que o limite: a lista mostra só os primeiros.
  cortada: boolean;
};

// Situação de distribuição (prancha 2-3): o caso tem os dois responsáveis, só o
// supervisor, ou nenhum.
export const SITUACOES_DISTRIBUICAO = [
  "distribuido",
  "aguardando_estagiario",
  "pendente",
] as const;
export type SituacaoDistribuicao = (typeof SITUACOES_DISTRIBUICAO)[number];

export const situacaoDistribuicao = (
  r: Pick<ResponsaveisDoCaso, "supervisor" | "estagiario">,
): SituacaoDistribuicao =>
  !r.supervisor
    ? "pendente"
    : r.estagiario
      ? "distribuido"
      : "aguardando_estagiario";
