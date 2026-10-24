import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { usuarios } from "./base";

// Parâmetros alterados pela coordenação (PARAMETROS_PADRAO em @clinica/shared).
// A alteração registra o autor e a data/hora, e o histórico fica na auditoria.
export const parametros = pgTable("parametros", {
  chave: text("chave").primaryKey(),
  valor: text("valor").notNull(),
  alteradoPor: uuid("alterado_por").references(() => usuarios.id),
  alteradoEm: timestamp("alterado_em", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
