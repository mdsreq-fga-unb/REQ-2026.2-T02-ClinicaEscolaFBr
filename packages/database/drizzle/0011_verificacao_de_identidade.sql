CREATE TABLE "codigos_verificacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inscricao_id" uuid NOT NULL,
	"identificador_chave" text NOT NULL,
	"codigo_hash" text NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"tentativas_falhas" integer DEFAULT 0 NOT NULL,
	"usado_em" timestamp with time zone,
	"invalidado_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "codigos_verificacao_tentativas" CHECK ("codigos_verificacao"."tentativas_falhas" between 0 and 5)
);
--> statement-breakpoint
CREATE TABLE "limites_codigo_verificacao" (
	"identificador_chave" text PRIMARY KEY NOT NULL,
	"ultimo_envio_em" timestamp with time zone NOT NULL,
	"janela_inicio" timestamp with time zone NOT NULL,
	"envios_na_janela" integer NOT NULL,
	"bloqueado_ate" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "verificacoes_identidade" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inscricao_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"criada_em" timestamp with time zone DEFAULT now() NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"encerrada_em" timestamp with time zone,
	CONSTRAINT "verificacoes_identidade_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "codigos_verificacao" ADD CONSTRAINT "codigos_verificacao_inscricao_id_inscricoes_id_fk" FOREIGN KEY ("inscricao_id") REFERENCES "public"."inscricoes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verificacoes_identidade" ADD CONSTRAINT "verificacoes_identidade_inscricao_id_inscricoes_id_fk" FOREIGN KEY ("inscricao_id") REFERENCES "public"."inscricoes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "codigos_verificacao_identificador_idx" ON "codigos_verificacao" USING btree ("identificador_chave");