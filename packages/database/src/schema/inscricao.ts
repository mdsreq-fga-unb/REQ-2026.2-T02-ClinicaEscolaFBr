import { sql } from "drizzle-orm";
import {
  check,
  date,
  pgEnum,
  pgSequence,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { CANAIS } from "@clinica/shared";

export const canalEnum = pgEnum("canal", CANAIS);

// Gera a parte sequencial do número único da inscrição (RF1, RF2).
export const inscricoesNumeroSeq = pgSequence("inscricoes_numero_seq");

// Inscrição on-line (RF1). Queixa, percepção de urgência e histórico são declarações
// do interessado (RF4). Pelo menos um contato é obrigatório, e WhatsApp ou ligação
// exigem o celular (DF24).
export const inscricoes = pgTable(
  "inscricoes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    numero: text("numero").notNull().unique(),
    nomeCompleto: text("nome_completo").notNull(),
    dataNascimento: date("data_nascimento").notNull(),
    cpf: text("cpf").notNull(),
    rg: text("rg").notNull(),
    endereco: text("endereco").notNull(),
    estadoCivil: text("estado_civil").notNull(),
    responsavelLegal: text("responsavel_legal"),
    celular: text("celular"),
    email: text("email"),
    canalPreferencial: canalEnum("canal_preferencial").notNull(),
    queixa: text("queixa").notNull(),
    percepcaoUrgencia: text("percepcao_urgencia").notNull(),
    historicoRelevante: text("historico_relevante").notNull(),
    criadaEm: timestamp("criada_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      "inscricoes_algum_contato",
      sql`${t.celular} is not null or ${t.email} is not null`,
    ),
    check(
      "inscricoes_canal_com_contato",
      sql`(${t.canalPreferencial} = 'email' and ${t.email} is not null) or (${t.canalPreferencial} in ('whatsapp', 'ligacao') and ${t.celular} is not null)`,
    ),
    check("inscricoes_cpf_11_digitos", sql`${t.cpf} ~ '^[0-9]{11}$'`),
  ],
);
