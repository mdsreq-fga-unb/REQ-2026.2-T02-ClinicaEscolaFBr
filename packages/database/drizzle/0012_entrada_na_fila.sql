-- A primeira entrada na fila mantém a data da inscrição, inclusive nos casos existentes.
ALTER TABLE "casos" ADD COLUMN "entrada_na_fila_em" timestamp with time zone;
--> statement-breakpoint
UPDATE "casos" SET "entrada_na_fila_em" = "inscricoes"."criada_em"
FROM "inscricoes" WHERE "casos"."inscricao_id" = "inscricoes"."id";
--> statement-breakpoint
ALTER TABLE "casos" ALTER COLUMN "entrada_na_fila_em" SET NOT NULL;
