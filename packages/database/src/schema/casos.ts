import { sql } from "drizzle-orm";
import {
  boolean,
  type AnyPgColumn,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  index,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { SITUACOES_CASO } from "@clinica/shared";
import { usuarios } from "./base";
import { inscricoes } from "./inscricao";

export const situacaoCasoEnum = pgEnum("situacao_caso", SITUACOES_CASO);

// Decisão de prioridade clínica (RF6). O histórico é somente inserção (RNF5): a decisão
// vigente é a mais recente da inscrição, e nenhuma decisão anterior é alterada.
// Não há área de especialidade (DF26). A cor é dado de saúde e fica cifrada (RNF51),
// com o valor de CORES (@clinica/shared) validado pela aplicação antes de cifrar.
export const decisoesPrioridade = pgTable(
  "decisoes_prioridade",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    inscricaoId: uuid("inscricao_id")
      .notNull()
      .references(() => inscricoes.id),
    corCifrada: text("cor_cifrada").notNull(),
    decisaoAnteriorId: uuid("decisao_anterior_id").references(
      (): AnyPgColumn => decisoesPrioridade.id,
    ),
    decididaPor: uuid("decidida_por")
      .notNull()
      .references(() => usuarios.id),
    decididaEm: timestamp("decidida_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("decisoes_prioridade_inscricao").on(t.inscricaoId, t.decididaEm),
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
