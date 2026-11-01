import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { PERFIS, SITUACOES_USUARIO } from "@clinica/shared";

export const perfilEnum = pgEnum("perfil", PERFIS);
export const situacaoUsuarioEnum = pgEnum(
  "situacao_usuario",
  SITUACOES_USUARIO,
);

export const usuarios = pgTable("usuarios", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: text("nome").notNull(),
  email: text("email").notNull().unique(),
  perfil: perfilEnum("perfil").notNull(),
  situacao: situacaoUsuarioEnum("situacao")
    .notNull()
    .default("pendente_ativacao"),
  // Preenchido na ativação da conta (RF53); só o hash é guardado (RNF49).
  senhaHash: text("senha_hash"),
  // Bloqueio de 15 minutos na 3ª tentativa seguida com erro (RF50, DF25).
  tentativasFalhas: integer("tentativas_falhas").notNull().default(0),
  bloqueadoAte: timestamp("bloqueado_ate", { withTimezone: true }),
  // Entradas sendo conferidas agora: somadas aos erros, não passam de 3, para
  // tentativas simultâneas não driblarem o bloqueio (RNF49). Uma reserva com
  // mais de 30 segundos é descartada, caso a conferência tenha sido interrompida.
  entradasEmCurso: integer("entradas_em_curso").notNull().default(0),
  emCursoDesde: timestamp("em_curso_desde", { withTimezone: true }),
  criadoEm: timestamp("criado_em", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Trilha de auditoria (RNF10, RNF52): somente inserção.
export const auditoria = pgTable("auditoria", {
  id: uuid("id").primaryKey().defaultRandom(),
  usuarioId: uuid("usuario_id").references(() => usuarios.id),
  operacao: text("operacao").notNull(),
  entidade: text("entidade").notNull(),
  entidadeId: text("entidade_id"),
  dadosAnteriores: jsonb("dados_anteriores"),
  dadosNovos: jsonb("dados_novos"),
  criadoEm: timestamp("criado_em", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
