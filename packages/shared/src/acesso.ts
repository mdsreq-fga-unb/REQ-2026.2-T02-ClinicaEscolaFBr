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

// Cadastro de usuário institucional pela coordenação (RF53).
export const cadastroUsuarioSchema = z.object({
  nome: z.string().trim().min(3, "Informe o nome completo."),
  email: z.email("Informe um e-mail válido.").trim().toLowerCase(),
  perfil: perfilSchema,
});
export type CadastroUsuario = z.infer<typeof cadastroUsuarioSchema>;

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
  situacao: z.infer<typeof situacaoUsuarioSchema>;
  conviteEnviadoEm: string | null;
  conviteExpiraEm: string | null;
  conviteVencido: boolean;
  desativadoEm: string | null;
};
