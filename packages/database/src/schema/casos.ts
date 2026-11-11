import { sql } from "drizzle-orm";
import {
  boolean,
  check,
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
import { SITUACOES_CASO, TIPOS_TRANSFERENCIA } from "@clinica/shared";
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
  entradaNaFilaEm: timestamp("entrada_na_fila_em", {
    withTimezone: true,
  }).notNull(),
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

export const tipoTransferenciaEnum = pgEnum(
  "tipo_transferencia_caso",
  TIPOS_TRANSFERENCIA,
);

// Transferência de caso (RF25): troca do estagiário pelo supervisor responsável, ou
// do supervisor e, se indicado, do estagiário pela coordenação. Guarda os
// responsáveis anteriores e os novos, ligada ao vínculo e à atribuição que ela
// encerrou. O motivo pode trazer informação de saúde e fica cifrado (RNF51). Só
// inserção, para o histórico existir inteiro mesmo sem a tela do RF26.
export const transferenciasCaso = pgTable(
  "transferencias_caso",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    casoId: uuid("caso_id")
      .notNull()
      .references(() => casos.id),
    tipo: tipoTransferenciaEnum("tipo").notNull(),
    supervisorAnteriorId: uuid("supervisor_anterior_id").references(
      () => usuarios.id,
    ),
    supervisorNovoId: uuid("supervisor_novo_id").references(() => usuarios.id),
    estagiarioAnteriorId: uuid("estagiario_anterior_id").references(
      () => usuarios.id,
    ),
    estagiarioNovoId: uuid("estagiario_novo_id").references(() => usuarios.id),
    atribuicaoAnteriorId: uuid("atribuicao_anterior_id").references(
      () => atribuicoesSupervisor.id,
    ),
    vinculoAnteriorId: uuid("vinculo_anterior_id").references(
      () => vinculosEstagiario.id,
    ),
    motivoCifrado: text("motivo_cifrado").notNull(),
    transferidoPor: uuid("transferido_por")
      .notNull()
      .references(() => usuarios.id),
    transferidoEm: timestamp("transferido_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("transferencias_caso_caso").on(t.casoId, t.transferidoEm),
    check(
      "transferencias_caso_novo_responsavel",
      sql`${t.supervisorNovoId} is not null or ${t.estagiarioNovoId} is not null`,
    ),
  ],
);
