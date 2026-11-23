import { z } from "zod";
import { dataValida, hojeEmBrasilia } from "./datas";
import type { UltimaAlteracao } from "./indicadores";

// Contribuição social do paciente (RF41): o registro do pagamento recebido pela
// secretaria por fora do sistema, a correção versionada e o valor, que é um
// parâmetro da coordenação guardado em centavos.

export const FORMAS_PAGAMENTO = ["dinheiro", "pix", "cartao"] as const;
export type FormaPagamento = (typeof FORMAS_PAGAMENTO)[number];

export const NOMES_FORMA_PAGAMENTO: Record<FormaPagamento, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  cartao: "Cartão",
};

// Dias corridos para pagar, contados do vínculo com o estagiário (RF41, RF43).
export const PRAZO_CONTRIBUICAO_DIAS = 10;

// Maior valor aceito para a contribuição: R$ 1.000,00.
export const VALOR_CONTRIBUICAO_MAXIMO_CENTAVOS = 100_000;

// O pagamento já foi recebido: a data não pode passar de hoje, em Brasília.
const pagoEm = z
  .string({ error: "Informe a data do pagamento." })
  .refine(dataValida, "Informe a data do pagamento.")
  .refine(
    (valor) => !dataValida(valor) || valor <= hojeEmBrasilia(),
    "A data do pagamento não pode ser futura.",
  );

const forma = z.enum(FORMAS_PAGAMENTO, {
  error: "Escolha a forma de pagamento.",
});

const valorCentavos = z
  .number({ error: "Informe o valor." })
  .int("Informe o valor em reais e centavos, como 35,00.")
  .min(1, "Informe um valor maior que zero.")
  .max(VALOR_CONTRIBUICAO_MAXIMO_CENTAVOS, "Informe no máximo R$ 1.000,00.");

// Registro (RF41): o valor gravado vem do parâmetro, e não do pedido. O pedido
// leva o valor que a secretaria viu na tela: se a coordenação mudou o valor com o
// formulário aberto, o registro é recusado (409) e a tela pede nova confirmação.
export const registroContribuicaoSchema = z.object({
  pagoEm,
  forma,
  valorEsperadoCentavos: valorCentavos,
});
export type RegistroContribuicao = z.infer<typeof registroContribuicaoSchema>;

// Correção (RF41, RNF36): a ficha inteira de novo, com o motivo obrigatório. O
// valor pode mudar, porque o erro pode estar nele.
// A versão esperada é a que a secretaria abriu para corrigir: se outra pessoa
// corrigiu antes, a correção é recusada (409), para não desfazer a outra.
export const correcaoContribuicaoSchema = z.object({
  versaoEsperada: z.number().int().min(1),
  valorCentavos,
  pagoEm,
  forma,
  motivo: z
    .string({ error: "Informe o motivo da correção." })
    .trim()
    .min(1, "Informe o motivo da correção.")
    .max(500, "Use até 500 caracteres."),
});
export type CorrecaoContribuicao = z.infer<typeof correcaoContribuicaoSchema>;

// Códigos do 409 do registro e da correção, para a tela saber o que mostrar.
export type ConflitoContribuicao =
  | { codigo: "ja_pago"; pagoEm: string | null }
  | { codigo: "valor_alterado"; valorAtualCentavos: number }
  | { codigo: "versao_desatualizada"; versaoAtual: number };

// Alteração do valor pela coordenação (RF41).
export const valorContribuicaoSchema = z.object({ valorCentavos });
export type ValorContribuicaoEntrada = z.infer<typeof valorContribuicaoSchema>;

export type VersaoContribuicao = {
  versao: number;
  valorCentavos: number;
  pagoEm: string;
  forma: FormaPagamento;
  // Vazio só na versão 1, que é o registro.
  motivoCorrecao: string | null;
  registradoPor: string;
  registradoEm: string;
};

export type SituacaoContribuicao = {
  casoId: string;
  cicloAtendimento: number;
  situacao: "pendente" | "efetivada";
  // Prazo para pagar, contado do primeiro vínculo depois da última entrada do
  // caso na fila. Vazio quando o caso ainda não tem vínculo nesse período, e a
  // contribuição ainda não é devida.
  prazo: { vinculadoEm: string; ate: string } | null;
  // Valor do parâmetro agora, mostrado no formulário de registro.
  valorAtualCentavos: number;
  vigente: VersaoContribuicao | null;
  // Da mais recente para a mais antiga.
  anteriores: VersaoContribuicao[];
  // Pagamentos dos ciclos anteriores do caso, só para consulta (RNF36), do ciclo
  // mais recente para o mais antigo. Só aparecem os ciclos com pagamento
  // registrado, e nenhum é cortado por data.
  ciclosAnteriores: CicloAnteriorContribuicao[];
};

