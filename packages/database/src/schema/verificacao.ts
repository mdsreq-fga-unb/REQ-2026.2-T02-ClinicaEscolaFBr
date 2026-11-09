import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { inscricoes } from "./inscricao";

// Verificação de identidade do paciente ou do responsável (RF52, RNF6). O CPF e
// o número da inscrição não ficam gravados aqui: o identificador informado vira
// uma chave HMAC (identificador_chave), e o código e o token também ficam só
// como hash.

// Código de uso único enviado ao e-mail da inscrição: 10 minutos, 5 tentativas
// erradas. O código novo invalida o anterior do mesmo identificador.
export const codigosVerificacao = pgTable(
  "codigos_verificacao",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    inscricaoId: uuid("inscricao_id")
      .notNull()
      .references(() => inscricoes.id),
    identificadorChave: text("identificador_chave").notNull(),
    codigoHash: text("codigo_hash").notNull(),
    expiraEm: timestamp("expira_em", { withTimezone: true }).notNull(),
    tentativasFalhas: integer("tentativas_falhas").notNull().default(0),
    usadoEm: timestamp("usado_em", { withTimezone: true }),
    invalidadoEm: timestamp("invalidado_em", { withTimezone: true }),
    criadoEm: timestamp("criado_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("codigos_verificacao_identificador_idx").on(t.identificadorChave),
    check(
      "codigos_verificacao_tentativas",
      sql`${t.tentativasFalhas} between 0 and 5`,
    ),
  ],
);

// Limite de envios por identificador, exista ou não uma inscrição com ele: um
// envio a cada 60 segundos e 3 em 60 minutos, com bloqueio de 60 minutos.
export const limitesCodigoVerificacao = pgTable("limites_codigo_verificacao", {
  identificadorChave: text("identificador_chave").primaryKey(),
  ultimoEnvioEm: timestamp("ultimo_envio_em", {
    withTimezone: true,
  }).notNull(),
  janelaInicio: timestamp("janela_inicio", { withTimezone: true }).notNull(),
  enviosNaJanela: integer("envios_na_janela").notNull(),
  bloqueadoAte: timestamp("bloqueado_ate", { withTimezone: true }),
});

// Verificação concluída: libera por 15 minutos as rotas do paciente para uma
// única inscrição. O cookie leva o token, e o banco guarda só o hash.
export const verificacoesIdentidade = pgTable("verificacoes_identidade", {
  id: uuid("id").primaryKey().defaultRandom(),
  inscricaoId: uuid("inscricao_id")
    .notNull()
    .references(() => inscricoes.id),
  tokenHash: text("token_hash").notNull().unique(),
  criadaEm: timestamp("criada_em", { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiraEm: timestamp("expira_em", { withTimezone: true }).notNull(),
  encerradaEm: timestamp("encerrada_em", { withTimezone: true }),
});
