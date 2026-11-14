import { z } from "zod";
import { hojeEmBrasilia } from "./datas";
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

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const dataValida = (valor: string) =>
  DATA.test(valor) &&
  !Number.isNaN(Date.parse(`${valor}T12:00:00Z`)) &&
  new Date(`${valor}T12:00:00Z`).toISOString().slice(0, 10) === valor;

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

// Registro (RF41): o valor não vem do pedido, vem do parâmetro.
export const registroContribuicaoSchema = z.object({ pagoEm, forma });
export type RegistroContribuicao = z.infer<typeof registroContribuicaoSchema>;

// Correção (RF41, RNF36): a ficha inteira de novo, com o motivo obrigatório. O
// valor pode mudar, porque o erro pode estar nele.
export const correcaoContribuicaoSchema = z.object({
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
};

export type ValorContribuicao = {
  valorCentavos: number;
  ultimaAlteracao: UltimaAlteracao | null;
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
