const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const R = require("./rnfs.cjs");

const exemplo = (nome) =>
  readFileSync(join(__dirname, "exemplos", nome), "utf8");

test("lê o resultado do Jest e do Vitest pelo nome completo de cada teste", () => {
  const testes = R.lerRelatorio(
    {
      testResults: [
        {
          assertionResults: [
            {
              fullName:
                "Restrição de acesso (RF55) registro somente inserção (RNF52)",
              status: "passed",
            },
            { fullName: "outro teste (RNF25)", status: "failed" },
          ],
        },
      ],
    },
    "api",
  );
  assert.deepEqual(testes, [
    {
      nome: "Restrição de acesso (RF55) registro somente inserção (RNF52)",
      origem: "api",
      passou: true,
    },
    { nome: "outro teste (RNF25)", origem: "api", passou: false },
  ]);
});

test("lê o resultado do Playwright, com os títulos dos describe no nome", () => {
  const testes = R.lerRelatorio(
    {
      suites: [
        {
          title: "inscricao.spec.ts",
          specs: [],
          suites: [
            {
              title: "inscrição (RF1)",
              specs: [
                {
                  title: "sem violações WCAG em 320px (RNF56, RNF58)",
                  ok: true,
                  tests: [{ results: [{ status: "passed" }] }],
                },
                {
                  title: "pulado (RNF57)",
                  ok: true,
                  tests: [{ results: [{ status: "skipped" }] }],
                },
              ],
            },
          ],
        },
      ],
    },
    "e2e",
  );
  assert.equal(
    testes[0].nome,
    "inscricao.spec.ts › inscrição (RF1) › sem violações WCAG em 320px (RNF56, RNF58)",
  );
  assert.equal(testes[0].passou, true);
  assert.equal(testes[1].passou, false);
});

test("o resumo guarda só os testes que passaram e citam um RNF", () => {
  const resumo = R.resumirTestes([
    { nome: "ativa a conta (RF53, RNF49)", origem: "api", passou: true },
    { nome: "sem RNF (RF53)", origem: "api", passou: true },
    { nome: "falhou (RF53, RNF10)", origem: "api", passou: false },
  ]);
  assert.deepEqual(resumo, [
    {
      nome: "ativa a conta (RF53, RNF49)",
      origem: "api",
      rnfs: ["RNF49"],
      rfs: ["RF53"],
    },
  ]);
  assert.match(R.resumoMarkdown(resumo), /\| RNF49 \| 1 \| RF53 \|/);
});

test("lê os RNFs e os RFs da feature nos dois modelos de issue", () => {
  const issue88 = exemplo("issue-88.md");
  assert.deepEqual(R.rnfsDaFeature(issue88), [
    "RNF1",
    "RNF51",
    "RNF53",
    "RNF56",
    "RNF57",
    "RNF58",
  ]);
  assert.deepEqual(
    R.rfsDaFeature("CP1 — Registrar solicitação (RF1)", issue88),
    ["RF1"],
  );
  const issue48 = exemplo("issue-48.md");
  assert.deepEqual(R.rnfsDaFeature(issue48), ["RNF49", "RNF53"]);
  assert.deepEqual(R.rfsDaFeature("CP12 — Cadastrar (RF53)", issue48), [
    "RF53",
  ]);
});

test("lê o comando /rnf com um ou vários RNFs e o link", () => {
  assert.deepEqual(R.lerComandoRnf("/rnf RNF53 https://x/relatorio"), {
    rnfs: ["RNF53"],
    link: "https://x/relatorio",
  });
  assert.deepEqual(
    R.lerComandoRnf("Inspeção feita.\n/rnf RNF56 RNF57 https://x/ata"),
    { rnfs: ["RNF56", "RNF57"], link: "https://x/ata" },
  );
  assert.deepEqual(R.lerComandoRnf("/rnf RNF53"), {
    rnfs: ["RNF53"],
    link: null,
  });
  assert.equal(R.lerComandoRnf("sem comando"), null);
});

test("registros /rnf só valem de integrantes e com link, e o robô não conta", () => {
  const registros = R.registrosManuais(
    [
      {
        body: "/rnf RNF53 https://x/1",
        author_association: "MEMBER",
        user: { login: "gabriel" },
      },
      {
        body: "/rnf RNF10 https://x/2",
        author_association: "NONE",
        user: { login: "visitante" },
      },
      {
        body: "/rnf RNF49",
        author_association: "MEMBER",
        user: { login: "gabriel" },
      },
      {
        body: "/rnf RNF51 https://x/3\n<!-- feature-status -->",
        author_association: "MEMBER",
        user: { login: "gabriel" },
      },
    ],
    ["OWNER", "MEMBER", "COLLABORATOR"],
  );
  assert.deepEqual(registros, [
    { rnf: "RNF53", link: "https://x/1", autor: "gabriel" },
  ]);
});

