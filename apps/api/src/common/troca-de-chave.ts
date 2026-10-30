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
  // As duas chaves são conferidas antes de tudo: com o banco vazio, uma chave
  // nova inválida passaria e ficaria registrada como troca feita.
  for (const [nome, chave] of [
    ['antiga', chaveAntiga],
    ['nova', chaveNova],
  ] as const) {
    if (Buffer.from(chave, 'base64').length !== 32) {
      throw new Error(`A chave ${nome} deve ter 32 bytes em base64.`);
    }
  }
  if (
    Buffer.from(chaveAntiga, 'base64').equals(Buffer.from(chaveNova, 'base64'))
  ) {
    throw new Error('A chave nova é igual à antiga.');
  }
  return db.transaction(async (tx) => {
    // Com a API conectada, o que ela gravar durante a troca sai com a chave
    // antiga e fica ilegível com a nova.
    const { rows: conexoes } = (await tx.execute(sql`
      select count(*)::int as total from pg_stat_activity
      where usename = 'clinica_app' and pid <> pg_backend_pid()
    `)) as unknown as { rows: { total: number }[] };
    if (conexoes[0]?.total) {
      throw new Error(
        'A API ainda está conectada ao banco (clinica_app). Pare o contêiner da API antes da troca.',
      );
    }
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
