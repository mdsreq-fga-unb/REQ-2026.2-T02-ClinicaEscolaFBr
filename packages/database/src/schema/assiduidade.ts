import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { ORIGENS_FALTA } from "@clinica/shared";
import { usuarios } from "./base";
import { casos } from "./casos";
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
