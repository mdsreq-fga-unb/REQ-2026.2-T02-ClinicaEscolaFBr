import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.url(),
  API_PORT: z.coerce.number().default(3333),
  WEB_URL: z.url(),
  SMTP_HOST: z.string(),
  SMTP_PORT: z.coerce.number(),
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
