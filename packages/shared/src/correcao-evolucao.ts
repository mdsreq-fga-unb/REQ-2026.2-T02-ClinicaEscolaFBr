import { z } from "zod";
import { hojeEmBrasilia } from "./datas";
import {
  CAMPOS_EVOLUCAO,
  evolucaoSchema,
  textoObrigatorio,
  type CampoEvolucao,
} from "./dominio-ciclo-3";
import { semestreDaData } from "./indicadores";

// Correção de evolução registrada (RF29). A evolução original não muda: cada
// correção é uma versão nova, com a ficha inteira, o autor, a data/hora e o motivo,
// que é obrigatório.

const motivo = textoObrigatorio("Informe o motivo da correção.");

// A evolução da ficha da DF38 é corrigida com os mesmos cinco campos.
export const correcaoEvolucaoSchema = evolucaoSchema.extend({ motivo });
export type CorrecaoEvolucao = z.infer<typeof correcaoEvolucaoSchema>;

// A evolução registrada antes da DF38 é corrigida com os campos dela (DF23).
export const CAMPOS_EVOLUCAO_ANTIGA = [
  ["queixa", "Evolução da queixa"],
  ["planejamento", "Planejamento"],
] as const;
export type CampoEvolucaoAntiga = (typeof CAMPOS_EVOLUCAO_ANTIGA)[number][0];
export const correcaoEvolucaoAntigaSchema = z.object({
  queixa: textoObrigatorio("Descreva a evolução da queixa."),
  planejamento: textoObrigatorio("Escreva o planejamento."),
  motivo,
});
export type CorrecaoEvolucaoAntiga = z.infer<
  typeof correcaoEvolucaoAntigaSchema
>;

// O esquema do corpo é o do formato da evolução corrigida: a API escolhe pelo
// registro original, para o erro de validação indicar o campo (400).
export const esquemaDaCorrecao = (fichaAntiga: boolean) =>
  fichaAntiga ? correcaoEvolucaoAntigaSchema : correcaoEvolucaoSchema;

// Data-limite para corrigir evoluções, por semestre (RF29). Vale para as evoluções
// das sessões daquele semestre, e não para o dia de hoje.
export const DATA_LIMITE_CORRECAO = "data_limite_correcao";

export const dataLimiteCorrecaoSchema = z.object({
  dataLimite: z.iso.date("Informe a data-limite."),
});
export type DataLimiteCorrecaoEntrada = z.infer<
  typeof dataLimiteCorrecaoSchema
>;

export type DataLimiteCorrecao = {
  semestre: string;
  dataLimite: string | null;
  // Sem a data do semestre vigente, a correção é permitida e a coordenação é avisada.
  pendente: boolean;
  ultimaAlteracao: {
    valorAnterior: string | null;
    valorNovo: string;
    por: string;
    em: string;
  } | null;
};

// Semestre da sessão, pelo dia dela em Brasília.
export const semestreDaSessao = (inicio: Date | string) =>
  semestreDaData(hojeEmBrasilia(new Date(inicio)));

// A correção vale até o fim do dia da data-limite, em Brasília. Sem data, é permitida.
export const correcaoNoPrazo = (
  dataLimite: string | null,
  agora: Date = new Date(),
) => dataLimite === null || hojeEmBrasilia(agora) <= dataLimite;

// Versão de uma evolução, como o prontuário mostra (RF29).
export type VersaoEvolucao = Record<CampoEvolucao, string | null> &
  Record<CampoEvolucaoAntiga, string | null> & {
    versao: number;
    autor: string;
    em: string;
    // Só a versão original (1) não tem motivo.
    motivo: string | null;
  };

export const CAMPOS_FICHA_EVOLUCAO = [
  ...CAMPOS_EVOLUCAO.map(([campo]) => campo),
  ...CAMPOS_EVOLUCAO_ANTIGA.map(([campo]) => campo),
] as const;
