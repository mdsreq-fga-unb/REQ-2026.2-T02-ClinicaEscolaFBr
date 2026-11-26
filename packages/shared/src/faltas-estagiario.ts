import { z } from "zod";
import { dataValida } from "./datas";

// Relação de faltas do estagiário (RF39): as sessões canceladas por ausência real
// do estagiário (RF16), para o supervisor e a coordenação (RNF35). Sem o nome do
// paciente nem o motivo da ausência. A contagem do semestre é do RF40, e a
// reprovação, do RF63.

// O período são dias do calendário de Brasília (AAAA-MM-DD), inteiros. Sem o
// estagiário, a consulta traz todos os que o perfil pode ver.
export const consultaFaltasEstagiarioSchema = z
  .object({
    estagiarioId: z.uuid("Escolha um estagiário da lista.").optional(),
    inicio: z.string().refine(dataValida, "Informe a data inicial."),
    fim: z.string().refine(dataValida, "Informe a data final."),
  })
  .superRefine((v, ctx) => {
    if (dataValida(v.inicio) && dataValida(v.fim) && v.inicio > v.fim) {
      ctx.addIssue({
        code: "custom",
        path: ["inicio"],
        message: "A data inicial não pode ser posterior à data final.",
      });
    }
  });
export type ConsultaFaltasEstagiario = z.infer<
  typeof consultaFaltasEstagiarioSchema
>;

// Primeiro dia do semestre de uma data: 1º de janeiro ou 1º de julho. A consulta
// abre com o semestre vigente até hoje.
export const inicioDoSemestre = (data: string) =>
  `${data.slice(0, 4)}-${Number(data.slice(5, 7)) <= 6 ? "01" : "07"}-01`;

// Ausência reclassificada pela coordenação como cancelamento administrativo
// (RF40): quem reclassificou e quando. O motivo só sai para a coordenação.
export type ReclassificacaoDaFalta = {
  por: string;
  em: string;
  motivo: string | null;
};

export type FaltaDoEstagiario = {
  id: string;
  estagiario: { id: string; nome: string };
  // Início da sessão cancelada e o momento do registro da ausência.
  inicio: string;
  registradaEm: string;
  // A reclassificada continua na lista, riscada, e sai da contagem (RF40).
  reclassificada: ReclassificacaoDaFalta | null;
};

export type FaltasDoEstagiario = {
  inicio: string;
  fim: string;
  faltas: FaltaDoEstagiario[];
};

// Faltas do estagiário no semestre (RF40). O semestre é o da data da sessão, em
// Brasília: "2026/1" de janeiro a junho e "2026/2" de julho a dezembro.
export const SEMESTRE = /^\d{4}\/[12]$/;

// Com 3 faltas no semestre, o estagiário reprova o campo de estágio, como a
// Clínica Escola confirmou; a sinalização da reprovação é do RF63.
export const LIMITE_FALTAS_ESTAGIARIO = 3;

export const consultaFaltasSemestreSchema = z.object({
  semestre: z.string().regex(SEMESTRE, "Escolha um semestre da lista."),
  estagiarioId: z.uuid("Escolha um estagiário da lista.").optional(),
});
export type ConsultaFaltasSemestre = z.infer<
  typeof consultaFaltasSemestreSchema
>;

// Como o seletor mostra o semestre: "2026/2 (julho a dezembro)".
export const rotuloSemestre = (semestre: string) =>
  `${semestre} (${semestre.endsWith("/1") ? "janeiro a junho" : "julho a dezembro"})`;

// Primeiro dia do semestre e do semestre seguinte, em AAAA-MM-DD.
export const limitesDoSemestre = (semestre: string) => {
  const ano = Number(semestre.slice(0, 4));
  return semestre.endsWith("/1")
    ? { inicio: `${ano}-01-01`, fimExclusivo: `${ano}-07-01` }
    : { inicio: `${ano}-07-01`, fimExclusivo: `${ano + 1}-01-01` };
};

// Uma falta do semestre. A reclassificada aparece riscada e não conta.
export type FaltaNoSemestre = {
  id: string;
  inicio: string;
  registradaEm: string;
  reclassificada: ReclassificacaoDaFalta | null;
};

export type EstagiarioNoSemestre = {
  estagiario: { id: string; nome: string };
  // A contagem é sempre a do estagiário no semestre inteiro, em todos os casos,
  // porque o limite vale para todas as faltas dele.
  faltas: number;
  // Para o supervisor, as linhas são só as dos casos dele; as faltas em casos de
  // outros supervisores entram na contagem, sem a data (RNF35). Para a
  // coordenação, é sempre 0, porque ela vê todas as linhas.
  faltasDeOutrosSupervisores: number;
  linhas: FaltaNoSemestre[];
};

