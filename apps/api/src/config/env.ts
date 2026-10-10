import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.url(),
  API_PORT: z.coerce.number().default(3333),
  WEB_URL: z.url(),
  SMTP_HOST: z.string(),
  SMTP_PORT: z.coerce.number(),
});

export type Env = z.infer<typeof envSchema>;
export const validarEnv = (config: Record<string, unknown>) =>
  envSchema.parse(config);
