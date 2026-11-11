ALTER TABLE "evolucoes" ALTER COLUMN "queixa_cifrada" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "evolucoes" ALTER COLUMN "planejamento_cifrado" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "evolucoes" ADD COLUMN "humor_aparencia_cifrado" text;--> statement-breakpoint
ALTER TABLE "evolucoes" ADD COLUMN "conteudo_trabalhado_cifrado" text;--> statement-breakpoint
ALTER TABLE "evolucoes" ADD COLUMN "tecnicas_utilizadas_cifrado" text;--> statement-breakpoint
ALTER TABLE "evolucoes" ADD COLUMN "intervencoes_encaminhamentos_cifrado" text;--> statement-breakpoint
ALTER TABLE "evolucoes" ADD COLUMN "plano_proxima_sessao_cifrado" text;--> statement-breakpoint
ALTER TABLE "prontuarios" ADD COLUMN "anamnese_por" uuid;--> statement-breakpoint
ALTER TABLE "prontuarios" ADD COLUMN "anamnese_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "prontuarios" ADD COLUMN "contrato_por" uuid;--> statement-breakpoint
ALTER TABLE "prontuarios" ADD COLUMN "contrato_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "prontuarios" ADD CONSTRAINT "prontuarios_anamnese_por_usuarios_id_fk" FOREIGN KEY ("anamnese_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prontuarios" ADD CONSTRAINT "prontuarios_contrato_por_usuarios_id_fk" FOREIGN KEY ("contrato_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evolucoes" ADD CONSTRAINT "evolucoes_ficha_completa" CHECK (("evolucoes"."queixa_cifrada" IS NOT NULL AND "evolucoes"."planejamento_cifrado" IS NOT NULL) OR ("evolucoes"."humor_aparencia_cifrado" IS NOT NULL AND "evolucoes"."conteudo_trabalhado_cifrado" IS NOT NULL AND "evolucoes"."tecnicas_utilizadas_cifrado" IS NOT NULL AND "evolucoes"."plano_proxima_sessao_cifrado" IS NOT NULL));--> statement-breakpoint
-- RF69: o registro antigo gravava a anamnese e o contrato juntos; o autor e a data/hora
-- dele passam para as duas partes.
UPDATE "prontuarios" SET "anamnese_por" = "dados_iniciais_por", "anamnese_em" = "dados_iniciais_em"
  WHERE "anamnese_cifrada" IS NOT NULL AND "dados_iniciais_em" IS NOT NULL;--> statement-breakpoint
UPDATE "prontuarios" SET "contrato_por" = "dados_iniciais_por", "contrato_em" = "dados_iniciais_em"
  WHERE ("data_assinatura_contrato" IS NOT NULL OR "contrato_cifrado" IS NOT NULL) AND "dados_iniciais_em" IS NOT NULL;
