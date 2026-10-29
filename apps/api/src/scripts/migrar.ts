import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createDb } from '@clinica/database';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

// Migrations da implantação, rodadas pelo serviço "migrador" antes de a API subir,
// com o dono do banco (a API se conecta com o clinica_app, que não altera o
// esquema). Depois das migrations, aplica as permissões do clinica_app
// (packages/database/sql/usuario-da-aplicacao.sql) e, na primeira vez, a senha dele.
//   DATABASE_URL=<dono do banco> CLINICA_APP_SENHA=... node dist/scripts/migrar.js
// As mesmas migrations do `pnpm db:migrate`, registradas na mesma tabela.
// A raiz do pacote @clinica/database, um nível acima do dist/index.js dele.
const PACOTE_DATABASE = resolve(
  dirname(require.resolve('@clinica/database')),
  '..',
);

async function principal() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Informe DATABASE_URL, com o dono do banco.');
  const db = createDb(url);
  try {
    await migrate(db, {
      migrationsFolder: resolve(PACOTE_DATABASE, 'drizzle'),
    });
    console.log('Migrations aplicadas.');

    const permissoes = resolve(PACOTE_DATABASE, 'sql/usuario-da-aplicacao.sql');
    if (existsSync(permissoes)) {
      await db.$client.query(readFileSync(permissoes, 'utf8'));
      const senha = process.env.CLINICA_APP_SENHA;
      if (senha) {
        const { rows } = await db.$client.query<{ comando: string }>(
          "select format('alter role clinica_app password %L', $1::text) as comando",
          [senha],
        );
        await db.$client.query(rows[0].comando);
      }
      console.log('Permissões do clinica_app aplicadas.');
    }
  } finally {
    await db.$client.end();
  }
}

principal().catch((erro: unknown) => {
  console.error(erro instanceof Error ? erro.message : erro);
  process.exit(1);
});
