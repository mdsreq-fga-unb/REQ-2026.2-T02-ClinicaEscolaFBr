import { z } from "zod";
import type { CancelamentoDaSessao } from "./cancelamento";
import { statusSessaoSchema, type StatusSessao } from "./dominio-ciclo-3";

// Agenda de sessões do estagiário (RF11).

// Situações que a agenda mostra sem filtro: as canceladas e as faltas aparecem só
// quando o filtro as pede.
export const STATUS_PADRAO_DA_AGENDA: StatusSessao[] = [
  "agendada",
  "confirmada",
  "realizada",
];

// O período mais longo de uma consulta, para a agenda não virar um relatório.
export const DIAS_MAXIMOS_DA_AGENDA = 93;

const DIA = 24 * 60 * 60 * 1000;
const dias = (de: string, ate: string) =>
  (Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / DIA;

// Período em datas de Brasília (de e até inclusive) e as situações, separadas por
// vírgula na URL. O estagiarioId só vale para o supervisor: o estagiário vê sempre
// a própria agenda.
export const consultaAgendaSchema = z
  .object({
    estagiarioId: z.uuid().optional(),
    de: z.iso.date({ error: "Informe a data inicial." }),
    ate: z.iso.date({ error: "Informe a data final." }),
    status: z
      .preprocess(
        (valor) =>
          typeof valor === "string" ? valor.split(",").filter(Boolean) : valor,
        z.array(statusSessaoSchema).min(1, "Marque ao menos uma situação."),
      )
      .optional(),
  })
  .refine((c) => c.de <= c.ate, {
    path: ["ate"],
    message: "A data final precisa ser igual ou depois da inicial.",
  })
  .refine((c) => dias(c.de, c.ate) < DIAS_MAXIMOS_DA_AGENDA, {
    path: ["ate"],
    message: `Escolha um período de até ${DIAS_MAXIMOS_DA_AGENDA} dias.`,
  });
export type ConsultaAgenda = z.infer<typeof consultaAgendaSchema>;

// O que cada linha permite a quem consulta, pela mesma regra das rotas: cancelar
// (RF15, RF16) e registrar a falta (RF34).
export type AcoesDaSessaoNaAgenda = {
  pedidoPaciente: boolean;
  administrativo: boolean;
  ausenciaEstagiario: boolean;
  registrarFalta: boolean;
};

// Sessão na agenda: só o nome do paciente, a data, o início, o término e a
// situação (RNF13), mais os ids para as ações e o prontuário da sessão realizada.
export type SessaoDaAgenda = {
  id: string;
  casoId: string;
  paciente: string;
  inicio: string;
  termino: string;
  status: StatusSessao;
  cancelamento: CancelamentoDaSessao | null;
  prontuarioId: string | null;
  acoes: AcoesDaSessaoNaAgenda;
};

export type AgendaDoEstagiario = {
  estagiario: { id: string; nome: string };
  de: string;
  ate: string;
  antecedenciaMinimaMinutos: number;
  sessoes: SessaoDaAgenda[];
};

// Estagiário do supervisor: vínculo vigente num caso com a atribuição vigente dele.
export type EstagiarioDoSupervisor = { id: string; nome: string };
