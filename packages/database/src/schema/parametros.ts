import {
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
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

// Parâmetros que valem por semestre ("2026/2"), como as vagas ofertadas (RF48).
// A linha guarda o valor vigente; cada mudança fica em alteracoes_parametro.
export const parametrosSemestre = pgTable(
  "parametros_semestre",
  {
    semestre: text("semestre").notNull(),
    chave: text("chave").notNull(),
    valor: text("valor").notNull(),
    alteradoPor: uuid("alterado_por")
      .notNull()
      .references(() => usuarios.id),
    alteradoEm: timestamp("alterado_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.semestre, t.chave] })],
);

// Histórico das mudanças de parâmetro (RF41, RF29 e RF48): o valor anterior, o
// novo, o autor e a data/hora. Só inserção (gatilho impedir_alteracao_registro).
// A chave dos parâmetros por semestre leva o semestre: "vagas_ofertadas:2026/2".
export const alteracoesParametro = pgTable("alteracoes_parametro", {
  id: uuid("id").primaryKey().defaultRandom(),
  chave: text("chave").notNull(),
  valorAnterior: text("valor_anterior"),
  valorNovo: text("valor_novo").notNull(),
  alteradoPor: uuid("alterado_por")
    .notNull()
    .references(() => usuarios.id),
  alteradoEm: timestamp("alterado_em", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
