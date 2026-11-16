CREATE TABLE "correcoes_evolucao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evolucao_id" uuid NOT NULL,
	"versao" integer NOT NULL,
	"queixa_cifrada" text,
	"planejamento_cifrado" text,
	"humor_aparencia_cifrado" text,
	"conteudo_trabalhado_cifrado" text,
	"tecnicas_utilizadas_cifrado" text,
	"intervencoes_encaminhamentos_cifrado" text,
	"plano_proxima_sessao_cifrado" text,
	"motivo_cifrado" text NOT NULL,
	"corrigida_por" uuid NOT NULL,
	"corrigida_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "correcoes_evolucao_versao" UNIQUE("evolucao_id","versao"),
	CONSTRAINT "correcoes_evolucao_versao_seguinte" CHECK ("correcoes_evolucao"."versao" >= 2),
	CONSTRAINT "correcoes_evolucao_ficha_completa" CHECK (("correcoes_evolucao"."queixa_cifrada" IS NOT NULL AND "correcoes_evolucao"."planejamento_cifrado" IS NOT NULL) OR ("correcoes_evolucao"."humor_aparencia_cifrado" IS NOT NULL AND "correcoes_evolucao"."conteudo_trabalhado_cifrado" IS NOT NULL AND "correcoes_evolucao"."tecnicas_utilizadas_cifrado" IS NOT NULL AND "correcoes_evolucao"."plano_proxima_sessao_cifrado" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "correcoes_evolucao" ADD CONSTRAINT "correcoes_evolucao_evolucao_id_evolucoes_id_fk" FOREIGN KEY ("evolucao_id") REFERENCES "public"."evolucoes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "correcoes_evolucao" ADD CONSTRAINT "correcoes_evolucao_corrigida_por_usuarios_id_fk" FOREIGN KEY ("corrigida_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- A versão gravada não muda nem é apagada (RF29): o original e cada correção ficam
-- no histórico. O script do usuário da aplicação também tira dele o UPDATE e o DELETE.
CREATE TRIGGER "correcoes_evolucao_somente_insercao" BEFORE UPDATE OR DELETE ON "correcoes_evolucao"
  FOR EACH ROW EXECUTE FUNCTION "impedir_alteracao_registro"();
