import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { DESTINATARIOS_RELATORIO, ESTADOS_RELATORIO } from "@clinica/shared";
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
export const acessosProntuario = pgTable(
  "acessos_prontuario",
  {
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
  },
  (t) => [
    index("acessos_prontuario_criado_em_idx").on(t.criadoEm),
    index("acessos_prontuario_prontuario_criado_em_idx").on(
      t.prontuarioId,
      t.criadoEm,
    ),
    index("acessos_prontuario_usuario_criado_em_idx").on(
      t.usuarioId,
      t.criadoEm,
    ),
  ],
);

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

// RF29: a correção não altera a evolução original (versão 1). Cada correção é uma
// linha nova, a versão seguinte, com a ficha inteira, cifrada (RNF51), o motivo, o
// autor e a data/hora. Somente inserção (gatilho impedir_alteracao_registro), e a
// restrição única impede duas correções simultâneas com a mesma versão.
export const correcoesEvolucao = pgTable(
  "correcoes_evolucao",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    evolucaoId: uuid("evolucao_id")
      .notNull()
      .references(() => evolucoes.id),
    versao: integer("versao").notNull(),
    queixaCifrada: text("queixa_cifrada"),
    planejamentoCifrado: text("planejamento_cifrado"),
    humorAparenciaCifrado: text("humor_aparencia_cifrado"),
    conteudoTrabalhadoCifrado: text("conteudo_trabalhado_cifrado"),
    tecnicasUtilizadasCifrado: text("tecnicas_utilizadas_cifrado"),
    intervencoesEncaminhamentosCifrado: text(
      "intervencoes_encaminhamentos_cifrado",
    ),
    planoProximaSessaoCifrado: text("plano_proxima_sessao_cifrado"),
    motivoCifrado: text("motivo_cifrado").notNull(),
    corrigidaPor: uuid("corrigida_por")
      .notNull()
      .references(() => usuarios.id),
    corrigidaEm: timestamp("corrigida_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("correcoes_evolucao_versao").on(t.evolucaoId, t.versao),
    check("correcoes_evolucao_versao_seguinte", sql`${t.versao} >= 2`),
    check(
      "correcoes_evolucao_ficha_completa",
      sql`(${t.queixaCifrada} IS NOT NULL AND ${t.planejamentoCifrado} IS NOT NULL) OR (${t.humorAparenciaCifrado} IS NOT NULL AND ${t.conteudoTrabalhadoCifrado} IS NOT NULL AND ${t.tecnicasUtilizadasCifrado} IS NOT NULL AND ${t.planoProximaSessaoCifrado} IS NOT NULL)`,
    ),
  ],
);

// RF30: o complemento é informação adicional e não altera a evolução nem as correções.
// O texto fica cifrado (RNF51), e a ordem é a de registrado_em. Somente inserção
// (gatilho impedir_alteracao_registro).
export const complementosEvolucao = pgTable(
  "complementos_evolucao",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    evolucaoId: uuid("evolucao_id")
      .notNull()
      .references(() => evolucoes.id),
    textoCifrado: text("texto_cifrado").notNull(),
    registradoPor: uuid("registrado_por")
      .notNull()
      .references(() => usuarios.id),
    registradoEm: timestamp("registrado_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("complementos_evolucao_evolucao_idx").on(
      t.evolucaoId,
      t.registradoEm,
    ),
  ],
);