export type CicloAnteriorContribuicao = {
  cicloAtendimento: number;
  vigente: VersaoContribuicao;
  // Da mais recente para a mais antiga.
  anteriores: VersaoContribuicao[];
};

export type ValorContribuicao = {
  valorCentavos: number;
  ultimaAlteracao: UltimaAlteracao | null;
  // Todas as alterações do valor, da mais recente para a mais antiga, sem corte
  // por data (RNF36). A primeira é a `ultimaAlteracao`.
  alteracoes: UltimaAlteracao[];
};

// Último dia do prazo (AAAA-MM-DD): o dia do vínculo em Brasília mais 10 dias
// corridos. Vinculado em 05/11, paga até 15/11.
export function prazoDaContribuicao(vinculadoEm: Date): string {
  const dia = new Date(`${hojeEmBrasilia(vinculadoEm)}T12:00:00Z`);
  dia.setUTCDate(dia.getUTCDate() + PRAZO_CONTRIBUICAO_DIAS);
  return dia.toISOString().slice(0, 10);
}

// "R$ 35,00".
export const formatarCentavos = (centavos: number) =>
  (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

// "35,00" para o campo de valor, sem o símbolo.
export const centavosParaCampo = (centavos: number) =>
  (centavos / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// Valor digitado em reais ("35", "35,5", "35,00", "1.000,00" ou "R$ 35,00") em
// centavos. Devolve null quando o texto não é um valor.
export function centavosDoCampo(texto: string): number | null {
  const limpo = texto.replace(/R\$\s*/i, "").replace(/\s/g, "");
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(limpo))
    return null;
  const [reais, centavos = ""] = limpo.replace(/\./g, "").split(",");
  return Number(reais) * 100 + Number(centavos.padEnd(2, "0"));
}

// Bloqueio do agendamento e perda da vaga (RF43).

// O prazo terminou: o último dia para pagar já passou, em Brasília. Vinculado em
// 17/11, paga até 27/11, e o aviso aparece a partir de 28/11.
export const prazoVencido = (ate: string, agora = new Date()) =>
  hojeEmBrasilia(agora) > ate;

// Situação da contribuição mostrada no "Agendar sessão" (RF43). A 1ª sessão do
// ciclo nunca é bloqueada; da 2ª em diante, o agendamento exige o pagamento.
export type ContribuicaoNoAgendamento = {
  situacao: "pendente" | "efetivada";
  // Pendente com uma sessão já realizada no ciclo: o agendamento é recusado.
  bloqueia: boolean;
  // Data do pagamento vigente, só para a secretaria, que registra o pagamento.
  pagoEm: string | null;
};

// Corpo do 422 do agendamento bloqueado (RF43).
export type BloqueioContribuicao = {
  codigo: "contribuicao_pendente";
  message: string;
};

// Caso com o prazo vencido sem pagamento (RF43): o aviso à secretaria e à
// coordenação, que confirmam a perda da vaga.
export type PrazoContribuicaoVencido = {
  casoId: string;
  numero: string;
  nome: string;
  estagiario: string;
  vinculadoEm: string;
  // Último dia do prazo (AAAA-MM-DD).
  ate: string;
};

// Prévia da perda da vaga, para o diálogo de confirmação (prancha 8-2).
export type PreviaPerdaVaga = {
  estagiario: string;
  vinculadoEm: string;
  ate: string;
  // Início das sessões futuras que a confirmação cancela.
  sessoesFuturas: string[];
};

// Perda da vaga já confirmada, para a ficha ("Na fila de espera desde …").
export type PerdaVagaConfirmada = {
  confirmadaPor: string;
  confirmadaEm: string;
  sessoesCanceladas: number;
  estagiario: string;
};

export type PerdaVagaDoCaso = {
  // O prazo venceu e a perda ainda não foi confirmada: a ficha mostra o aviso.
  previa: PreviaPerdaVaga | null;
  // A perda mais recente do caso, se ele está de volta à fila por ela.
  confirmada: PerdaVagaConfirmada | null;
  // Entrada do caso na fila, usada no desempate (RF7, DF33).
  naFilaDesde: string;
};

export type ResultadoPerdaVaga = {
  estagiario: string;
  sessoesCanceladas: number;
  naFilaDesde: string;
};
