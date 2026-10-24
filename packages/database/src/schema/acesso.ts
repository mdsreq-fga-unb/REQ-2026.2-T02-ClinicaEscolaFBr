import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { usuarios } from "./base";

// Convite de ativação da conta (RF53): token guardado só como hash, uso único,
// validade pelo parâmetro validade_convite_horas (72 h, DF30). O reenvio invalida o anterior.
export const convitesAtivacao = pgTable("convites_ativacao", {
  id: uuid("id").primaryKey().defaultRandom(),
  usuarioId: uuid("usuario_id")
    .notNull()
    .references(() => usuarios.id),
  tokenHash: text("token_hash").notNull().unique(),
  expiraEm: timestamp("expira_em", { withTimezone: true }).notNull(),
  usadoEm: timestamp("usado_em", { withTimezone: true }),
  invalidadoEm: timestamp("invalidado_em", { withTimezone: true }),
  criadoEm: timestamp("criado_em", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Sessão de login (RF50). A desativação (RF54) revoga as sessões abertas.
export const sessoesLogin = pgTable("sessoes_login", {
  id: uuid("id").primaryKey().defaultRandom(),
  usuarioId: uuid("usuario_id")
    .notNull()
    .references(() => usuarios.id),
  tokenHash: text("token_hash").notNull().unique(),
  criadaEm: timestamp("criada_em", { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiraEm: timestamp("expira_em", { withTimezone: true }).notNull(),
  revogadaEm: timestamp("revogada_em", { withTimezone: true }),
});
