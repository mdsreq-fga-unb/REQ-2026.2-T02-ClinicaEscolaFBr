// Verificação dos RNFs de cada feature (D4.5), sem acesso ao GitHub: tudo aqui
// recebe texto ou JSON e devolve texto ou JSON, para ser testado com node --test.
// Convenção dos testes e do comando /rnf: "Boas práticas de utilização do GitHub",
// seção "Verificação dos RNFs (D4.5)".

const { MARCA_ROBO } = require("./logica.cjs");

// Códigos citados no texto, um a um ("RNF56, RNF57") ou em intervalo ("RNF56 a
// RNF58", "RNF56-RNF58", "RNF56 a 58"), que vale por todos os códigos entre eles.
function codigos(texto, prefixo) {
  const achados = new Set();
  const intervalo = new RegExp(
    `\\b${prefixo}(\\d+)\\s*(?:a|até|-|–)\\s*(?:${prefixo})?(\\d+)\\b`,
    "g",
  );
  for (const m of (texto ?? "").matchAll(intervalo)) {
    const [inicio, fim] = [Number(m[1]), Number(m[2])];
    if (fim <= inicio) continue;
    for (let n = inicio; n <= fim; n += 1) achados.add(`${prefixo}${n}`);
  }
  for (const m of (texto ?? "").matchAll(
    new RegExp(`\\b${prefixo}(\\d+)\\b`, "g"),
  )) {
    achados.add(`${prefixo}${m[1]}`);
  }
  return [...achados].sort(
    (a, b) => Number(a.slice(prefixo.length)) - Number(b.slice(prefixo.length)),
  );
}
const codigosRnf = (texto) => codigos(texto, "RNF");
const codigosRf = (texto) => codigos(texto, "RF");

// Resultado de cada teste nos três formatos do CI: o do Jest (repórter do projeto)
// e o do Vitest, que seguem o mesmo formato, e o do Playwright.
function lerRelatorio(json, origem) {
  const testes = [];
  for (const arquivo of json.testResults ?? []) {
    for (const t of arquivo.assertionResults ?? []) {
      testes.push({ nome: t.fullName, origem, passou: t.status === "passed" });
    }
  }
  const percorrer = (suite, titulos) => {
    const caminho = suite.title ? [...titulos, suite.title] : titulos;
    for (const spec of suite.specs ?? []) {
      const resultados = (spec.tests ?? []).flatMap((t) => t.results ?? []);
      testes.push({
        nome: [...caminho, spec.title].join(" › "),
        origem,
        passou:
          spec.ok === true && resultados.some((r) => r.status === "passed"),
      });
    }
    for (const filha of suite.suites ?? []) percorrer(filha, caminho);
  };
  for (const suite of json.suites ?? []) percorrer(suite, []);
  return testes;
}

// Relatório do CI: só os testes que passaram e citam algum RNF no nome.
function resumirTestes(testes) {
  return testes
    .filter((t) => t.passou && codigosRnf(t.nome).length > 0)
    .map((t) => ({
      nome: t.nome,
      origem: t.origem,
      rnfs: codigosRnf(t.nome),
      rfs: codigosRf(t.nome),
    }));
}

// Resumo do relatório para a página da execução do CI, um RNF por linha.
function resumoMarkdown(verificados) {
  const porRnf = new Map();
  for (const t of verificados) {
    for (const rnf of t.rnfs) {
      porRnf.set(rnf, [...(porRnf.get(rnf) ?? []), t]);
    }
  }
  const linhas = [...porRnf.entries()]
    .sort(([a], [b]) => Number(a.slice(3)) - Number(b.slice(3)))
    .map(
      ([rnf, ts]) =>
        `| ${rnf} | ${ts.length} | ${[...new Set(ts.flatMap((t) => t.rfs))].join(", ") || "—"} |`,
    );
  if (linhas.length === 0) {
    return "## RNFs verificados por testes\n\nNenhum teste que passou cita um RNF no nome.";
  }
  return [
    "## RNFs verificados por testes",
    "",
    "| RNF | Testes que passaram | RFs citados nos testes |",
    "| --- | --- | --- |",
    ...linhas,
    ...(verificados.some((t) => t.rfs.length === 0)
      ? [
          "",
          'Testes que citam o RNF sem o RF não contam para nenhuma feature: cite também o RF da feature no nome, por exemplo "(RF55, RNF52)".',
        ]
      : []),
  ].join("\n");
}

const SECAO = "#{2,3} ";

// Texto das seções com esses títulos, juntas.
function secoes(corpo, titulos) {
  const texto = corpo ?? "";
  return titulos
    .map((titulo) => {
      const m = new RegExp(`^${SECAO}${titulo}[^\\n]*\\n`, "m").exec(texto);
      if (!m) return "";
      const resto = texto.slice(m.index + m[0].length);
      const proxima = new RegExp(`^${SECAO}`, "m").exec(resto);
      return proxima ? resto.slice(0, proxima.index) : resto;
    })
    .join("\n");
}

// RNFs que restringem a feature: a seção do modelo de issue, ou a dos requisitos
// relacionados nas issues convertidas à mão.
const rnfsDaFeature = (corpo) =>
  codigosRnf(
    secoes(corpo, [
      "RNFs que restringem a feature",
      "Requisito\\(s\\) relacionado\\(s\\)",
    ]),
  );

