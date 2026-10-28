import { z } from "zod";
import type { Canal } from "./dominio-ciclo-3";

// Agendamento de sessão (RF10). Início e término chegam como data/hora ISO com o
// fuso (o site envia no horário de Brasília). Sem término, a API usa a duração padrão.
export const agendamentoSchema = z.object({
  casoId: z.uuid("Escolha o paciente."),
  inicio: z.iso.datetime({ offset: true, error: "Informe a data e o início." }),
  termino: z.iso
    .datetime({ offset: true, error: "Informe um término válido." })
    .optional(),
});
export type Agendamento = z.infer<typeof agendamentoSchema>;

// Busca de pacientes na tela de agendamento (RF10).
export const buscaPacientesSchema = z.object({
  busca: z.string().trim().optional(),
});
export type BuscaPacientes = z.infer<typeof buscaPacientesSchema>;

// Agenda de um estagiário em um dia (AAAA-MM-DD, horário de Brasília).
export const filtroAgendaSchema = z.object({
  estagiarioId: z.uuid(),
  data: z.iso.date(),
});
export type FiltroAgenda = z.infer<typeof filtroAgendaSchema>;

// Paciente na busca: sem estagiário vinculado, ele aparece com o aviso e não pode
// ser agendado.
export type PacienteAgendavel = {
  casoId: string;
  nome: string;
  estagiario: { id: string; nome: string } | null;
};

// Bloco ocupado na agenda do estagiário: sessão mais o intervalo para anotações.
// Não traz o nome do paciente (sigilo entre pacientes).
export type BlocoAgenda = {
  inicio: string;
  termino: string;
  fimIntervaloAnotacoes: string;
};

export type ResultadoAgendamento = {
  id: string;
  paciente: string;
  estagiario: string;
  inicio: string;
  termino: string;
  fimIntervaloAnotacoes: string;
  canal: Canal;
  // Canal e-mail: o link sai na hora; false quando o envio falhou.
  linkEnviadoPorEmail: boolean;
  // Canal WhatsApp ou ligação: a secretaria envia a mensagem pronta (DF24).
  whatsapp: { celular: string; mensagem: string; url: string } | null;
};

// Corpo do 409: a sessão em conflito, o bloco que ela ocupa (até o fim das anotações,
// para o estagiário; até o término, para o paciente) e o primeiro horário livre no dia.
export type ConflitoAgendamento = {
  message: string;
  conflito: "estagiario" | "paciente";
  blocoOcupado: { inicio: string; fim: string };
  primeiroHorarioLivre: string | null;
};