// Relatório final do ciclo (RF33): um por prontuário, isto é, por caso e ciclo.
export const relatoriosFinais = pgTable("relatorios_finais", {
  id: uuid("id").primaryKey().defaultRandom(),
  prontuarioId: uuid("prontuario_id")
    .notNull()
    .unique()
    .references(() => prontuarios.id),
  criadoEm: timestamp("criado_em", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const estadoRelatorioEnum = pgEnum(
  "estado_relatorio",
  ESTADOS_RELATORIO,
);

// Versões do relatório (RF33). Só o rascunho muda; o envio fixa o texto e as
// sessões e evoluções de origem, e a decisão do supervisor (aprovar ou devolver,
// com as observações) é a última alteração permitida (gatilho
// proteger_versao_relatorio). As seções e as observações ficam cifradas (RNF51).
// Há no máximo uma versão aberta (rascunho ou em revisão) e uma aprovada.
export const versoesRelatorio = pgTable(
  "versoes_relatorio",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    relatorioId: uuid("relatorio_id")
      .notNull()
      .references(() => relatoriosFinais.id),
    versao: integer("versao").notNull(),
    estado: estadoRelatorioEnum("estado").notNull().default("rascunho"),
    // JSON com as seções de SECOES_RELATORIO.
    secoesCifradas: text("secoes_cifradas").notNull(),
    // Obrigatória no envio quando o ciclo teve menos de 8 ou mais de 10 sessões.
    justificativaExcecaoCifrada: text("justificativa_excecao_cifrada"),
    // Sessões e evoluções consideradas, fixadas no envio, para a conferência com
    // o prontuário.
    origem: jsonb("origem").$type<{ sessoes: string[]; evolucoes: string[] }>(),
    autorId: uuid("autor_id")
      .notNull()
      .references(() => usuarios.id),
    criadaEm: timestamp("criada_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
    atualizadaEm: timestamp("atualizada_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
    enviadaEm: timestamp("enviada_em", { withTimezone: true }),
    decididaPor: uuid("decidida_por").references(() => usuarios.id),
    decididaEm: timestamp("decidida_em", { withTimezone: true }),
    observacoesCifradas: text("observacoes_cifradas"),
  },
  (t) => [
    unique("versoes_relatorio_versao").on(t.relatorioId, t.versao),
    check("versoes_relatorio_versao_positiva", sql`${t.versao} >= 1`),
    uniqueIndex("versoes_relatorio_uma_aberta")
      .on(t.relatorioId)
      .where(sql`${t.estado} in ('rascunho', 'em_revisao')`),
    uniqueIndex("versoes_relatorio_uma_aprovada")
      .on(t.relatorioId)
      .where(sql`${t.estado} = 'aprovado'`),
    // Enviada: com a data do envio e a origem. Decidida: com o supervisor e a
    // data/hora. Devolvida: com as observações.
    check(
      "versoes_relatorio_envio",
      sql`${t.estado} = 'rascunho' OR (${t.enviadaEm} IS NOT NULL AND ${t.origem} IS NOT NULL)`,
    ),
    check(
      "versoes_relatorio_decisao",
      sql`(${t.estado} in ('aprovado', 'devolvido')) = (${t.decididaPor} IS NOT NULL AND ${t.decididaEm} IS NOT NULL)`,
    ),
    check(
      "versoes_relatorio_observacoes",
      sql`(${t.estado} = 'devolvido') = (${t.observacoesCifradas} IS NOT NULL)`,
    ),
  ],
);

// Cada impressão da versão aprovada (RF33): quem imprimiu e quando. Só inserção.
export const impressoesRelatorio = pgTable(
  "impressoes_relatorio",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    versaoId: uuid("versao_id")
      .notNull()
      .references(() => versoesRelatorio.id),
    impressaPor: uuid("impressa_por")
      .notNull()
      .references(() => usuarios.id),
    impressaEm: timestamp("impressa_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("impressoes_relatorio_versao").on(t.versaoId, t.impressaEm)],
);

export const destinatarioRelatorioEnum = pgEnum(
  "destinatario_relatorio",
  DESTINATARIOS_RELATORIO,
);

// Entrega presencial da via assinada (RF33), registrada pela secretaria. Uma por
// versão aprovada, depois da confirmação da via assinada. Só inserção.
export const entregasRelatorio = pgTable(
  "entregas_relatorio",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    versaoId: uuid("versao_id")
      .notNull()
      .unique()
      .references(() => versoesRelatorio.id),
    viaAssinada: boolean("via_assinada").notNull(),
    entregueA: destinatarioRelatorioEnum("entregue_a").notNull(),
    entregueEm: date("entregue_em").notNull(),
    registradaPor: uuid("registrada_por")
      .notNull()
      .references(() => usuarios.id),
    registradaEm: timestamp("registrada_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [check("entregas_relatorio_via_assinada", sql`${t.viaAssinada}`)],
);
