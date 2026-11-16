CREATE TYPE "public"."forma_pagamento" AS ENUM('dinheiro', 'pix', 'cartao');--> statement-breakpoint
CREATE TABLE "pagamentos_contribuicao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caso_id" uuid NOT NULL,
	"ciclo_atendimento" integer NOT NULL,
	"versao" integer NOT NULL,
	"valor_centavos" integer NOT NULL,
	"pago_em" date NOT NULL,
	"forma" "forma_pagamento" NOT NULL,
	"motivo_correcao" text,
	"registrado_por" uuid NOT NULL,
	"registrado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pagamentos_contribuicao_versao_unica" UNIQUE("caso_id","ciclo_atendimento","versao"),
	CONSTRAINT "pagamentos_contribuicao_versao_positiva" CHECK ("pagamentos_contribuicao"."versao" >= 1),
	CONSTRAINT "pagamentos_contribuicao_valor_positivo" CHECK ("pagamentos_contribuicao"."valor_centavos" > 0),
	CONSTRAINT "pagamentos_contribuicao_motivo_da_correcao" CHECK (("pagamentos_contribuicao"."versao" = 1) = ("pagamentos_contribuicao"."motivo_correcao" is null))
);
--> statement-breakpoint
ALTER TABLE "pagamentos_contribuicao" ADD CONSTRAINT "pagamentos_contribuicao_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagamentos_contribuicao" ADD CONSTRAINT "pagamentos_contribuicao_registrado_por_usuarios_id_fk" FOREIGN KEY ("registrado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Valor da contribuição social (RF41): R$ 35,00, guardado em centavos.
INSERT INTO "parametros" ("chave", "valor") VALUES ('valor_contribuicao_centavos', '3500');--> statement-breakpoint
-- O pagamento e as correções são só inserção (RF41, RNF36): a correção é uma versão
-- nova, e nenhuma versão é alterada nem apagada. O usuário da aplicação também não
-- recebe UPDATE, DELETE nem TRUNCATE nesta tabela (usuario-da-aplicacao.sql).
CREATE TRIGGER "pagamentos_contribuicao_somente_insercao" BEFORE UPDATE OR DELETE ON "pagamentos_contribuicao"
  FOR EACH ROW EXECUTE FUNCTION "impedir_alteracao_registro"();
