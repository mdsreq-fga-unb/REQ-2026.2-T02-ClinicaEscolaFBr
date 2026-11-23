import { sql } from "drizzle-orm";
import {
  check,
  date,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { FORMAS_PAGAMENTO } from "@clinica/shared";
import { usuarios } from "./base";
import { casos, vinculosEstagiario } from "./casos";

export const formaPagamentoEnum = pgEnum("forma_pagamento", FORMAS_PAGAMENTO);

// Pagamento da contribuição social (RF41, RNF36), recebido pela secretaria por
// fora do sistema. Só inserção (gatilho impedir_alteracao_registro): a versão 1 é
// o registro, e cada correção é uma versão nova, com o motivo. Vale a versão de
// maior número do caso no ciclo. O valor é copiado do parâmetro no registro, para
// a mudança do parâmetro não alterar o que já foi pago.
export const pagamentosContribuicao = pgTable(
  "pagamentos_contribuicao",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    casoId: uuid("caso_id")
      .notNull()
      .references(() => casos.id),
    cicloAtendimento: integer("ciclo_atendimento").notNull(),
    versao: integer("versao").notNull(),
    valorCentavos: integer("valor_centavos").notNull(),
    pagoEm: date("pago_em").notNull(),
    forma: formaPagamentoEnum("forma").notNull(),
    motivoCorrecao: text("motivo_correcao"),
    registradoPor: uuid("registrado_por")
      .notNull()
      .references(() => usuarios.id),
    registradoEm: timestamp("registrado_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Dois registros ao mesmo tempo não geram duas versões iguais: um passa, e o
    // outro recebe o 409.
    unique("pagamentos_contribuicao_versao_unica").on(
      t.casoId,
      t.cicloAtendimento,
      t.versao,
    ),
    check("pagamentos_contribuicao_versao_positiva", sql`${t.versao} >= 1`),
    check(
      "pagamentos_contribuicao_valor_positivo",
      sql`${t.valorCentavos} > 0`,
    ),
    // O motivo fica vazio só no registro (versão 1); toda correção tem motivo.
    check(
      "pagamentos_contribuicao_motivo_da_correcao",
      sql`(${t.versao} = 1) = (${t.motivoCorrecao} is null)`,
    ),
  ],
);

// Perda da vaga pela contribuição pendente (RF43, DF33), confirmada pela
// secretaria ou pela coordenação depois do prazo de 10 dias corridos. Encerra o
// vínculo e a atribuição do supervisor, libera a vaga do estagiário, cancela as
// sessões futuras e devolve o caso à fila. Só inserção. Uma por vínculo: duas
// confirmações ao mesmo tempo não geram duas perdas nem duas vagas.
export const perdasVaga = pgTable(
  "perdas_vaga",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    casoId: uuid("caso_id")
      .notNull()
      .references(() => casos.id),
    cicloAtendimento: integer("ciclo_atendimento").notNull(),
    vinculoId: uuid("vinculo_id")
      .notNull()
      .unique()
      .references(() => vinculosEstagiario.id),
    estagiarioId: uuid("estagiario_id")
      .notNull()
      .references(() => usuarios.id),
    supervisorId: uuid("supervisor_id")
      .notNull()
      .references(() => usuarios.id),
    // Início e fim do prazo vencido, como estavam na confirmação.
    vinculadoEm: timestamp("vinculado_em", { withTimezone: true }).notNull(),
    prazoAte: date("prazo_ate").notNull(),
    sessoesCanceladas: integer("sessoes_canceladas").notNull(),
    confirmadaPor: uuid("confirmada_por")
      .notNull()
      .references(() => usuarios.id),
    confirmadaEm: timestamp("confirmada_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check("perdas_vaga_sessoes_canceladas", sql`${t.sessoesCanceladas} >= 0`),
  ],
);
