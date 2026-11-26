CREATE TABLE "perdas_vaga" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caso_id" uuid NOT NULL,
	"ciclo_atendimento" integer NOT NULL,
	"vinculo_id" uuid NOT NULL,
	"estagiario_id" uuid NOT NULL,
	"supervisor_id" uuid NOT NULL,
	"vinculado_em" timestamp with time zone NOT NULL,
	"prazo_ate" date NOT NULL,
	"sessoes_canceladas" integer NOT NULL,
	"confirmada_por" uuid NOT NULL,
	"confirmada_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "perdas_vaga_vinculo_id_unique" UNIQUE("vinculo_id"),
	CONSTRAINT "perdas_vaga_sessoes_canceladas" CHECK ("perdas_vaga"."sessoes_canceladas" >= 0)
);
--> statement-breakpoint
ALTER TABLE "vagas_liberadas" DROP CONSTRAINT "vagas_origem_unica";--> statement-breakpoint
ALTER TABLE "vagas_liberadas" ADD COLUMN "perda_vaga_id" uuid;--> statement-breakpoint
ALTER TABLE "perdas_vaga" ADD CONSTRAINT "perdas_vaga_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perdas_vaga" ADD CONSTRAINT "perdas_vaga_vinculo_id_vinculos_estagiario_id_fk" FOREIGN KEY ("vinculo_id") REFERENCES "public"."vinculos_estagiario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perdas_vaga" ADD CONSTRAINT "perdas_vaga_estagiario_id_usuarios_id_fk" FOREIGN KEY ("estagiario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perdas_vaga" ADD CONSTRAINT "perdas_vaga_supervisor_id_usuarios_id_fk" FOREIGN KEY ("supervisor_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perdas_vaga" ADD CONSTRAINT "perdas_vaga_confirmada_por_usuarios_id_fk" FOREIGN KEY ("confirmada_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vagas_liberadas" ADD CONSTRAINT "vagas_liberadas_perda_vaga_id_perdas_vaga_id_fk" FOREIGN KEY ("perda_vaga_id") REFERENCES "public"."perdas_vaga"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vagas_liberadas" ADD CONSTRAINT "vagas_liberadas_perda_vaga_id_unique" UNIQUE("perda_vaga_id");--> statement-breakpoint
ALTER TABLE "vagas_liberadas" ADD CONSTRAINT "vagas_origem_unica" CHECK (num_nonnulls("vagas_liberadas"."desligamento_id", "vagas_liberadas"."alta_id", "vagas_liberadas"."perda_vaga_id") = 1);--> statement-breakpoint
-- A perda da vaga é só inserção (RF43), como o desligamento que ela reaproveita.
CREATE TRIGGER "perdas_vaga_somente_insercao" BEFORE UPDATE OR DELETE ON "perdas_vaga"
  FOR EACH ROW EXECUTE FUNCTION "impedir_alteracao_registro"();--> statement-breakpoint
-- A origem da vaga (desligamento, alta ou perda da vaga) não muda depois de gravada.
DROP TRIGGER "vagas_liberadas_campos_preenchidos" ON "vagas_liberadas";--> statement-breakpoint
CREATE TRIGGER "vagas_liberadas_campos_preenchidos" BEFORE UPDATE OR DELETE ON "vagas_liberadas"
  FOR EACH ROW EXECUTE FUNCTION "proteger_campos_preenchidos"(
    'id,desligamento_id,alta_id,perda_vaga_id,estagiario_id,supervisor_id,liberada_em',
    'ocupada_em,ocupada_por_vinculo_id,encerrada_em'
  );
