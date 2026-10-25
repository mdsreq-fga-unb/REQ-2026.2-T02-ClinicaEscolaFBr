const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const acompanhar = require("./index.cjs");
const L = require("./logica.cjs");

const exemplo = (nome) =>
  readFileSync(join(__dirname, "exemplos", nome), "utf8");
// Issue #88 (modelo, com "###") e #48 (CP12 convertida à mão, com "##" e sem o
// rótulo requirements), como estavam em 25/10/2026.
const ISSUE_88 = exemplo("issue-88.md");
const ISSUE_48 = exemplo("issue-48.md");

// Descrição da issue #88 com o DoR aprovado: todos os critérios R marcados e o
// registro preenchido.
const comDoR = (corpo) =>
  L.marcarItens(
    corpo,
    L.lerChecklist(corpo)
      .filter((i) => i.codigo.startsWith("R"))
      .map((i) => i.codigo),
  )
    .replace(
      "Data: <dd/mm/aaaa>    Avaliador: <nome>    Revisor: <nome>",
      "Data: 24/10/2026    Avaliador: Jônatas    Revisor: Gabriel",
    )
    .replace(
      "Resultado: Pronta | Pronta com ressalvas | Não pronta",
      "Resultado: Pronta",
    );

const OPCOES = {
  Status: [
    "Backlog",
    "Lista de Features",
    "Planejado",
    "Em Design",
    "Em Construção",
    "Em Validação",
    "Concluído",
  ],
  Ciclo: ["Ciclo 3 — 14/10 a 27/10 (U3)", "Ciclo 4 — 28/10 a 10/11 (U3)"],
  CP: [
    "CP1 — Inscrição on-line",
    "CP12 — Segurança, sigilo e controle de acesso",
  ],
};

// GitHub simulado: uma issue, seus comentários, os arquivos da PR e o item da
// issue no Project.
let issue;
let comentarios;
let arquivos;
let item;
let avisos;

const github = {
  rest: {
    issues: {
      get: async ({ issue_number }) => {
        if (issue_number !== issue.number) throw new Error("não encontrada");
        return { data: issue };
      },
      update: async ({ body }) => {
        issue = { ...issue, body };
        return { data: issue };
      },
      createComment: async ({ body }) => {
        comentarios.push({ body, user: { login: "gabriel" } });
      },
      listComments: async () => ({ data: comentarios }),
      listForRepo: () => {},
    },
    pulls: { listFiles: () => {} },
  },
  paginate: async (metodo) =>
    metodo === github.rest.pulls.listFiles
      ? arquivos.map((filename) => ({ filename }))
      : [issue, { number: 99, title: "Unidade 2 - Cronograma" }],
  graphql: async (consulta, variaveis) => {
    if (consulta.includes("organization(")) {
      return {
        organization: {
          projectV2: {
            id: "P",
            fields: {
              nodes: Object.entries(OPCOES).map(([name, nomes]) => ({
                id: name,
                name,
                options: nomes.map((n) => ({ id: n, name: n })),
              })),
            },
          },
        },
      };
    }
    if (consulta.includes("projectItems")) {
      const nodes = item
        ? [
            {
              id: "I",
              project: { id: "P" },
              fieldValues: {
                nodes: Object.entries(item).map(([campo, name]) => ({
                  name,
                  field: { name: campo },
                })),
              },
            },
          ]
        : [];
      return { node: { projectItems: { nodes } } };
    }
    if (consulta.includes("addProjectV2ItemById")) {
      item = {};
      return { addProjectV2ItemById: { item: { id: "I" } } };
    }
    if (consulta.includes("updateProjectV2ItemFieldValue")) {
      item[variaveis.campo] = variaveis.opcao;
      return {};
    }
    throw new Error(`consulta inesperada: ${consulta}`);
  },
};
const core = {
  info: () => {},
  notice: (m) => avisos.push(m),
  warning: (m) => avisos.push(m),
};
const rodar = (eventName, payload) =>
  acompanhar({
    github,
    context: {
      eventName,
      payload,
      repo: { owner: "mdsreq-fga-unb", repo: "REQ" },
    },
    core,
  });

