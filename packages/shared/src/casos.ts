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

// Transferência de caso (RF25). O supervisor responsável troca só o estagiário, por
// outro estagiário dele; a coordenação troca o supervisor e, se indicar, o
// estagiário, ou só o estagiário.
export const TIPOS_TRANSFERENCIA = ["estagiario", "supervisor"] as const;
export type TipoTransferencia = (typeof TIPOS_TRANSFERENCIA)[number];

export const LIMITE_MOTIVO_TRANSFERENCIA = 1000;

export const transferenciaSchema = z
  .object({
    estagiarioId: z.uuid("Escolha o novo estagiário responsável.").optional(),
    supervisorId: z.uuid("Escolha o novo supervisor responsável.").optional(),
    motivo: z
      .string()
      .trim()
      .min(1, "Informe o motivo da transferência.")
      .max(
        LIMITE_MOTIVO_TRANSFERENCIA,
        `Use no máximo ${LIMITE_MOTIVO_TRANSFERENCIA.toLocaleString("pt-BR")} caracteres.`,
      ),
  })
  .refine((d) => d.estagiarioId || d.supervisorId, {
    message: "Escolha o novo responsável pelo caso.",
    path: ["estagiarioId"],
  });
export type Transferencia = z.infer<typeof transferenciaSchema>;

type Pessoa = { id: string; nome: string };

// O que o diálogo "Transferir caso" mostra: o caso, os responsáveis atuais e as
// opções de quem abre. O supervisor recebe só os estagiários dele; a coordenação,
// os supervisores ativos, com os casos ativos e o limite (DF17), e os estagiários
// ativos.
export type OpcoesTransferencia = {
  casoId: string;
  numero: string;
  paciente: string;
  supervisorAtual: Pessoa | null;
  estagiarioAtual: Pessoa | null;
  estagiarios: EstagiarioDisponivel[];
  supervisores: SupervisorDisponivel[];
};

export type ResultadoTransferencia = {
  casoId: string;
  numero: string;
  paciente: string;
  supervisor: string | null;
  estagiario: string | null;
  // Sessões futuras do estagiário anterior, canceladas como administrativas e a
  // reagendar com o novo estagiário.
  sessoesCanceladas: number;
  // Início das sessões futuras canceladas, para reagendar com o novo estagiário.
  sessoesAReagendar: string[];
};
