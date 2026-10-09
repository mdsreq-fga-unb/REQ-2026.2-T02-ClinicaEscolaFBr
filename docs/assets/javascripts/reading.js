/*
 * Clínica Escola FBr — camada de leitura.
 *
 * Organiza visualmente as páginas longas sem alterar nenhum texto:
 * critérios Dado/Quando/Então, cabeçalho e contexto recolhível das CPs,
 * resumo do requisito, etiquetas de referência (RF/RNF/CP/OE), barra de
 * contexto fixa, índice enxuto, decisões coloridas na análise do feedback,
 * tempo de leitura, cards de comparação e reuniões recolhíveis.
 * Roda depois do extra.js (que monta os cards de RF/RNF e as tabelas).
 * Sem JavaScript, o conteúdo continua íntegro e legível.
 */
(function () {
  "use strict";

  var CP_HEADING = /\((CP\d+)\)\s*#?$/;
  var REF = /\b(RNF|RF|CP|OE)(\d+)\b/g;
  var WORDS_PER_MINUTE = 200;

  function text(node) {
    return (node.textContent || "").replace(/\s+/g, " ").trim();
  }

  function el(tag, className, content) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (content != null) node.textContent = content;
    return node;
  }

  function headingText(h) {
    return text(h).replace(/#$/, "").trim();
  }

  /* Percorre os nós de texto de um elemento, ignorando links, código e o resumo do card */
  function textNodes(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        return node.parentElement.closest("a, code, summary, .ref-chip, .gwt") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    return nodes;
  }

  /* Envolve a primeira ocorrência de um padrão em um <span> */
  function wrapFirst(root, pattern, className) {
    var nodes = textNodes(root);
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var match = pattern.exec(node.nodeValue);
      if (!match) continue;
      var start = match.index + match[0].indexOf(match[1]);
      var word = node.splitText(start);
      word.splitText(match[1].length);
      var span = el("span", className);
      word.parentNode.replaceChild(span, word);
      span.appendChild(word);
      return span;
    }
    return null;
  }

  /* ---- A. Critérios de aceitação em Dado / Quando / Então ---- */
  function enhanceCriteria(root) {
    root.querySelectorAll(".req__criteria > li").forEach(function (li) {
      if (li.dataset.gwt) return;
      li.dataset.gwt = "1";
      if (!/^Dad[oa]s?\b/.test(text(li))) return;
      wrapFirst(li, /^\s*(Dad[oa]s?)\b/, "gwt gwt--given");
      var when = wrapFirst(li, /,\s+(quando)\b/, "gwt gwt--when");
      var then = wrapFirst(li, /,\s+(então)\b/, "gwt gwt--then");
      // Quebra de linha visual antes de "quando" e "então" (o texto não muda).
      [when, then].forEach(function (span) { if (span) span.before(el("br", "gwt-break")); });
      if (when || then) li.classList.add("gwt-item");
    });
  }

  /* ---- B. Cabeçalho da CP com contagens e contexto recolhível ---- */
  function sectionNodes(heading) {
    var nodes = [];
    var node = heading.nextElementSibling;
    while (node && !/^H[12]$/.test(node.tagName) && !(node.tagName === "H3" && CP_HEADING.test(headingText(node)))) {
      nodes.push(node);
      node = node.nextElementSibling;
    }
    return nodes;
  }

  function enhanceCpSections(root, cpHeadings) {
    cpHeadings.forEach(function (h) {
      if (h.dataset.cp) return;
      var code = headingText(h).match(CP_HEADING)[1];
      h.dataset.cp = code;
      h.classList.add("cp-heading");
      var nodes = sectionNodes(h);

      var features = nodes.filter(function (n) { return n.matches("h4.feature-heading"); }).length;
      var rfs = nodes.filter(function (n) { return n.matches("details.req--rf"); }).length;
      var rnfs = nodes.filter(function (n) { return n.matches("details.req--rnf"); }).length;
      var parts = [];
      if (features) parts.push(features + (features === 1 ? " feature" : " features"));
      if (rfs) parts.push(rfs + (rfs === 1 ? " RF" : " RFs"));
      if (rnfs) parts.push(rnfs + (rnfs === 1 ? " RNF" : " RNFs"));

      var meta = el("p", "cp-meta");
      meta.appendChild(el("span", "cp-meta__code", code));
      parts.forEach(function (part) { meta.appendChild(el("span", "cp-meta__count", part)); });
      h.after(meta);

      // Contexto: o primeiro parágrafo fica visível, o restante do texto corrido é recolhido.
      var run = [];
      for (var i = 0; i < nodes.length; i++) {
        if (!/^(P|UL|OL|BLOCKQUOTE)$/.test(nodes[i].tagName)) break;
        run.push(nodes[i]);
      }
      if (run.length < 2 || run[0].tagName !== "P") return;
      run[0].classList.add("cp-lead");
      var fold = el("details", "cp-context");
      fold.appendChild(el("summary", "", "Ver contexto da " + code + " (" + (run.length - 1) + (run.length === 2 ? " parágrafo)" : " parágrafos)")));
      run[0].after(fold);
      run.slice(1).forEach(function (n) { fold.appendChild(n); });
    });
  }

  /* ---- C. Requisito em níveis: resumo em destaque e detalhes com recuo ---- */
  function enhanceRequirementBody(root) {
    root.querySelectorAll("details.req").forEach(function (card) {
      if (card.dataset.levels) return;
      card.dataset.levels = "1";
      var first = true;
      Array.prototype.some.call(card.children, function (child) {
        if (child.tagName === "SUMMARY") return false;
        if (child.matches(".req__label, .req__trace, .req__meta, .req__criteria, .table-toggle")) return true;
        if (child.tagName === "P" && first) child.classList.add("req__lead");
        else if (/^(P|UL|OL)$/.test(child.tagName)) child.classList.add("req__body");
        first = false;
        return false;
      });
    });
  }

  /* ---- D. Referências como etiquetas e "Relaciona-se com" no fim do card ---- */
  function refHref(kind, number, cpTargets) {
    var id = kind.toLowerCase() + number;
    if (kind === "CP") return cpTargets[kind + number] ? "#" + cpTargets[kind + number] : null;
    if (kind === "OE") return null;
    if (document.getElementById(id)) return "#" + id;
    var onReqPage = /\/requisitos\/(funcionais|nao-funcionais)\/?$/.test(location.pathname);
    if (!onReqPage) return null;
    return (kind === "RF" ? "../funcionais/" : "../nao-funcionais/") + "#" + id;
  }

  function chip(kind, number, href) {
    var node = el(href ? "a" : "span", "ref-chip ref-chip--" + kind.toLowerCase(), kind + number);
    if (href) node.href = href;
    return node;
  }

  function enhanceReferences(root, cpHeadings) {
    var cpTargets = {};
    cpHeadings.forEach(function (h) { if (h.id) cpTargets[h.dataset.cp] = h.id; });

    root.querySelectorAll("details.req").forEach(function (card) {
      if (card.dataset.refs) return;
      card.dataset.refs = "1";
      var own = card.id ? card.id.toUpperCase() : "";
      var found = [];

      textNodes(card).forEach(function (node) {
        if (node.parentElement.closest(".req__trace, .req__meta")) return;
        var value = node.nodeValue;
        REF.lastIndex = 0;
        if (!REF.test(value)) return;
        REF.lastIndex = 0;
        var frag = document.createDocumentFragment();
        var last = 0;
        value.replace(REF, function (all, kind, number, offset) {
          frag.appendChild(document.createTextNode(value.slice(last, offset)));
          frag.appendChild(chip(kind, number, refHref(kind, number, cpTargets)));
          if (all !== own && found.indexOf(all) === -1) found.push(all);
          last = offset + all.length;
          return all;
        });
        frag.appendChild(document.createTextNode(value.slice(last)));
        node.parentNode.replaceChild(frag, node);
      });

      if (!found.length) return;
      var order = { CP: 0, OE: 1, RF: 2, RNF: 3 };
      found.sort(function (a, b) {
        var ka = a.match(/[A-Z]+/)[0], kb = b.match(/[A-Z]+/)[0];
        return order[ka] - order[kb] || parseInt(a.replace(/\D/g, ""), 10) - parseInt(b.replace(/\D/g, ""), 10);
      });
      var box = el("p", "req__refs");
      box.appendChild(el("span", "req__refs-label", "Relaciona-se com"));
      found.forEach(function (code) {
        var m = code.match(/^([A-Z]+)(\d+)$/);
        box.appendChild(chip(m[1], m[2], refHref(m[1], m[2], cpTargets)));
      });
      card.appendChild(box);
    });
  }

  /* ---- E. Barra fixa com a CP e a feature em que o leitor está ---- */
  function enhanceContextBar(root, cpHeadings) {
    if (cpHeadings.length < 3 || root.querySelector(".cp-context-bar")) return;
    var bar = el("div", "cp-context-bar");
    bar.setAttribute("aria-hidden", "true");
    var cp = el("span", "cp-context-bar__cp");
    var feature = el("span", "cp-context-bar__feature");
    bar.append(cp, feature);
    root.prepend(bar);

    var features = Array.prototype.slice.call(root.querySelectorAll("h4.feature-heading"));
    var offset = 0;

    function headerOffset() {
      var header = document.querySelector(".md-header");
      var tabs = document.querySelector(".md-tabs");
      var height = header ? header.getBoundingClientRect().height : 0;
      if (tabs && tabs.offsetHeight && getComputedStyle(tabs).display !== "none" && !tabs.hidden) {
        var rect = tabs.getBoundingClientRect();
        if (rect.bottom > 0) height = Math.max(height, rect.bottom);
      }
      return height;
    }

    function current(list, limit) {
      var hit = null;
      for (var i = 0; i < list.length; i++) {
        if (list[i].getBoundingClientRect().top - limit <= 8) hit = list[i];
        else break;
      }
      return hit;
    }

    var frame = 0;
    function update() {
      frame = 0;
      offset = headerOffset();
      var column = root.getBoundingClientRect();
      bar.style.top = offset + "px";
      bar.style.left = column.left + "px";
      bar.style.width = column.width + "px";
      var limit = offset + bar.offsetHeight;
      var h = current(cpHeadings, limit);
      if (!h) {
        bar.classList.remove("is-visible");
        document.body.classList.remove("has-context-bar");
        return;
      }
      var name = headingText(h).replace(CP_HEADING, "").trim();
      cp.textContent = h.dataset.cp + " · " + name;
      var f = current(features, limit);
      var inSection = f && (h.compareDocumentPosition(f) & Node.DOCUMENT_POSITION_FOLLOWING);
      feature.textContent = inSection ? headingText(f).replace(/^Feature\s*[—–-]?\s*/, "") : "";
      bar.classList.toggle("has-feature", !!inSection);
      bar.classList.add("is-visible");
      document.body.classList.add("has-context-bar");
    }
    window.addEventListener("scroll", function () { if (!frame) frame = requestAnimationFrame(update); }, { passive: true });
    window.addEventListener("resize", function () { if (!frame) frame = requestAnimationFrame(update); });
    update();
  }

  /* ---- G. Decisões coloridas e filtro na análise do feedback ---- */
  var DECISIONS = {
    "aceito": "accepted",
    "parcialmente aceito": "partial",
    "não aceito": "rejected",
    "não aplicável": "na"
  };

  function enhanceDecisions(root) {
    if (root.querySelector(".decision")) return;
    var naRows = 0;
    root.querySelectorAll("td").forEach(function (td) {
      var key = DECISIONS[text(td).toLowerCase()];
      if (!key) return;
      var badge = el("span", "decision decision--" + key, text(td));
      td.replaceChildren(badge);
      var row = td.parentElement;
      // Na tabela de legenda a decisão é a primeira coluna: essa linha nunca é ocultada
      // e não entra na contagem de decisões.
      if (td.cellIndex === 0) {
        badge.classList.add("decision--legend");
        var legendBox = td.closest("details.table-toggle");
        if (legendBox) legendBox.classList.add("table-toggle--legend");
        return;
      }
      if (key === "na") { row.classList.add("row--na"); naRows++; }
      row.classList.add("row--" + key);
    });

    var totals = {};
    root.querySelectorAll("details.table-toggle").forEach(function (box) {
      var summary = box.querySelector("summary");
      var label = summary.querySelector(".table-toggle__label");
      if (box.classList.contains("table-toggle--legend")) {
        if (label) label.textContent = "Legenda das decisões";
        box.open = true;
        return;
      }
      var counts = {};
      box.querySelectorAll(".decision:not(.decision--legend)").forEach(function (b) {
        var k = b.className.replace(/.*decision--/, "");
        counts[k] = (counts[k] || 0) + 1;
        totals[k] = (totals[k] || 0) + 1;
      });
      if (!Object.keys(counts).length) return;
      // A tabela fica logo abaixo do título da CP: evita repetir o mesmo nome.
      if (label && label.classList.contains("table-toggle__label--generic")) {
        label.textContent = "Apontamentos da verificação";
        label.classList.remove("table-toggle__label--generic");
      }
      ["accepted", "partial", "rejected", "na"].forEach(function (k) {
        if (!counts[k]) return;
        var label = { accepted: "aceito", partial: "parcial", rejected: "não aceito", na: "sem alteração" }[k];
        summary.appendChild(el("span", "decision-count decision--" + k, counts[k] + " " + label));
      });
    });

    renderDecisionSummary(root, totals);

    if (!naRows) return;
    var bar = el("div", "decision-filter");
    var button = el("button", "decision-filter__button");
    button.type = "button";
    button.setAttribute("aria-pressed", "false");
    function label() {
      var on = root.classList.contains("hide-na");
      button.textContent = on ? "Mostrar itens sem alteração (" + naRows + ")" : "Ocultar itens sem alteração (" + naRows + ")";
      button.setAttribute("aria-pressed", on ? "true" : "false");
    }
    button.addEventListener("click", function () { root.classList.toggle("hide-na"); label(); });
    label();
    bar.appendChild(button);
    var anchor = root.querySelector("h2");
    if (anchor) anchor.before(bar); else root.appendChild(bar);
  }

  /* Resumo em números de todas as decisões da página, com barra proporcional */
  function renderDecisionSummary(root, totals) {
    var keys = ["accepted", "partial", "rejected", "na"];
    var total = keys.reduce(function (sum, k) { return sum + (totals[k] || 0); }, 0);
    if (!total || root.querySelector(".decision-summary")) return;
    var names = { accepted: "aceitos", partial: "parcialmente aceitos", rejected: "não aceitos", na: "sem alteração" };
    var box = el("section", "decision-summary");
    box.setAttribute("aria-label", "Resumo das decisões");
    box.appendChild(el("p", "decision-summary__title", total + " apontamentos analisados"));
    var bar = el("div", "decision-summary__bar");
    bar.setAttribute("aria-hidden", "true");
    var list = el("ul", "decision-summary__list");
    keys.forEach(function (k) {
      if (!totals[k]) return;
      var seg = el("span", "decision-summary__seg decision--" + k);
      seg.style.flexGrow = totals[k];
      bar.appendChild(seg);
      var item = el("li", "decision-summary__item");
      item.appendChild(el("span", "decision-summary__dot decision--" + k));
      item.appendChild(el("strong", "", String(totals[k])));
      item.appendChild(document.createTextNode(" " + names[k]));
      list.appendChild(item);
    });
    box.append(bar, list);
    var anchor = root.querySelector("h2");
    if (anchor) anchor.before(box); else root.appendChild(box);
  }

  /* ---- H. Tempo de leitura nas páginas longas ---- */
  function enhanceReadingTime(root, cpHeadings) {
    if (root.querySelector(".reading-meta")) return;
    var words = (root.textContent || "").split(/\s+/).filter(Boolean).length;
    if (words < 1500) return;
    var meta = el("p", "reading-meta");
    // Páginas de consulta (requisitos, decisões, tabelas longas) não são lidas de
    // ponta a ponta: nelas o tempo de leitura assusta mais do que orienta.
    var longTable = Array.prototype.some.call(root.querySelectorAll("table"), function (t) {
      return t.querySelectorAll("tbody tr").length > 30;
    });
    var reference = !!root.querySelector("details.req, .decision") || longTable;
    if (!reference) {
      meta.appendChild(el("span", "reading-meta__time", "~" + Math.max(1, Math.round(words / WORDS_PER_MINUTE)) + " min de leitura"));
    }
    var rfs = root.querySelectorAll("details.req--rf").length;
    var rnfs = root.querySelectorAll("details.req--rnf").length;
    if (rfs) meta.appendChild(el("span", "", rfs + " RFs"));
    if (rnfs) meta.appendChild(el("span", "", rnfs + " RNFs"));
    var cps = cpHeadings.map(function (h) { return headingText(h).match(CP_HEADING)[1]; })
      .filter(function (code, i, all) { return all.indexOf(code) === i; }).length;
    if (cps) meta.appendChild(el("span", "", cps + (cps === 1 ? " CP" : " CPs")));
    if (!meta.children.length) return;
    var first = root.querySelector("h1, h2");
    if (first) first.after(meta); else root.prepend(meta);
  }

  /* ---- I. Parágrafos com nome em negrito em sequência viram cards ---- */
  function leadName(p) {
    if (p.tagName !== "P" || p.classList.contains("meta-lines") || p.closest("details.req")) return null;
    var first = p.firstChild;
    if (!first || first.nodeName !== "STRONG") return null;
    var name = text(first);
    if (!name || name.length > 60 || /:$/.test(name) || name === text(p)) return null;
    return first;
  }

  function enhanceLeadCards(root) {
    var children = Array.prototype.slice.call(root.children);
    for (var i = 0; i < children.length; i++) {
      var run = [];
      while (i < children.length && leadName(children[i])) run.push(children[i++]);
      if (run.length < 3) continue;
      var grid = el("div", "lead-cards");
      run[0].before(grid);
      run.forEach(function (p) {
        p.classList.add("lead-card");
        leadName(p).classList.add("lead-card__name");
        grid.appendChild(p);
      });
    }
  }

  /* ---- J. Reuniões como cards recolhíveis ---- */
  function enhanceMeetings(root) {
    var heads = Array.prototype.filter.call(root.children, function (node) {
      var next = node.nextElementSibling;
      return node.tagName === "H2" && next && next.tagName === "P" && /^Data:/.test(text(next));
    });
    if (heads.length < 2 || root.querySelector("details.meeting")) return;

    // Todas as reuniões começam recolhidas; um link direto (#...) abre a de destino.
    heads.forEach(function (h) {
      var meta = h.nextElementSibling;
      var date = (text(meta).match(/Data:\s*([^\s]+)/) || [])[1] || "";
      var card = el("details", "meeting");
      var summary = el("summary", "meeting__summary");
      h.before(card);
      summary.appendChild(h);
      if (date) summary.appendChild(el("span", "meeting__date", date));
      card.appendChild(summary);
      var node = card.nextElementSibling;
      while (node && node.tagName !== "H2" && node.tagName !== "H1") {
        var next = node.nextElementSibling;
        card.appendChild(node);
        node = next;
      }
    });
  }

  /* ---- F. Índice lateral enxuto nas páginas de requisitos ---- */
  function enhanceToc(root) {
    var isReqPage = !!root.querySelector("details.req");
    document.body.classList.toggle("toc-compact", isReqPage);
  }

  function enhance() {
    var root = document.querySelector(".md-content__inner");
    if (!root || root.dataset.fbrReading) return;
    root.dataset.fbrReading = "1";

    var cpHeadings = Array.prototype.filter.call(root.querySelectorAll(":scope > h3"), function (h) {
      return CP_HEADING.test(headingText(h));
    });
    var hasReqs = !!root.querySelector("details.req");

    enhanceCriteria(root);
    if (hasReqs) enhanceCpSections(root, cpHeadings);
    enhanceRequirementBody(root);
    enhanceReferences(root, cpHeadings);
    enhanceDecisions(root);
    enhanceReadingTime(root, cpHeadings);
    enhanceLeadCards(root);
    enhanceMeetings(root);
    enhanceToc(root);
    enhanceContextBar(root, cpHeadings);

    // Se a página abriu com um destino (#rf10, #reuniao...), revela os blocos recém-criados.
    var id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch (_) { id = ""; }
    var target = id && document.getElementById(id);
    if (target && target.closest("details:not([open])")) {
      for (var n = target; n; n = n.parentElement) if (n.tagName === "DETAILS") n.open = true;
      requestAnimationFrame(function () { target.scrollIntoView(); });
    }
  }

  if (window.document$ && typeof window.document$.subscribe === "function") {
    window.document$.subscribe(enhance);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", enhance);
  } else {
    enhance();
  }
})();
