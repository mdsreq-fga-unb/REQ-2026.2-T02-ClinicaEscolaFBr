ALTER TABLE "usuarios" ADD COLUMN "entradas_em_curso" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "em_curso_desde" timestamp with time zone;