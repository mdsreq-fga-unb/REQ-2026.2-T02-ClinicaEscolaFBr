import {
  boolean,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { PERFIS } from "@clinica/shared";

export const perfilEnum = pgEnum("perfil", PERFIS);

export const usuarios = pgTable("usuarios", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: text("nome").notNull(),
  email: text("email").notNull().unique(),
  perfil: perfilEnum("perfil").notNull(),
  ativo: boolean("ativo").notNull().default(true),
  criadoEm: timestamp("criado_em", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Trilha de auditoria (RNF10, RNF52): somente inserção.
export const auditoria = pgTable("auditoria", {
  id: uuid("id").primaryKey().defaultRandom(),
  usuarioId: uuid("usuario_id").references(() => usuarios.id),
  operacao: text("operacao").notNull(),
  entidade: text("entidade").notNull(),
  entidadeId: text("entidade_id"),
  dadosAnteriores: jsonb("dados_anteriores"),
  dadosNovos: jsonb("dados_novos"),
  criadoEm: timestamp("criado_em", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
