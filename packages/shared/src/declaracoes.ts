import { z } from "zod";
import { dataValida, hojeEmBrasilia } from "./datas";

// Declarações de comparecimento (CP10). O RF44 lista as sessões com presença
// registrada, isto é, com o status "realizada", marcado pelo estagiário no
// prontuário. Cada sessão traz só o id, a data e o horário de início e o nome do
// estagiário: nenhum dado clínico (RNF6).
export type SessaoComPresenca = {
  // Usado para emitir a declaração da sessão (RF45).
  id: string;
  // Início da sessão (ISO 8601); a tela mostra a data e o horário de Brasília.
  inicio: string;
  estagiario: string;
};

// Quem pediu a emissão (RNF39): a secretaria, com conta, ou o paciente ou o
// responsável, pela verificação de identidade (RF52).
export const CANAIS_DECLARACAO = ["secretaria", "verificacao"] as const;
export type CanalDeclaracao = (typeof CANAIS_DECLARACAO)[number];

// Declaração emitida (RF45): os dados para a página de impressão, sem nenhum
// dado clínico. A tela monta o texto; o modelo, quem assina e o CRP aguardam a
// FBr, e até lá o psicólogo responsável é o supervisor do caso na data da
// sessão, com o CRP do cadastro (RF53).
export type DeclaracaoComparecimento = {
  emissaoId: string;
  // Data e hora da emissão (ISO 8601); a tela mostra "Brasília, 16 de novembro de 2026."
  emitidaEm: string;
  paciente: string;
  sessao: { id: string; inicio: string };
  estagiario: string;
  // crp é nulo se o supervisor foi cadastrado antes do campo e a coordenação
  // ainda não o informou (RF53); a tela deixa a linha para preencher à mão.
  psicologoResponsavel: { nome: string; crp: string | null };
};

// Por que a declaração não sai (422), para a tela escolher o aviso: sessão sem
// presença registrada (falta, cancelamento ou ainda sem registro) ou menor de
// idade sem a autorização registrada. A mensagem já vem pronta.
export const MOTIVOS_SEM_DECLARACAO = [
  "sem_presenca",
  "autorizacao_pendente",
] as const;
export type MotivoSemDeclaracao = (typeof MOTIVOS_SEM_DECLARACAO)[number];
export type RecusaDeclaracao = {
  message: string;
  motivo: MotivoSemDeclaracao;
};

// Registro da entrega da autorização de menor pela secretaria (RF45). A data é
// a da entrega, que não pode ser futura.
export const registroAutorizacaoMenorSchema = z.object({
  entregueEm: z
    .string()
    .refine(dataValida, "Informe a data da entrega.")
    .refine(
      (data) => !dataValida(data) || data <= hojeEmBrasilia(),
      "A data da entrega não pode ser futura.",
    ),
});
export type RegistroAutorizacaoMenor = z.infer<
  typeof registroAutorizacaoMenorSchema
>;

// Situação da autorização na ficha do paciente (RF45). `menor` é calculado pela
// data de nascimento no dia da consulta.
export type AutorizacaoMenor = {
  menor: boolean;
  responsavelLegal: string | null;
  autorizacao: {
    entregueEm: string;
    registradoPor: string;
    registradoEm: string;
  } | null;
};
