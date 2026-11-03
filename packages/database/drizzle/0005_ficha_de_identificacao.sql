ALTER TABLE "inscricoes" ADD COLUMN "bairro" text;--> statement-breakpoint
ALTER TABLE "inscricoes" ADD COLUMN "cidade_uf" text;--> statement-breakpoint
ALTER TABLE "inscricoes" ADD COLUMN "cep" text;--> statement-breakpoint
ALTER TABLE "inscricoes" ADD COLUMN "sexo" text;--> statement-breakpoint
ALTER TABLE "inscricoes" ADD COLUMN "profissao" text;--> statement-breakpoint
ALTER TABLE "inscricoes" ADD COLUMN "escolaridade" text;--> statement-breakpoint
ALTER TABLE "inscricoes" ADD COLUMN "cpf_responsavel" text;--> statement-breakpoint
ALTER TABLE "inscricoes" ADD COLUMN "documento_responsavel" text;--> statement-breakpoint
ALTER TABLE "inscricoes" ADD COLUMN "whatsapp" text;--> statement-breakpoint
ALTER TABLE "inscricoes" ADD COLUMN "contato_emergencia_nome" text;--> statement-breakpoint
ALTER TABLE "inscricoes" ADD COLUMN "contato_emergencia_parentesco" text;--> statement-breakpoint
ALTER TABLE "inscricoes" ADD COLUMN "contato_emergencia_telefone" text;--> statement-breakpoint
ALTER TABLE "inscricoes" ADD CONSTRAINT "inscricoes_cpf_responsavel_11_digitos" CHECK ("inscricoes"."cpf_responsavel" is null or "inscricoes"."cpf_responsavel" ~ '^[0-9]{11}$');--> statement-breakpoint
ALTER TABLE "inscricoes" ADD CONSTRAINT "inscricoes_cep_8_digitos" CHECK ("inscricoes"."cep" is null or "inscricoes"."cep" ~ '^[0-9]{8}$');