import { sql } from 'drizzle-orm';
import type { Transacao } from '../../auditoria/auditoria.service';

// Trava a evolução até o fim da transação: correção (RF29), complemento (RF30) e
// validação (RF67) entram um de cada vez. O FOR UPDATE pediria a permissão de UPDATE,
// que o usuário da aplicação não tem nas evoluções.
export const travarEvolucao = (tx: Transacao, evolucaoId: string) =>
  tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`correcao_evolucao:${evolucaoId}`}, 0))`,
  );
