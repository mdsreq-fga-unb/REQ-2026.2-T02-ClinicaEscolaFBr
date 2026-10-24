import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { CORES, SITUACOES_CASO } from "@clinica/shared";
import { usuarios } from "./base";
import { inscricoes } from "./inscricao";

export const corEnum = pgEnum("cor", CORES);
export const situacaoCasoEnum = pgEnum("situacao_caso", SITUACOES_CASO);

// Decisão de prioridade clínica (RF6), com histórico: só uma vigente por inscrição.
// Não há área de especialidade (DF26).
export const decisoesPrioridade = pgTable(
  "decisoes_prioridade",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    inscricaoId: uuid("inscricao_id")
      .notNull()
      .references(() => inscricoes.id),
    cor: corEnum("cor").notNull(),
    decididaPor: uuid("decidida_por")
      .notNull()
      .references(() => usuarios.id),
    decididaEm: timestamp("decidida_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
    vigente: boolean("vigente").notNull().default(true),
  },
  (t) => [
    uniqueIndex("decisoes_prioridade_vigente_unica")
      .on(t.inscricaoId)
      .where(sql`${t.vigente}`),
  ],
);

// Caso criado na primeira decisão de prioridade (RF6) e distribuído (RF18 a RF21).
export const casos = pgTable("casos", {
  id: uuid("id").primaryKey().defaultRandom(),
  inscricaoId: uuid("inscricao_id")
    .notNull()
    .unique()
    .references(() => inscricoes.id),
  situacao: situacaoCasoEnum("situacao")
    .notNull()
    .default("aguardando_distribuicao"),
  cicloAtendimento: integer("ciclo_atendimento").notNull().default(1),
  criadoEm: timestamp("criado_em", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Supervisor responsável (RF20): uma atribuição vigente por caso; a troca é pela transferência (RF25).
export const atribuicoesSupervisor = pgTable(
  "atribuicoes_supervisor",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    casoId: uuid("caso_id")
      .notNull()
      .references(() => casos.id),
    supervisorId: uuid("supervisor_id")
      .notNull()
      .references(() => usuarios.id),
    atribuidoPor: uuid("atribuido_por")
      .notNull()
      .references(() => usuarios.id),
    atribuidoEm: timestamp("atribuido_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
    vigente: boolean("vigente").notNull().default(true),
  },
  (t) => [
    uniqueIndex("atribuicoes_supervisor_vigente_unica")
      .on(t.casoId)
      .where(sql`${t.vigente}`),
  ],
);

// Estagiário responsável (RF21): um vínculo vigente por caso (DF27).
export const vinculosEstagiario = pgTable(
  "vinculos_estagiario",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    casoId: uuid("caso_id")
      .notNull()
      .references(() => casos.id),
    estagiarioId: uuid("estagiario_id")
      .notNull()
      .references(() => usuarios.id),
    vinculadoPor: uuid("vinculado_por")
      .notNull()
      .references(() => usuarios.id),
    vinculadoEm: timestamp("vinculado_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
    vigente: boolean("vigente").notNull().default(true),
  },
  (t) => [
    uniqueIndex("vinculos_estagiario_vigente_unico")
      .on(t.casoId)
      .where(sql`${t.vigente}`),
  ],
);
