import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { drizzle } from 'drizzle-orm/pglite';
import * as schema from '@clinica/database';
import type { Db } from '@clinica/database';

const PASTA_MIGRATIONS = join(
  __dirname,
  '../../../../packages/database/drizzle',
);

// Banco Postgres em memória com as mesmas migrations do projeto, para testes de integração.
export type BancoDeTeste = {
  db: Db;
  limpar: () => Promise<unknown>;
  fechar: () => Promise<void>;
};

export async function criarBancoDeTeste(): Promise<BancoDeTeste> {
  const cliente = new PGlite({ extensions: { btree_gist } });
  const arquivos = readdirSync(PASTA_MIGRATIONS)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const arquivo of arquivos) {
    const sql = readFileSync(join(PASTA_MIGRATIONS, arquivo), 'utf8');
    for (const comando of sql.split('--> statement-breakpoint')) {
      if (comando.trim()) await cliente.exec(comando);
    }
  }
  const db = drizzle(cliente, { schema }) as unknown as Db;
  // Esvazia as tabelas entre os testes, mantendo os parâmetros iniciais.
  const limpar = () =>
    cliente.exec(
      `TRUNCATE acessos_prontuario, links_confirmacao, sessoes_atendimento, prontuarios,
        vinculos_estagiario, atribuicoes_supervisor, casos, decisoes_prioridade, inscricoes,
        sessoes_login, convites_ativacao, auditoria, usuarios CASCADE`,
    );
  return { db, limpar, fechar: () => cliente.close() };
}

export const CHAVE_TESTE = Buffer.alloc(32, 7).toString('base64');
