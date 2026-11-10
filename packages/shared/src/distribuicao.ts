import { z } from "zod";

export const transferirCasoSchema = z.object({
  casoId: z.string().uuid("ID do caso inválido"),
  estagiarioDestinoId: z.string().uuid("ID do estagiário de destino inválido"),
  motivo: z
    .string()
    .min(5, "O motivo da transferência deve ter pelo menos 5 caracteres")
    .max(500),
});

export type TransferirCasoDto = z.infer<typeof transferirCasoSchema>;
