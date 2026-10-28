import { auditoria, type Db } from '@clinica/database';
import { sql } from 'drizzle-orm';
import { cifrar, decifrar } from './criptografia';

type Coluna = { tabela: string; coluna: string };

// Troca da chave dos dados de saúde (RNF51, gestão das chaves): decifra cada
// valor com a chave antiga e cifra de novo com a nova, numa transação só, e
// registra a troca na auditoria com o responsável. As colunas cifradas são as que
// terminam em "_cifrada" ou "_cifrado", então uma coluna nova entra sozinha.
// Tabelas que só aceitam inserção (evoluções e decisões de prioridade) têm os
// gatilhos desligados só dentro da transação, para a nova cifra ser gravada.
export async function trocarChaveDados(
  db: Db,
  chaveAntiga: string,
  chaveNova: string,
  responsavel: string,
) {
  if (!responsavel.trim()) {
    throw new Error('Informe o responsável pela troca da chave.');
  }
  return db.transaction(async (tx) => {
    const { rows: colunas } = (await tx.execute(sql`
      select table_name as tabela, column_name as coluna
      from information_schema.columns
      where table_schema = 'public' and column_name ~ '_cifrad[ao]$'
      order by 1, 2
    `)) as unknown as { rows: Coluna[] };
    const tabelas = [...new Set(colunas.map((c) => c.tabela))];

    for (const tabela of tabelas) {
      await tx.execute(
        sql`alter table ${sql.identifier(tabela)} disable trigger user`,
      );
    }
    let registros = 0;
    for (const { tabela, coluna } of colunas) {
      const { rows } = (await tx.execute(sql`
        select id, ${sql.identifier(coluna)} as valor
        from ${sql.identifier(tabela)}
        where ${sql.identifier(coluna)} is not null
      `)) as unknown as { rows: { id: string; valor: string }[] };
      for (const { id, valor } of rows) {
        const novo = cifrar(decifrar(valor, chaveAntiga), chaveNova);
        await tx.execute(sql`
          update ${sql.identifier(tabela)}
          set ${sql.identifier(coluna)} = ${novo}
          where id = ${id}
        `);
        registros += 1;
      }
    }
    for (const tabela of tabelas) {
      await tx.execute(
        sql`alter table ${sql.identifier(tabela)} enable trigger user`,
      );
    }

    const resumo = {
      responsavel: responsavel.trim(),
      colunas: colunas.map((c) => `${c.tabela}.${c.coluna}`),
      registros,
    };
    await tx.insert(auditoria).values({
      operacao: 'trocar_chave_dados',
      entidade: 'chave_dados',
      dadosNovos: resumo,
    });
    return resumo;
  });
}
