import { sql } from "drizzle-orm";
import {
  boolean,
  check,
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
import { sessoesAtendimento } from "./agendamento";

// Prontuário (RF66): criado na mesma transação do vínculo (RF21), um por caso e ciclo.
// Os dados iniciais (anamnese e contrato) são do RF69, no Ciclo 4, e a anamnese fica
// cifrada (RNF51), com as seis seções da ficha da clínica num JSON (DF37); os registros
// antigos, de texto único, aparecem como a queixa principal. O contrato é o da Clínica
// Escola, assinado em papel (DF41): o prontuário guarda a data, o aceite do termo para
// pesquisa e a guarda da via. O texto livre do contrato fica só nos registros feitos
// antes da DF41. A anamnese e o contrato são registrados separados, cada um com autor e
// data/hora; dados_iniciais_por e dados_iniciais_em ficam só nos registros antigos.
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
    anamneseCifrada: text("anamnese_cifrada"),
    contratoCifrado: text("contrato_cifrado"),
    dataAssinaturaContrato: date("data_assinatura_contrato"),
    aceiteTclePesquisa: boolean("aceite_tcle_pesquisa"),
    viaContratoGuardada: boolean("via_contrato_guardada"),
    dadosIniciaisPor: uuid("dados_iniciais_por").references(() => usuarios.id),
    dadosIniciaisEm: timestamp("dados_iniciais_em", { withTimezone: true }),
    anamnesePor: uuid("anamnese_por").references(() => usuarios.id),
    anamneseEm: timestamp("anamnese_em", { withTimezone: true }),
    contratoPor: uuid("contrato_por").references(() => usuarios.id),
    contratoEm: timestamp("contrato_em", { withTimezone: true }),
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

// RF28: o original é imutável e cada sessão possui no máximo uma evolução inicial.
// Os campos seguem a ficha "Registro de evolução" da clínica (DF38); a queixa e o
// planejamento ficam só nas evoluções registradas antes dela (DF23).
export const evolucoes = pgTable(
  "evolucoes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    prontuarioId: uuid("prontuario_id")
      .notNull()
      .references(() => prontuarios.id),
    sessaoId: uuid("sessao_id")
      .notNull()
      .unique()
      .references(() => sessoesAtendimento.id),
    queixaCifrada: text("queixa_cifrada"),
    planejamentoCifrado: text("planejamento_cifrado"),
    humorAparenciaCifrado: text("humor_aparencia_cifrado"),
    conteudoTrabalhadoCifrado: text("conteudo_trabalhado_cifrado"),
    tecnicasUtilizadasCifrado: text("tecnicas_utilizadas_cifrado"),
    intervencoesEncaminhamentosCifrado: text(
      "intervencoes_encaminhamentos_cifrado",
    ),
    planoProximaSessaoCifrado: text("plano_proxima_sessao_cifrado"),
    registradaPor: uuid("registrada_por")
      .notNull()
      .references(() => usuarios.id),
    registradaEm: timestamp("registrada_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Cada evolução tem a ficha antiga (DF23) ou a da DF38 completa.
    check(
      "evolucoes_ficha_completa",
      sql`(${t.queixaCifrada} IS NOT NULL AND ${t.planejamentoCifrado} IS NOT NULL) OR (${t.humorAparenciaCifrado} IS NOT NULL AND ${t.conteudoTrabalhadoCifrado} IS NOT NULL AND ${t.tecnicasUtilizadasCifrado} IS NOT NULL AND ${t.planoProximaSessaoCifrado} IS NOT NULL)`,
    ),
  ],
);
