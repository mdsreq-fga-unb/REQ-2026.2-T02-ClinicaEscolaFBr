CREATE TABLE "validacoes_evolucao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evolucao_id" uuid NOT NULL,
	"validada_por" uuid NOT NULL,
	"validada_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "validacoes_evolucao" ADD CONSTRAINT "validacoes_evolucao_evolucao_id_evolucoes_id_fk" FOREIGN KEY ("evolucao_id") REFERENCES "public"."evolucoes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "validacoes_evolucao" ADD CONSTRAINT "validacoes_evolucao_validada_por_usuarios_id_fk" FOREIGN KEY ("validada_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "validacoes_evolucao_evolucao_idx" ON "validacoes_evolucao" USING btree ("evolucao_id","validada_em");--> statement-breakpoint
-- A validação gravada não muda nem é apagada (RF67, RNF27). O script do usuário da
-- aplicação também tira dela o UPDATE e o DELETE.
CREATE TRIGGER "validacoes_evolucao_somente_insercao" BEFORE UPDATE OR DELETE ON "validacoes_evolucao"
  FOR EACH ROW EXECUTE FUNCTION "impedir_alteracao_registro"();
