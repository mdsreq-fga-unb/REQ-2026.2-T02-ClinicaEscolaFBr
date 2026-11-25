CREATE TYPE "public"."destinatario_relatorio" AS ENUM('paciente', 'responsavel_legal');--> statement-breakpoint
CREATE TYPE "public"."estado_relatorio" AS ENUM('rascunho', 'em_revisao', 'devolvido', 'aprovado');--> statement-breakpoint
CREATE TABLE "entregas_relatorio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"versao_id" uuid NOT NULL,
	"via_assinada" boolean NOT NULL,
	"entregue_a" "destinatario_relatorio" NOT NULL,
	"entregue_em" date NOT NULL,
	"registrada_por" uuid NOT NULL,
	"registrada_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entregas_relatorio_versao_id_unique" UNIQUE("versao_id"),
	CONSTRAINT "entregas_relatorio_via_assinada" CHECK ("entregas_relatorio"."via_assinada")
);
--> statement-breakpoint
CREATE TABLE "impressoes_relatorio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"versao_id" uuid NOT NULL,
	"impressa_por" uuid NOT NULL,
	"impressa_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "relatorios_finais" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prontuario_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "relatorios_finais_prontuario_id_unique" UNIQUE("prontuario_id")
);
--> statement-breakpoint
CREATE TABLE "versoes_relatorio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"relatorio_id" uuid NOT NULL,
	"versao" integer NOT NULL,
	"estado" "estado_relatorio" DEFAULT 'rascunho' NOT NULL,
	"secoes_cifradas" text NOT NULL,
	"justificativa_excecao_cifrada" text,
	"origem" jsonb,
	"autor_id" uuid NOT NULL,
	"criada_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizada_em" timestamp with time zone DEFAULT now() NOT NULL,
	"enviada_em" timestamp with time zone,
	"decidida_por" uuid,
	"decidida_em" timestamp with time zone,
	"observacoes_cifradas" text,
	CONSTRAINT "versoes_relatorio_versao" UNIQUE("relatorio_id","versao"),
	CONSTRAINT "versoes_relatorio_versao_positiva" CHECK ("versoes_relatorio"."versao" >= 1),
	CONSTRAINT "versoes_relatorio_envio" CHECK ("versoes_relatorio"."estado" = 'rascunho' OR ("versoes_relatorio"."enviada_em" IS NOT NULL AND "versoes_relatorio"."origem" IS NOT NULL)),
	CONSTRAINT "versoes_relatorio_decisao" CHECK (("versoes_relatorio"."estado" in ('aprovado', 'devolvido')) = ("versoes_relatorio"."decidida_por" IS NOT NULL AND "versoes_relatorio"."decidida_em" IS NOT NULL)),
	CONSTRAINT "versoes_relatorio_observacoes" CHECK (("versoes_relatorio"."estado" = 'devolvido') = ("versoes_relatorio"."observacoes_cifradas" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "entregas_relatorio" ADD CONSTRAINT "entregas_relatorio_versao_id_versoes_relatorio_id_fk" FOREIGN KEY ("versao_id") REFERENCES "public"."versoes_relatorio"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entregas_relatorio" ADD CONSTRAINT "entregas_relatorio_registrada_por_usuarios_id_fk" FOREIGN KEY ("registrada_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impressoes_relatorio" ADD CONSTRAINT "impressoes_relatorio_versao_id_versoes_relatorio_id_fk" FOREIGN KEY ("versao_id") REFERENCES "public"."versoes_relatorio"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impressoes_relatorio" ADD CONSTRAINT "impressoes_relatorio_impressa_por_usuarios_id_fk" FOREIGN KEY ("impressa_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relatorios_finais" ADD CONSTRAINT "relatorios_finais_prontuario_id_prontuarios_id_fk" FOREIGN KEY ("prontuario_id") REFERENCES "public"."prontuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "versoes_relatorio" ADD CONSTRAINT "versoes_relatorio_relatorio_id_relatorios_finais_id_fk" FOREIGN KEY ("relatorio_id") REFERENCES "public"."relatorios_finais"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "versoes_relatorio" ADD CONSTRAINT "versoes_relatorio_autor_id_usuarios_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "versoes_relatorio" ADD CONSTRAINT "versoes_relatorio_decidida_por_usuarios_id_fk" FOREIGN KEY ("decidida_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "impressoes_relatorio_versao" ON "impressoes_relatorio" USING btree ("versao_id","impressa_em");--> statement-breakpoint
CREATE UNIQUE INDEX "versoes_relatorio_uma_aberta" ON "versoes_relatorio" USING btree ("relatorio_id") WHERE "versoes_relatorio"."estado" in ('rascunho', 'em_revisao');--> statement-breakpoint
CREATE UNIQUE INDEX "versoes_relatorio_uma_aprovada" ON "versoes_relatorio" USING btree ("relatorio_id") WHERE "versoes_relatorio"."estado" = 'aprovado';--> statement-breakpoint
-- Versão do relatório final (RF33): nenhuma é apagada. O rascunho muda à vontade
-- e só passa para "em revisão"; a versão em revisão só recebe a decisão do
-- supervisor (aprovar ou devolver), sem mudar o texto nem a origem; a aprovada e a
-- devolvida ficam fixas.
CREATE FUNCTION "proteger_versao_relatorio"() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'A versão do relatório final não pode ser apagada (RF33).';
  END IF;
  IF NEW.relatorio_id <> OLD.relatorio_id OR NEW.versao <> OLD.versao
     OR NEW.autor_id <> OLD.autor_id OR NEW.criada_em <> OLD.criada_em THEN
    RAISE EXCEPTION 'A identificação da versão do relatório final não muda (RF33).';
  END IF;
  IF OLD.estado = 'rascunho' AND NEW.estado IN ('rascunho', 'em_revisao') THEN
    RETURN NEW;
  END IF;
  IF OLD.estado = 'em_revisao' AND NEW.estado IN ('aprovado', 'devolvido')
     AND NEW.secoes_cifradas = OLD.secoes_cifradas
     AND NEW.justificativa_excecao_cifrada IS NOT DISTINCT FROM OLD.justificativa_excecao_cifrada
     AND NEW.origem IS NOT DISTINCT FROM OLD.origem
     AND NEW.enviada_em IS NOT DISTINCT FROM OLD.enviada_em
     AND NEW.atualizada_em = OLD.atualizada_em THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'A versão % do relatório final (%) não pode ser alterada (RF33).', OLD.versao, OLD.estado;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "versoes_relatorio_protegidas" BEFORE UPDATE OR DELETE ON "versoes_relatorio"
  FOR EACH ROW EXECUTE FUNCTION "proteger_versao_relatorio"();
--> statement-breakpoint
-- Só a versão aprovada é impressa e entregue (RF33).
CREATE FUNCTION "exigir_versao_relatorio_aprovada"() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "versoes_relatorio" WHERE "id" = NEW.versao_id AND "estado" = 'aprovado'
  ) THEN
    RAISE EXCEPTION 'Só a versão aprovada do relatório final é impressa e entregue (RF33).';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "impressoes_relatorio_versao_aprovada" BEFORE INSERT ON "impressoes_relatorio"
  FOR EACH ROW EXECUTE FUNCTION "exigir_versao_relatorio_aprovada"();
--> statement-breakpoint
CREATE TRIGGER "entregas_relatorio_versao_aprovada" BEFORE INSERT ON "entregas_relatorio"
  FOR EACH ROW EXECUTE FUNCTION "exigir_versao_relatorio_aprovada"();
--> statement-breakpoint
-- Impressões e entregas são só inserção; o usuário da aplicação também não recebe
-- UPDATE, DELETE nem TRUNCATE nelas (usuario-da-aplicacao.sql).
CREATE TRIGGER "impressoes_relatorio_somente_insercao" BEFORE UPDATE OR DELETE ON "impressoes_relatorio"
  FOR EACH ROW EXECUTE FUNCTION "impedir_alteracao_registro"();
--> statement-breakpoint
CREATE TRIGGER "entregas_relatorio_somente_insercao" BEFORE UPDATE OR DELETE ON "entregas_relatorio"
  FOR EACH ROW EXECUTE FUNCTION "impedir_alteracao_registro"();
