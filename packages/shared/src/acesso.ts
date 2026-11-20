import { z } from "zod";
import { perfilSchema } from "./perfis";
import { situacaoUsuarioSchema } from "./situacao-usuario";

// Regras da senha (RNF49): pelo menos 8 caracteres, com uma letra e um número.
export const REGRAS_SENHA = [
  {
    id: "tamanho",
    texto: "Pelo menos 8 caracteres",
    teste: (s: string) => s.length >= 8,
  },
  {
    id: "letra",
    texto: "Pelo menos 1 letra",
    teste: (s: string) => /\p{L}/u.test(s),
  },
  {
    id: "numero",
    texto: "Pelo menos 1 número",
    teste: (s: string) => /\d/.test(s),
  },
] as const;

export const senhaSchema = z
  .string()
  .refine((s) => REGRAS_SENHA.every((r) => r.teste(s)), {
    message:
      "A senha precisa ter pelo menos 8 caracteres, com 1 letra e 1 número.",
  });

// Número de inscrição no CRP do supervisor (RF53, usado no RF33 e no RF45): a
// região com dois dígitos, a barra e o número, como em "01/12345". Aceita o
// prefixo "CRP" e espaços, e guarda só "01/12345".
const FORMATO_CRP = /^(?:CRP\s*-?\s*)?(\d{2})\s*\/\s*(\d{1,6})$/i;
export const crpSchema = z
  .string()
  .trim()
  .regex(FORMATO_CRP, "Informe o CRP no formato 01/12345.")
  .transform((crp) => crp.replace(FORMATO_CRP, "$1/$2"));

// Campo vazio no formulário conta como não informado.
const crpOpcional = z.preprocess(
  (valor) =>
    typeof valor === "string" && valor.trim() === "" ? undefined : valor,
  crpSchema.optional(),
);

// Cadastro de usuário institucional pela coordenação (RF53). O CRP é
// obrigatório só para o supervisor e descartado nos outros perfis.
export const cadastroUsuarioSchema = z
  .object({
    nome: z.string().trim().min(3, "Informe o nome completo."),
    email: z.email("Informe um e-mail válido.").trim().toLowerCase(),
    perfil: perfilSchema,
    crp: crpOpcional,
  })
  .superRefine((dados, ctx) => {
    if (dados.perfil === "supervisor" && !dados.crp) {
      ctx.addIssue({
        code: "custom",
        path: ["crp"],
        message: "Informe o número do CRP do supervisor.",
      });
    }
  })
  .transform(({ crp, ...dados }) =>
    dados.perfil === "supervisor" ? { ...dados, crp } : dados,
  );
export type CadastroUsuario = z.input<typeof cadastroUsuarioSchema>;
export type CadastroUsuarioValidado = z.output<typeof cadastroUsuarioSchema>;

// Correção do CRP de um supervisor pela coordenação (RF53).
export const correcaoCrpSchema = z.object({ crp: crpSchema });
export type CorrecaoCrp = z.output<typeof correcaoCrpSchema>;

// Ativação da conta pelo link do convite (RF53).
export const ativacaoSchema = z
  .object({
    token: z.string().min(1),
    senha: senhaSchema,
    confirmacao: z.string(),
  })
  .refine((d) => d.senha === d.confirmacao, {
    message: "As senhas não são iguais. Digite a mesma senha nos dois campos.",
    path: ["confirmacao"],
  });
export type Ativacao = z.infer<typeof ativacaoSchema>;

// Entrada no sistema com e-mail e senha (RF50).
export const loginSchema = z.object({
  email: z.email("Informe um e-mail válido.").trim().toLowerCase(),
  senha: z.string().min(1, "Informe a senha."),
});
export type Login = z.infer<typeof loginSchema>;

// Filtros da lista de usuários (RF53 e RF54).
export const filtroUsuariosSchema = z.object({
  busca: z.string().trim().optional(),
  perfil: perfilSchema.optional(),
  situacao: situacaoUsuarioSchema.optional(),
});
export type FiltroUsuarios = z.infer<typeof filtroUsuariosSchema>;

export type UsuarioListado = {
  id: string;
  nome: string;
  email: string;
  perfil: z.infer<typeof perfilSchema>;
  // Só do supervisor; nulo nos outros perfis ou se ainda não foi informado.
  crp: string | null;
  situacao: z.infer<typeof situacaoUsuarioSchema>;
  conviteEnviadoEm: string | null;
  conviteExpiraEm: string | null;
  conviteVencido: boolean;
  desativadoEm: string | null;
};

// Resposta do cadastro: o usuário fica salvo mesmo se o e-mail do convite falhar,
// e a coordenação usa o reenvio (RF53).
export type ResultadoCadastroUsuario = {
  id: string;
  situacao: z.infer<typeof situacaoUsuarioSchema>;
  conviteEnviado: boolean;
};
