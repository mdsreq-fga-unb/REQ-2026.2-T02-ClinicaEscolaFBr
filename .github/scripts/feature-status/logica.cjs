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

// O registro do DoR só vale preenchido (seção 9.1.5). Issues antigas, sem a
// seção, dependem só do checklist.
function registroDoRPreenchido(corpo) {
  const inicio = (corpo ?? "").indexOf("### Registro da avaliação do DoR");
  if (inicio === -1) return true;
  const fim = corpo.indexOf("\n### ", inicio + 1);
  const trecho = corpo.slice(inicio, fim === -1 ? undefined : fim);
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

// Estado escrito hoje na descrição da issue, ou null se a seção não existir.
function estadoAtual(corpo) {
  const m = /### Estado da feature \(FDD\)\s*\n+([^\n]+)/.exec(corpo ?? "");
  if (!m) return null;
  const valor = m[1].trim();
  return ESTADOS.includes(valor) ? valor : null;
}

// Troca o estado escrito na descrição. Sem a seção, a descrição fica igual.
function escreverEstado(corpo, estado) {
  return corpo.replace(
    /(### Estado da feature \(FDD\)\s*\n+)([^\n]+)/,
    (_, cabecalho) => `${cabecalho}${estado}`,
  );
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

// Issues citadas numa PR (título ou descrição), como #48, "Refs #48" ou "Closes #48".
function issuesCitadas(...textos) {
  const numeros = new Set();
  for (const texto of textos) {
    for (const m of (texto ?? "").matchAll(/(?<![\w/])#(\d+)\b/g)) {
      numeros.add(Number(m[1]));
    }
  }
  return [...numeros];
}

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
