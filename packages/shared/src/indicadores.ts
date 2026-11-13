import { z } from "zod";
import { hojeEmBrasilia } from "./datas";

// Indicadores operacionais (RF48), consultados pela coordenação para um
// intervalo de datas. As datas são dias do calendário de Brasília (AAAA-MM-DD).

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const dataValida = (valor: string) =>
  DATA.test(valor) &&
  !Number.isNaN(Date.parse(`${valor}T12:00:00Z`)) &&
  new Date(`${valor}T12:00:00Z`).toISOString().slice(0, 10) === valor;

// A data final não pode passar do dia da consulta, e a inicial não pode passar
// da final. O motivo fica no campo, para a tela marcar o campo certo.
export const consultaIndicadoresSchema = z
  .object({
    inicio: z.string().refine(dataValida, "Informe a data inicial."),
    fim: z.string().refine(dataValida, "Informe a data final."),
  })
  .superRefine((v, ctx) => {
    if (!dataValida(v.inicio) || !dataValida(v.fim)) return;
    const hoje = hojeEmBrasilia();
    if (v.fim > hoje) {
      ctx.addIssue({
        code: "custom",
        path: ["fim"],
        message: `A data final não pode ser posterior à data da consulta (${hoje.split("-").reverse().join("/")}).`,
      });
    } else if (v.inicio > v.fim) {
      ctx.addIssue({
        code: "custom",
        path: ["inicio"],
        message: "A data inicial não pode ser posterior à data final.",
      });
    }
  });
export type ConsultaIndicadores = z.infer<typeof consultaIndicadoresSchema>;

// Semestre de uma data: "2026/1" de janeiro a junho e "2026/2" de julho a dezembro.
export const semestreDaData = (data: string) =>
  `${data.slice(0, 4)}/${Number(data.slice(5, 7)) <= 6 ? 1 : 2}`;

// Na URL, o semestre vai com hífen ("2026-2"), porque a barra separa o caminho.
export const SEMESTRE_URL = /^\d{4}-[12]$/;
export const semestreParaUrl = (semestre: string) => semestre.replace("/", "-");
export const semestreDaUrl = (valor: string) => valor.replace("-", "/");

export const vagasOfertadasSchema = z.object({
  total: z
    .number({ error: "Informe o total de vagas ofertadas." })
    .int("Informe um número inteiro de vagas.")
    .min(1, "Informe pelo menos 1 vaga.")
    .max(10000, "Informe no máximo 10.000 vagas."),
});
export type VagasOfertadasEntrada = z.infer<typeof vagasOfertadasSchema>;

export type UltimaAlteracao = {
  valorAnterior: string | null;
  valorNovo: string;
  por: string;
  em: string;
};

export type VagasOfertadas = {
  semestre: string;
  total: number | null;
  ultimaAlteracao: UltimaAlteracao | null;
};

export type Indicadores = {
  inicio: string;
  fim: string;
  // Instante usado nos indicadores de posição: o fim do dia final, ou o momento
  // da consulta quando a data final é hoje.
  referencia: string;
  referenciaEhAgora: boolean;
  vagas: {
    ocupadas: number;
    semestre: string;
    ofertadas: number | null;
    // Uma casa decimal; null sem vagas ofertadas registradas.
    percentual: number | null;
  };
  espera: {
    // Dias corridos, com uma casa decimal; 0 sem primeiras sessões no período.
    mediaDias: number;
    pacientes: number;
  };
  evasao: {
    // Uma casa decimal; 0 sem pacientes em atendimento ativo no período.
    percentual: number;
    desligamentos: number;
    ativos: number;
  };
  supervisores: { id: string; nome: string; casos: number }[];
};