test("um teste só conta para a feature se citar o RNF e um RF dela", () => {
  const linhas = R.avaliarRnfs({
    rnfs: ["RNF52", "RNF53"],
    rfs: ["RF55"],
    testes: [
      { nome: "a", origem: "api", rnfs: ["RNF52"], rfs: ["RF55"] },
      { nome: "b", origem: "api", rnfs: ["RNF53"], rfs: ["RF1"] },
      { nome: "c", origem: "api", rnfs: ["RNF53"], rfs: [] },
    ],
    registros: [],
  });
  assert.deepEqual(
    linhas.map((l) => [l.rnf, l.testes.map((t) => t.nome)]),
    [
      ["RNF52", ["a"]],
      ["RNF53", []],
    ],
  );
  assert.equal(R.todosVerificados(linhas), false);
  assert.equal(R.todosVerificados([]), false);
});

test("o comentário traz a tabela, a marca para ser editado e como completar", () => {
  const texto = R.comentarioRnfs(
    [
      {
        rnf: "RNF52",
        testes: [{ nome: "registro (RF55, RNF52)", origem: "api" }],
        registros: [],
      },
      { rnf: "RNF53", testes: [], registros: [] },
    ],
    "https://github.com/x/actions/runs/1",
  );
  assert.match(
    texto,
    /\| RNF52 \| ✅ verificado \| teste "registro \(RF55, RNF52\)" \(api\) \|/,
  );
  assert.match(texto, /\| RNF53 \| ⏳ sem evidência \| — \|/);
  assert.match(texto, /\/rnf RNF53/);
  assert.ok(texto.includes(R.MARCA_RNFS));
});

test("junta os relatórios do CI e do leitor de tela, com o link de cada execução", () => {
  const ci = "https://github.com/x/actions/runs/1";
  const leitor = "https://github.com/x/actions/runs/2";
  const junto = R.juntarRelatorios([
    {
      execucao: ci,
      relatorio: {
        arquivos: ["api.json"],
        testes: [
          {
            nome: "a (RF55, RNF52)",
            origem: "api",
            rnfs: ["RNF52"],
            rfs: ["RF55"],
          },
        ],
      },
    },
    {
      execucao: leitor,
      relatorio: {
        arquivos: ["leitor-de-tela.json"],
        testes: [
          {
            nome: "b (RF20, RNF24)",
            origem: "leitor-de-tela",
            rnfs: ["RNF24"],
            rfs: ["RF20"],
          },
        ],
      },
    },
    { execucao: null, relatorio: null },
  ]);
  assert.deepEqual(junto.arquivos, ["api.json", "leitor-de-tela.json"]);
  assert.deepEqual(
    junto.testes.map((t) => t.execucao),
    [ci, leitor],
  );

  const texto = R.comentarioRnfs(
    [
      { rnf: "RNF52", testes: [junto.testes[0]], registros: [] },
      { rnf: "RNF24", testes: [junto.testes[1]], registros: [] },
    ],
    ci,
  );
  // O teste do CI fica como antes; o do leitor de tela leva o link da execução dele.
  assert.match(texto, /teste "a \(RF55, RNF52\)" \(api\) \|/);
  assert.ok(
    texto.includes(`teste "b (RF20, RNF24)" ([leitor-de-tela](${leitor}))`),
  );
});

test("intervalos de RNFs valem por todos os códigos entre eles", () => {
  assert.deepEqual(R.codigosRnf("transversal CP14 — RNF56 a RNF58"), [
    "RNF56",
    "RNF57",
    "RNF58",
  ]);
  assert.deepEqual(R.codigosRnf("RNF51; RNF56-RNF58 e RNF10 até 11"), [
    "RNF10",
    "RNF11",
    "RNF51",
    "RNF56",
    "RNF57",
    "RNF58",
  ]);
  // Só os códigos soltos quando o "intervalo" não cresce.
  assert.deepEqual(R.codigosRnf("RNF58 a RNF56"), ["RNF56", "RNF58"]);
  // Travessão separando o código do título não é intervalo.
  assert.deepEqual(R.codigosRnf("RNF1 — Identificação de erros"), ["RNF1"]);
});

test("a seção de RNFs das issues #52 e #155, com intervalo, inclui o RNF57", () => {
  const corpo = (rnfs) =>
    `### RF(s) declarado(s)\n\nRF57\n\n### RNFs que restringem a feature\n\n${rnfs}\n\n### Rastreabilidade\n\n-`;
  assert.deepEqual(
    R.rnfsDaFeature(
      corpo("RNF51 — Criptografia; transversal CP14 — RNF56 a RNF58"),
    ),
    ["RNF51", "RNF56", "RNF57", "RNF58"],
  );
});
