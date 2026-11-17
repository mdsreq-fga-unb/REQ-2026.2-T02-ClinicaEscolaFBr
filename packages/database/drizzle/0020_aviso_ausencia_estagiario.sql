CREATE TYPE "public"."aviso_paciente" AS ENUM('envio_pendente', 'email_enviado', 'sem_email', 'email_nao_enviado');--> statement-breakpoint
CREATE TYPE "public"."canal_aviso_manual" AS ENUM('whatsapp', 'outro');--> statement-breakpoint
ALTER TABLE "cancelamentos_sessao" ADD COLUMN "aviso_paciente" "aviso_paciente";--> statement-breakpoint
ALTER TABLE "cancelamentos_sessao" ADD COLUMN "aviso_manual_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "cancelamentos_sessao" ADD COLUMN "aviso_manual_por" uuid;--> statement-breakpoint
ALTER TABLE "cancelamentos_sessao" ADD COLUMN "aviso_manual_canal" "canal_aviso_manual";--> statement-breakpoint
ALTER TABLE "cancelamentos_sessao" ADD CONSTRAINT "cancelamentos_sessao_aviso_manual_por_usuarios_id_fk" FOREIGN KEY ("aviso_manual_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- O aviso ao paciente (RF17) é gravado na transação do cancelamento por ausência do
-- estagiário (RF16). NOT VALID: o check vale para as linhas novas, sem conferir os
-- cancelamentos anteriores a esta migration, que ficam com o aviso nulo e fora da
-- lista da secretaria.
ALTER TABLE "cancelamentos_sessao" ADD CONSTRAINT "cancelamentos_aviso_paciente" CHECK (("cancelamentos_sessao"."classificacao" = 'ausencia_estagiario') = ("cancelamentos_sessao"."aviso_paciente" is not null)) NOT VALID;--> statement-breakpoint
ALTER TABLE "cancelamentos_sessao" ADD CONSTRAINT "cancelamentos_aviso_manual_completo" CHECK (("cancelamentos_sessao"."aviso_manual_em" is null) = ("cancelamentos_sessao"."aviso_manual_por" is null) and ("cancelamentos_sessao"."aviso_manual_em" is null) = ("cancelamentos_sessao"."aviso_manual_canal" is null) and ("cancelamentos_sessao"."aviso_manual_em" is null or "cancelamentos_sessao"."aviso_paciente" is not null));--> statement-breakpoint
-- O cancelamento continua sem poder ser apagado nem alterado, menos o aviso (RF17): o
-- aviso_paciente muda depois do envio do e-mail, e o aviso manual da secretaria só
-- passa de vazio a preenchido. O usuário da aplicação passa a ter UPDATE, mas não
-- DELETE, nesta tabela (usuario-da-aplicacao.sql).
DROP TRIGGER "cancelamentos_sessao_somente_insercao" ON "cancelamentos_sessao";--> statement-breakpoint
CREATE TRIGGER "cancelamentos_sessao_campos_preenchidos" BEFORE UPDATE OR DELETE ON "cancelamentos_sessao"
  FOR EACH ROW EXECUTE FUNCTION "proteger_campos_preenchidos"(
    'id,sessao_id,origem,classificacao,justificativa_cifrada,registrado_por,registrado_em,antecedencia_minutos,desligamento_id',
    'aviso_manual_em,aviso_manual_por,aviso_manual_canal'
  );
