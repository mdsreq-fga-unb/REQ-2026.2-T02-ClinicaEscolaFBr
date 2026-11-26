CREATE TYPE "public"."decisao_reprovacao" AS ENUM('confirmada', 'nao_aplicada');--> statement-breakpoint
CREATE TABLE "decisoes_reprovacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sinalizacao_id" uuid NOT NULL,
	"decisao" "decisao_reprovacao" NOT NULL,
	"faltas" integer NOT NULL,
	"justificativa_cifrada" text NOT NULL,
	"decidida_por" uuid NOT NULL,
	"decidida_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "decisoes_reprovacao_faltas" CHECK ("decisoes_reprovacao"."faltas" >= 0)
);
--> statement-breakpoint
ALTER TABLE "decisoes_reprovacao" ADD CONSTRAINT "decisoes_reprovacao_sinalizacao_id_sinalizacoes_reprovacao_id_fk" FOREIGN KEY ("sinalizacao_id") REFERENCES "public"."sinalizacoes_reprovacao"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisoes_reprovacao" ADD CONSTRAINT "decisoes_reprovacao_decidida_por_usuarios_id_fk" FOREIGN KEY ("decidida_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "decisoes_reprovacao_sinalizacao" ON "decisoes_reprovacao" USING btree ("sinalizacao_id");--> statement-breakpoint
-- A decisão não muda nem é apagada (RF64): uma decisão nova fica no histórico ao lado
-- da anterior. O script do usuário da aplicação também tira dela o UPDATE e o DELETE.
CREATE TRIGGER "decisoes_reprovacao_somente_insercao" BEFORE UPDATE OR DELETE ON "decisoes_reprovacao"
  FOR EACH ROW EXECUTE FUNCTION "impedir_alteracao_registro"();
