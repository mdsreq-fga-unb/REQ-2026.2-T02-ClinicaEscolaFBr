CREATE TABLE "transferencias_casos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caso_id" uuid NOT NULL,
	"estagiario_origem_id" uuid,
	"estagiario_destino_id" uuid NOT NULL,
	"autorizado_por_id" uuid NOT NULL,
	"motivo" text NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
