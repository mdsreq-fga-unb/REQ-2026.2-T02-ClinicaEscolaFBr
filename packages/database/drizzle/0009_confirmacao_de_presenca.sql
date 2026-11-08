CREATE TYPE "public"."meio_confirmacao" AS ENUM('link', 'secretaria');--> statement-breakpoint
ALTER TABLE "sessoes_atendimento" ADD COLUMN "confirmada_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sessoes_atendimento" ADD COLUMN "confirmada_por" "meio_confirmacao";--> statement-breakpoint
ALTER TABLE "sessoes_atendimento" ADD CONSTRAINT "sessoes_confirmacao_completa" CHECK (("sessoes_atendimento"."confirmada_em" is null) = ("sessoes_atendimento"."confirmada_por" is null));--> statement-breakpoint
-- Valor padrão do prazo de confirmação confirmado com a FBr (DF45).
INSERT INTO "parametros" ("chave", "valor") VALUES ('prazo_confirmacao_horas', '24');--> statement-breakpoint
-- O link passa a valer até o início da sessão, porque o cancelamento pelo link vale
-- até lá (RF15, RNF59); o prazo de confirmação é conferido à parte. Os links já
-- enviados das sessões futuras acompanham. Esta consulta não usa os status criados na
-- 0007: o migrate aplica as migrations pendentes numa transação só.
UPDATE "links_confirmacao" AS l
SET "expira_em" = s."inicio"
FROM "sessoes_atendimento" AS s
WHERE s."id" = l."sessao_id" AND l."usado_em" IS NULL AND s."inicio" > now();
