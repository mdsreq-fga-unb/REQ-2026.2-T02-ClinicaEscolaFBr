const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const L = require("./logica.cjs");

// Descrição real da issue #88, criada pelo modelo "Feature (FDD)".
const ISSUE = readFileSync(join(__dirname, "exemplos", "issue-88.md"), "utf8");

const codigos = (corpo, filtro) =>
  L.lerChecklist(corpo)
    .filter(filtro)
    .map((i) => i.codigo);
const registroPreenchido = (corpo) =>
  corpo
    .replace(
      "Data: <dd/mm/aaaa>    Avaliador: <nome>    Revisor: <nome>",
      "Data: 24/10/2026    Avaliador: Jônatas    Revisor: Gabriel",
    )
    .replace(
      "Resultado: Pronta | Pronta com ressalvas | Não pronta",
      "Resultado: Pronta",
    );
const dorPronto = (corpo) =>
  registroPreenchido(
    L.marcarItens(
      corpo,
      codigos(corpo, (i) => i.codigo.startsWith("R")),
    ),
  );
const marcarGrupo = (corpo, grupo) =>
  L.marcarItens(
    corpo,
    codigos(corpo, (i) => i.codigo.startsWith(`${grupo}.`)),
  );

test("lê o checklist do DoR e do DoD do modelo de issue", () => {
  const itens = L.lerChecklist(ISSUE);
  assert.ok(itens.some((i) => i.codigo === "R1.1" && i.bloqueante));
  assert.ok(itens.some((i) => i.codigo === "R1.6" && !i.bloqueante));
  assert.ok(itens.some((i) => i.codigo === "D6.1"));
});

test("sem o registro do DoR preenchido, a feature continua Planejada", () => {
  const tudoMarcado = L.marcarItens(
    ISSUE,
    codigos(ISSUE, (i) => i.codigo.startsWith("R")),
  );
  assert.equal(L.estadoDoChecklist(tudoMarcado), "Planejada");
});

test("DoR completo e registrado leva a Em design", () => {
  assert.equal(L.estadoDoChecklist(dorPronto(ISSUE)), "Em design");
});

test("critério [R] pendente não impede o DoR", () => {
  const semR16 = dorPronto(ISSUE).replace("- [x] R1.6", "- [ ] R1.6");
  assert.equal(L.estadoDoChecklist(semR16), "Em design");
});

test("cada marco do DoD exige o anterior", () => {
  const comD1 = marcarGrupo(dorPronto(ISSUE), "D1");
  assert.equal(L.estadoDoChecklist(comD1), "Design inspecionado");
  // D3 completo sem o D2 não avança além do D1.
  assert.equal(
    L.estadoDoChecklist(marcarGrupo(comD1, "D3")),
    "Design inspecionado",
  );
  let corpo = comD1;
  for (const grupo of ["D2", "D3", "D4", "D5"])
    corpo = marcarGrupo(corpo, grupo);
  assert.equal(L.estadoDoChecklist(corpo), "Demonstrada");
  assert.equal(L.estadoDoChecklist(L.marcarItens(corpo, ["D6.1"])), "Aceita");
});

test("D1 completo sem o DoR não avança", () => {
  assert.equal(L.estadoDoChecklist(marcarGrupo(ISSUE, "D1")), "Planejada");
});

test("issue antiga, sem a seção de registro, depende só do checklist", () => {
  const semRegistro = ISSUE.replace(
    "### Registro da avaliação do DoR",
    "### Outra seção",
  );
  const marcado = L.marcarItens(
    semRegistro,
    codigos(semRegistro, (i) => i.codigo.startsWith("R")),
  );
  assert.equal(L.estadoDoChecklist(marcado), "Em design");
});

test("marca só os itens pedidos e não muda o que já está marcado", () => {
  const uma = L.marcarItens(ISSUE, ["D4.3"]);
  assert.match(uma, /- \[x\] D4\.3/);
  assert.match(uma, /- \[ \] D4\.4/);
  assert.equal(L.marcarItens(uma, ["D4.3"]), uma);
});

