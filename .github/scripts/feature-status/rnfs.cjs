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

// Junta os relatórios de mais de um workflow (o CI e o do leitor de tela). Cada
// teste guarda o link da execução de onde veio, para a evidência apontar para ela.
function juntarRelatorios(fontes) {
  const presentes = fontes.filter((f) => f.relatorio);
  return {
    arquivos: presentes.flatMap((f) => f.relatorio.arquivos ?? []),
    testes: presentes.flatMap((f) =>
      (f.relatorio.testes ?? []).map((t) =>
        f.execucao ? { ...t, execucao: f.execucao } : t,
      ),
    ),
  };
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
// com evidência de todas estas origens. Uma origem é o nome do relatório dos
// testes ("api", "web", "e2e" ou "leitor-de-tela", do workflow do VoiceOver) ou
// "registro", um /rnf com a evidência do que teste nenhum cobre.
const ORIGENS_EXIGIDAS = {
  // Criptografia no banco (testes) e HTTPS, TLS, chaves fora do repositório e
  // troca de chave, conferidos na implantação (registro).
  RNF51: ["api", "registro"],
  // Registros de acesso que não se alteram (testes) e as permissões do usuário da
  // aplicação no banco e a consulta do RF56, conferidas na implantação (registro).
  RNF52: ["api", "registro"],
  // Teclado e contraste (e2e) e o leitor de tela de verdade.
  RNF24: ["e2e", "leitor-de-tela"],
  // Ferramenta automática (e2e) e a inspeção com teclado e leitor de tela.
  RNF56: ["e2e", "leitor-de-tela"],
  // As 3 interações (e2e) e o teste de tarefa com pessoas (registro).
  RNF22: ["e2e", "registro"],
};

const temOrigem = (linha, origem) =>
  origem === "registro"
    ? linha.registros.length > 0
    : linha.testes.some((t) => t.origem === origem);

// Origens exigidas que ainda não têm evidência para o RNF.
const origensFaltando = (linha) =>
  (ORIGENS_EXIGIDAS[linha.rnf] ?? []).filter((o) => !temOrigem(linha, o));

// Um registro com /rnf conta sozinho, como verificação feita e assumida por um
// integrante, a não ser que o registro seja uma das origens exigidas: aí ele é a
// parte que os testes não cobrem, e os testes continuam exigidos.
const verificado = (linha) => {
  const exigidas = ORIGENS_EXIGIDAS[linha.rnf] ?? [];
  if (linha.registros.length > 0 && !exigidas.includes("registro")) return true;
  return (
    (linha.testes.length > 0 || linha.registros.length > 0) &&
    origensFaltando(linha).length === 0
  );
};

function situacao(linha) {
  if (verificado(linha)) return "✅ verificado";
  if (linha.testes.length > 0 || linha.registros.length > 0) {
    const falta = origensFaltando(linha).map((o) =>
      o === "registro" ? "registro com /rnf" : `teste de ${o}`,
    );
    return `⏳ falta: ${falta.join(", ")}`;
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
      ...l.testes.map((t) =>
        // O teste de outro workflow traz o link da própria execução.
        t.execucao && t.execucao !== execucao
          ? `teste "${t.nome}" ([${t.origem}](${t.execucao}))`
          : `teste "${t.nome}" (${t.origem})`,
      ),
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
  juntarRelatorios,
  rnfsDaFeature,
  rfsDaFeature,
  lerComandoRnf,
  registrosManuais,
  avaliarRnfs,
  todosVerificados,
  comentarioRnfs,
};