// RFs da feature: os do título ("... (RF55)") e os da seção dos requisitos.
const rfsDaFeature = (titulo, corpo) => [
  ...new Set([
    ...codigosRf(titulo),
    ...codigosRf(
      secoes(corpo, [
        "RF\\(s\\) declarado\\(s\\)",
        "Requisito\\(s\\) relacionado\\(s\\)",
      ]),
    ),
  ]),
];

// Comando "/rnf RNF53 <link>" (ou vários RNFs antes do link), para a verificação
// que não é teste automático: inspeção, relatório, teste manual.
function lerComandoRnf(texto) {
  const m = /^\s*\/rnf\b(.*)$/m.exec(texto ?? "");
  if (!m) return null;
  const partes = m[1].trim().split(/\s+/).filter(Boolean);
  const link = partes.find((p) => /^https?:\/\/\S+$/.test(p)) ?? null;
  return { rnfs: codigosRnf(m[1]), link };
}

// Registros manuais válidos nos comentários da issue.
function registrosManuais(comentarios, membros) {
  const registros = [];
  for (const c of comentarios) {
    if ((c.body ?? "").includes(MARCA_ROBO)) continue;
    if (!membros.includes(c.author_association)) continue;
    const lido = lerComandoRnf(c.body);
    if (!lido?.link) continue;
    for (const rnf of lido.rnfs) {
      registros.push({ rnf, link: lido.link, autor: c.user?.login });
    }
  }
  return registros;
}

// Situação de cada RNF da feature. Um teste só conta se citar o RNF e um dos RFs
// da feature, para que o teste de outra feature não sirva de evidência desta.
function avaliarRnfs({ rnfs, rfs, testes, registros }) {
  return rnfs.map((rnf) => ({
    rnf,
    testes: testes.filter(
      (t) => t.rnfs.includes(rnf) && t.rfs.some((rf) => rfs.includes(rf)),
    ),
    registros: registros.filter((r) => r.rnf === rnf),
  }));
}

// RNFs cuja meta pede mais de um tipo de verificação: só contam como verificados
// com testes de todas estas origens (o nome do relatório: "e2e" é o Playwright do
// CI, "leitor-de-tela" é o workflow do VoiceOver). O RNF24 pede navegação por
// teclado e contraste (e2e) e o leitor de tela de verdade.
const ORIGENS_EXIGIDAS = {
  RNF24: ["e2e", "leitor-de-tela"],
};

// Origens exigidas que ainda não têm teste passando para o RNF.
const origensFaltando = (linha) =>
  (ORIGENS_EXIGIDAS[linha.rnf] ?? []).filter(
    (origem) => !linha.testes.some((t) => t.origem === origem),
  );

// Um registro com /rnf conta sozinho: é a verificação feita e assumida por um
// integrante, com o link da evidência.
const verificado = (linha) =>
  linha.registros.length > 0 ||
  (linha.testes.length > 0 && origensFaltando(linha).length === 0);

function situacao(linha) {
  if (verificado(linha)) return "✅ verificado";
  if (linha.testes.length > 0) {
    return `⏳ falta o teste de: ${origensFaltando(linha).join(", ")}`;
  }
  return "⏳ sem evidência";
}
const todosVerificados = (linhas) =>
  linhas.length > 0 && linhas.every(verificado);

const MARCA_RNFS = "<!-- feature-status:rnfs -->";

const limitar = (lista, n) =>
  lista.length > n ? [...lista.slice(0, n), `mais ${lista.length - n}`] : lista;

// Comentário da issue com a tabela dos RNFs. Ele é editado a cada avaliação, em
// vez de virar um comentário novo.
function comentarioRnfs(linhas, execucao) {
  const tabela = linhas.map((l) => {
    const evidencias = [
      ...l.testes.map((t) => `teste "${t.nome}" (${t.origem})`),
      ...l.registros.map((r) => `[registro de @${r.autor}](${r.link})`),
    ];
    return `| ${l.rnf} | ${situacao(l)} | ${limitar(evidencias, 3).join("<br>") || "—"} |`;
  });
  const completo = todosVerificados(linhas);
  return [
    "**Verificação dos RNFs (D4.5)**, atualizada automaticamente",
    "",
    `Testes da versão integrada: ${execucao ? `[execução do CI da \`main\`](${execucao})` : "sem relatório da `main`"}.`,
    "",
    "| RNF | Situação | Evidência |",
    "| --- | --- | --- |",
    ...tabela,
    "",
    completo
      ? "Todos os RNFs da feature têm evidência: D4.5 marcado."
      : 'Falta evidência para algum RNF. Um teste conta quando passa na `main` e cita no nome o RNF e o RF da feature, por exemplo "(RF55, RNF52)". Para o que não é teste automático, comente `/rnf RNF53 <link da evidência>`.',
    "",
    MARCA_RNFS,
    MARCA_ROBO,
  ].join("\n");
}

module.exports = {
  MARCA_RNFS,
  ORIGENS_EXIGIDAS,
  codigosRnf,
  codigosRf,
  lerRelatorio,
  resumirTestes,
  resumoMarkdown,
  rnfsDaFeature,
  rfsDaFeature,
  lerComandoRnf,
  registrosManuais,
  avaliarRnfs,
  todosVerificados,
  comentarioRnfs,
};
