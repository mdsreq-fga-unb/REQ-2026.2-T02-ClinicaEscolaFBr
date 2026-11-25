CREATE TYPE "public"."canal_declaracao" AS ENUM('secretaria', 'verificacao');--> statement-breakpoint
CREATE TABLE "autorizacoes_menor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inscricao_id" uuid NOT NULL,
	"entregue_em" date NOT NULL,
	"registrado_por" uuid NOT NULL,
	"registrado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "autorizacoes_menor_inscricao_id_unique" UNIQUE("inscricao_id")
);
--> statement-breakpoint
CREATE TABLE "emissoes_declaracao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sessao_id" uuid NOT NULL,
	"inscricao_id" uuid NOT NULL,
	"canal" "canal_declaracao" NOT NULL,
	"emitida_por" uuid,
	"tipo" text DEFAULT 'emissao' NOT NULL,
	"emitida_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "emissoes_declaracao_autor_do_canal" CHECK (("emissoes_declaracao"."canal" = 'secretaria') = ("emissoes_declaracao"."emitida_por" is not null)),
	CONSTRAINT "emissoes_declaracao_tipo" CHECK ("emissoes_declaracao"."tipo" in ('emissao', 'reemissao'))
);
--> statement-breakpoint
ALTER TABLE "autorizacoes_menor" ADD CONSTRAINT "autorizacoes_menor_inscricao_id_inscricoes_id_fk" FOREIGN KEY ("inscricao_id") REFERENCES "public"."inscricoes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "autorizacoes_menor" ADD CONSTRAINT "autorizacoes_menor_registrado_por_usuarios_id_fk" FOREIGN KEY ("registrado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emissoes_declaracao" ADD CONSTRAINT "emissoes_declaracao_sessao_id_sessoes_atendimento_id_fk" FOREIGN KEY ("sessao_id") REFERENCES "public"."sessoes_atendimento"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emissoes_declaracao" ADD CONSTRAINT "emissoes_declaracao_inscricao_id_inscricoes_id_fk" FOREIGN KEY ("inscricao_id") REFERENCES "public"."inscricoes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emissoes_declaracao" ADD CONSTRAINT "emissoes_declaracao_emitida_por_usuarios_id_fk" FOREIGN KEY ("emitida_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- As emissões são só inserção (RF45, RNF39): nenhuma é alterada nem apagada. O
-- usuário da aplicação também não recebe UPDATE, DELETE nem TRUNCATE nesta
-- tabela (usuario-da-aplicacao.sql).
CREATE TRIGGER "emissoes_declaracao_somente_insercao" BEFORE UPDATE OR DELETE ON "emissoes_declaracao"
  FOR EACH ROW EXECUTE FUNCTION "impedir_alteracao_registro"();
