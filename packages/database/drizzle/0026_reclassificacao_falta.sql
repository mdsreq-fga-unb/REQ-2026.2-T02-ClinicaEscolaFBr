CREATE TABLE "reclassificacoes_falta" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cancelamento_id" uuid NOT NULL,
	"motivo_cifrado" text NOT NULL,
	"reclassificada_por" uuid NOT NULL,
	"reclassificada_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reclassificacoes_falta_cancelamento" UNIQUE("cancelamento_id")
);
--> statement-breakpoint
ALTER TABLE "reclassificacoes_falta" ADD CONSTRAINT "reclassificacoes_falta_cancelamento_id_cancelamentos_sessao_id_fk" FOREIGN KEY ("cancelamento_id") REFERENCES "public"."cancelamentos_sessao"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reclassificacoes_falta" ADD CONSTRAINT "reclassificacoes_falta_reclassificada_por_usuarios_id_fk" FOREIGN KEY ("reclassificada_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- A reclassificação não muda nem é apagada (RF40): ela fica no histórico, com o
-- motivo, o autor e a data/hora. O script do usuário da aplicação também tira dele o
-- UPDATE e o DELETE.
CREATE TRIGGER "reclassificacoes_falta_somente_insercao" BEFORE UPDATE OR DELETE ON "reclassificacoes_falta"
  FOR EACH ROW EXECUTE FUNCTION "impedir_alteracao_registro"();