const pr = (dados = {}) => ({
  number: 140,
  title: "feat: inscrição",
  body: "Refs #88",
  base: { ref: "main" },
  user: { login: "jonatas" },
  html_url: "https://github.com/x/pull/140",
  ...dados,
});
const comentario = (body, login, associacao = "MEMBER") => ({
  body,
  user: { login },
  author_association: associacao,
});

beforeEach(() => {
  process.env.TEM_TOKEN = "true";
  issue = {
    number: 88,
    node_id: "ISSUE88",
    title: "CP1 — Registrar solicitação de atendimento on-line (RF1)",
    state: "open",
    labels: [{ name: "requirements" }],
    milestone: { title: "Ciclo 3 — Base técnica e primeiras features do MVP" },
    body: comDoR(ISSUE_88),
  };
  comentarios = [];
  arquivos = ["apps/web/src/app/inscricao/page.tsx"];
  item = null;
  avisos = [];
});

test("sem o token, só avisa e não altera nada", async () => {
  process.env.TEM_TOKEN = "false";
  await rodar("issues", { action: "edited", issue });
  assert.equal(item, null);
  assert.equal(avisos.length, 1);
});

test("issue do ciclo sem o DoR entra no Project como Planejado, com o ciclo e a CP", async () => {
  issue.body = ISSUE_88;
  await rodar("issues", { action: "milestoned", issue });
  assert.deepEqual(item, {
    Status: "Planejado",
    Ciclo: "Ciclo 3 — 14/10 a 27/10 (U3)",
    CP: "CP1 — Inscrição on-line",
  });
});

test("issue da CP12 convertida à mão (com ## e sem o rótulo) também é acompanhada", async () => {
  issue = {
    ...issue,
    number: 48,
    title: "CP12 — Cadastrar usuário institucional com perfil de acesso (RF53)",
    labels: [{ name: "fdd:lista-features" }],
    body: ISSUE_48,
  };
  await rodar("issues", { action: "edited", issue });
  assert.equal(L.estadoAtual(issue.body), L.estadoDoChecklist(ISSUE_48));
  assert.equal(item.CP, "CP12 — Segurança, sigilo e controle de acesso");
});

test("PR de código que cita a issue leva a Em Construção", async () => {
  item = { Status: "Em Design" };
  await rodar("pull_request", { action: "opened", pull_request: pr() });
  assert.equal(item.Status, "Em Construção");
});

test("PR mesclada na main marca o D4.3 e leva a Em Validação", async () => {
  item = { Status: "Em Construção" };
  await rodar("pull_request", {
    action: "closed",
    pull_request: pr({ merged: true }),
  });
  assert.match(issue.body, /- \[x\] D4\.3/);
  assert.equal(item.Status, "Em Validação");
  assert.match(comentarios[0].body, /D4\.3 marcado/);
  assert.ok(comentarios[0].body.includes(L.MARCA_ROBO));
});

test("PR só de documentação não marca nada, mesmo citando a issue", async () => {
  arquivos = ["documentacao/docs/unidade-2/requisitos/backlog.md"];
  item = { Status: "Em Design" };
  await rodar("pull_request", {
    action: "closed",
    pull_request: pr({ title: "docs: decisões", merged: true }),
  });
  assert.doesNotMatch(issue.body, /- \[x\] D4\.3/);
  assert.equal(item.Status, "Em Design");
});

test("a descrição real da #133, com a lista de issues relacionadas, não cita nenhuma feature", async () => {
  assert.deepEqual(L.issuesCitadas("", exemplo("pr-133.md")), []);
});