export type FaltasNoSemestre = {
  semestre: string;
  // O semestre vigente e os semestres com alguma falta, do mais recente ao mais antigo.
  semestres: string[];
  estagiarios: EstagiarioNoSemestre[];
};

// Reclassificação de uma ausência registrada por engano (RF40), pela coordenação.
export const reclassificacaoFaltaSchema = z.object({
  motivo: z
    .string("Informe o motivo da reclassificação.")
    .trim()
    .min(1, "Informe o motivo da reclassificação.")
    .max(1000, "Use até 1.000 caracteres."),
});
export type ReclassificacaoFalta = z.infer<typeof reclassificacaoFaltaSchema>;

export type ResultadoReclassificacao = {
  estagiarioId: string;
  semestre: string;
  faltas: number;
};

// Os estagiários do campo "Estagiário": para o supervisor, os que ele supervisiona
// hoje e os que têm falta registrada enquanto o caso era dele; para a
// coordenação, todos.
export type EstagiarioComFaltas = { id: string; nome: string };

// Sinalização de reprovação do estagiário por faltas (RF63): gerada quando a
// contagem do semestre chega ao limite, uma vez por estagiário e semestre. Fica
// aberta até a decisão da coordenação (RF64) ou até uma reclassificação deixar a
// contagem abaixo do limite.
export const MOTIVOS_ENCERRAMENTO_SINALIZACAO = [
  "decisao",
  "contagem_abaixo_do_limite",
] as const;
export type MotivoEncerramentoSinalizacao =
  (typeof MOTIVOS_ENCERRAMENTO_SINALIZACAO)[number];

export const consultaSinalizacoesSchema = z.object({
  situacao: z.enum(["abertas", "todas"]).default("abertas"),
  estagiarioId: z.uuid("Escolha um estagiário da lista.").optional(),
});
export type ConsultaSinalizacoes = z.infer<typeof consultaSinalizacoesSchema>;

export type SinalizacaoReprovacao = {
  id: string;
  estagiario: { id: string; nome: string };
  semestre: string;
  geradaEm: string;
  encerradaEm: string | null;
  motivoEncerramento: MotivoEncerramentoSinalizacao | null;
  // A falta cuja reclassificação encerrou a sinalização sem decisão: o início da
  // sessão e o momento da reclassificação. Para o supervisor, o início só vem
  // quando a falta é de um caso dele, como nas sessões (RNF35); senão, é nulo.
  faltaReclassificada: { inicio: string | null; em: string } | null;
  // A contagem atual do semestre, que continua mudando depois da sinalização.
  faltas: number;
  // Para o supervisor, as sessões são só as dos casos dele, e as outras faltas
  // entram só neste número (RNF35), como na contagem do RF40.
  faltasDeOutrosSupervisores: number;
  // Início de cada sessão que conta, da mais antiga para a mais recente.
  sessoes: string[];
  // Os supervisores com o estagiário hoje (CP4), que recebem a sinalização.
  supervisores: string[];
  // As decisões da coordenação (RF64), da mais antiga para a mais recente. Uma
  // decisão nova não apaga a anterior.
  decisoes: DecisaoDaSinalizacao[];
};

export type Sinalizacoes = { sinalizacoes: SinalizacaoReprovacao[] };

// Decisão institucional sobre a sinalização de reprovação (RF64), só da
// coordenação. Ela encerra a sinalização aberta e não muda a contagem do RF40.
export const DECISOES_REPROVACAO = ["confirmada", "nao_aplicada"] as const;
export type DecisaoReprovacao = (typeof DECISOES_REPROVACAO)[number];
export const NOMES_DECISAO_REPROVACAO: Record<DecisaoReprovacao, string> = {
  confirmada: "Reprovação confirmada",
  nao_aplicada: "Reprovação não aplicada",
};

export const registroDecisaoSchema = z.object({
  decisao: z.enum(DECISOES_REPROVACAO, "Escolha a decisão."),
  justificativa: z
    .string("Informe a justificativa da decisão.")
    .trim()
    .min(1, "Informe a justificativa da decisão.")
    .max(1000, "Use até 1.000 caracteres."),
});
export type RegistroDecisao = z.infer<typeof registroDecisaoSchema>;

export type DecisaoDaSinalizacao = {
  id: string;
  decisao: DecisaoReprovacao;
  // Só a coordenação lê a justificativa, que pode trazer dado pessoal do
  // estagiário; o supervisor vê a decisão, o autor e a data (apontamento 2).
  justificativa: string | null;
  por: string;
  em: string;
};
