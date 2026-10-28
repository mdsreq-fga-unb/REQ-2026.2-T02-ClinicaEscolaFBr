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
const SO_INSERCAO = [
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

  it('o usuário da aplicação só insere e consulta os registros de acesso ao prontuário, sem alterar nem apagar (RF55, RF66, RNF52)', async () => {
    for (const tabela of SO_INSERCAO) {
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
