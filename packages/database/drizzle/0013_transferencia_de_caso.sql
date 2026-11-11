CREATE TYPE "public"."tipo_transferencia_caso" AS ENUM('estagiario', 'supervisor');--> statement-breakpoint
CREATE TABLE "transferencias_caso" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caso_id" uuid NOT NULL,
	"tipo" "tipo_transferencia_caso" NOT NULL,
	"supervisor_anterior_id" uuid,
	"supervisor_novo_id" uuid,
	"estagiario_anterior_id" uuid,
	"estagiario_novo_id" uuid,
	"atribuicao_anterior_id" uuid,
	"vinculo_anterior_id" uuid,
	"motivo_cifrado" text NOT NULL,
	"transferido_por" uuid NOT NULL,
	"transferido_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transferencias_caso_novo_responsavel" CHECK ("transferencias_caso"."supervisor_novo_id" is not null or "transferencias_caso"."estagiario_novo_id" is not null)
);
--> statement-breakpoint
ALTER TABLE "transferencias_caso" ADD CONSTRAINT "transferencias_caso_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transferencias_caso" ADD CONSTRAINT "transferencias_caso_supervisor_anterior_id_usuarios_id_fk" FOREIGN KEY ("supervisor_anterior_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transferencias_caso" ADD CONSTRAINT "transferencias_caso_supervisor_novo_id_usuarios_id_fk" FOREIGN KEY ("supervisor_novo_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transferencias_caso" ADD CONSTRAINT "transferencias_caso_estagiario_anterior_id_usuarios_id_fk" FOREIGN KEY ("estagiario_anterior_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transferencias_caso" ADD CONSTRAINT "transferencias_caso_estagiario_novo_id_usuarios_id_fk" FOREIGN KEY ("estagiario_novo_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transferencias_caso" ADD CONSTRAINT "transferencias_caso_atribuicao_anterior_id_atribuicoes_supervisor_id_fk" FOREIGN KEY ("atribuicao_anterior_id") REFERENCES "public"."atribuicoes_supervisor"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transferencias_caso" ADD CONSTRAINT "transferencias_caso_vinculo_anterior_id_vinculos_estagiario_id_fk" FOREIGN KEY ("vinculo_anterior_id") REFERENCES "public"."vinculos_estagiario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transferencias_caso" ADD CONSTRAINT "transferencias_caso_transferido_por_usuarios_id_fk" FOREIGN KEY ("transferido_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transferencias_caso_caso" ON "transferencias_caso" USING btree ("caso_id","transferido_em");--> statement-breakpoint
-- O histórico de transferências é só de inserção (RF25, RNF16).
CREATE TRIGGER "transferencias_caso_somente_insercao" BEFORE UPDATE OR DELETE ON "transferencias_caso"
  FOR EACH ROW EXECUTE FUNCTION "impedir_alteracao_registro"();
