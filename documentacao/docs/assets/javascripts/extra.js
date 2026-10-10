/*
 * Clínica Escola FBr — melhorias progressivas de apresentação.
 *
 * Este script apenas reconhece padrões que já existem no Markdown
 * (RFs, RNFs, critérios de aceitação, rastreabilidade, legendas de figura,
 * tabelas) e adiciona classes/estrutura visual. Nenhum texto é alterado.
 * Sem JavaScript, o conteúdo continua íntegro e legível.
 */
(function () {
  "use strict";

  var REQ_TITLE = /^(RNF|RF)(\d+)\s*[—–-]\s*(.+)$/;
  var HEADING_NUM = /^(\d+(?:\.\d+)*\.?)\s+(?=\S)/;
  var STOP_TAGS = /^(H1|H2|H3|H4|H5|H6|HR)$/;

  function text(el) {
    return (el.textContent || "").replace(/\s+/g, " ").trim();
  }

  function el(tag, className, content) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (content != null) node.textContent = content;
    return node;
  }

  /* Parágrafo composto apenas por um <strong> com "RFn — Título" */
  function requirementMatch(node) {
    if (!node || node.tagName !== "P" || node.children.length !== 1) return null;
    var strong = node.firstElementChild;
    if (strong.tagName !== "STRONG" || text(node) !== text(strong)) return null;
    return text(strong).match(REQ_TITLE);
  }

  /* ---- Requisitos: agrupa cada RF/RNF em um card ---- */
  function enhanceRequirements(root) {
    var heads = Array.prototype.filter.call(root.querySelectorAll("p"), function (p) {
      return p.parentElement === root && requirementMatch(p);
    });

    heads.forEach(function (head) {
      var match = requirementMatch(head);
      var kind = match[1].toLowerCase();
      var id = kind + match[2];

      var card = el("details", "req req--" + kind);
      // Preserva o destino definido no Markdown ao mover o título para o card.
      var authoredAnchor = head.firstElementChild.id;
      if (authoredAnchor === id) {
        head.firstElementChild.removeAttribute("id");
        card.id = id;
      } else if (!document.getElementById(id)) {
        card.id = id;
      }
      head.parentNode.insertBefore(card, head);

      // O título vira o controle nativo do acordeão, acessível por teclado.
      var summary = el("summary", "req__summary");
      summary.appendChild(el("span", "req__id", match[1] + match[2]));
      summary.appendChild(el("span", "visually-hidden", " — "));
      summary.appendChild(el("span", "req__title", match[3]));
      card.appendChild(summary);

      // Move tudo o que pertence a este requisito para dentro do acordeão.
      // (inclui os nós de texto entre os blocos, preservando o texto exatamente)
      var node = head;
      while (node) {
        var next = node.nextSibling;
        if (node !== head) card.appendChild(node);
        var nextEl = next && next.nodeType === 3 ? next.nextElementSibling : next;
        if (!next || !nextEl || STOP_TAGS.test(nextEl.tagName) || requirementMatch(nextEl)) break;
        node = next;
      }
      head.remove();

      Array.prototype.forEach.call(card.children, function (child) {
        if (child.tagName !== "P") return;
        var first = child.firstElementChild;
        var firstIsLead = first && child.firstChild === first;
        var lead = firstIsLead && first.tagName === "EM" ? text(first) : "";
        var body = text(child);

        if (/^Critérios de aceitação:?$/.test(lead) && body === lead) {
          child.classList.add("req__label");
          var list = child.nextElementSibling;
          if (list && /^(UL|OL)$/.test(list.tagName)) list.classList.add("req__criteria");
        } else if (/^Rastreabilidade:?$/.test(lead)) {
          child.classList.add("req__trace");
          first.classList.add("req__tag");
        } else if (/^(Classificação|Rastreabilidade):/.test(body)) {
          child.classList.add("req__meta");
          labelLines(child, /(^|\n)(Classificação|Rastreabilidade):/g);
        }
      });
    });
  }

  /* Envolve rótulos no início de linhas de texto (ex.: "Classificação:") */
  function labelLines(p, pattern) {
    Array.prototype.slice.call(p.childNodes).forEach(function (node) {
      if (node.nodeType !== 3) return;
      var value = node.nodeValue;
      pattern.lastIndex = 0;
      if (!pattern.test(value)) return;
      pattern.lastIndex = 0;

      var frag = document.createDocumentFragment();
      var last = 0;
      value.replace(pattern, function (all, br, label, offset) {
        frag.appendChild(document.createTextNode(value.slice(last, offset) + br));
        frag.appendChild(el("span", "req__tag", label + ":"));
        last = offset + all.length;
        return all;
      });
      frag.appendChild(document.createTextNode(value.slice(last)));
      p.replaceChild(frag, node);
    });
  }

  /* ---- Títulos: "Feature — ..." e numeração das seções ---- */
  function enhanceHeadings(root) {
    root.querySelectorAll("h4").forEach(function (h) {
      var node = h.firstChild;
      if (!node || node.nodeType !== 3 || !/^Feature\s*[—–-]\s*/.test(node.nodeValue)) return;
      var prefix = node.nodeValue.match(/^Feature\s*[—–-]\s*/)[0];
      node.nodeValue = node.nodeValue.slice(prefix.length);
      var label = el("span", "feature-heading__label", "Feature");
      label.appendChild(el("span", "visually-hidden", " — "));
      h.insertBefore(label, node);
      h.classList.add("feature-heading");
    });

    root.querySelectorAll("h1, h2, h3").forEach(function (h) {
      var node = h.firstChild;
      if (!node || node.nodeType !== 3) return;
      var match = node.nodeValue.match(HEADING_NUM);
      if (!match) return;
      node.nodeValue = node.nodeValue.slice(match[0].length);
      h.insertBefore(el("span", "heading-num", match[1] + " "), node);
    });
  }

  /* ---- Linhas de metadados: "**Data:** ...\n**Local:** ..." ---- */
  function enhanceMetaLines(root) {
    root.querySelectorAll("p").forEach(function (p) {
      if (p.closest(".req") || !p.firstChild || p.firstChild.nodeName !== "STRONG") return;
      var breaks = 0;
      Array.prototype.forEach.call(p.childNodes, function (node) {
        var next = node.nextSibling;
        if (node.nodeType === 3 && /\n\s*$/.test(node.nodeValue) && next && next.nodeName === "STRONG") breaks++;
      });
      if (breaks) p.classList.add("meta-lines");
    });
  }

  /* ---- Figuras: legenda logo abaixo da imagem e ampliação ---- */
  function enhanceFigures(root) {
    root.querySelectorAll("p > img").forEach(function (img) {
      var p = img.parentElement;
      if (p.children.length !== 1 || text(p) !== "") return;
      p.classList.add("figure-media");

      if (!img.closest("a")) {
        var link = el("a", "figure-media__zoom");
        link.href = img.currentSrc || img.src;
        link.target = "_blank";
        link.rel = "noopener";
        link.setAttribute("aria-label", "Abrir imagem em tamanho original" + (img.alt ? ": " + img.alt : "") + " (nova aba)");
        p.insertBefore(link, img);
        link.appendChild(img);
      }

      var caption = p.nextElementSibling;
      if (!caption) return;
      if (caption.tagName === "P" && /^Figura\s/.test(text(caption))) {
        caption.classList.add("figure-caption");
      } else if (caption.tagName === "BLOCKQUOTE" && caption.children.length === 1 && /^Figura\s/.test(text(caption))) {
        caption.classList.add("figure-caption");
      }
    });
  }

  /* ---- Tabelas: colunas compactas/largas e tabela de histórico ---- */
  function enhanceTables(root) {
    root.querySelectorAll("table").forEach(function (table) {
      if (table.dataset.fbrTable) return;
      table.dataset.fbrTable = "1";

      // Atributo em vez de classe: o Material estiliza apenas table:not([class])
      var headers = Array.prototype.map.call(table.querySelectorAll("thead th"), text);
      if (headers.indexOf("Versão") !== -1 && headers.indexOf("Data") !== -1) {
        table.dataset.fbrTable = "history";
      }

      var rows = table.querySelectorAll("tbody tr");
      if (!rows.length) return;
      headers.forEach(function (_, col) {
        var total = 0, max = 0, count = 0;
        rows.forEach(function (row) {
          var cell = row.children[col];
          if (!cell) return;
          var len = text(cell).length;
          total += len; max = Math.max(max, len); count++;
        });
        if (!count) return;
        var avg = total / count;
        var cls = max <= 18 ? "col-compact" : avg >= 70 ? "col-wide" : avg >= 24 ? "col-medium" : "";
        if (!cls) return;
        table.querySelectorAll("tr").forEach(function (row) {
          var cell = row.children[col];
          if (cell) cell.classList.add(cls);
        });
      });
    });
  }

  /* ---- Tabelas retráteis: cada tabela ganha um cabeçalho que abre e fecha (começa fechada) ---- */
  /* Parágrafo formado só por um <strong> logo acima da tabela (ex.: "**Complexidade técnica**") */
  function boldCaption(node) {
    var prev = node.previousElementSibling;
    if (!prev || prev.tagName !== "P" || prev.children.length !== 1) return null;
    var strong = prev.firstElementChild;
    return strong.tagName === "STRONG" && text(prev) === text(strong) ? prev : null;
  }

  function tableLabel(node) {
    var prev = node.previousElementSibling;
    while (prev) {
      if (/^H[1-6]$/.test(prev.tagName)) return text(prev).replace(/#$/, "").trim();
      prev = prev.previousElementSibling;
    }
    return "Tabela";
  }

  /*
   * Regra de abertura: a tabela que é o assunto da seção (até OPEN_MAX_ROWS
   * linhas) já aparece aberta; tabelas longas de consulta (ex.: 68 RFs) e
   * páginas com muitas tabelas (ex.: análise do feedback, onde o resumo de
   * cada CP fica no cabeçalho) começam fechadas.
   */
  var OPEN_MAX_ROWS = 16;
  var MANY_TABLES = 10;

  function enhanceCollapsibleTables(root) {
    var blocks = [];
    root.querySelectorAll("table").forEach(function (table) {
      if (table.closest("details")) return;
      var block = table.closest(".md-typeset__scrollwrap") || table;
      if (block.parentElement !== root) return;
      blocks.push({ table: table, block: block });
    });
    var manyTables = blocks.length >= MANY_TABLES;

    blocks.forEach(function (item) {
      var block = item.block;
      var rows = item.table.querySelectorAll("tbody tr").length;
      var caption = boldCaption(block);
      var details = el("details", "table-toggle");
      var summary = el("summary", "table-toggle__summary");
      // Sem legenda própria, o rótulo repetia o título da seção logo acima;
      // "Tabela" + contagem evita a duplicação. O nome da seção fica guardado
      // em data-section para quem precisar dele (ex.: análise do feedback).
      var label = caption ? text(caption) : "Tabela";
      var labelNode = el("span", "table-toggle__label", label);
      if (!caption) {
        details.dataset.section = tableLabel(block);
        labelNode.classList.add("table-toggle__label--generic");
      }
      summary.appendChild(labelNode);
      if (caption) caption.remove();
      summary.appendChild(el("span", "table-toggle__count", rows + (rows === 1 ? " linha" : " linhas")));
      details.appendChild(summary);
      block.parentNode.insertBefore(details, block);
      details.appendChild(block);
      if (!manyTables && rows <= OPEN_MAX_ROWS) details.open = true;
    });
  }

  /* Indica visualmente quando uma tabela pode ser rolada na horizontal */
  var resizeObserver = "ResizeObserver" in window ? new ResizeObserver(function (entries) {
    entries.forEach(function (entry) { updateScroll(entry.target); });
  }) : null;

  function updateScroll(wrap) {
    var overflow = wrap.scrollWidth - wrap.clientWidth > 2;
    if (overflow) {
      wrap.tabIndex = 0;
      wrap.setAttribute("role", "region");
      wrap.setAttribute("aria-label", "Tabela com mais colunas. Use as setas para rolar horizontalmente.");
    } else {
      wrap.removeAttribute("tabindex");
      wrap.removeAttribute("role");
      wrap.removeAttribute("aria-label");
    }
    if (wrap.previousElementSibling && wrap.previousElementSibling.classList.contains("table-scroll-hint")) {
      wrap.previousElementSibling.hidden = !overflow;
    }
    wrap.classList.toggle("is-overflowing", overflow);
    wrap.classList.toggle("is-scrolled", overflow && wrap.scrollLeft > 2);
    wrap.classList.toggle("is-at-end", overflow && wrap.scrollLeft + wrap.clientWidth >= wrap.scrollWidth - 2);
  }

  function enhanceScrollWraps(root) {
    root.querySelectorAll(".md-typeset__scrollwrap").forEach(function (wrap) {
      if (wrap.dataset.fbrScroll) return;
      wrap.dataset.fbrScroll = "1";
      var hint = el("p", "table-scroll-hint", "Mais colunas à direita: deslize a tabela ou use as setas do teclado.");
      wrap.before(hint);
      updateScroll(wrap);
      wrap.addEventListener("scroll", function () { updateScroll(wrap); }, { passive: true });
      if (resizeObserver) resizeObserver.observe(wrap);
    });
  }

  /* Busca local: mantém a documentação intacta e oferece destinos diretos. */
  function normalize(value) {
    return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  function enhanceRequirementSearch(root) {
    var cards = Array.prototype.slice.call(root.querySelectorAll("details.req[id]"));
    var index = root.querySelector(".requirement-index");
    if (!cards.length || !index || root.querySelector(".req-finder")) return;
    var finder = el("section", "req-finder");
    finder.setAttribute("aria-label", "Localizar requisitos nesta página");
    var label = el("label", "req-finder__label", "Localizar requisito nesta página");
    label.htmlFor = "req-query";
    var field = el("input", "req-finder__input");
    field.id = "req-query";
    field.type = "search";
    field.placeholder = "Digite um código ou assunto";
    field.setAttribute("aria-describedby", "req-help req-status");
    var controls = el("div", "req-finder__controls");
    var clear = el("button", "req-finder__clear", "Limpar busca");
    clear.type = "button";
    clear.disabled = true;
    controls.append(field, clear);
    var help = el("p", "req-finder__help", "Busque por código (RF7, RNF15), título ou palavra do texto. Os resultados levam ao requisito completo.");
    help.id = "req-help";
    var status = el("p", "req-finder__status");
    status.id = "req-status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    var results = el("ul", "req-finder__results");
    results.hidden = true;
    var entries = cards.map(function (card) {
      return { card: card, title: text(card.querySelector("summary")), body: normalize(text(card)) };
    });
    function search() {
      var query = normalize(field.value.trim());
      clear.disabled = !field.value;
      results.replaceChildren();
      results.hidden = !query;
      if (!query) {
        status.textContent = cards.length + " requisitos disponíveis. Você também pode navegar pelo índice abaixo.";
        return;
      }
      var code = query.replace(/\s/g, "").match(/^(rnf|rf)0*(\d+)$/);
      var matches = entries.filter(function (entry) {
        return code ? entry.card.id === code[1] + Number(code[2]) : query.split(/\s+/).every(function (word) { return entry.body.indexOf(word) !== -1; });
      });
      status.textContent = matches.length ? matches.length + (matches.length === 1 ? " requisito encontrado." : " requisitos encontrados.") : "Nenhum requisito encontrado. Tente outro assunto ou confira o código. Você pode limpar a busca e usar o índice abaixo.";
      matches.forEach(function (entry) {
        var item = el("li");
        var link = el("a", "", entry.title);
        link.href = "#" + entry.card.id;
        item.appendChild(link);
        results.appendChild(item);
      });
    }
    field.addEventListener("input", search);
    clear.addEventListener("click", function () { field.value = ""; search(); field.focus(); });
    finder.append(label, controls, help, status, results);
    index.before(finder);
    search();
  }

  /* Um link direto deve revelar o conteúdo do acordeão e de seus ancestrais. */
  function revealFragment(focus) {
    var id;
    try { id = decodeURIComponent(window.location.hash.slice(1)); } catch (_) { return; }
    var target = id && document.getElementById(id);
    if (!target) return;
    var parent = target;
    while (parent) {
      if (parent.tagName === "DETAILS") parent.open = true;
      parent = parent.parentElement;
    }
    if (target.matches("details.req")) {
      window.requestAnimationFrame(function () {
        target.scrollIntoView({ block: "start" });
        if (focus) target.querySelector("summary").focus({ preventScroll: true });
      });
    }
  }

  window.addEventListener("hashchange", function () { revealFragment(true); });
  document.addEventListener("click", function (event) {
    var link = event.target.closest("a[href]");
    if (!link) return;
    var destination = new URL(link.href, window.location.href);
    if (destination.pathname === location.pathname && destination.hash === location.hash) revealFragment(true);
  });
  var printOpen = [];
  window.addEventListener("beforeprint", function () {
    printOpen = Array.prototype.slice.call(document.querySelectorAll("details.req:not([open]), details.table-toggle:not([open]), details.feature-area:not([open]), details.cp-context:not([open]), details.meeting:not([open])"));
    printOpen.forEach(function (card) { card.open = true; });
  });
  window.addEventListener("afterprint", function () {
    printOpen.forEach(function (card) { card.open = false; });
    printOpen = [];
  });

  /* ---- Página inicial: revelação no scroll, contadores e spotlight ---- */
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function countUp(node) {
    var target = parseInt(node.getAttribute("data-count"), 10);
    if (isNaN(target) || reduceMotion) return;
    var duration = 1400;
    var start = null;
    function step(now) {
      if (start === null) start = now;
      var t = Math.min((now - start) / duration, 1);
      var eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      node.textContent = String(Math.round(target * eased));
      if (t < 1) window.requestAnimationFrame(step);
    }
    node.textContent = "0";
    window.requestAnimationFrame(step);
  }

  function enhanceHome() {
    var hero = document.querySelector(".home-hero");
    if (!hero || hero.dataset.fbrHome) return;
    hero.dataset.fbrHome = "1";

    var reveals = document.querySelectorAll(".fbr-reveal");
    var counters = document.querySelectorAll(".home-stats__value[data-count]");

    if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          entry.target.querySelectorAll(".home-stats__value[data-count]").forEach(countUp);
          observer.unobserve(entry.target);
        });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.15 });
      reveals.forEach(function (node) { observer.observe(node); });
    } else {
      reveals.forEach(function (node) { node.classList.add("is-visible"); });
    }
    if (!reveals.length) counters.forEach(countUp);

    if (reduceMotion || !window.matchMedia("(pointer: fine)").matches) return;

    /* Luz que acompanha o cursor no hero e nos cards */
    document.querySelectorAll("[data-spotlight]").forEach(function (area) {
      var isHero = area === hero;
      var frame = 0;
      area.addEventListener("pointermove", function (event) {
        if (frame) return;
        frame = window.requestAnimationFrame(function () {
          frame = 0;
          var rect = area.getBoundingClientRect();
          var x = event.clientX - rect.left + "px";
          var y = event.clientY - rect.top + "px";
          area.style.setProperty(isHero ? "--spot-x" : "--mx", x);
          area.style.setProperty(isHero ? "--spot-y" : "--my", y);
        });
      }, { passive: true });
      if (isHero) {
        area.addEventListener("pointerenter", function () { area.classList.add("is-pointer"); });
        area.addEventListener("pointerleave", function () { area.classList.remove("is-pointer"); });
      }
    });
  }

  /* Abre o bloco retrátil quando um link aponta para ele (ex.: #historico-de-revisao) */
  function openTargetDetails() {
    var id = decodeURIComponent(window.location.hash.slice(1));
    var target = id && document.getElementById(id);
    if (target && target.tagName === "DETAILS") target.open = true;
  }

  window.addEventListener("hashchange", openTargetDetails);

  function enhance() {
    var root = document.querySelector(".md-content__inner");
    if (root && !root.dataset.fbrEnhanced) {
      root.dataset.fbrEnhanced = "1";
      enhanceRequirements(root);
      enhanceHeadings(root);
      enhanceMetaLines(root);
      enhanceFigures(root);
      enhanceTables(root);
      enhanceCollapsibleTables(root);
      enhanceRequirementSearch(root);
    }
    // O Material envolve as tabelas depois de montar o conteúdo
    window.requestAnimationFrame(function () {
      if (root) enhanceScrollWraps(root);
    });
    enhanceHome();
    openTargetDetails();
    revealFragment(false);
    document.documentElement.classList.add("fbr-ready");
  }

  if (window.document$ && typeof window.document$.subscribe === "function") {
    window.document$.subscribe(enhance);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", enhance);
  } else {
    enhance();
  }
})();
