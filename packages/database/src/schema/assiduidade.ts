import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  CLASSIFICACOES_CANCELAMENTO,
  ORIGENS_CANCELAMENTO,
  ORIGENS_FALTA,
} from "@clinica/shared";
import { usuarios } from "./base";
import { casos, vinculosEstagiario } from "./casos";
import { sessoesAtendimento } from "./agendamento";

export const origemFaltaEnum = pgEnum("origem_falta", ORIGENS_FALTA);

// Falta do paciente (RF34) ou cancelamento fora do prazo (RF15), consumidos pela
// contagem do ciclo (RF35). Não há tabela de contagem: ela é calculada a partir
// destas linhas, para nunca divergir delas (RNF32). Nada é apagado e a origem não
// muda; a justificativa e a retirada da contagem (RF38) só preenchem campos vazios,
// e o gatilho proteger_campos_preenchidos recusa qualquer outra alteração.
export const faltasPaciente = pgTable(
  "faltas_paciente",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessaoId: uuid("sessao_id")
      .notNull()
      .unique()
      .references(() => sessoesAtendimento.id),
    casoId: uuid("caso_id")
      .notNull()
      .references(() => casos.id),
    cicloAtendimento: integer("ciclo_atendimento").notNull(),
    origem: origemFaltaEnum("origem").notNull(),
    // Vazio quando a falta vem do cancelamento pelo link, sem usuário logado (RNF10).
    registradaPor: uuid("registrada_por").references(() => usuarios.id),
    registradaPeloPaciente: boolean("registrada_pelo_paciente")
      .notNull()
      .default(false),
    registradaEm: timestamp("registrada_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
    justificada: boolean("justificada").notNull().default(false),
    // Pode trazer informação de saúde, como um atestado (RNF51).
    motivoJustificativaCifrado: text("motivo_justificativa_cifrado"),
    justificadaPor: uuid("justificada_por").references(() => usuarios.id),
    justificadaEm: timestamp("justificada_em", { withTimezone: true }),
    retiradaPor: uuid("retirada_por").references(() => usuarios.id),
    retiradaEm: timestamp("retirada_em", { withTimezone: true }),
  },
  (t) => [
    check(
      "faltas_autor",
      sql`(${t.registradaPor} is not null) <> ${t.registradaPeloPaciente}`,
    ),
    check(
      "faltas_justificativa_completa",
      sql`${t.justificada} = (${t.motivoJustificativaCifrado} is not null and ${t.justificadaEm} is not null)`,
    ),
    check(
      "faltas_retirada_completa",
      sql`(${t.retiradaEm} is null) = (${t.retiradaPor} is null)`,
    ),
    index("faltas_caso_ciclo").on(t.casoId, t.cicloAtendimento),
  ],
);

// Desligamento do paciente por faltas (RF37), com a reversão pela coordenação
// (RF38). Não há motivo digitado na decisão: o motivo é o limite atingido, com as
// faltas gravadas em desligamento_faltas. A reversão só preenche os campos dela.
export const desligamentosPorFaltas = pgTable(
  "desligamentos_por_faltas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    casoId: uuid("caso_id")
      .notNull()
      .references(() => casos.id),
    cicloAtendimento: integer("ciclo_atendimento").notNull(),
    dataDecisao: date("data_decisao").notNull(),
    decididoPor: uuid("decidido_por")
      .notNull()
      .references(() => usuarios.id),
    decididoEm: timestamp("decidido_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
    revertidoPor: uuid("revertido_por").references(() => usuarios.id),
    revertidoEm: timestamp("revertido_em", { withTimezone: true }),
    // Pode trazer informação de saúde (RNF51); só a coordenação lê.
    motivoReversaoCifrado: text("motivo_reversao_cifrado"),
  },
  (t) => [
    check(
      "desligamentos_reversao_completa",
      sql`(${t.revertidoEm} is null) = (${t.revertidoPor} is null) and (${t.revertidoEm} is null) = (${t.motivoReversaoCifrado} is null)`,
    ),
    // Um desligamento vigente por caso e ciclo: dois pedidos simultâneos não geram
    // dois desligamentos nem duas vagas.
    uniqueIndex("desligamentos_vigente_unico")
      .on(t.casoId, t.cicloAtendimento)
      .where(sql`${t.revertidoEm} is null`),
  ],
);

