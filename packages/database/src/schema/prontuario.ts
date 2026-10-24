import {
  boolean,
  date,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { perfilEnum, usuarios } from "./base";
import { casos, vinculosEstagiario } from "./casos";

// Prontuário (RF66): criado na mesma transação do vínculo (RF21), um por caso e ciclo.
// Os dados iniciais (anamnese e contrato) são do RF69, no Ciclo 4.
export const prontuarios = pgTable(
  "prontuarios",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    casoId: uuid("caso_id")
      .notNull()
      .references(() => casos.id),
    cicloAtendimento: integer("ciclo_atendimento").notNull(),
    vinculoOrigemId: uuid("vinculo_origem_id")
      .notNull()
      .references(() => vinculosEstagiario.id),
    criadoEm: timestamp("criado_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
    anamnese: text("anamnese"),
    contrato: text("contrato"),
    dataAssinaturaContrato: date("data_assinatura_contrato"),
    dadosIniciaisPor: uuid("dados_iniciais_por").references(() => usuarios.id),
    dadosIniciaisEm: timestamp("dados_iniciais_em", { withTimezone: true }),
  },
  (t) => [unique("prontuarios_caso_ciclo").on(t.casoId, t.cicloAtendimento)],
);

// Registro de acessos ao prontuário, permitidos e negados (RF55, RNF52), consultado
// pela coordenação no RF56. Somente inserção.
export const acessosProntuario = pgTable("acessos_prontuario", {
  id: uuid("id").primaryKey().defaultRandom(),
  prontuarioId: uuid("prontuario_id").references(() => prontuarios.id),
  usuarioId: uuid("usuario_id")
    .notNull()
    .references(() => usuarios.id),
  perfil: perfilEnum("perfil").notNull(),
  operacao: text("operacao").notNull(),
  permitido: boolean("permitido").notNull(),
  criadoEm: timestamp("criado_em", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
