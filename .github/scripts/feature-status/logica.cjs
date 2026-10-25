// Regras do acompanhamento automático das issues de feature (FDD), sem acesso ao
// GitHub: tudo aqui recebe texto e devolve texto, para ser testado com node --test.

// Estados do campo "Estado da feature (FDD)" do modelo de issue, na ordem dos marcos.
const ESTADOS = [
  "Planejada",
  "Em design",
  "Design inspecionado",
  "Código concluído",
  "Código inspecionado",
  "Promovida para a versão integrada",
  "Demonstrada",
  "Aceita",
];

// Status do Project, na ordem do board "Fluxo FDD".
const STATUS = [
  "Backlog",
  "Lista de Features",
  "Planejado",
  "Em Design",
  "Em Construção",
  "Em Validação",
  "Concluído",
];

// Status do Project que corresponde a cada estado da feature.
const STATUS_DO_ESTADO = {
  Planejada: "Planejado",
  "Em design": "Em Design",
  "Design inspecionado": "Em Construção",
  "Código concluído": "Em Construção",
  "Código inspecionado": "Em Construção",
  "Promovida para a versão integrada": "Em Validação",
  Demonstrada: "Em Validação",
  Aceita: "Concluído",
};

const ITEM = /^- \[( |x|X)\] ([RD]\d+\.\d+)\b(.*)$/;

// Itens do checklist (DoR e DoD), com o código, se está marcado e se é bloqueante.
function lerChecklist(corpo) {
  const itens = [];
  for (const linha of (corpo ?? "").split("\n")) {
    const m = ITEM.exec(linha.trim());
    if (m) {
      itens.push({
        codigo: m[2],
        marcado: m[1] !== " ",
        bloqueante: m[3].trimStart().startsWith("[B]"),
      });
    }
  }
  return itens;
}

const doGrupo = (itens, prefixo) =>
  itens.filter((i) => i.codigo.startsWith(`${prefixo}.`));
const completo = (itens) => itens.length > 0 && itens.every((i) => i.marcado);

// Issue de feature: título no formato "CP<n> — ..." (seção 8.1). Vale também para
// as issues convertidas à mão para o modelo novo, sem o rótulo requirements.
const ehFeature = (issue) =>
  !issue.pull_request && /^CP\d+\b/.test(issue.title ?? "");

// As issues criadas pelo modelo usam "###" nos títulos das seções, e as convertidas
// à mão usam "##"; as duas formas valem.
const SECAO = "#{2,3} ";

// O registro do DoR só vale preenchido (seção 9.1.5). Issues antigas, sem a
// seção, dependem só do checklist.
function registroDoRPreenchido(corpo) {
  const texto = corpo ?? "";
  const m = new RegExp(`^${SECAO}Registro da avaliação do DoR`, "m").exec(
    texto,
  );
  if (!m) return true;
  const resto = texto.slice(m.index + m[0].length);
  const proxima = new RegExp(`^${SECAO}`, "m").exec(resto);
  const trecho = proxima ? resto.slice(0, proxima.index) : resto;
  return (
    !trecho.includes("Avaliador: <nome>") &&
    !trecho.includes("Pronta | Pronta com ressalvas | Não pronta")
  );
}

// Estado mais avançado que o checklist comprova. Cada marco exige o anterior.
function estadoDoChecklist(corpo) {
  const itens = lerChecklist(corpo);
  const dor = itens.filter((i) => i.codigo.startsWith("R") && i.bloqueante);
  const marcos = [
    completo(dor) && registroDoRPreenchido(corpo),
    completo(doGrupo(itens, "D1")),
    completo(doGrupo(itens, "D2")),
    completo(doGrupo(itens, "D3")),
    completo(doGrupo(itens, "D4")),
    completo(doGrupo(itens, "D5")),
    doGrupo(itens, "D6").some((i) => i.codigo === "D6.1" && i.marcado),
  ];
  let nivel = 0;
  while (nivel < marcos.length && marcos[nivel]) nivel += 1;
  return ESTADOS[nivel];
}

// O DoR está aprovado: sem ele, a feature não é avaliada pelo DoD (seção 9.2).
const dorAprovado = (corpo) =>
  ESTADOS.indexOf(estadoDoChecklist(corpo)) >= ESTADOS.indexOf("Em design");

const SECAO_ESTADO = new RegExp(
  `(^${SECAO}Estado da feature \\(FDD\\)\\s*\\n+)([^\\n]+)`,
  "m",
);

