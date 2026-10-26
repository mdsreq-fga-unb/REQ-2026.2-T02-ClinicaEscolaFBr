import { z } from "zod";
import { CANAIS } from "./dominio-ciclo-3";

export const ESTADOS_CIVIS = [
  "Solteiro(a)",
  "Casado(a)",
  "União estável",
  "Divorciado(a)",
  "Viúvo(a)",
  "Separado(a)",
] as const;
const obrigatorio = (max: number) =>
  z
    .string()
    .trim()
    .min(1, "Preencha este campo.")
    .max(max, `Use no máximo ${max} caracteres.`);

export function hojeEmBrasilia(agora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
}

export function menorDeIdade(
  nascimento: string,
  hoje = hojeEmBrasilia(),
): boolean {
  const idade = Number(hoje.slice(0, 4)) - Number(nascimento.slice(0, 4));
  return idade - (hoje.slice(5) < nascimento.slice(5) ? 1 : 0) < 18;
}

// Validação de formato, sem consulta de identidade ou upload de documentos.
const dadosBase = z.object({
  nomeCompleto: obrigatorio(200),
  dataNascimento: z.iso
    .date("Informe uma data válida.")
    .refine(
      (data) => data <= hojeEmBrasilia(),
      "A data não pode estar no futuro.",
    ),
  cpf: obrigatorio(11).regex(
    /^\d{11}$/,
    "Digite os 11 números do CPF, sem pontuação.",
  ),
  rg: obrigatorio(30).regex(
    /^[0-9A-Za-z.\- /]+$/,
    "Informe um RG válido, sem anexos.",
  ),
  endereco: obrigatorio(500),
  estadoCivil: z.enum(ESTADOS_CIVIS, { error: "Selecione o estado civil." }),
  responsavelLegal: z.string().trim().max(200).default(""),
  celular: z
    .string()
    .trim()
    .max(22)
    .regex(
      /^(?:(?:\+55\s?)?(?:\([1-9]\d\)|[1-9]\d)\s?9\d{4}-?\d{4})?$/,
      "Informe um celular com DDD e 11 dígitos.",
    )
    .transform((valor) =>
      valor.replace(/\D/g, "").replace(/^55(?=\d{11}$)/, ""),
    )
    .default(""),
  email: z
    .union([z.literal(""), z.email("Informe um e-mail válido.").max(254)])
    .default(""),
  canalPreferencial: z.enum(CANAIS, {
    error: "Escolha e-mail, WhatsApp ou ligação.",
  }),
});
const validarResponsavel = (
  dados: {
    dataNascimento: string;
    responsavelLegal: string;
    celular: string;
    email: string;
    canalPreferencial: string;
  },
  ctx: z.RefinementCtx,
) => {
  if (!dados.celular && !dados.email) {
    for (const campo of ["celular", "email"])
      ctx.addIssue({
        code: "custom",
        path: [campo],
        message: "Informe pelo menos um contato: celular ou e-mail.",
      });
  } else if (dados.canalPreferencial === "email" && !dados.email) {
    ctx.addIssue({
      code: "custom",
      path: ["email"],
      message: "Informe um e-mail para o canal escolhido.",
    });
  } else if (dados.canalPreferencial !== "email" && !dados.celular) {
    ctx.addIssue({
      code: "custom",
      path: ["celular"],
      message: "Informe um celular para WhatsApp ou ligação.",
    });
  }
  if (menorDeIdade(dados.dataNascimento) && !dados.responsavelLegal) {
    ctx.addIssue({
      code: "custom",
      path: ["responsavelLegal"],
      message: "Informe o nome do responsável legal para menores de 18 anos.",
    });
  }
};
export const dadosInscricaoSchema = dadosBase.superRefine(validarResponsavel);
export const triagemInscricaoSchema = z.object({
  queixa: obrigatorio(5000),
  percepcaoUrgencia: obrigatorio(2000),
  historicoRelevante: obrigatorio(5000),
});
export const inscricaoSchema = dadosBase
  .extend(triagemInscricaoSchema.shape)
  .extend({
    confirmado: z.literal(true, {
      error: "Revise os dados e confirme o envio.",
    }),
    chaveEnvio: z.uuid(),
  })
  .superRefine(validarResponsavel);
export type Inscricao = z.infer<typeof inscricaoSchema>;
export const comprovanteSchema = z.object({
  numero: z.string().regex(/^\d{4}-\d{5,}$/),
  criadaEm: z.iso.datetime(),
});
export type ComprovanteInscricao = z.infer<typeof comprovanteSchema>;
