CREATE TYPE "public"."classificacao_cancelamento" AS ENUM('no_prazo', 'fora_do_prazo', 'administrativo', 'ausencia_estagiario', 'desligamento');--> statement-breakpoint
CREATE TYPE "public"."origem_cancelamento" AS ENUM('link', 'secretaria', 'estagiario', 'supervisor', 'coordenacao');--> statement-breakpoint
ALTER TYPE "public"."situacao_caso" ADD VALUE 'desligado_por_faltas';--> statement-breakpoint
ALTER TYPE "public"."situacao_caso" ADD VALUE 'aguardando_vaga';--> statement-breakpoint
CREATE TABLE "cancelamentos_sessao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sessao_id" uuid NOT NULL,
	"origem" "origem_cancelamento" NOT NULL,
	"classificacao" "classificacao_cancelamento" NOT NULL,
	"justificativa_cifrada" text,
	"registrado_por" uuid,
	"registrado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"antecedencia_minutos" integer NOT NULL,
	"desligamento_id" uuid,
	CONSTRAINT "cancelamentos_sessao_sessao_id_unique" UNIQUE("sessao_id"),
	CONSTRAINT "cancelamentos_autor" CHECK (("cancelamentos_sessao"."origem" = 'link') = ("cancelamentos_sessao"."registrado_por" is null)),
	CONSTRAINT "cancelamentos_desligamento" CHECK (("cancelamentos_sessao"."desligamento_id" is not null) = ("cancelamentos_sessao"."classificacao" = 'desligamento')),
	CONSTRAINT "cancelamentos_justificativa" CHECK ("cancelamentos_sessao"."justificativa_cifrada" is not null or "cancelamentos_sessao"."classificacao" in ('desligamento', 'administrativo'))
);
--> statement-breakpoint
CREATE TABLE "desligamento_faltas" (
	"desligamento_id" uuid NOT NULL,
	"falta_id" uuid NOT NULL,
	CONSTRAINT "desligamento_faltas_desligamento_id_falta_id_pk" PRIMARY KEY("desligamento_id","falta_id")
);
--> statement-breakpoint
CREATE TABLE "desligamentos_por_faltas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caso_id" uuid NOT NULL,
	"ciclo_atendimento" integer NOT NULL,
	"data_decisao" date NOT NULL,
	"decidido_por" uuid NOT NULL,
	"decidido_em" timestamp with time zone DEFAULT now() NOT NULL,
	"revertido_por" uuid,
	"revertido_em" timestamp with time zone,
	"motivo_reversao_cifrado" text,
	CONSTRAINT "desligamentos_reversao_completa" CHECK (("desligamentos_por_faltas"."revertido_em" is null) = ("desligamentos_por_faltas"."revertido_por" is null) and ("desligamentos_por_faltas"."revertido_em" is null) = ("desligamentos_por_faltas"."motivo_reversao_cifrado" is null))
);
--> statement-breakpoint
CREATE TABLE "vagas_liberadas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"desligamento_id" uuid NOT NULL,
	"estagiario_id" uuid NOT NULL,
	"supervisor_id" uuid NOT NULL,
	"liberada_em" timestamp with time zone DEFAULT now() NOT NULL,
	"ocupada_em" timestamp with time zone,
	"ocupada_por_vinculo_id" uuid,
	"encerrada_em" timestamp with time zone,
	CONSTRAINT "vagas_liberadas_desligamento_id_unique" UNIQUE("desligamento_id"),
	CONSTRAINT "vagas_ocupacao_completa" CHECK (("vagas_liberadas"."ocupada_em" is null) = ("vagas_liberadas"."ocupada_por_vinculo_id" is null))
);
--> statement-breakpoint
ALTER TABLE "cancelamentos_sessao" ADD CONSTRAINT "cancelamentos_sessao_sessao_id_sessoes_atendimento_id_fk" FOREIGN KEY ("sessao_id") REFERENCES "public"."sessoes_atendimento"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cancelamentos_sessao" ADD CONSTRAINT "cancelamentos_sessao_registrado_por_usuarios_id_fk" FOREIGN KEY ("registrado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cancelamentos_sessao" ADD CONSTRAINT "cancelamentos_sessao_desligamento_id_desligamentos_por_faltas_id_fk" FOREIGN KEY ("desligamento_id") REFERENCES "public"."desligamentos_por_faltas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "desligamento_faltas" ADD CONSTRAINT "desligamento_faltas_desligamento_id_desligamentos_por_faltas_id_fk" FOREIGN KEY ("desligamento_id") REFERENCES "public"."desligamentos_por_faltas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "desligamento_faltas" ADD CONSTRAINT "desligamento_faltas_falta_id_faltas_paciente_id_fk" FOREIGN KEY ("falta_id") REFERENCES "public"."faltas_paciente"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "desligamentos_por_faltas" ADD CONSTRAINT "desligamentos_por_faltas_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "desligamentos_por_faltas" ADD CONSTRAINT "desligamentos_por_faltas_decidido_por_usuarios_id_fk" FOREIGN KEY ("decidido_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "desligamentos_por_faltas" ADD CONSTRAINT "desligamentos_por_faltas_revertido_por_usuarios_id_fk" FOREIGN KEY ("revertido_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vagas_liberadas" ADD CONSTRAINT "vagas_liberadas_desligamento_id_desligamentos_por_faltas_id_fk" FOREIGN KEY ("desligamento_id") REFERENCES "public"."desligamentos_por_faltas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vagas_liberadas" ADD CONSTRAINT "vagas_liberadas_estagiario_id_usuarios_id_fk" FOREIGN KEY ("estagiario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vagas_liberadas" ADD CONSTRAINT "vagas_liberadas_supervisor_id_usuarios_id_fk" FOREIGN KEY ("supervisor_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vagas_liberadas" ADD CONSTRAINT "vagas_liberadas_ocupada_por_vinculo_id_vinculos_estagiario_id_fk" FOREIGN KEY ("ocupada_por_vinculo_id") REFERENCES "public"."vinculos_estagiario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cancelamentos_desligamento" ON "cancelamentos_sessao" USING btree ("desligamento_id");--> statement-breakpoint
CREATE UNIQUE INDEX "desligamentos_vigente_unico" ON "desligamentos_por_faltas" USING btree ("caso_id","ciclo_atendimento") WHERE "desligamentos_por_faltas"."revertido_em" is null;--> statement-breakpoint
CREATE INDEX "vagas_estagiario" ON "vagas_liberadas" USING btree ("estagiario_id");--> statement-breakpoint
-- Registros do desligamento e da vaga só ganham informação (RNF32): a reversão e a
-- ocupação preenchem campos vazios, e nada é apagado (usuario-da-aplicacao.sql
-- retira o DELETE do usuário da aplicação nas tabelas com este gatilho).
CREATE TRIGGER "desligamentos_por_faltas_campos_preenchidos" BEFORE UPDATE OR DELETE ON "desligamentos_por_faltas"
  FOR EACH ROW EXECUTE FUNCTION "proteger_campos_preenchidos"(
    'id,caso_id,ciclo_atendimento,data_decisao,decidido_por,decidido_em',
    'revertido_por,revertido_em,motivo_reversao_cifrado'
  );--> statement-breakpoint
CREATE TRIGGER "vagas_liberadas_campos_preenchidos" BEFORE UPDATE OR DELETE ON "vagas_liberadas"
  FOR EACH ROW EXECUTE FUNCTION "proteger_campos_preenchidos"(
    'id,desligamento_id,estagiario_id,supervisor_id,liberada_em',
    'ocupada_em,ocupada_por_vinculo_id,encerrada_em'
  );--> statement-breakpoint
-- As faltas que fundamentam o desligamento e o cancelamento da sessão são só inserção.
CREATE TRIGGER "desligamento_faltas_somente_insercao" BEFORE UPDATE OR DELETE ON "desligamento_faltas"
  FOR EACH ROW EXECUTE FUNCTION "impedir_alteracao_registro"();--> statement-breakpoint
CREATE TRIGGER "cancelamentos_sessao_somente_insercao" BEFORE UPDATE OR DELETE ON "cancelamentos_sessao"
  FOR EACH ROW EXECUTE FUNCTION "impedir_alteracao_registro"();