test("PR mesclada em outra branch (PR empilhada) não muda nada", async () => {
  item = { Status: "Em Construção" };
  await rodar("pull_request", {
    action: "closed",
    pull_request: pr({ merged: true, base: { ref: "feat/rf53" } }),
  });
  assert.doesNotMatch(issue.body, /- \[x\] D4\.3/);
  assert.equal(item.Status, "Em Construção");
});

test("feature sem o DoR aprovado não tem o DoD atualizado pela PR", async () => {
  issue.body = ISSUE_88;
  item = { Status: "Planejado" };
  await rodar("pull_request", {
    action: "closed",
    pull_request: pr({ merged: true }),
  });
  assert.doesNotMatch(issue.body, /- \[x\] D4\.3/);
  assert.equal(item.Status, "Planejado");
  assert.match(avisos[0], /sem o DoR aprovado/);
});

test("aprovação de outro integrante marca o D3.1", async () => {
  item = { Status: "Em Construção" };
  await rodar("pull_request_review", {
    review: {
      state: "approved",
      user: { login: "revisora" },
      author_association: "MEMBER",
      html_url: "https://r",
    },
    pull_request: pr(),
  });
  assert.match(issue.body, /- \[x\] D3\.1/);
});

test("aprovação de quem não é da equipe não marca o D3.1", async () => {
  await rodar("pull_request_review", {
    review: {
      state: "approved",
      user: { login: "alguem" },
      author_association: "NONE",
      html_url: "https://r",
    },
    pull_request: pr(),
  });
  assert.doesNotMatch(issue.body, /- \[x\] D3\.1/);
});

test("/de-acordo de quem registrou a inspeção é recusado; de outro integrante, marca o D1.8", async () => {
  comentarios.push(
    comentario(
      "## Inspeção de design (DoD 1) — RF1\n\nResultado: aprovado",
      "gabriel",
    ),
  );
  await rodar("issue_comment", {
    issue,
    comment: comentario("/de-acordo", "gabriel"),
  });
  assert.doesNotMatch(issue.body, /- \[x\] D1\.8/);
  assert.match(comentarios.at(-1).body, /outro integrante/);

  await rodar("issue_comment", {
    issue,
    comment: comentario("/de-acordo", "jonatas"),
  });
  assert.match(issue.body, /- \[x\] D1\.8/);
});

test("a recusa do robô não conta como inspeção para um segundo /de-acordo", async () => {
  await rodar("issue_comment", {
    issue,
    comment: comentario("/de-acordo", "jonatas"),
  });
  assert.match(comentarios.at(-1).body, /ainda não há o registro da inspeção/);
  await rodar("issue_comment", {
    issue,
    comment: comentario("/de-acordo", "jonatas"),
  });
  assert.doesNotMatch(issue.body, /- \[x\] D1\.8/);
});

test("/demonstrada sem link pede a evidência e não marca nada", async () => {
  await rodar("issue_comment", {
    issue,
    comment: comentario("/demonstrada", "jonatas"),
  });
  assert.doesNotMatch(issue.body, /- \[x\] D5\.1/);
  assert.match(comentarios.at(-1).body, /precisa do link/);
});

test("comando de quem não é da equipe é ignorado", async () => {
  await rodar("issue_comment", {
    issue,
    comment: comentario("/aceite https://ata", "x", "NONE"),
  });
  assert.doesNotMatch(issue.body, /- \[x\] D6\.1/);
  assert.equal(comentarios.length, 0);
});

test("o Status nunca volta para trás sozinho", async () => {
  item = { Status: "Em Validação" };
  await rodar("issues", { action: "edited", issue });
  assert.equal(item.Status, "Em Validação");
});

test("issues que não são de feature ficam de fora", async () => {
  issue = { ...issue, title: "Unidade 2 - Cronograma", labels: [] };
  await rodar("issues", { action: "edited", issue });
  assert.equal(item, null);
});

test("a execução diária acompanha só as issues de feature", async () => {
  await rodar("workflow_dispatch", {});
  assert.equal(item.Status, "Em Design");
});
