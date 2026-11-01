import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PGlite } from '@electric-sql/pglite';
import { criarBancoDeTeste } from '../test-utils/banco-de-teste';

// O script do usuário da aplicação no banco (packages/database/sql), rodado sobre
// as migrations do projeto, como na implantação.
const SCRIPT = readFileSync(
  join(__dirname, '../../../../packages/database/sql/usuario-da-aplicacao.sql'),
  'utf8',
);
// As tabelas que só aceitam inserção hoje. O teste confere que o script acha
// pelo menos estas pelo gatilho, e cobre também as que entrarem depois.
const SO_INSERCAO_CONHECIDAS = [
  'acessos_prontuario',
  'auditoria',
  'evolucoes',
  'decisoes_prioridade',
];

describe('Usuário da aplicação no banco (RF55 e RF66)', () => {
  let banco: Awaited<ReturnType<typeof criarBancoDeTeste>>;
  let cliente: PGlite;

  beforeAll(async () => {
    banco = await criarBancoDeTeste();
    cliente = (banco.db as unknown as { $client: PGlite }).$client;
    await cliente.exec(SCRIPT);
    // Rodar de novo, como depois de cada migration, não dá erro.
    await cliente.exec(SCRIPT);
  }, 60_000);
  afterAll(() => banco.fechar());

  const pode = async (tabela: string, permissao: string) => {
    const { rows } = await cliente.query<{ pode: boolean }>(
      `select has_table_privilege('clinica_app', $1, $2) as pode`,
      [tabela, permissao],
    );
    return rows[0].pode;
  };

  // Toda tabela com o gatilho que impede alterar ou apagar o registro.
  const tabelasSoInsercao = async () => {
    const { rows } = await cliente.query<{ tabela: string }>(
      `select distinct t.tgrelid::regclass::text as tabela
       from pg_trigger t join pg_proc f on f.oid = t.tgfoid
       where f.proname = 'impedir_alteracao_registro' and not t.tgisinternal
       order by 1`,
    );
    return rows.map((r) => r.tabela);
  };

  it('o usuário da aplicação só insere e consulta os registros de acesso ao prontuário, sem alterar nem apagar (RF55, RF66, RNF52)', async () => {
    const soInsercao = await tabelasSoInsercao();
    expect(soInsercao).toEqual(expect.arrayContaining(SO_INSERCAO_CONHECIDAS));
    for (const tabela of soInsercao) {
      expect([tabela, await pode(tabela, 'INSERT')]).toEqual([tabela, true]);
      expect([tabela, await pode(tabela, 'SELECT')]).toEqual([tabela, true]);
      for (const permissao of ['UPDATE', 'DELETE', 'TRUNCATE']) {
        expect([tabela, permissao, await pode(tabela, permissao)]).toEqual([
          tabela,
          permissao,
          false,
        ]);
      }
    }
    // Nas outras tabelas, a aplicação lê e grava normalmente.
    expect(await pode('usuarios', 'UPDATE')).toBe(true);
    expect(await pode('prontuarios', 'UPDATE')).toBe(true);
  });

  it('uma tabela nova que só aceita inserção também fica sem alterar nem apagar para o usuário da aplicação (RF55, RNF52)', async () => {
    await cliente.exec(`
      create table registros_novos (id serial primary key, texto text);
      create trigger registros_novos_somente_insercao
        before update or delete on registros_novos
        for each row execute function impedir_alteracao_registro();
    `);
    try {
      await cliente.exec(SCRIPT);
      expect(await pode('registros_novos', 'INSERT')).toBe(true);
      expect(await pode('registros_novos', 'UPDATE')).toBe(false);
      expect(await pode('registros_novos', 'DELETE')).toBe(false);
    } finally {
      await cliente.exec('drop table registros_novos');
    }
  });

  it('como usuário da aplicação, apagar ou alterar o registro de acessos é recusado pela permissão do banco (RF55, RNF52)', async () => {
    await cliente.exec('set role clinica_app');
    try {
      await cliente.exec(
        "insert into auditoria (operacao, entidade) values ('teste', 'teste')",
      );
      await expect(
        cliente.exec('delete from acessos_prontuario'),
      ).rejects.toThrow(/permission denied/);
      await expect(
        cliente.exec("update auditoria set operacao = 'outra'"),
      ).rejects.toThrow(/permission denied/);
    } finally {
      await cliente.exec('reset role');
    }
  });
});