test("lê e reescreve o estado da feature na descrição", () => {
  assert.equal(L.estadoAtual(ISSUE), "Planejada");
  const novo = L.escreverEstado(ISSUE, "Em design");
  assert.equal(L.estadoAtual(novo), "Em design");
  assert.equal(
    novo.length,
    ISSUE.length + "Em design".length - "Planejada".length,
  );
});

test("o mais avançado de dois estados ou status", () => {
  assert.equal(
    L.maisAvancado(L.ESTADOS, "Em design", "Planejada"),
    "Em design",
  );
  assert.equal(
    L.maisAvancado(L.STATUS, "Em Validação", "Em Construção"),
    "Em Validação",
  );
  assert.equal(L.maisAvancado(L.STATUS, undefined, "Planejado"), "Planejado");
  assert.equal(L.maisAvancado(L.STATUS, "Backlog", null), "Backlog");
});

test("encontra as issues citadas numa PR", () => {
  assert.deepEqual(
    L.issuesCitadas("feat: entrada (RF50)", "Closes #45, Closes #46\nRefs #45"),
    [45, 46],
  );
  assert.deepEqual(
    L.issuesCitadas("", "link https://x.com/a#page-1 e owner/repo#12"),
    [],
  );
});

test("lê os comandos dos comentários", () => {
  assert.deepEqual(L.lerComando("/demonstrada https://site/ata"), {
    comando: "demonstrada",
    link: "https://site/ata",
  });
  assert.deepEqual(L.lerComando("Tudo certo.\n/de-acordo"), {
    comando: "de-acordo",
    link: null,
  });
  assert.deepEqual(L.lerComando("/aceite sem-link"), {
    comando: "aceite",
    link: null,
  });
  assert.equal(L.lerComando("nada de comando aqui"), null);
});

test("ciclo e CP vêm dos nomes", () => {
  assert.equal(
    L.cicloDoMilestone("Ciclo 4 — Continuação da construção do MVP"),
    4,
  );
  assert.equal(L.cicloDoMilestone("Unidade 3 — Entrega"), null);
  assert.equal(
    L.cpDoTitulo("CP12 — Cadastrar usuário institucional (RF53)"),
    12,
  );
});

test("só conta a issue citada depois de Refs, Closes, Fixes ou Resolves", () => {
  assert.deepEqual(L.issuesCitadas("", "Refs #45, #46 e #48"), [45, 46, 48]);
  assert.deepEqual(L.issuesCitadas("", "Fixes: #12\nresolves #13"), [12, 13]);
  assert.deepEqual(L.issuesCitadas("", "Issues relacionadas: #88, #89"), []);
  assert.deepEqual(L.issuesCitadas("", "parte da #133"), []);
});

test("aceita os títulos de seção com ## das issues convertidas à mão", () => {
  const corpo = "## Estado da feature (FDD)\n\nPlanejada\n\n## Outra";
  assert.equal(L.estadoAtual(corpo), "Planejada");
  assert.equal(
    L.estadoAtual(L.escreverEstado(corpo, "Em design")),
    "Em design",
  );
  assert.equal(
    L.registroDoRPreenchido(
      "## Registro da avaliação do DoR\n\nAvaliador: <nome>\n",
    ),
    false,
  );
});

test("feature é reconhecida pelo título, e PR de código pelos arquivos", () => {
  assert.ok(
    L.ehFeature({ title: "CP12 — Desativar usuário institucional (RF54)" }),
  );
  assert.ok(!L.ehFeature({ title: "Unidade 2 - DoR" }));
  assert.ok(!L.ehFeature({ title: "CP1 — x", pull_request: {} }));
  assert.ok(L.mexeNoCodigo(["documentacao/a.md", "apps/api/src/x.ts"]));
  assert.ok(!L.mexeNoCodigo(["documentacao/a.md", ".github/workflows/ci.yml"]));
});

test("só o comentário com o cabeçalho da inspeção, fora do robô, é inspeção", () => {
  assert.ok(L.ehInspecao("## Inspeção de design (DoD 1) — RF53\n..."));
  assert.ok(!L.ehInspecao("Fiz a inspeção de design ontem."));
  assert.ok(!L.ehInspecao(`## Inspeção de design (DoD 1)\n\n${L.MARCA_ROBO}`));
});
