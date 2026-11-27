import { z } from "zod";
import { DOCUMENTOS_COM_FOTO } from "./documentos";
import type { SituacaoCaso } from "./dominio-ciclo-3";

export const revogacaoSchema = z
  .object({
    solicitante: z.enum(["titular", "responsavel"], {
      error: "Informe quem pede a revogação.",
    }),
    formaVerificacao: z.enum(["documento", "verificacao_rf52"], {
      error: "Escolha como a identidade foi confirmada.",
    }),
    documento: z.string().trim().max(120, "Use até 120 caracteres.").optional(),
  })
  .superRefine((dados, ctx) => {
    // Na verificação pelo RF52, o documento não é usado nem gravado.
    if (dados.formaVerificacao !== "documento") return;
    if (!dados.documento)
      ctx.addIssue({
        code: "custom",
        path: ["documento"],
        message: "Escolha o documento apresentado.",
      });
    else if (
      !(DOCUMENTOS_COM_FOTO as readonly string[]).includes(dados.documento)
    )
      ctx.addIssue({
        code: "custom",
        path: ["documento"],
        message: "Escolha um documento da lista.",
      });
  });
export type Revogacao = z.infer<typeof revogacaoSchema>;
export type ConsentimentoDaInscricao = {
  inscricaoId: string;
  casoId: string | null;
  numero: string;
  paciente: string;
  menor: boolean;
  responsavelLegal: string | null;
  situacao: SituacaoCaso | null;
  aceite: { versao: string; em: string; peloResponsavel: boolean } | null;
  revogacao: {
    id: string;
    versao: string;
    em: string;
    por: string;
    solicitante: Revogacao["solicitante"];
    formaVerificacao: Revogacao["formaVerificacao"];
  } | null;
};
export const MENSAGEM_CONSENTIMENTO_REVOGADO =
  "O consentimento foi revogado. Novos agendamentos e comunicações ao titular estão suspensos.";
