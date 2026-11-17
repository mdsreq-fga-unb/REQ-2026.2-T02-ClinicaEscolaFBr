// Declarações de comparecimento (CP10). O RF44 lista as sessões com presença
// registrada, isto é, com o status "realizada", marcado pelo estagiário no
// prontuário. Cada sessão traz só a data e o horário de início e o nome do
// estagiário: nenhum dado clínico (RNF6).
export type SessaoComPresenca = {
  // Início da sessão (ISO 8601); a tela mostra a data e o horário de Brasília.
  inicio: string;
  estagiario: string;
};
