import { sql } from "drizzle-orm";
import {
  check,
  boolean,
  jsonb,
  date,
  pgEnum,
  pgSequence,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { CANAIS } from "@clinica/shared";

export const canalEnum = pgEnum("canal", CANAIS);

// Gera a parte sequencial do número único da inscrição (RF1, RF2).
export const inscricoesNumeroSeq = pgSequence("inscricoes_numero_seq");

// Versões são acrescentadas por migration; nunca sobrescreva uma versão aceita.
export const versoesTermo = pgTable("versoes_termo", {
  versao: text("versao").primaryKey(),
  titulo: text("titulo").notNull(),
  introducao: text("introducao").notNull(),
  topicos: jsonb("topicos")
    .$type<{ titulo: string; corpo: string }[]>()
    .notNull(),
  vigenteDesde: timestamp("vigente_desde", { withTimezone: true }).notNull(),
  provisoria: boolean("provisoria").notNull(),
});

// Inscrição on-line (RF1). Queixa, percepção de urgência e histórico são declarações
// do interessado (RF4) e dados de saúde: ficam cifrados no banco (RNF51). Pelo menos um contato é obrigatório, e WhatsApp ou ligação
// exigem o celular (DF24). Os dados da ficha de identificação da Clínica Escola são
// opcionais (DF43).
export const inscricoes = pgTable(
  "inscricoes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    numero: text("numero").notNull().unique(),
    nomeCompleto: text("nome_completo").notNull(),
    dataNascimento: date("data_nascimento").notNull(),
    cpf: text("cpf").notNull(),
    rg: text("rg").notNull(),
    endereco: text("endereco").notNull(),
    bairro: text("bairro"),
    cidadeUf: text("cidade_uf"),
    cep: text("cep"),
    estadoCivil: text("estado_civil").notNull(),
    sexo: text("sexo"),
    profissao: text("profissao"),
    escolaridade: text("escolaridade"),
    responsavelLegal: text("responsavel_legal"),
    cpfResponsavel: text("cpf_responsavel"),
    documentoResponsavel: text("documento_responsavel"),
    celular: text("celular"),
    whatsapp: text("whatsapp"),
    email: text("email"),
    contatoEmergenciaNome: text("contato_emergencia_nome"),
    contatoEmergenciaParentesco: text("contato_emergencia_parentesco"),
    contatoEmergenciaTelefone: text("contato_emergencia_telefone"),
    canalPreferencial: canalEnum("canal_preferencial").notNull(),
    // Campos nullable para suportar inscrições legadas importadas sem resposta;
    // novas inscrições continuam validadas como obrigatórias na API RF1.
    queixaCifrada: text("queixa_cifrada"),
    percepcaoUrgenciaCifrada: text("percepcao_urgencia_cifrada"),
    historicoRelevanteCifrado: text("historico_relevante_cifrado"),
    versaoTermoAceita: text("versao_termo_aceita").references(
      () => versoesTermo.versao,
    ),
    termoAceitoEm: timestamp("termo_aceito_em", { withTimezone: true }),
    aceitePeloResponsavel: boolean("aceite_pelo_responsavel"),
    criadaEm: timestamp("criada_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      "inscricoes_aceite_com_versao",
      sql`(${t.versaoTermoAceita} is null) = (${t.termoAceitoEm} is null)`,
    ),
    check(
      "inscricoes_aceite_com_responsavel",
      sql`(${t.versaoTermoAceita} is null) = (${t.aceitePeloResponsavel} is null)`,
    ),
    check(
      "inscricoes_algum_contato",
      sql`${t.celular} is not null or ${t.email} is not null`,
    ),
    check(
      "inscricoes_canal_com_contato",
      sql`(${t.canalPreferencial} = 'email' and ${t.email} is not null) or (${t.canalPreferencial} in ('whatsapp', 'ligacao') and ${t.celular} is not null)`,
    ),
    check("inscricoes_cpf_11_digitos", sql`${t.cpf} ~ '^[0-9]{11}$'`),
    check(
      "inscricoes_cpf_responsavel_11_digitos",
      sql`${t.cpfResponsavel} is null or ${t.cpfResponsavel} ~ '^[0-9]{11}$'`,
    ),
    check(
      "inscricoes_cep_8_digitos",
      sql`${t.cep} is null or ${t.cep} ~ '^[0-9]{8}$'`,
    ),
  ],
);
