import { z } from "zod";
import { hojeEmBrasilia } from "./datas";
import type { Perfil } from "./perfis";

export const TAMANHO_PAGINA_ACESSOS = 50;

export function periodoInicialAcessos(agora = new Date()) {
  const fim = hojeEmBrasilia(agora);
  const inicio = new Date(`${fim}T12:00:00Z`);
  inicio.setUTCDate(inicio.getUTCDate() - 29);
  return { inicio: inicio.toISOString().slice(0, 10), fim };
}

const nome = z.string().trim().max(150, "Use até 150 caracteres.").optional();
export const filtroAcessosSchema = z
  .object({
    pacienteId: z.uuid().optional(),
    usuarioId: z.uuid().optional(),
    paciente: nome,
    usuario: nome,
    inicio: z.iso.date("Informe uma data inicial válida.").optional(),
    fim: z.iso.date("Informe uma data final válida.").optional(),
    operacao: z
      .enum(["visualizacao", "criacao", "alteracao", "acesso_negado"], {
        error: "Escolha uma operação da lista.",
      })
      .optional(),
    pagina: z.coerce.number().int().min(1).max(100000).default(1),
  })
  .refine((f) => !f.inicio || !f.fim || f.inicio <= f.fim, {
    path: ["fim"],
    message: "A data final deve ser igual ou posterior à inicial.",
  });
export type FiltroAcessos = z.infer<typeof filtroAcessosSchema>;
export type OperacaoAcesso =
  "visualizacao" | "criacao" | "alteracao" | "acesso_negado";
export const NOMES_OPERACAO_ACESSO: Record<OperacaoAcesso, string> = {
  visualizacao: "Visualização",
  criacao: "Criação",
  alteracao: "Alteração",
  acesso_negado: "Acesso negado",
};
export type AcessoAoProntuario = {
  id: string;
  dataHora: string;
  usuario: string;
  perfil: Perfil;
  paciente: string | null;
  operacao: OperacaoAcesso;
};
export type ListaAcessosProntuario = {
  acessos: AcessoAoProntuario[];
  total: number;
  pagina: number;
  tamanhoPagina: number;
};
