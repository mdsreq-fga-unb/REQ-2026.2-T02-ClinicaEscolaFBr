ALTER TYPE "public"."situacao_caso" ADD VALUE 'cancelado_por_revogacao';--> statement-breakpoint
CREATE TABLE "revogacoes_consentimento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inscricao_id" uuid NOT NULL,
	"versao_termo" text NOT NULL,
	"solicitante" text NOT NULL,
	"forma_verificacao" text NOT NULL,
	"documento_cifrado" text,
	"verificacao_id" uuid,
	"registrada_por" uuid NOT NULL,
	"registrada_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "revogacoes_consentimento_inscricao_id_unique" UNIQUE("inscricao_id"),
	CONSTRAINT "revogacoes_solicitante" CHECK ("revogacoes_consentimento"."solicitante" in ('titular', 'responsavel')),
	CONSTRAINT "revogacoes_identidade" CHECK (("revogacoes_consentimento"."forma_verificacao" = 'documento' and "revogacoes_consentimento"."documento_cifrado" is not null and "revogacoes_consentimento"."verificacao_id" is null) or ("revogacoes_consentimento"."forma_verificacao" = 'verificacao_rf52' and "revogacoes_consentimento"."verificacao_id" is not null and "revogacoes_consentimento"."documento_cifrado" is null))
);
--> statement-breakpoint
ALTER TABLE "revogacoes_consentimento" ADD CONSTRAINT "revogacoes_consentimento_inscricao_id_inscricoes_id_fk" FOREIGN KEY ("inscricao_id") REFERENCES "public"."inscricoes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revogacoes_consentimento" ADD CONSTRAINT "revogacoes_consentimento_versao_termo_versoes_termo_versao_fk" FOREIGN KEY ("versao_termo") REFERENCES "public"."versoes_termo"("versao") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revogacoes_consentimento" ADD CONSTRAINT "revogacoes_consentimento_verificacao_id_verificacoes_identidade_id_fk" FOREIGN KEY ("verificacao_id") REFERENCES "public"."verificacoes_identidade"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revogacoes_consentimento" ADD CONSTRAINT "revogacoes_consentimento_registrada_por_usuarios_id_fk" FOREIGN KEY ("registrada_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
-- Mantém o histórico imutável; o script do usuário da aplicação revoga também
-- UPDATE, DELETE e TRUNCATE ao encontrar este gatilho.
CREATE TRIGGER "revogacoes_consentimento_somente_insercao" BEFORE UPDATE OR DELETE ON "revogacoes_consentimento"
  FOR EACH ROW EXECUTE FUNCTION "impedir_alteracao_registro"();
