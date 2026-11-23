import { z } from "zod";
import { dataValida, hojeEmBrasilia } from "./datas";

// Relatório final do ciclo de atendimento (RF33), no modelo de relatório
// psicológico da Clínica Escola (DF42). Um relatório por prontuário (caso e
// ciclo), com as versões numeradas. Só o rascunho muda; a versão enviada para
// revisão fica fixa, e o supervisor a aprova ou a devolve.
export const ESTADOS_RELATORIO = [
  "rascunho",
  "em_revisao",
  "devolvido",
  "aprovado",
] as const;
export type EstadoRelatorio = (typeof ESTADOS_RELATORIO)[number];

export const NOMES_ESTADO_RELATORIO: Record<EstadoRelatorio, string> = {
  rascunho: "Rascunho",
  em_revisao: "Em revisão",
  devolvido: "Devolvida para ajustes",
  aprovado: "Aprovada",
};

// Seções escritas pelo estagiário, na ordem do modelo (DF42). A identificação
// (paciente, solicitante, estagiário e supervisor com o CRP) vem do caso; só a
// finalidade dela é escrita. O texto fica cifrado num JSON (RNF51).
export const SECOES_RELATORIO = [
  ["finalidade", "Finalidade do relatório"],
  ["demanda", "Descrição da demanda"],
  ["procedimentos", "Procedimentos"],
  ["analise", "Análise"],
  ["conclusao", "Conclusão"],
] as const;
export type SecaoRelatorio = (typeof SECOES_RELATORIO)[number][0];
export type SecoesRelatorio = Record<SecaoRelatorio, string>;

// Quem recebeu a via impressa (RF33): o paciente ou, se menor de idade, o
// responsável legal.
export const DESTINATARIOS_RELATORIO = [
  "paciente",
  "responsavel_legal",
] as const;
export type DestinatarioRelatorio = (typeof DESTINATARIOS_RELATORIO)[number];
export const NOMES_DESTINATARIO_RELATORIO: Record<
  DestinatarioRelatorio,
  string
> = {
  paciente: "Paciente",
  responsavel_legal: "Responsável legal",
};

// Registro da entrega pela secretaria (RF33): antes, ela confirma que a via foi
// assinada pelo estagiário e pelo supervisor. A data não pode ser futura.
export const entregaRelatorioSchema = z.object({
  viaAssinada: z.literal(true, {
    error:
      "Confirme que a via impressa foi assinada pelo estagiário e pelo supervisor.",
  }),
  entregueA: z.enum(DESTINATARIOS_RELATORIO, {
    error: "Informe a quem o relatório foi entregue.",
  }),
  entregueEm: z
    .string({ error: "Informe a data da entrega." })
    .refine(dataValida, "Informe a data da entrega.")
    .refine(
      (data) => !dataValida(data) || data <= hojeEmBrasilia(),
      "A data da entrega não pode ser futura.",
    ),
});
export type EntregaRelatorio = z.infer<typeof entregaRelatorioSchema>;

// Uma versão na lista "Versões" (estagiário, supervisor e coordenação). A
// secretaria recebe só a versão aprovada, sem as observações.
export type VersaoDoRelatorio = {
  versao: number;
  estado: EstadoRelatorio;
  autor: string;
  // Datas e horas em ISO 8601; a tela mostra o horário de Brasília.
  enviadaEm: string | null;
  decisao: {
    por: string;
    em: string;
    // Só na devolução, e nunca para a secretaria.
    observacoes: string | null;
  } | null;
};

export type ImpressaoDoRelatorio = { por: string; em: string };

export type EntregaRegistrada = {
  versao: number;
  entregueA: DestinatarioRelatorio;
  // Data da entrega (AAAA-MM-DD).
  entregueEm: string;
  registradaPor: string;
  registradaEm: string;
};

// GET /casos/:id/relatorio-final: o relatório do ciclo (o atual, se a consulta
// não informar). `null` quando o ciclo ainda não tem relatório.
export type RelatorioFinalDoCiclo = {
  casoId: string;
  ciclo: number;
  paciente: string;
  // Da inscrição, para a secretaria escolher a quem entregou (RF33).
  responsavelLegal: string | null;
  versoes: VersaoDoRelatorio[];
  aprovada: { versao: number; aprovadaPor: string; aprovadaEm: string } | null;
  impressoes: ImpressaoDoRelatorio[];
  entrega: EntregaRegistrada | null;
};

// Versão para impressão (RF33): só a aprovada. A página monta o documento com
// os campos das assinaturas manuscritas; não há download nem envio.
export type RelatorioParaImpressao = {
  casoId: string;
  ciclo: number;
  versao: number;
  paciente: string;
  // O responsável legal, quando há um na inscrição; senão, o próprio paciente.
  solicitante: string | null;
  estagiario: string;
  // crp é nulo se o supervisor foi cadastrado antes do campo e a coordenação
  // ainda não o informou (RF53); a página deixa a linha para preencher à mão.
  supervisor: { nome: string; crp: string | null };
  // Primeira sessão realizada no ciclo (AAAA-MM-DD), ou nula se não houver.
  inicioAcompanhamento: string | null;
  secoes: SecoesRelatorio;
  aprovadaEm: string;
};
