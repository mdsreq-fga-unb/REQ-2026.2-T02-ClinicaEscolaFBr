import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('RF57: migration depois das do RF7, do RF52, do RF25 e do RF27', () => {
  it('preserva inscrições legadas sem presumir aceite e impede alterar a versão publicada', async () => {
    const db = new PGlite({ extensions: { btree_gist } });
    const pasta = resolve(__dirname, '../../../../packages/database/drizzle');
    const aplicar = async (tag: string) => {
      for (const sql of readFileSync(
        resolve(pasta, `${tag}.sql`),
        'utf8',
      ).split('--> statement-breakpoint')) {
        if (sql.trim()) await db.exec(sql);
      }
    };
    try {
      const journal = JSON.parse(
        readFileSync(resolve(pasta, 'meta/_journal.json'), 'utf8'),
      ) as { entries: { idx: number; tag: string }[] };
      for (const { tag } of journal.entries.filter((e) => e.idx <= 14))
        await aplicar(tag);
      const { rows } = await db.query<{ id: string }>(
        `insert into inscricoes(numero,nome_completo,data_nascimento,cpf,rg,endereco,estado_civil,email,canal_preferencial,criada_em) values ('2026-00001','Pessoa fictícia','1990-01-01','52998224725','123','Rua fictícia','Solteiro(a)','ficticio@example.com','email','2026-01-02T03:04:05Z') returning id`,
      );
      await db.query(
        `insert into casos(inscricao_id,entrada_na_fila_em) values ($1,'2026-01-02T03:04:05Z')`,
        [rows[0].id],
      );
      await db.query(
        `insert into verificacoes_identidade(inscricao_id,token_hash,expira_em) values ($1,'ficticio','2026-01-03T03:04:05Z')`,
        [rows[0].id],
      );
      await aplicar('0015_consentimento_versionado');
      expect(
        (
          await db.query(
            `select i.versao_termo_aceita, i.termo_aceito_em, i.aceite_pelo_responsavel, c.entrada_na_fila_em, v.token_hash from inscricoes i join casos c on c.inscricao_id=i.id join verificacoes_identidade v on v.inscricao_id=i.id`,
          )
        ).rows,
      ).toEqual([
        {
          versao_termo_aceita: null,
          termo_aceito_em: null,
          aceite_pelo_responsavel: null,
          entrada_na_fila_em: new Date('2026-01-02T03:04:05Z'),
          token_hash: 'ficticio',
        },
      ]);
      await expect(
        db.query("update inscricoes set versao_termo_aceita='0.1'"),
      ).rejects.toThrow();
      await expect(
        db.query("update versoes_termo set titulo='outro texto'"),
      ).rejects.toThrow();
      await expect(db.query('delete from versoes_termo')).rejects.toThrow();
      const termo = (
        await db.query<{
          versao: string;
          provisoria: boolean;
          topicos: { titulo: string; corpo: string }[];
        }>('select * from versoes_termo')
      ).rows[0];
      expect(termo.versao).toBe('0.1');
      expect(termo.provisoria).toBe(true);
      expect(termo.topicos).toHaveLength(5);
      const documento = readFileSync(
        resolve(
          pasta,
          '../../../documentacao/docs/construcao/termo-consentimento.md',
        ),
        'utf8',
      );
      for (const topico of termo.topicos)
        expect(documento.replace(/\r\n/g, '\n')).toContain(topico.corpo);
    } finally {
      await db.close();
    }
  }, 60_000);
});
