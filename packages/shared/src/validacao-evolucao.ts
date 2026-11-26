// Validação da evolução pelo supervisor do caso (RF67). A situação é calculada na
// leitura: a evolução está validada quando a última validação é posterior à última
// correção (RF29) e ao último complemento (RF30). No empate, fica pendente.
export type MudancaDaEvolucao<D = string> = {
  tipo: "correcao" | "complemento";
  em: D;
};

export type ValidacaoEvolucao<D = string> = {
  situacao: "validada" | "pendente";
  // Última validação, também quando a evolução voltou a ficar pendente.
  ultima: { por: string; em: D } | null;
  // Mudança mais recente depois da última validação, que a devolveu a pendente.
  mudanca: MudancaDaEvolucao<D> | null;
};

export const NOMES_SITUACAO_VALIDACAO = {
  validada: "Validada",
  pendente: "Pendente de validação",
} as const;

const maisRecente = <T extends { em: Date }>(itens: T[]): T | null =>
  itens.reduce<T | null>(
    (atual, item) => (!atual || item.em > atual.em ? item : atual),
    null,
  );

export function situacaoDaValidacao(
  validacoes: { por: string; em: Date }[],
  mudancas: MudancaDaEvolucao<Date>[],
): ValidacaoEvolucao<Date> {
  const ultima = maisRecente(validacoes);
  if (!ultima) return { situacao: "pendente", ultima: null, mudanca: null };
  const mudanca = maisRecente(mudancas);
  return mudanca && mudanca.em >= ultima.em
    ? { situacao: "pendente", ultima, mudanca }
    : { situacao: "validada", ultima, mudanca: null };
}
