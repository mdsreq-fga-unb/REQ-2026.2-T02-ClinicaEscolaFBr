import { z } from "zod";
import type { Cor } from "./dominio-ciclo-3";

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
