import { z } from "zod";
import type { ValidacaoEvolucao } from "./validacao-evolucao";

export const filtroHistoricoEvolucoesSchema = z.object({
  ciclo: z.preprocess(
    (valor) => (valor === "" ? undefined : valor),
    z.coerce.number().int().min(1).max(2147483647).optional(),
  ),
});
export type RegistroHistoricoEvolucao = {
  id: string;
  tipo: "original" | "correcao" | "complemento";
  versao: number | null;
  autor: string;
  em: string;
  motivo: string | null;
  campos: { rotulo: string; texto: string | null }[];
};
export type SessaoHistoricoEvolucao = {
  id: string;
  evolucaoId: string;
  numero: number | null;
  inicio: string;
  autor: string;
  registros: RegistroHistoricoEvolucao[];
  validacao: ValidacaoEvolucao;
};
export type HistoricoEvolucoes = {
  prontuarioId: string;
  ciclo: number;
  ciclos: { numero: number; atual: boolean }[];
  sessoes: SessaoHistoricoEvolucao[];
  transferencias: {
    id: string;
    em: string;
    estagiarioAnterior: string | null;
    estagiarioNovo: string | null;
    supervisorAnterior: string | null;
    supervisorNovo: string | null;
  }[];
};
