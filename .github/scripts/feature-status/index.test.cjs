const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const acompanhar = require("./index.cjs");

const ISSUE = readFileSync(join(__dirname, "exemplos", "issue-88.md"), "utf8");
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

// GitHub simulado: uma issue, seus comentários e o item dela no Project.
let issue;
let comentarios;
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
        comentarios.push({ body, user: { login: "acao" } });
      },
      listComments: async () => ({ data: comentarios }),
      listForRepo: async () => ({ data: [issue] }),
    },
  },
  paginate: async () => [issue],
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
const core = { info: () => {}, notice: (m) => avisos.push(m) };
const contexto = (eventName, payload) => ({
  eventName,
  payload,
  repo: { owner: "mdsreq-fga-unb", repo: "REQ" },
});
const rodar = (eventName, payload) =>
  acompanhar({ github, context: contexto(eventName, payload), core });

beforeEach(() => {
  process.env.TEM_TOKEN = "true";
  issue = {
    number: 88,
    node_id: "ISSUE88",
    title: "CP1 — Registrar solicitação de atendimento on-line (RF1)",
    state: "open",
    labels: [{ name: "requirements" }],
    milestone: { title: "Ciclo 3 — Base técnica e primeiras features do MVP" },
    body: ISSUE,
  };
  comentarios = [];
  item = null;
  avisos = [];
});

test("sem o token, só avisa e não altera nada", async () => {
  process.env.TEM_TOKEN = "false";
  await rodar("issues", { action: "edited", issue });
  assert.equal(item, null);
  assert.equal(avisos.length, 1);
});

test("issue do ciclo entra no Project como Planejado, com o ciclo e a CP", async () => {
  await rodar("issues", { action: "milestoned", issue });
  assert.deepEqual(item, {
    Status: "Planejado",
    Ciclo: "Ciclo 3 — 14/10 a 27/10 (U3)",
    CP: "CP1 — Inscrição on-line",
  });
});

test("PR aberta que cita a issue leva a Em Construção", async () => {
  item = { Status: "Em Design" };
  await rodar("pull_request", {
    action: "opened",
    pull_request: {
      number: 140,
      title: "feat: inscrição",
      body: "Refs #88",
      base: { ref: "main" },
    },
  });
  assert.equal(item.Status, "Em Construção");
});

test("PR mesclada na main marca o D4.3 e leva a Em Validação", async () => {
  item = { Status: "Em Construção" };
  await rodar("pull_request", {
    action: "closed",
    pull_request: {
      number: 140,
      title: "feat: inscrição",
      body: "Refs #88",
      merged: true,
      base: { ref: "main" },
      html_url: "https://github.com/x/pull/140",
    },
  });
  assert.match(issue.body, /- \[x\] D4\.3/);
  assert.equal(item.Status, "Em Validação");
  assert.match(comentarios[0].body, /D4\.3 marcado/);
});

test("PR mesclada em outra branch (PR empilhada) não muda nada", async () => {
  item = { Status: "Em Construção" };
  await rodar("pull_request", {
    action: "closed",
    pull_request: {
      number: 136,
      title: "feat: entrada",
      body: "Refs #88",
      merged: true,
      base: { ref: "feat/rf53" },
    },
  });
  assert.doesNotMatch(issue.body, /- \[x\] D4\.3/);
  assert.equal(item.Status, "Em Construção");
});

test("aprovação de outro integrante marca o D3.1", async () => {
  item = { Status: "Em Construção" };
  await rodar("pull_request_review", {
    review: {
      state: "approved",
      user: { login: "revisora" },
      html_url: "https://r",
    },
    pull_request: {
      number: 140,
      title: "feat",
      body: "Refs #88",
      user: { login: "lider" },
    },
  });
  assert.match(issue.body, /- \[x\] D3\.1/);
});

test("/de-acordo de quem registrou a inspeção é recusado; de outro integrante, marca o D1.8", async () => {
  comentarios.push({
    body: "## Inspeção de design (DoD 1)",
    user: { login: "gabriel" },
  });
  const comentario = (login) => ({
    body: "/de-acordo",
    user: { login },
    author_association: "MEMBER",
  });
  await rodar("issue_comment", { issue, comment: comentario("gabriel") });
  assert.doesNotMatch(issue.body, /- \[x\] D1\.8/);
  assert.match(comentarios.at(-1).body, /outro integrante/);

  await rodar("issue_comment", { issue, comment: comentario("jonatas") });
  assert.match(issue.body, /- \[x\] D1\.8/);
});

test("/demonstrada sem link pede a evidência e não marca nada", async () => {
  await rodar("issue_comment", {
    issue,
    comment: {
      body: "/demonstrada",
      user: { login: "jonatas" },
      author_association: "MEMBER",
    },
  });
  assert.doesNotMatch(issue.body, /- \[x\] D5\.1/);
  assert.match(comentarios.at(-1).body, /precisa do link/);
});

test("comando de quem não é da equipe é ignorado", async () => {
  await rodar("issue_comment", {
    issue,
    comment: {
      body: "/aceite https://ata",
      user: { login: "x" },
      author_association: "NONE",
    },
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
