CREATE TYPE "public"."situacao_usuario" AS ENUM('pendente_ativacao', 'ativo', 'desativado');--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "situacao" "situacao_usuario" DEFAULT 'pendente_ativacao' NOT NULL;--> statement-breakpoint
-- Contas que já existiam mantêm o estado: ativo vira "ativo" e inativo vira "desativado".
UPDATE "usuarios" SET "situacao" = CASE WHEN "ativo" THEN 'ativo'::"situacao_usuario" ELSE 'desativado'::"situacao_usuario" END;--> statement-breakpoint
ALTER TABLE "usuarios" DROP COLUMN "ativo";