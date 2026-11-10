import type { Cor } from "./dominio-ciclo-3";

export type InscritoNaFila = {
  inscricaoId: string;
  casoId: string;
  numero: string;
  nome: string;
  prioridade: Cor;
  entradaEm: string;

  posicao: number;
};
export type FilaEspera = {
  inscritos: InscritoNaFila[];
  pendentes: { numero: string; nome: string; criadaEm: string }[];
};

export type SituacaoInscricao = {
  numero: string;
  situacao:
    "aguardando_triagem" | "na_fila" | "em_atendimento" | "procure_secretaria";
  posicao: number | null;
  consultadaEm: string;
};
