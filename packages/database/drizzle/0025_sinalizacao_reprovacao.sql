CREATE TYPE "public"."motivo_encerramento_sinalizacao" AS ENUM('decisao', 'contagem_abaixo_do_limite');--> statement-breakpoint
CREATE TABLE "sinalizacoes_reprovacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estagiario_id" uuid NOT NULL,
	"semestre" text NOT NULL,
	"gerada_em" timestamp with time zone DEFAULT now() NOT NULL,
	"encerrada_em" timestamp with time zone,
	"motivo_encerramento" "motivo_encerramento_sinalizacao",
	"reclassificacao_id" uuid,
	CONSTRAINT "sinalizacoes_reprovacao_semestre" CHECK ("sinalizacoes_reprovacao"."semestre" ~ '^[0-9]{4}/[12]$'),
	CONSTRAINT "sinalizacoes_reprovacao_encerramento" CHECK (("sinalizacoes_reprovacao"."encerrada_em" is null) = ("sinalizacoes_reprovacao"."motivo_encerramento" is null)),
	CONSTRAINT "sinalizacoes_reprovacao_reclassificacao" CHECK (("sinalizacoes_reprovacao"."reclassificacao_id" is not null) = (coalesce("sinalizacoes_reprovacao"."motivo_encerramento"::text, '') = 'contagem_abaixo_do_limite'))
);
--> statement-breakpoint
ALTER TABLE "sinalizacoes_reprovacao" ADD CONSTRAINT "sinalizacoes_reprovacao_estagiario_id_usuarios_id_fk" FOREIGN KEY ("estagiario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sinalizacoes_reprovacao" ADD CONSTRAINT "sinalizacoes_reprovacao_reclassificacao_id_reclassificacoes_falta_id_fk" FOREIGN KEY ("reclassificacao_id") REFERENCES "public"."reclassificacoes_falta"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sinalizacoes_reprovacao_aberta" ON "sinalizacoes_reprovacao" USING btree ("estagiario_id","semestre") WHERE "sinalizacoes_reprovacao"."encerrada_em" is null;--> statement-breakpoint
CREATE INDEX "sinalizacoes_reprovacao_estagiario" ON "sinalizacoes_reprovacao" USING btree ("estagiario_id","semestre");--> statement-breakpoint
-- A sinalização não é apagada (RF63): o estagiário, o semestre e a geração não
-- mudam, e o encerramento, pela decisão (RF64) ou pela contagem abaixo do limite, só
-- é preenchido uma vez. O script do usuário da aplicação tira dela o DELETE.
CREATE TRIGGER "sinalizacoes_reprovacao_campos_preenchidos" BEFORE UPDATE OR DELETE ON "sinalizacoes_reprovacao"
  FOR EACH ROW EXECUTE FUNCTION "proteger_campos_preenchidos"(
    'id,estagiario_id,semestre,gerada_em',
    'encerrada_em,motivo_encerramento,reclassificacao_id'
  );
