/*
 * Clínica Escola FBr — matriz de priorização interativa e resumo do MVP.
 *
 * Fonte única dos dados: as próprias tabelas da página do Backlog
 * (10.2.1.4 Tabela consolidada e 10.2.3 Definição do MVP). Nenhum requisito,
 * valor, esforço ou decisão é digitado aqui: se as duas tabelas não
 * concordarem entre si (código, CP ou valor), a matriz interativa não é
 * desenhada e a imagem original continua sendo exibida.
 *
 * Também expõe window.FBRPriorizacao para que as páginas de RFs e RNFs
 * mostrem a decisão de MVP de cada requisito (lida da página do Backlog).
 */
(function () {
  "use strict";

  var VALUE_NAMES = { 4: "Must have", 3: "Should have", 2: "Could have", 1: "Won't have now" };
  var EFFORT_NAMES = { 1: "baixo", 2: "moderado", 3: "alto", 4: "muito alto" };

  function text(node) {
    return (node.textContent || "").replace(/\s+/g, " ").trim();
  }

  function el(tag, className, content) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (content != null) node.textContent = content;
    return node;
  }

  function headers(table) {
    return Array.prototype.map.call(table.querySelectorAll("thead th"), text);
  }

  function findTable(root, required) {
    var tables = root.querySelectorAll("table");
    for (var i = 0; i < tables.length; i++) {
      var h = headers(tables[i]);
      if (required.every(function (name) { return h.indexOf(name) !== -1; })) return { table: tables[i], headers: h };
    }
    return null;
  }

  function rowsOf(found) {
    return Array.prototype.map.call(found.table.querySelectorAll("tbody tr"), function (tr) {
      var cells = {};
      found.headers.forEach(function (name, i) { cells[name] = tr.children[i]; });
      return cells;
    });
  }

  /* Lê as duas tabelas do Backlog e devolve { rfs: [...], rnfs: {...} } ou null */
  function parseBacklog(root) {
    var mvp = findTable(root, ["Código", "CP", "Valor de negócio", "Esforço técnico (1-4)", "No MVP?"]);
    var cons = findTable(root, ["Código", "Requisito", "CP", "Valor de negócio", "Esforço técnico consolidado"]);
    if (!mvp || !cons) return null;

    var titles = {};
    var problems = [];
    rowsOf(cons).forEach(function (c) {
      var code = text(c["Código"]);
      titles[code] = {
        title: text(c["Requisito"]),
        cp: text(c["CP"]),
        value: text(c["Valor de negócio"]),
        decimal: text(c["Esforço técnico consolidado"])
      };
    });

    var rfs = rowsOf(mvp).map(function (c) {
      var code = text(c["Código"]);
      var info = titles[code];
      var item = {
        code: code,
        number: parseInt(code.replace(/\D/g, ""), 10),
        cp: text(c["CP"]),
        value: parseInt(text(c["Valor de negócio"]), 10),
        effort: parseInt(text(c["Esforço técnico (1-4)"]), 10),
        mvp: /^sim/i.test(text(c["No MVP?"])),
        reason: c["Motivo"] ? text(c["Motivo"]) : "",
        title: info ? info.title : "",
        decimal: info ? info.decimal : ""
      };
      if (!info) problems.push(code + " ausente da tabela consolidada");
      else if (info.cp !== item.cp || parseInt(info.value, 10) !== item.value) problems.push(code + " diverge entre as tabelas");
      if (!(item.value >= 1 && item.value <= 4 && item.effort >= 1 && item.effort <= 4)) problems.push(code + " fora da escala 1–4");
      return item;
    });
    if (rfs.length !== Object.keys(titles).length) problems.push("quantidade de RFs diferente entre as tabelas");
    if (problems.length) {
      if (window.console) console.warn("Matriz de priorização não desenhada:", problems);
      return null;
    }

    var rnfs = {};
    var rnfTable = findTable(root, ["Código", "Requisito não funcional", "Classificação"]);
    if (rnfTable) {
      rowsOf(rnfTable).forEach(function (c) {
        rnfs[text(c["Código"])] = text(c["Classificação"]);
      });
    }
    return { rfs: rfs, rnfs: rnfs };
  }

  /* ---- Resumo em números no topo do Backlog ---- */
  function renderSummary(root, data) {
    if (root.querySelector(".mvp-summary")) return;
    var inside = data.rfs.filter(function (r) { return r.mvp; }).length;
    var box = el("section", "mvp-summary");
    box.setAttribute("aria-label", "Resumo do recorte do MVP");
    var stats = [
      [String(data.rfs.length), "RFs avaliados com o cliente"],
      [String(inside), "RFs no MVP", "is-mvp"],
      [String(data.rfs.length - inside), "RFs para uma versão posterior", "is-later"]
    ];
    var rnfEntries = Object.keys(data.rnfs);
    var rnfOutside = rnfEntries.filter(function (code) {
      return data.rnfs[code] === "Não aplicável ao MVP";
    }).length;
    if (rnfEntries.length) {
      stats.push([String(rnfEntries.length - rnfOutside), "RNFs no MVP", "is-mvp"]);
      stats.push([String(rnfOutside), "RNFs fora do MVP", "is-later"]);
    }
    stats.forEach(function (s) {
      var item = el("div", "mvp-summary__item" + (s[2] ? " " + s[2] : ""));
      item.appendChild(el("span", "mvp-summary__value", s[0]));
      item.appendChild(el("span", "mvp-summary__label", s[1]));
      box.appendChild(item);
    });
    var bar = el("div", "mvp-summary__bar");
    bar.setAttribute("aria-hidden", "true");
    var a = el("span", "mvp-summary__seg is-mvp"); a.style.flexGrow = inside;
    var b = el("span", "mvp-summary__seg is-later"); b.style.flexGrow = data.rfs.length - inside;
    bar.append(a, b);
    box.appendChild(bar);
    var anchor = root.querySelector(".reading-meta") || root.querySelector("h1");
    if (anchor) anchor.after(box); else root.prepend(box);
  }

  /* ---- Matriz ---- */
  function renderMatrix(root, data) {
    var img = root.querySelector('img[src*="matriz-priorizacao"]');
    var figure = img && img.closest("p");
    if (!figure || root.querySelector(".prio-matrix")) return;

    var reqPage = "../funcionais/";
    var section = el("section", "prio-matrix");
    section.setAttribute("aria-label", "Matriz de priorização interativa");

    /* Barra de filtros */
    var tools = el("div", "prio-matrix__tools");
    var inside = data.rfs.filter(function (r) { return r.mvp; }).length;
    var filters = [
      ["all", "Todos (" + data.rfs.length + ")"],
      ["mvp", "No MVP (" + inside + ")"],
      ["later", "Fora do MVP (" + (data.rfs.length - inside) + ")"]
    ];
    var group = el("div", "prio-matrix__filters");
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", "Filtrar requisitos");
    filters.forEach(function (f, i) {
      var b = el("button", "prio-matrix__filter", f[1]);
      b.type = "button";
      b.dataset.filter = f[0];
      b.setAttribute("aria-pressed", i === 0 ? "true" : "false");
      group.appendChild(b);
    });
    var cpLabel = el("label", "prio-matrix__cp");
    cpLabel.appendChild(el("span", "visually-hidden", "Característica de produto"));
    var cpSelect = el("select", "prio-matrix__select");
    cpSelect.appendChild(new Option("Todas as CPs", ""));
    data.rfs.map(function (r) { return r.cp; })
      .filter(function (cp, i, all) { return all.indexOf(cp) === i; })
      .sort(function (a, b) { return parseInt(a.slice(2), 10) - parseInt(b.slice(2), 10); })
      .forEach(function (cp) { cpSelect.appendChild(new Option(cp, cp)); });
    cpLabel.appendChild(cpSelect);
    var legend = el("p", "prio-matrix__legend");
    legend.appendChild(el("span", "prio-chip prio-chip--sample is-mvp", "RF"));
    legend.appendChild(document.createTextNode(" no recorte do MVP "));
    legend.appendChild(el("span", "prio-chip prio-chip--sample is-later", "RF"));
    legend.appendChild(document.createTextNode(" fora do MVP · linhas: valor de negócio (4 a 1) · colunas: esforço técnico (1 a 4)"));
    tools.append(group, cpLabel);
    section.append(tools, legend);

    /* Grade 4 × 4: linhas = valor (4 → 1), colunas = esforço (1 → 4) */
    var grid = el("div", "prio-matrix__grid");
    function quadrantLabel(name, hint, col, row, cls) {
      var q = el("div", "prio-matrix__quadrant " + cls);
      q.style.gridColumn = col;
      q.style.gridRow = row;
      q.appendChild(el("strong", "", name));
      q.appendChild(el("span", "", hint));
      grid.appendChild(q);
    }
    quadrantLabel("Quick wins", "valor alto, esforço baixo", "2 / 4", "1", "is-top");
    quadrantLabel("Grandes projetos", "valor alto, esforço alto", "4 / 6", "1", "is-top");

    var chips = [];
    [4, 3, 2, 1].forEach(function (value, ri) {
      var row = ri + 2;
      var yl = el("div", "prio-matrix__ylabel");
      yl.style.gridRow = String(row);
      yl.appendChild(el("strong", "", String(value)));
      yl.appendChild(el("span", "", VALUE_NAMES[value]));
      grid.appendChild(yl);
      [1, 2, 3, 4].forEach(function (effort) {
        var cell = el("div", "prio-matrix__cell");
        cell.style.gridRow = String(row);
        cell.style.gridColumn = String(effort + 1);
        cell.classList.add(value >= 3 ? "is-high" : "is-low");
        cell.classList.add(effort <= 2 ? "is-easy" : "is-hard");
        if (effort === 3) cell.classList.add("is-split-x");
        if (value === 2) cell.classList.add("is-split-y");
        if (effort === 4) cell.classList.add("is-last-col");
        if (value === 1) cell.classList.add("is-last-row");
        var items = data.rfs.filter(function (r) { return r.value === value && r.effort === effort; })
          .sort(function (a, b) { return a.number - b.number; });
        cell.setAttribute("aria-label", "Valor " + value + " (" + VALUE_NAMES[value] + "), esforço " + effort + " (" + EFFORT_NAMES[effort] + "): " + items.length + (items.length === 1 ? " requisito" : " requisitos"));
        cell.setAttribute("role", "group");
        items.forEach(function (r) {
          var chip = el("button", "prio-chip " + (r.mvp ? "is-mvp" : "is-later"), r.code);
          chip.type = "button";
          chip.dataset.code = r.code;
          chip.setAttribute("aria-label", r.code + " — " + r.title + ". " + (r.mvp ? "No MVP" : "Fora do MVP"));
          chip._req = r;
          chips.push(chip);
          cell.appendChild(chip);
        });
        grid.appendChild(cell);
      });
    });

    quadrantLabel("Preenchimento", "valor baixo, esforço baixo", "2 / 4", "6", "is-bottom");
    quadrantLabel("Tarefas ingratas", "valor baixo, esforço alto", "4 / 6", "6", "is-bottom");
    [1, 2, 3, 4].forEach(function (effort) {
      var xl = el("div", "prio-matrix__xlabel");
      xl.style.gridColumn = String(effort + 1);
      xl.style.gridRow = "7";
      xl.appendChild(el("strong", "", String(effort)));
      xl.appendChild(el("span", "", EFFORT_NAMES[effort]));
      grid.appendChild(xl);
    });
    var yTitle = el("div", "prio-matrix__axis prio-matrix__axis--y", "Valor de negócio");
    yTitle.style.gridRow = "1";
    yTitle.style.gridColumn = "1";
    grid.appendChild(yTitle);
    var xTitle = el("div", "prio-matrix__axis prio-matrix__axis--x", "Esforço técnico consolidado (escala inteira 1–4, regra 3 da seção 10.2.1.3)");
    xTitle.style.gridRow = "8";
    xTitle.style.gridColumn = "2 / 6";
    grid.appendChild(xTitle);
    section.appendChild(grid);

    /* Painel de detalhe (clique) e dica (passar o mouse/foco) */
    var detail = el("div", "prio-matrix__detail");
    detail.setAttribute("aria-live", "polite");
    detail.appendChild(el("p", "prio-matrix__hint", "Passe o mouse ou toque em um RF para ver o título, a CP, o valor, o esforço e a decisão."));
    section.appendChild(detail);
    section.appendChild(el("p", "prio-matrix__note", "Dentro de cada célula os RFs aparecem em ordem numérica, sem ordem de prioridade entre eles. Dados lidos das tabelas 10.2.1.4 e 10.2.3 desta página."));

    var tip = matrixTip();

    function describe(r) {
      return {
        head: r.code + " — " + r.title,
        meta: [r.cp, "Valor " + r.value + " · " + VALUE_NAMES[r.value], "Esforço " + (r.decimal ? r.decimal + " → " : "") + r.effort + " · " + EFFORT_NAMES[r.effort]],
        decision: r.mvp ? "No MVP" : "Fora do MVP"
      };
    }

    function showTip(chip) {
      var d = describe(chip._req);
      tip.replaceChildren();
      tip.appendChild(el("strong", "", d.head));
      tip.appendChild(el("span", "", d.meta.join(" · ")));
      tip.appendChild(el("span", "prio-matrix__tip-decision " + (chip._req.mvp ? "is-mvp" : "is-later"), d.decision));
      tip.hidden = false;
      var rect = chip.getBoundingClientRect();
      var w = tip.offsetWidth;
      var left = Math.min(Math.max(8, rect.left + rect.width / 2 - w / 2), window.innerWidth - w - 8);
      var top = rect.top - tip.offsetHeight - 10;
      if (top < 8) top = rect.bottom + 10;
      tip.style.left = left + "px";
      tip.style.top = top + "px";
    }

    function select(chip) {
      chips.forEach(function (c) { c.classList.toggle("is-selected", c === chip); c.setAttribute("aria-pressed", c === chip ? "true" : "false"); });
      var r = chip._req;
      var d = describe(r);
      detail.replaceChildren();
      var card = el("div", "prio-matrix__card");
      card.appendChild(el("span", "prio-matrix__tip-decision " + (r.mvp ? "is-mvp" : "is-later"), d.decision));
      card.appendChild(el("strong", "prio-matrix__card-title", d.head));
      card.appendChild(el("span", "prio-matrix__card-meta", d.meta.join(" · ")));
      if (r.reason) card.appendChild(el("span", "prio-matrix__card-reason", r.reason));
      var link = el("a", "prio-matrix__card-link", "Abrir " + r.code + " nos requisitos funcionais");
      link.href = reqPage + "#" + r.code.toLowerCase();
      card.appendChild(link);
      detail.appendChild(card);
    }

    chips.forEach(function (chip) {
      chip.setAttribute("aria-pressed", "false");
      chip.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") showTip(chip); });
      chip.addEventListener("pointerleave", hideTip);
      chip.addEventListener("focus", function () { showTip(chip); });
      chip.addEventListener("blur", hideTip);
      chip.addEventListener("click", function () { hideTip(); select(chip); });
    });

    var state = { filter: "all", cp: "" };
    function apply() {
      chips.forEach(function (c) {
        var r = c._req;
        var okFilter = state.filter === "all" || (state.filter === "mvp" ? r.mvp : !r.mvp);
        var okCp = !state.cp || r.cp === state.cp;
        c.classList.toggle("is-dimmed", !(okFilter && okCp));
        c.tabIndex = okFilter && okCp ? 0 : -1;
      });
    }
    group.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      state.filter = b.dataset.filter;
      group.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      apply();
    });
    cpSelect.addEventListener("change", function () { state.cp = cpSelect.value; apply(); });

    /* A imagem original continua disponível, recolhida, logo abaixo */
    figure.before(section);
    var keep = el("details", "prio-matrix__static");
    keep.appendChild(el("summary", "", "Ver a imagem estática da matriz (PNG)"));
    section.after(keep);
    keep.appendChild(figure);
  }

  /* Dica única, reaproveitada entre execuções (como o lightbox de melhorias.js) */
  var tipEl = null;
  function hideTip() { if (tipEl) tipEl.hidden = true; }
  function matrixTip() {
    if (tipEl) return tipEl;
    tipEl = el("div", "prio-matrix__tip");
    tipEl.setAttribute("role", "tooltip");
    tipEl.hidden = true;
    document.body.appendChild(tipEl);
    window.addEventListener("scroll", hideTip, { passive: true });
    return tipEl;
  }

  /* ---- Decisão de MVP nas páginas de RFs e RNFs ---- */
  var cache = null;
  function loadBacklog() {
    if (cache) return cache;
    var url = new URL("../backlog/", window.location.href).href;
    cache = fetch(url, { credentials: "same-origin" })
      .then(function (res) { if (!res.ok) throw new Error(res.status); return res.text(); })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, "text/html");
        var root = doc.querySelector(".md-content__inner") || doc.body;
        return parseBacklog(root);
      })
      .catch(function () {
        // Não memoriza a falha: a próxima chamada tenta de novo
        cache = null;
        return null;
      });
    return cache;
  }

  window.FBRPriorizacao = { parse: parseBacklog, load: loadBacklog };

  function enhance() {
    var root = document.querySelector(".md-content__inner");
    if (!root || root.dataset.fbrMatrix) return;
    root.dataset.fbrMatrix = "1";
    if (!root.querySelector('img[src*="matriz-priorizacao"]')) return;
    var data = parseBacklog(root);
    if (!data) return;
    renderSummary(root, data);
    renderMatrix(root, data);
  }

  if (window.document$ && typeof window.document$.subscribe === "function") {
    window.document$.subscribe(enhance);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", enhance);
  } else {
    enhance();
  }
})();
