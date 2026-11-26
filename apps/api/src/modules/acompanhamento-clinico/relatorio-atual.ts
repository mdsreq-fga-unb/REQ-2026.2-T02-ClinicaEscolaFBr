// Relatório final em dia com o ciclo (RF33, RF68): uma versão aprovada só vale se
// a origem dela cobrir todas as evoluções registradas no ciclo. Depois de uma
// reabertura pela coordenação (RF68), as evoluções novas deixam o relatório
// aprovado desatualizado: o estagiário elabora uma versão nova, e a alta espera a
// aprovação dela.
type VersaoComOrigem = {
  estado: string;
  origem: unknown;
};

const evolucoesDaOrigem = (origem: unknown): string[] => {
  const lista = (origem as { evolucoes?: unknown } | null)?.evolucoes;
  return Array.isArray(lista) ? (lista as string[]) : [];
};

export function aprovadaEmDia(
  versoes: VersaoComOrigem[],
  evolucoesDoCiclo: string[],
): boolean {
  return versoes.some((v) => {
    if (v.estado !== 'aprovado') return false;
    const cobertas = new Set(evolucoesDaOrigem(v.origem));
    return evolucoesDoCiclo.every((id) => cobertas.has(id));
  });
}
