import { primeiroNome } from './confirmacao.service';
import { dataBrasilia, diaDaSemana, horaBrasilia } from './horario';

// Remarcar: o cancelamento administrativo (RF15), em que o novo horário vai pelo
// aviso do agendamento (RF10). Ausência: a do estagiário (RF16, RF17).
export type MotivoDoAviso = 'remarcar' | 'ausencia';

// O texto do aviso do cancelamento ao paciente, o mesmo no e-mail e na mensagem
// pronta do WhatsApp (RF17). Diz o dia, a data e o horário e que não conta como
// falta, sem o motivo do cancelamento (CFP art. 9º).
export function paragrafosDoAviso(
  nome: string,
  inicio: Date,
  motivo: MotivoDoAviso,
) {
  return [
    `Olá, ${primeiroNome(nome)}.`,
    `A sua sessão na Clínica Escola de Psicologia da FBr de ${diaDaSemana(inicio)}, ${dataBrasilia(inicio)}, às ${horaBrasilia(inicio)}, foi cancelada pela clínica. Este cancelamento não conta como falta.`,
    motivo === 'remarcar'
      ? 'O novo horário será enviado em seguida, por este e-mail.'
      : 'A secretaria vai entrar em contato para marcar outro horário.',
  ];
}

// A mensagem do WhatsApp, num parágrafo só, como na prancha 5-1.
export const mensagemDaAusencia = (nome: string, inicio: Date) =>
  paragrafosDoAviso(nome, inicio, 'ausencia').join(' ');
