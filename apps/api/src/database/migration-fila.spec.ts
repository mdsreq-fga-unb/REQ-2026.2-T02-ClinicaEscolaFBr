import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Migration RF7 sobre a development com RF52', () => {
  it('preserva casos legados, datas de inscrição e verificação de identidade', async () => {
    // PostgreSQL em memória: não usa DATABASE_URL nem dados de pacientes reais.
    const db = new PGlite({ extensions: { btree_gist } });
    const pasta = resolve(__dirname, '../../../../packages/database/drizzle');
    const journal = JSON.parse(
      readFileSync(resolve(pasta, 'meta/_journal.json'), 'utf8'),
    ) as {
      entries: { idx: number; tag: string }[];
    };
    const aplicar = async (tag: string) => {
      for (const comando of readFileSync(
        resolve(pasta, `${tag}.sql`),
        'utf8',
      ).split('--> statement-breakpoint')) {
        if (comando.trim()) await db.exec(comando);
      }
    };
    try {
      for (const { tag } of journal.entries.filter((e) => e.idx <= 11))
        await aplicar(tag);
      const { rows } = await db.query<{ id: string }>(
        `insert into inscricoes(numero,nome_completo,data_nascimento,cpf,rg,endereco,estado_civil,email,canal_preferencial,criada_em)
         values ('2026-00001','Pessoa fictícia','1990-01-01','52998224725','123','Rua fictícia','Solteiro(a)','ficticio@example.com','email','2026-01-02T03:04:05Z') returning id`,
      );
      await db.query('insert into casos(inscricao_id) values ($1)', [
        rows[0].id,
      ]);
      await db.query(
        `insert into verificacoes_identidade(inscricao_id,token_hash,expira_em) values ($1,'hash-ficticio','2026-01-03T00:00:00Z')`,
        [rows[0].id],
      );
      await aplicar('0012_entrada_na_fila');
      const resultado = await db.query<{
        entrada: Date;
        criada: Date;
        situacao: string;
        token: string;
      }>(
        `select c.entrada_na_fila_em as entrada, i.criada_em as criada, c.situacao,
                v.token_hash as token from casos c join inscricoes i on i.id=c.inscricao_id
                join verificacoes_identidade v on v.inscricao_id=i.id`,
      );
      expect(resultado.rows).toEqual([
        {
          entrada: new Date('2026-01-02T03:04:05Z'),
          criada: new Date('2026-01-02T03:04:05Z'),
          situacao: 'aguardando_distribuicao',
          token: 'hash-ficticio',
        },
      ]);
      await expect(
        db.query('update casos set entrada_na_fila_em = null'),
      ).rejects.toThrow();
    } finally {
      await db.close();
    }
  }, 60_000);
});
