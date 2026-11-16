import { sql } from "drizzle-orm";
import {
  check,
  date,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { FORMAS_PAGAMENTO } from "@clinica/shared";
import { usuarios } from "./base";
import { casos } from "./casos";

export const formaPagamentoEnum = pgEnum("forma_pagamento", FORMAS_PAGAMENTO);

// Pagamento da contribuição social (RF41, RNF36), recebido pela secretaria por
// fora do sistema. Só inserção (gatilho impedir_alteracao_registro): a versão 1 é
// o registro, e cada correção é uma versão nova, com o motivo. Vale a versão de
// maior número do caso no ciclo. O valor é copiado do parâmetro no registro, para
// a mudança do parâmetro não alterar o que já foi pago.
export const pagamentosContribuicao = pgTable(
  "pagamentos_contribuicao",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    casoId: uuid("caso_id")
      .notNull()
      .references(() => casos.id),
    cicloAtendimento: integer("ciclo_atendimento").notNull(),
    versao: integer("versao").notNull(),
    valorCentavos: integer("valor_centavos").notNull(),
    pagoEm: date("pago_em").notNull(),
    forma: formaPagamentoEnum("forma").notNull(),
    motivoCorrecao: text("motivo_correcao"),
    registradoPor: uuid("registrado_por")
      .notNull()
      .references(() => usuarios.id),
    registradoEm: timestamp("registrado_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Dois registros ao mesmo tempo não geram duas versões iguais: um passa, e o
    // outro recebe o 409.
    unique("pagamentos_contribuicao_versao_unica").on(
      t.casoId,
      t.cicloAtendimento,
      t.versao,
    ),
    check("pagamentos_contribuicao_versao_positiva", sql`${t.versao} >= 1`),
    check(
      "pagamentos_contribuicao_valor_positivo",
      sql`${t.valorCentavos} > 0`,
    ),
    // O motivo fica vazio só no registro (versão 1); toda correção tem motivo.
    check(
      "pagamentos_contribuicao_motivo_da_correcao",
      sql`(${t.versao} = 1) = (${t.motivoCorrecao} is null)`,
    ),
  ],
);