// Estado escrito hoje na descrição da issue, ou null se a seção não existir.
function estadoAtual(corpo) {
  const m = SECAO_ESTADO.exec(corpo ?? "");
  if (!m) return null;
  const valor = m[2].trim();
  return ESTADOS.includes(valor) ? valor : null;
}

// Troca o estado escrito na descrição. Sem a seção, a descrição fica igual.
function escreverEstado(corpo, estado) {
  return corpo.replace(SECAO_ESTADO, (_, cabecalho) => `${cabecalho}${estado}`);
}

// Marca os itens do checklist com esses códigos. Itens já marcados não mudam.
function marcarItens(corpo, codigos) {
  return corpo
    .split("\n")
    .map((linha) => {
      const m = ITEM.exec(linha.trim());
      return m && m[1] === " " && codigos.includes(m[2])
        ? linha.replace("- [ ]", "- [x]")
        : linha;
    })
    .join("\n");
}

// O mais avançado de dois estados (ou status): nada volta sozinho para trás.
const maisAvancado = (lista, a, b) => {
  if (!a) return b;
  if (!b) return a;
  return lista.indexOf(a) >= lista.indexOf(b) ? a : b;
};

// Issues que uma PR declara implementar: só as citadas depois de "Refs", "Closes",
// "Fixes" ou "Resolves" (e variações), como "Refs #48" ou "Closes #45, #46". Um
// "#N" solto, como numa lista de issues relacionadas da documentação, não conta.
const PALAVRA_CHAVE =
  /\b(?:refs?|closes?|closed|fix(?:es|ed)?|resolves?|resolved)\b:?\s*((?:#\d+\b[\s,]*(?:e\s+|and\s+)?)+)/gi;

function issuesCitadas(...textos) {
  const numeros = new Set();
  for (const texto of textos) {
    for (const m of (texto ?? "").matchAll(PALAVRA_CHAVE)) {
      for (const n of m[1].matchAll(/#(\d+)/g)) numeros.add(Number(n[1]));
    }
  }
  return [...numeros];
}

// Só PRs que mexem no código do produto contam para os marcos de código do DoD.
const mexeNoCodigo = (arquivos) =>
  arquivos.some((a) => /^(apps|packages)\//.test(a));

// Marca invisível nos comentários do robô, para que eles nunca contem como
// registro de inspeção nem como evidência.
const MARCA_ROBO = "<!-- feature-status -->";

// Comentário que registra a inspeção de design, pelo cabeçalho usado na equipe.
const ehInspecao = (texto) =>
  !(texto ?? "").includes(MARCA_ROBO) &&
  new RegExp(`^${SECAO}Inspeção de design \\(DoD 1\\)`, "m").test(texto ?? "");

// Comandos aceitos nos comentários das issues de feature.
function lerComando(texto) {
  const m = /^\s*\/(de-acordo|demonstrada|aceite)\b[ \t]*(\S*)/m.exec(
    texto ?? "",
  );
  if (!m) return null;
  const link = /^https?:\/\/\S+$/.test(m[2]) ? m[2] : null;
  return { comando: m[1], link };
}

// Item do checklist que cada comando marca, e se ele exige um link de evidência.
const COMANDOS = {
  "de-acordo": { codigos: ["D1.8"], exigeLink: false },
  demonstrada: { codigos: ["D5.1"], exigeLink: true },
  aceite: { codigos: ["D6.1"], exigeLink: true },
};

// Número do ciclo pelo título do milestone ("Ciclo 4 — ...").
function cicloDoMilestone(titulo) {
  const m = /^Ciclo (\d+)\b/.exec(titulo ?? "");
  return m ? Number(m[1]) : null;
}

// CP pelo título da issue ("CP12 — ...").
function cpDoTitulo(titulo) {
  const m = /^CP(\d+)\b/.exec(titulo ?? "");
  return m ? Number(m[1]) : null;
}

module.exports = {
  MARCA_ROBO,
  ehFeature,
  dorAprovado,
  mexeNoCodigo,
  ehInspecao,
  ESTADOS,
  STATUS,
  STATUS_DO_ESTADO,
  COMANDOS,
  lerChecklist,
  estadoDoChecklist,
  estadoAtual,
  escreverEstado,
  marcarItens,
  maisAvancado,
  issuesCitadas,
  lerComando,
  cicloDoMilestone,
  cpDoTitulo,
  registroDoRPreenchido,
};
