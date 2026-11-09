import { z } from "zod";

// Verificação de identidade do paciente ou do responsável (RF52): o
// identificador é o CPF, com ou sem pontuação, ou o número da inscrição
// (AAAA-NNNNN). As regras do código estão no RF52 e no RNF6.
export const DIGITOS_CODIGO = 6;
export const MINUTOS_VALIDADE_CODIGO = 10;
export const TENTATIVAS_POR_CODIGO = 5;
export const SEGUNDOS_ENTRE_ENVIOS = 60;
export const CODIGOS_POR_JANELA = 3;
export const MINUTOS_JANELA_ENVIOS = 60;
export const MINUTOS_BLOQUEIO_ENVIOS = 60;
// O RF52 não define a duração da verificação: o projeto do Ciclo 4 adota 15
// minutos, sem renovação.
export const MINUTOS_VERIFICACAO = 15;

export const MENSAGEM_CODIGO_PEDIDO =
  "Se a inscrição tiver e-mail cadastrado, enviamos para ele um código de 6 dígitos. O código vale por 10 minutos.";
export const MENSAGEM_CODIGO_INVALIDO =
  "Código inválido ou expirado. Confira o código no e-mail ou peça um novo.";

export type Identificador =
  { tipo: "cpf"; valor: string } | { tipo: "numero"; valor: string };

// CPF com 11 números, aceitando pontos, traço e espaços; ou o número da
// inscrição como sai no comprovante (RF2).
export function lerIdentificador(texto: string): Identificador | null {
  const limpo = texto.trim();
  if (/^\d{4}-\d{5,}$/.test(limpo)) return { tipo: "numero", valor: limpo };
  if (/^[\d.\-\s]+$/.test(limpo)) {
    const digitos = limpo.replace(/\D/g, "");
    if (digitos.length === 11) return { tipo: "cpf", valor: digitos };
  }
  return null;
}

const identificadorSchema = z
  .string({ error: "Informe o CPF ou o número da inscrição." })
  .trim()
  .min(1, "Informe o CPF ou o número da inscrição.")
  .max(40, "Digite o CPF com 11 números ou o número da inscrição.")
  .transform((texto, ctx) => {
    const identificador = lerIdentificador(texto);
    if (!identificador) {
      ctx.addIssue({
        code: "custom",
        message:
          "Digite o CPF com 11 números ou o número da inscrição, como 2026-00487.",
      });
      return z.NEVER;
    }
    return identificador;
  });

export const pedidoCodigoSchema = z.object({
  identificador: identificadorSchema,
});
export type PedidoCodigo = z.infer<typeof pedidoCodigoSchema>;

export const conferenciaCodigoSchema = z.object({
  identificador: identificadorSchema,
  codigo: z
    .string({ error: "Digite os 6 números do código mais recente." })
    .trim()
    .regex(/^\d{6}$/, "Digite os 6 números do código mais recente."),
});
export type ConferenciaCodigo = z.infer<typeof conferenciaCodigoSchema>;

// Inscrição liberada pela verificação, mostrada só a quem confirmou a
// identidade.
export type VerificacaoAtual = {
  numero: string;
  expiraEm: string;
};
