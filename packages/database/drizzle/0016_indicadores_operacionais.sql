CREATE TABLE "alteracoes_parametro" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chave" text NOT NULL,
	"valor_anterior" text,
	"valor_novo" text NOT NULL,
	"alterado_por" uuid NOT NULL,
	"alterado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parametros_semestre" (
	"semestre" text NOT NULL,
	"chave" text NOT NULL,
	"valor" text NOT NULL,
	"alterado_por" uuid NOT NULL,
	"alterado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "parametros_semestre_semestre_chave_pk" PRIMARY KEY("semestre","chave")
);
--> statement-breakpoint
ALTER TABLE "atribuicoes_supervisor" ADD COLUMN "encerrada_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "vinculos_estagiario" ADD COLUMN "encerrado_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "alteracoes_parametro" ADD CONSTRAINT "alteracoes_parametro_alterado_por_usuarios_id_fk" FOREIGN KEY ("alterado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parametros_semestre" ADD CONSTRAINT "parametros_semestre_alterado_por_usuarios_id_fk" FOREIGN KEY ("alterado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Vínculos e atribuições já encerrados: a data vem da transferência que os
-- encerrou (RF25) ou, no vínculo, do desligamento por faltas (RF37) feito depois do
-- vínculo. Sem nenhum dos dois, fica a data de início, para o registro não contar
-- como atendimento ativo depois de terminado.
UPDATE "vinculos_estagiario" v SET "encerrado_em" = coalesce(
  (SELECT min(t."transferido_em") FROM "transferencias_caso" t WHERE t."vinculo_anterior_id" = v."id"),
  (SELECT min(d."decidido_em") FROM "desligamentos_por_faltas" d WHERE d."caso_id" = v."caso_id" AND d."decidido_em" >= v."vinculado_em"),
  v."vinculado_em"
) WHERE NOT v."vigente";--> statement-breakpoint
UPDATE "atribuicoes_supervisor" a SET "encerrada_em" = coalesce(
  (SELECT min(t."transferido_em") FROM "transferencias_caso" t WHERE t."atribuicao_anterior_id" = a."id"),
  a."atribuido_em"
) WHERE NOT a."vigente";--> statement-breakpoint
CREATE TRIGGER "alteracoes_parametro_somente_insercao" BEFORE UPDATE OR DELETE ON "alteracoes_parametro"
  FOR EACH ROW EXECUTE FUNCTION "impedir_alteracao_registro"();--> statement-breakpoint
ALTER TABLE "atribuicoes_supervisor" ADD CONSTRAINT "atribuicoes_supervisor_encerrada_sem_vigencia" CHECK ("atribuicoes_supervisor"."vigente" = ("atribuicoes_supervisor"."encerrada_em" is null));--> statement-breakpoint
ALTER TABLE "vinculos_estagiario" ADD CONSTRAINT "vinculos_estagiario_encerrado_sem_vigencia" CHECK ("vinculos_estagiario"."vigente" = ("vinculos_estagiario"."encerrado_em" is null));