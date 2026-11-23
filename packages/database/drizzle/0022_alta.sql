ALTER TYPE "public"."situacao_caso" ADD VALUE 'encerrado_por_alta';--> statement-breakpoint
CREATE TABLE "encerramentos_alta" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caso_id" uuid NOT NULL,
	"ciclo_atendimento" integer NOT NULL,
	"data_alta" date NOT NULL,
	"motivo_cifrado" text NOT NULL,
	"pedida_por" uuid NOT NULL,
	"pedida_em" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmada_por" uuid,
	"confirmada_em" timestamp with time zone,
	CONSTRAINT "encerramentos_alta_confirmacao_completa" CHECK (("encerramentos_alta"."confirmada_por" is null) = ("encerramentos_alta"."confirmada_em" is null))
);
--> statement-breakpoint
CREATE TABLE "reaberturas_caso" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"encerramento_id" uuid NOT NULL,
	"pedida_por" uuid NOT NULL,
	"reaberta_por" uuid NOT NULL,
	"reaberta_em" timestamp with time zone DEFAULT now() NOT NULL,
	"motivo_cifrado" text NOT NULL,
	CONSTRAINT "reaberturas_caso_encerramento_id_unique" UNIQUE("encerramento_id")
);
--> statement-breakpoint
ALTER TABLE "vagas_liberadas" ALTER COLUMN "desligamento_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "vagas_liberadas" ADD COLUMN "alta_id" uuid;--> statement-breakpoint
ALTER TABLE "encerramentos_alta" ADD CONSTRAINT "encerramentos_alta_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encerramentos_alta" ADD CONSTRAINT "encerramentos_alta_pedida_por_usuarios_id_fk" FOREIGN KEY ("pedida_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encerramentos_alta" ADD CONSTRAINT "encerramentos_alta_confirmada_por_usuarios_id_fk" FOREIGN KEY ("confirmada_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reaberturas_caso" ADD CONSTRAINT "reaberturas_caso_encerramento_id_encerramentos_alta_id_fk" FOREIGN KEY ("encerramento_id") REFERENCES "public"."encerramentos_alta"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reaberturas_caso" ADD CONSTRAINT "reaberturas_caso_pedida_por_usuarios_id_fk" FOREIGN KEY ("pedida_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reaberturas_caso" ADD CONSTRAINT "reaberturas_caso_reaberta_por_usuarios_id_fk" FOREIGN KEY ("reaberta_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "encerramentos_alta_caso" ON "encerramentos_alta" USING btree ("caso_id","pedida_em");--> statement-breakpoint
CREATE UNIQUE INDEX "encerramentos_alta_pedido_aberto" ON "encerramentos_alta" USING btree ("caso_id") WHERE "encerramentos_alta"."confirmada_em" is null;--> statement-breakpoint
ALTER TABLE "vagas_liberadas" ADD CONSTRAINT "vagas_liberadas_alta_id_encerramentos_alta_id_fk" FOREIGN KEY ("alta_id") REFERENCES "public"."encerramentos_alta"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vagas_liberadas" ADD CONSTRAINT "vagas_liberadas_alta_id_unique" UNIQUE("alta_id");--> statement-breakpoint
ALTER TABLE "vagas_liberadas" ADD CONSTRAINT "vagas_origem_unica" CHECK (("vagas_liberadas"."desligamento_id" is null) <> ("vagas_liberadas"."alta_id" is null));--> statement-breakpoint
-- A alta (RF68, RNF27): o pedido só ganha a confirmação, uma vez, e nada é
-- apagado; a reabertura é só inserção. A vaga da alta segue as mesmas regras da
-- vaga do desligamento, agora com a origem alta_id também fixa.
CREATE TRIGGER "encerramentos_alta_campos_preenchidos" BEFORE UPDATE OR DELETE ON "encerramentos_alta"
  FOR EACH ROW EXECUTE FUNCTION "proteger_campos_preenchidos"(
    'id,caso_id,ciclo_atendimento,data_alta,motivo_cifrado,pedida_por,pedida_em',
    'confirmada_por,confirmada_em'
  );--> statement-breakpoint
CREATE TRIGGER "reaberturas_caso_somente_insercao" BEFORE UPDATE OR DELETE ON "reaberturas_caso"
  FOR EACH ROW EXECUTE FUNCTION "impedir_alteracao_registro"();--> statement-breakpoint
DROP TRIGGER "vagas_liberadas_campos_preenchidos" ON "vagas_liberadas";--> statement-breakpoint
CREATE TRIGGER "vagas_liberadas_campos_preenchidos" BEFORE UPDATE OR DELETE ON "vagas_liberadas"
  FOR EACH ROW EXECUTE FUNCTION "proteger_campos_preenchidos"(
    'id,desligamento_id,alta_id,estagiario_id,supervisor_id,liberada_em',
    'ocupada_em,ocupada_por_vinculo_id,encerrada_em'
  );
