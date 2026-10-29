import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.url(),
  API_PORT: z.coerce.number().default(3333),
  WEB_URL: z.url(),
  SMTP_HOST: z.string(),
  SMTP_PORT: z.coerce.number(),
  // Só na implantação: remetente, nome de apresentação (EHLO) do relay do Google
  // Workspace e, com uma conta própria, usuário e senha de app.
  SMTP_EHLO: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  // Inscrições públicas novas por origem a cada 10 minutos (RF1).
  LIMITE_INSCRICOES_POR_ORIGEM: z.coerce.number().int().positive().default(20),
  // Proxies à frente da API na implantação, para o req.ip ser o do visitante.
  SALTOS_DE_PROXY: z.coerce.number().int().nonnegative().default(0),
  // Chave da criptografia em repouso dos dados de saúde (RNF51): 32 bytes em base64.
  CHAVE_DADOS: z
    .base64()
    .refine((v) => Buffer.from(v, 'base64').length === 32, {
      message: 'CHAVE_DADOS deve ter 32 bytes em base64',
    }),
});

export type Env = z.infer<typeof envSchema>;
export const validarEnv = (config: Record<string, unknown>) =>
  envSchema.parse(config);
