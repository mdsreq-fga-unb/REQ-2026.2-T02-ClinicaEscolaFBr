CREATE TYPE "public"."canal" AS ENUM('email', 'whatsapp', 'ligacao');--> statement-breakpoint
CREATE TYPE "public"."situacao_caso" AS ENUM('aguardando_distribuicao', 'aguardando_vinculo', 'em_atendimento', 'encerrado');--> statement-breakpoint
CREATE TYPE "public"."status_sessao" AS ENUM('agendada');--> statement-breakpoint
CREATE SEQUENCE "public"."inscricoes_numero_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "convites_ativacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"usado_em" timestamp with time zone,
	"invalidado_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "convites_ativacao_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "sessoes_login" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"criada_em" timestamp with time zone DEFAULT now() NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"revogada_em" timestamp with time zone,
	CONSTRAINT "sessoes_login_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "inscricoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero" text NOT NULL,
	"nome_completo" text NOT NULL,
	"data_nascimento" date NOT NULL,
	"cpf" text NOT NULL,
	"rg" text NOT NULL,
	"endereco" text NOT NULL,
	"estado_civil" text NOT NULL,
	"responsavel_legal" text,
	"celular" text,
	"email" text,
	"canal_preferencial" "canal" NOT NULL,
	"queixa_cifrada" text NOT NULL,
	"percepcao_urgencia_cifrada" text NOT NULL,
	"historico_relevante_cifrado" text NOT NULL,
	"criada_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inscricoes_numero_unique" UNIQUE("numero"),
	CONSTRAINT "inscricoes_algum_contato" CHECK ("inscricoes"."celular" is not null or "inscricoes"."email" is not null),
	CONSTRAINT "inscricoes_canal_com_contato" CHECK (("inscricoes"."canal_preferencial" = 'email' and "inscricoes"."email" is not null) or ("inscricoes"."canal_preferencial" in ('whatsapp', 'ligacao') and "inscricoes"."celular" is not null)),
	CONSTRAINT "inscricoes_cpf_11_digitos" CHECK ("inscricoes"."cpf" ~ '^[0-9]{11}$')
);
--> statement-breakpoint
CREATE TABLE "atribuicoes_supervisor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caso_id" uuid NOT NULL,
	"supervisor_id" uuid NOT NULL,
	"atribuido_por" uuid NOT NULL,
	"atribuido_em" timestamp with time zone DEFAULT now() NOT NULL,
	"vigente" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "casos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inscricao_id" uuid NOT NULL,
	"situacao" "situacao_caso" DEFAULT 'aguardando_distribuicao' NOT NULL,
	"ciclo_atendimento" integer DEFAULT 1 NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "casos_inscricao_id_unique" UNIQUE("inscricao_id")
);
--> statement-breakpoint
CREATE TABLE "decisoes_prioridade" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inscricao_id" uuid NOT NULL,
	"cor_cifrada" text NOT NULL,
	"decidida_por" uuid NOT NULL,
	"decidida_em" timestamp with time zone DEFAULT now() NOT NULL,
	"vigente" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vinculos_estagiario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caso_id" uuid NOT NULL,
	"estagiario_id" uuid NOT NULL,
	"vinculado_por" uuid NOT NULL,
	"vinculado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"vigente" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "links_confirmacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sessao_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"usado_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "links_confirmacao_sessao_id_unique" UNIQUE("sessao_id"),
	CONSTRAINT "links_confirmacao_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "sessoes_atendimento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caso_id" uuid NOT NULL,
	"estagiario_id" uuid NOT NULL,
	"inicio" timestamp with time zone NOT NULL,
	"termino" timestamp with time zone NOT NULL,
	"fim_intervalo_anotacoes" timestamp with time zone NOT NULL,
	"status" "status_sessao" DEFAULT 'agendada' NOT NULL,
	"agendada_por" uuid NOT NULL,
	"agendada_em" timestamp with time zone DEFAULT now() NOT NULL,
	"mensagem_whatsapp_em" timestamp with time zone,
	CONSTRAINT "sessoes_termino_apos_inicio" CHECK ("sessoes_atendimento"."termino" > "sessoes_atendimento"."inicio"),
	CONSTRAINT "sessoes_intervalo_apos_termino" CHECK ("sessoes_atendimento"."fim_intervalo_anotacoes" >= "sessoes_atendimento"."termino")
);
--> statement-breakpoint
CREATE TABLE "acessos_prontuario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prontuario_id" uuid,
	"usuario_id" uuid NOT NULL,
	"perfil" "perfil" NOT NULL,
	"operacao" text NOT NULL,
	"permitido" boolean NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prontuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caso_id" uuid NOT NULL,
	"ciclo_atendimento" integer NOT NULL,
	"vinculo_origem_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"anamnese_cifrada" text,
	"contrato_cifrado" text,
	"data_assinatura_contrato" date,
	"dados_iniciais_por" uuid,
	"dados_iniciais_em" timestamp with time zone,
	CONSTRAINT "prontuarios_caso_ciclo" UNIQUE("caso_id","ciclo_atendimento")
);
--> statement-breakpoint
CREATE TABLE "parametros" (
	"chave" text PRIMARY KEY NOT NULL,
	"valor" text NOT NULL,
	"alterado_por" uuid,
	"alterado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "senha_hash" text;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "tentativas_falhas" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "bloqueado_ate" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "convites_ativacao" ADD CONSTRAINT "convites_ativacao_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessoes_login" ADD CONSTRAINT "sessoes_login_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "atribuicoes_supervisor" ADD CONSTRAINT "atribuicoes_supervisor_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "atribuicoes_supervisor" ADD CONSTRAINT "atribuicoes_supervisor_supervisor_id_usuarios_id_fk" FOREIGN KEY ("supervisor_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "atribuicoes_supervisor" ADD CONSTRAINT "atribuicoes_supervisor_atribuido_por_usuarios_id_fk" FOREIGN KEY ("atribuido_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "casos" ADD CONSTRAINT "casos_inscricao_id_inscricoes_id_fk" FOREIGN KEY ("inscricao_id") REFERENCES "public"."inscricoes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisoes_prioridade" ADD CONSTRAINT "decisoes_prioridade_inscricao_id_inscricoes_id_fk" FOREIGN KEY ("inscricao_id") REFERENCES "public"."inscricoes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisoes_prioridade" ADD CONSTRAINT "decisoes_prioridade_decidida_por_usuarios_id_fk" FOREIGN KEY ("decidida_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vinculos_estagiario" ADD CONSTRAINT "vinculos_estagiario_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vinculos_estagiario" ADD CONSTRAINT "vinculos_estagiario_estagiario_id_usuarios_id_fk" FOREIGN KEY ("estagiario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vinculos_estagiario" ADD CONSTRAINT "vinculos_estagiario_vinculado_por_usuarios_id_fk" FOREIGN KEY ("vinculado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "links_confirmacao" ADD CONSTRAINT "links_confirmacao_sessao_id_sessoes_atendimento_id_fk" FOREIGN KEY ("sessao_id") REFERENCES "public"."sessoes_atendimento"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessoes_atendimento" ADD CONSTRAINT "sessoes_atendimento_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessoes_atendimento" ADD CONSTRAINT "sessoes_atendimento_estagiario_id_usuarios_id_fk" FOREIGN KEY ("estagiario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessoes_atendimento" ADD CONSTRAINT "sessoes_atendimento_agendada_por_usuarios_id_fk" FOREIGN KEY ("agendada_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acessos_prontuario" ADD CONSTRAINT "acessos_prontuario_prontuario_id_prontuarios_id_fk" FOREIGN KEY ("prontuario_id") REFERENCES "public"."prontuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acessos_prontuario" ADD CONSTRAINT "acessos_prontuario_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prontuarios" ADD CONSTRAINT "prontuarios_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prontuarios" ADD CONSTRAINT "prontuarios_vinculo_origem_id_vinculos_estagiario_id_fk" FOREIGN KEY ("vinculo_origem_id") REFERENCES "public"."vinculos_estagiario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prontuarios" ADD CONSTRAINT "prontuarios_dados_iniciais_por_usuarios_id_fk" FOREIGN KEY ("dados_iniciais_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parametros" ADD CONSTRAINT "parametros_alterado_por_usuarios_id_fk" FOREIGN KEY ("alterado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "atribuicoes_supervisor_vigente_unica" ON "atribuicoes_supervisor" USING btree ("caso_id") WHERE "atribuicoes_supervisor"."vigente";--> statement-breakpoint
CREATE UNIQUE INDEX "decisoes_prioridade_vigente_unica" ON "decisoes_prioridade" USING btree ("inscricao_id") WHERE "decisoes_prioridade"."vigente";--> statement-breakpoint
CREATE UNIQUE INDEX "vinculos_estagiario_vigente_unico" ON "vinculos_estagiario" USING btree ("caso_id") WHERE "vinculos_estagiario"."vigente";--> statement-breakpoint
CREATE INDEX "sessoes_estagiario_inicio" ON "sessoes_atendimento" USING btree ("estagiario_id","inicio");--> statement-breakpoint
CREATE INDEX "sessoes_caso_inicio" ON "sessoes_atendimento" USING btree ("caso_id","inicio");--> statement-breakpoint
-- Valores padrão dos parâmetros confirmados com a FBr (DF17, DF18 e DF30).
INSERT INTO "parametros" ("chave", "valor") VALUES
  ('duracao_sessao_minutos', '50'),
  ('intervalo_anotacoes_minutos', '10'),
  ('limite_casos_supervisor', '50'),
  ('validade_convite_horas', '72');--> statement-breakpoint
-- A auditoria e o registro de acessos ao prontuário são somente inserção (RNF10, RNF52).
CREATE FUNCTION "impedir_alteracao_registro"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Registro de auditoria não pode ser alterado nem apagado (tabela %)', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER "auditoria_somente_insercao" BEFORE UPDATE OR DELETE ON "auditoria"
  FOR EACH ROW EXECUTE FUNCTION "impedir_alteracao_registro"();--> statement-breakpoint
CREATE TRIGGER "acessos_prontuario_somente_insercao" BEFORE UPDATE OR DELETE ON "acessos_prontuario"
  FOR EACH ROW EXECUTE FUNCTION "impedir_alteracao_registro"();--> statement-breakpoint
-- Sem sobreposição de sessões, mesmo com duas requisições simultâneas (RNF9):
-- o estagiário ocupa a sessão e o intervalo de anotações (DF18); o paciente, só a sessão.
-- Quando o RF14 a RF16 criarem novos status, a condição WHERE precisa incluí-los.
CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
ALTER TABLE "sessoes_atendimento" ADD CONSTRAINT "sessoes_estagiario_sem_sobreposicao"
  EXCLUDE USING gist ("estagiario_id" WITH =, tstzrange("inicio", "fim_intervalo_anotacoes", '[)') WITH &&)
  WHERE ("status" = 'agendada');--> statement-breakpoint
ALTER TABLE "sessoes_atendimento" ADD CONSTRAINT "sessoes_caso_sem_sobreposicao"
  EXCLUDE USING gist ("caso_id" WITH =, tstzrange("inicio", "termino", '[)') WITH &&)
  WHERE ("status" = 'agendada');
