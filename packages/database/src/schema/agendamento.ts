import { sql } from "drizzle-orm";
import {
  check,
  integer,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import {
  CLASSIFICACOES_CANCELAMENTO,
  MEIOS_CONFIRMACAO,
  ORIGENS_CANCELAMENTO,
  STATUS_SESSAO,
} from "@clinica/shared";
import { usuarios } from "./base";
import { casos } from "./casos";

export const statusSessaoEnum = pgEnum("status_sessao", STATUS_SESSAO);
export const meioConfirmacaoEnum = pgEnum(
  "meio_confirmacao",
  MEIOS_CONFIRMACAO,
);
export const origemCancelamentoEnum = pgEnum(
  "origem_cancelamento",
  ORIGENS_CANCELAMENTO,
);
export const classificacaoCancelamentoEnum = pgEnum(
  "classificacao_cancelamento",
  CLASSIFICACOES_CANCELAMENTO,
);

// Sessão de atendimento (RF10): 50 minutos mais o intervalo de 10 minutos para
// anotações, que fica reservado na agenda do estagiário (DF18).
export const sessoesAtendimento = pgTable(
  "sessoes_atendimento",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    casoId: uuid("caso_id")
      .notNull()
      .references(() => casos.id),
    cicloAtendimento: integer("ciclo_atendimento").notNull().default(1),
    estagiarioId: uuid("estagiario_id")
      .notNull()
      .references(() => usuarios.id),
    inicio: timestamp("inicio", { withTimezone: true }).notNull(),
    termino: timestamp("termino", { withTimezone: true }).notNull(),
    fimIntervaloAnotacoes: timestamp("fim_intervalo_anotacoes", {
      withTimezone: true,
    }).notNull(),
    status: statusSessaoEnum("status").notNull().default("agendada"),
    agendadaPor: uuid("agendada_por")
      .notNull()
      .references(() => usuarios.id),
    agendadaEm: timestamp("agendada_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Quando quem agendou abriu a mensagem pronta no WhatsApp (DF24).
    mensagemWhatsappEm: timestamp("mensagem_whatsapp_em", {
      withTimezone: true,
    }),
    // Quando e por onde a presença foi confirmada (RF14). Quem da secretaria
    // registrou fica na auditoria (RNF10).
    confirmadaEm: timestamp("confirmada_em", { withTimezone: true }),
    confirmadaPor: meioConfirmacaoEnum("confirmada_por"),
  },
  (t) => [
    check(
      "sessoes_confirmacao_completa",
      sql`(${t.confirmadaEm} is null) = (${t.confirmadaPor} is null)`,
    ),
    check("sessoes_termino_apos_inicio", sql`${t.termino} > ${t.inicio}`),
    check(
      "sessoes_intervalo_apos_termino",
      sql`${t.fimIntervaloAnotacoes} >= ${t.termino}`,
    ),
    index("sessoes_estagiario_inicio").on(t.estagiarioId, t.inicio),
    index("sessoes_caso_inicio").on(t.casoId, t.inicio),
    index("sessoes_caso_ciclo_inicio").on(
      t.casoId,
      t.cicloAtendimento,
      t.inicio,
    ),
  ],
);

// Link de confirmação de presença (RF14, RNF59): token só como hash.
export const linksConfirmacao = pgTable("links_confirmacao", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessaoId: uuid("sessao_id")
    .notNull()
    .unique()
    .references(() => sessoesAtendimento.id),
  tokenHash: text("token_hash").notNull().unique(),
  expiraEm: timestamp("expira_em", { withTimezone: true }).notNull(),
  usadoEm: timestamp("usado_em", { withTimezone: true }),
  criadoEm: timestamp("criado_em", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Cancelamento da sessão (RF15, RF16): no máximo um por sessão. A antecedência fica
// guardada com a classificação, para ela poder ser conferida mesmo que o parâmetro
// mude. A justificativa é cifrada (RNF51) e só pode faltar no desligamento (RF37) e
// no administrativo da transferência (RF25). Sem quem registrou, foi o paciente,
// pelo link (RNF10).
export const cancelamentosSessao = pgTable(
  "cancelamentos_sessao",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessaoId: uuid("sessao_id")
      .notNull()
      .unique()
      .references(() => sessoesAtendimento.id),
    origem: origemCancelamentoEnum("origem").notNull(),
    classificacao: classificacaoCancelamentoEnum("classificacao").notNull(),
    justificativaCifrada: text("justificativa_cifrada"),
    registradoPor: uuid("registrado_por").references(() => usuarios.id),
    registradoEm: timestamp("registrado_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
    antecedenciaMinutos: integer("antecedencia_minutos").notNull(),
  },
  (t) => [
    check(
      "cancelamentos_justificativa",
      sql`${t.justificativaCifrada} is not null or ${t.classificacao} in ('desligamento', 'administrativo')`,
    ),
    check(
      "cancelamentos_autor",
      sql`(${t.origem} = 'link') = (${t.registradoPor} is null)`,
    ),
  ],
);
