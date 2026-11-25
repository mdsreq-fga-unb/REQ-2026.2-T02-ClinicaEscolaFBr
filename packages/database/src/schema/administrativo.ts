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
import { CANAIS_DECLARACAO, FORMAS_PAGAMENTO } from "@clinica/shared";
import { usuarios } from "./base";
import { sessoesAtendimento } from "./agendamento";
import { casos } from "./casos";
import { inscricoes } from "./inscricao";

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

// Emissão da declaração de comparecimento (RF45, RNF39): só inserção (gatilho
// impedir_alteracao_registro). Guarda a sessão de origem, o paciente
// (inscrição), o canal, quem emitiu e o tipo de operação; a reemissão (RF46)
// entra como "reemissao" quando for construída. Pelo canal "verificacao", o
// paciente ou o responsável não tem conta, e emitida_por fica nulo.
export const canalDeclaracaoEnum = pgEnum(
  "canal_declaracao",
  CANAIS_DECLARACAO,
);

export const emissoesDeclaracao = pgTable(
  "emissoes_declaracao",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessaoId: uuid("sessao_id")
      .notNull()
      .references(() => sessoesAtendimento.id),
    inscricaoId: uuid("inscricao_id")
      .notNull()
      .references(() => inscricoes.id),
    canal: canalDeclaracaoEnum("canal").notNull(),
    emitidaPor: uuid("emitida_por").references(() => usuarios.id),
    tipo: text("tipo").notNull().default("emissao"),
    emitidaEm: timestamp("emitida_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      "emissoes_declaracao_autor_do_canal",
      sql`(${t.canal} = 'secretaria') = (${t.emitidaPor} is not null)`,
    ),
    check(
      "emissoes_declaracao_tipo",
      sql`${t.tipo} in ('emissao', 'reemissao')`,
    ),
  ],
);

// Entrega da Autorização para Acompanhamento Psicoterapêutico de Crianças e
// Adolescentes, assinada presencialmente (RF45, proposta da equipe a validar com
// a FBr). Uma por inscrição; a secretaria pode corrigir a data, e a auditoria
// guarda a anterior. É o registro que libera a declaração de um menor.
export const autorizacoesMenor = pgTable("autorizacoes_menor", {
  id: uuid("id").primaryKey().defaultRandom(),
  inscricaoId: uuid("inscricao_id")
    .notNull()
    .unique()
    .references(() => inscricoes.id),
  entregueEm: date("entregue_em").notNull(),
  registradoPor: uuid("registrado_por")
    .notNull()
    .references(() => usuarios.id),
  registradoEm: timestamp("registrado_em", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
