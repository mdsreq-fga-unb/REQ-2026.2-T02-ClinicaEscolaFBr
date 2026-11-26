CREATE TABLE "complementos_evolucao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evolucao_id" uuid NOT NULL,
	"texto_cifrado" text NOT NULL,
	"registrado_por" uuid NOT NULL,
	"registrado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "complementos_evolucao" ADD CONSTRAINT "complementos_evolucao_evolucao_id_evolucoes_id_fk" FOREIGN KEY ("evolucao_id") REFERENCES "public"."evolucoes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complementos_evolucao" ADD CONSTRAINT "complementos_evolucao_registrado_por_usuarios_id_fk" FOREIGN KEY ("registrado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "complementos_evolucao_evolucao_idx" ON "complementos_evolucao" USING btree ("evolucao_id","registrado_em");--> statement-breakpoint
-- O complemento gravado não muda nem é apagado (RF30). O script do usuário da
-- aplicação também tira dele o UPDATE e o DELETE.
CREATE TRIGGER "complementos_evolucao_somente_insercao" BEFORE UPDATE OR DELETE ON "complementos_evolucao"
  FOR EACH ROW EXECUTE FUNCTION "impedir_alteracao_registro"();
