ALTER TABLE "inscricoes" ALTER COLUMN "queixa_cifrada" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "inscricoes" ALTER COLUMN "percepcao_urgencia_cifrada" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "inscricoes" ALTER COLUMN "historico_relevante_cifrado" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "decisoes_prioridade" ADD COLUMN "decisao_anterior_id" uuid;--> statement-breakpoint
ALTER TABLE "decisoes_prioridade" ADD CONSTRAINT "decisoes_prioridade_anterior_fk" FOREIGN KEY ("decisao_anterior_id") REFERENCES "public"."decisoes_prioridade"("id");--> statement-breakpoint
ALTER TYPE "status_sessao" ADD VALUE 'realizada';--> statement-breakpoint
ALTER TABLE "sessoes_atendimento" ADD COLUMN "ciclo_atendimento" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE TABLE "evolucoes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "prontuario_id" uuid NOT NULL,
  "sessao_id" uuid NOT NULL,
  "queixa_cifrada" text NOT NULL,
  "planejamento_cifrado" text NOT NULL,
  "registrada_por" uuid NOT NULL,
  "registrada_em" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "evolucoes_sessao_id_unique" UNIQUE("sessao_id")
);--> statement-breakpoint
ALTER TABLE "evolucoes" ADD CONSTRAINT "evolucoes_prontuario_fk" FOREIGN KEY ("prontuario_id") REFERENCES "public"."prontuarios"("id");--> statement-breakpoint
ALTER TABLE "evolucoes" ADD CONSTRAINT "evolucoes_sessao_fk" FOREIGN KEY ("sessao_id") REFERENCES "public"."sessoes_atendimento"("id");--> statement-breakpoint
ALTER TABLE "evolucoes" ADD CONSTRAINT "evolucoes_autor_fk" FOREIGN KEY ("registrada_por") REFERENCES "public"."usuarios"("id");--> statement-breakpoint
CREATE INDEX "sessoes_caso_ciclo_inicio" ON "sessoes_atendimento" USING btree ("caso_id", "ciclo_atendimento", "inicio");--> statement-breakpoint
CREATE TRIGGER "evolucoes_somente_insercao" BEFORE UPDATE OR DELETE ON "evolucoes"
  FOR EACH ROW EXECUTE FUNCTION "impedir_alteracao_registro"();;--> statement-breakpoint
-- RNF9: a sessão realizada continua ocupando o horário (o estagiário, até o fim das
-- anotações). Como hoje todo status ocupa a agenda, as restrições valem para qualquer
-- sessão. Quando o RF15 criar o cancelamento, ele entra como exceção no WHERE, numa
-- migration própria (o valor novo do enum não pode ser usado na mesma transação).
ALTER TABLE "sessoes_atendimento" DROP CONSTRAINT "sessoes_estagiario_sem_sobreposicao";--> statement-breakpoint
ALTER TABLE "sessoes_atendimento" ADD CONSTRAINT "sessoes_estagiario_sem_sobreposicao"
  EXCLUDE USING gist ("estagiario_id" WITH =, tstzrange("inicio", "fim_intervalo_anotacoes", '[)') WITH &&);--> statement-breakpoint
ALTER TABLE "sessoes_atendimento" DROP CONSTRAINT "sessoes_caso_sem_sobreposicao";--> statement-breakpoint
ALTER TABLE "sessoes_atendimento" ADD CONSTRAINT "sessoes_caso_sem_sobreposicao"
  EXCLUDE USING gist ("caso_id" WITH =, tstzrange("inicio", "termino", '[)') WITH &&);
