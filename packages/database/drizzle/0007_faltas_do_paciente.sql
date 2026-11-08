CREATE TYPE "public"."origem_falta" AS ENUM('falta', 'cancelamento_fora_do_prazo');--> statement-breakpoint
ALTER TYPE "public"."status_sessao" ADD VALUE 'confirmada' BEFORE 'realizada';--> statement-breakpoint
ALTER TYPE "public"."status_sessao" ADD VALUE 'cancelada' BEFORE 'realizada';--> statement-breakpoint
ALTER TYPE "public"."status_sessao" ADD VALUE 'falta_paciente';--> statement-breakpoint
CREATE TABLE "faltas_paciente" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sessao_id" uuid NOT NULL,
	"caso_id" uuid NOT NULL,
	"ciclo_atendimento" integer NOT NULL,
	"origem" "origem_falta" NOT NULL,
	"registrada_por" uuid,
	"registrada_pelo_paciente" boolean DEFAULT false NOT NULL,
	"registrada_em" timestamp with time zone DEFAULT now() NOT NULL,
	"justificada" boolean DEFAULT false NOT NULL,
	"motivo_justificativa_cifrado" text,
	"justificada_por" uuid,
	"justificada_em" timestamp with time zone,
	"retirada_por" uuid,
	"retirada_em" timestamp with time zone,
	CONSTRAINT "faltas_paciente_sessao_id_unique" UNIQUE("sessao_id"),
	CONSTRAINT "faltas_autor" CHECK (("faltas_paciente"."registrada_por" is not null) <> "faltas_paciente"."registrada_pelo_paciente"),
	CONSTRAINT "faltas_justificativa_completa" CHECK ("faltas_paciente"."justificada" = ("faltas_paciente"."motivo_justificativa_cifrado" is not null and "faltas_paciente"."justificada_em" is not null)),
	CONSTRAINT "faltas_retirada_completa" CHECK (("faltas_paciente"."retirada_em" is null) = ("faltas_paciente"."retirada_por" is null))
);
--> statement-breakpoint
ALTER TABLE "faltas_paciente" ADD CONSTRAINT "faltas_paciente_sessao_id_sessoes_atendimento_id_fk" FOREIGN KEY ("sessao_id") REFERENCES "public"."sessoes_atendimento"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faltas_paciente" ADD CONSTRAINT "faltas_paciente_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faltas_paciente" ADD CONSTRAINT "faltas_paciente_registrada_por_usuarios_id_fk" FOREIGN KEY ("registrada_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faltas_paciente" ADD CONSTRAINT "faltas_paciente_justificada_por_usuarios_id_fk" FOREIGN KEY ("justificada_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faltas_paciente" ADD CONSTRAINT "faltas_paciente_retirada_por_usuarios_id_fk" FOREIGN KEY ("retirada_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "faltas_caso_ciclo" ON "faltas_paciente" USING btree ("caso_id","ciclo_atendimento");--> statement-breakpoint
-- Só a sessão cancelada libera o horário (RNF9). O valor novo do enum não pode ser
-- usado na transação em que é criado, e o migrate aplica as migrations pendentes numa
-- transação só: por isso a condição compara o status como texto. A conversão do enum
-- para texto não é imutável, e a condição de uma restrição de exclusão só aceita
-- funções imutáveis; a comparação fica numa função PL/pgSQL marcada como imutável,
-- o que vale porque os rótulos do enum não são renomeados.
CREATE FUNCTION "sessao_ocupa_horario"(status "status_sessao") RETURNS boolean
  IMMUTABLE AS $$
BEGIN
  RETURN status::text <> 'cancelada';
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
ALTER TABLE "sessoes_atendimento" DROP CONSTRAINT "sessoes_estagiario_sem_sobreposicao";--> statement-breakpoint
ALTER TABLE "sessoes_atendimento" ADD CONSTRAINT "sessoes_estagiario_sem_sobreposicao"
  EXCLUDE USING gist ("estagiario_id" WITH =, tstzrange("inicio", "fim_intervalo_anotacoes", '[)') WITH &&)
  WHERE ("sessao_ocupa_horario"("status"));--> statement-breakpoint
ALTER TABLE "sessoes_atendimento" DROP CONSTRAINT "sessoes_caso_sem_sobreposicao";--> statement-breakpoint
ALTER TABLE "sessoes_atendimento" ADD CONSTRAINT "sessoes_caso_sem_sobreposicao"
  EXCLUDE USING gist ("caso_id" WITH =, tstzrange("inicio", "termino", '[)') WITH &&)
  WHERE ("sessao_ocupa_horario"("status"));--> statement-breakpoint
-- Registros que só ganham informação (RNF32): a linha não é apagada, os campos de
-- identidade (1º argumento) nunca mudam e os de preenchimento único (2º argumento)
-- só passam de vazio a preenchido. O usuário da aplicação também não recebe DELETE
-- nessas tabelas (usuario-da-aplicacao.sql).
CREATE FUNCTION "proteger_campos_preenchidos"() RETURNS trigger AS $$
DECLARE
  antigo jsonb;
  novo jsonb;
  campo text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Registro não pode ser apagado (tabela %)', TG_TABLE_NAME;
  END IF;
  antigo := to_jsonb(OLD);
  novo := to_jsonb(NEW);
  FOREACH campo IN ARRAY string_to_array(TG_ARGV[0], ',') LOOP
    IF antigo -> campo IS DISTINCT FROM novo -> campo THEN
      RAISE EXCEPTION 'O campo % não pode ser alterado (tabela %)', campo, TG_TABLE_NAME;
    END IF;
  END LOOP;
  FOREACH campo IN ARRAY string_to_array(TG_ARGV[1], ',') LOOP
    IF antigo ->> campo IS NOT NULL AND antigo -> campo IS DISTINCT FROM novo -> campo THEN
      RAISE EXCEPTION 'O campo % já foi preenchido e não pode mudar (tabela %)', campo, TG_TABLE_NAME;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER "faltas_paciente_campos_preenchidos" BEFORE UPDATE OR DELETE ON "faltas_paciente"
  FOR EACH ROW EXECUTE FUNCTION "proteger_campos_preenchidos"(
    'id,sessao_id,caso_id,ciclo_atendimento,origem,registrada_por,registrada_pelo_paciente,registrada_em',
    'motivo_justificativa_cifrado,justificada_por,justificada_em,retirada_por,retirada_em'
  );
