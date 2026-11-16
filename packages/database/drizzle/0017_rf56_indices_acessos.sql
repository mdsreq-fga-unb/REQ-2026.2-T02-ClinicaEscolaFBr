CREATE INDEX "acessos_prontuario_criado_em_idx" ON "acessos_prontuario" USING btree ("criado_em");--> statement-breakpoint
CREATE INDEX "acessos_prontuario_prontuario_criado_em_idx" ON "acessos_prontuario" USING btree ("prontuario_id","criado_em");--> statement-breakpoint
CREATE INDEX "acessos_prontuario_usuario_criado_em_idx" ON "acessos_prontuario" USING btree ("usuario_id","criado_em");