import { sql } from "drizzle-orm";
import { check, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { usuarios } from "./base";
import { inscricoes, versoesTermo } from "./inscricao";
import { verificacoesIdentidade } from "./verificacao";

// RF65: linha nova e imutável; nunca substitui o aceite na inscrição.
export const revogacoesConsentimento = pgTable(
  "revogacoes_consentimento",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    inscricaoId: uuid("inscricao_id")
      .notNull()
      .unique()
      .references(() => inscricoes.id),
    versaoTermo: text("versao_termo")
      .notNull()
      .references(() => versoesTermo.versao),
    solicitante: text("solicitante")
      .$type<"titular" | "responsavel">()
      .notNull(),
    formaVerificacao: text("forma_verificacao")
      .$type<"documento" | "verificacao_rf52">()
      .notNull(),
    documentoCifrado: text("documento_cifrado"),
    verificacaoId: uuid("verificacao_id").references(
      () => verificacoesIdentidade.id,
    ),
    registradaPor: uuid("registrada_por")
      .notNull()
      .references(() => usuarios.id),
    registradaEm: timestamp("registrada_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      "revogacoes_solicitante",
      sql`${t.solicitante} in ('titular', 'responsavel')`,
    ),
    check(
      "revogacoes_identidade",
      sql`(${t.formaVerificacao} = 'documento' and ${t.documentoCifrado} is not null and ${t.verificacaoId} is null) or (${t.formaVerificacao} = 'verificacao_rf52' and ${t.verificacaoId} is not null and ${t.documentoCifrado} is null)`,
    ),
  ],
);
