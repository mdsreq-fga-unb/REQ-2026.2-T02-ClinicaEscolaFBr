CREATE TYPE "public"."classificacao_cancelamento" AS ENUM('no_prazo', 'fora_do_prazo', 'administrativo', 'ausencia_estagiario', 'desligamento');--> statement-breakpoint
CREATE TYPE "public"."origem_cancelamento" AS ENUM('link', 'secretaria', 'estagiario', 'supervisor', 'coordenacao');--> statement-breakpoint
CREATE TABLE "cancelamentos_sessao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sessao_id" uuid NOT NULL,
	"origem" "origem_cancelamento" NOT NULL,
	"classificacao" "classificacao_cancelamento" NOT NULL,
	"justificativa_cifrada" text,
	"registrado_por" uuid,
	"registrado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"antecedencia_minutos" integer NOT NULL,
	CONSTRAINT "cancelamentos_sessao_sessao_id_unique" UNIQUE("sessao_id"),
	CONSTRAINT "cancelamentos_justificativa" CHECK ("cancelamentos_sessao"."justificativa_cifrada" is not null or "cancelamentos_sessao"."classificacao" in ('desligamento', 'administrativo')),
	CONSTRAINT "cancelamentos_autor" CHECK (("cancelamentos_sessao"."origem" = 'link') = ("cancelamentos_sessao"."registrado_por" is null))
);
--> statement-breakpoint
ALTER TABLE "cancelamentos_sessao" ADD CONSTRAINT "cancelamentos_sessao_sessao_id_sessoes_atendimento_id_fk" FOREIGN KEY ("sessao_id") REFERENCES "public"."sessoes_atendimento"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cancelamentos_sessao" ADD CONSTRAINT "cancelamentos_sessao_registrado_por_usuarios_id_fk" FOREIGN KEY ("registrado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Antecedência mínima para cancelar sem falta (RF15, DF20), configurável pela coordenação.
INSERT INTO "parametros" ("chave", "valor") VALUES ('antecedencia_minima_cancelamento_minutos', '60');