// Faltas que contavam no momento da decisão: o fundamento do desligamento (RF38).
// Só inserção.
export const desligamentoFaltas = pgTable(
  "desligamento_faltas",
  {
    desligamentoId: uuid("desligamento_id")
      .notNull()
      .references(() => desligamentosPorFaltas.id),
    faltaId: uuid("falta_id")
      .notNull()
      .references(() => faltasPaciente.id),
  },
  (t) => [primaryKey({ columns: [t.desligamentoId, t.faltaId] })],
);

// Vaga do estagiário liberada pelo desligamento, aguardando realocação (RF37). Só
// o vínculo de um paciente novo pelo RF21 a ocupa; a reversão (RF38) a encerra.
export const vagasLiberadas = pgTable(
  "vagas_liberadas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    desligamentoId: uuid("desligamento_id")
      .notNull()
      .unique()
      .references(() => desligamentosPorFaltas.id),
    estagiarioId: uuid("estagiario_id")
      .notNull()
      .references(() => usuarios.id),
    supervisorId: uuid("supervisor_id")
      .notNull()
      .references(() => usuarios.id),
    liberadaEm: timestamp("liberada_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ocupadaEm: timestamp("ocupada_em", { withTimezone: true }),
    ocupadaPorVinculoId: uuid("ocupada_por_vinculo_id").references(
      () => vinculosEstagiario.id,
    ),
    encerradaEm: timestamp("encerrada_em", { withTimezone: true }),
  },
  (t) => [
    check(
      "vagas_ocupacao_completa",
      sql`(${t.ocupadaEm} is null) = (${t.ocupadaPorVinculoId} is null)`,
    ),
    index("vagas_estagiario").on(t.estagiarioId),
  ],
);

export const origemCancelamentoEnum = pgEnum(
  "origem_cancelamento",
  ORIGENS_CANCELAMENTO,
);
export const classificacaoCancelamentoEnum = pgEnum(
  "classificacao_cancelamento",
  CLASSIFICACOES_CANCELAMENTO,
);

// Cancelamento da sessão (RF15, RF16, RF25 e RF37), com quem registrou e por quê.
// Entra com o desligamento (RF37), o primeiro a cancelar sessões, e é reaproveitado
// pelo RF15. O cancelamento pelo desligamento guarda o desligamento, para o RF38
// listar as sessões a reagendar. Só inserção.
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
    // Vazia só no desligamento e no cancelamento administrativo da transferência,
    // em que o motivo fica no próprio desligamento ou na transferência.
    justificativaCifrada: text("justificativa_cifrada"),
    // Vazio no cancelamento pelo link, feito pelo paciente sem login (RNF10).
    registradoPor: uuid("registrado_por").references(() => usuarios.id),
    registradoEm: timestamp("registrado_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
    antecedenciaMinutos: integer("antecedencia_minutos"),
    desligamentoId: uuid("desligamento_id").references(
      () => desligamentosPorFaltas.id,
    ),
  },
  (t) => [
    check(
      "cancelamentos_autor",
      sql`(${t.registradoPor} is null) = (${t.origem} = 'link')`,
    ),
    check(
      "cancelamentos_desligamento",
      sql`(${t.desligamentoId} is not null) = (${t.classificacao} = 'desligamento')`,
    ),
    check(
      "cancelamentos_justificativa",
      sql`${t.justificativaCifrada} is not null or ${t.classificacao} in ('desligamento', 'administrativo')`,
    ),
    index("cancelamentos_desligamento").on(t.desligamentoId),
  ],
);
