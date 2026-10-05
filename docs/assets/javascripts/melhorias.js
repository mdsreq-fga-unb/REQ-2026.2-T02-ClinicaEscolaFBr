/*
 * Clínica Escola FBr — ajustes de leitura das Unidades 1 e 2.
 *
 * Roda depois de extra.js, reading.js e matriz.js. Como os demais scripts,
 * apenas reorganiza a apresentação: nenhum texto de requisito é alterado e,
 * sem JavaScript, o conteúdo continua completo.
 *
 *  A. Feature com um único RF de mesmo nome vira um só card
 *  B. Link da issue no título da feature vira etiqueta
 *  C. Decisão de MVP nos cards de RF/RNF e nos cabeçalhos das CPs
 *  D. Etiquetas coloridas em colunas de decisão (Sim/Não, Situação, Classificação)
 *  E. Tabelas largas viram cartões empilhados no celular
 *  F. Botão "Expandir tudo / Recolher tudo"
 *  G. Ampliação de figuras na própria página
 */
(function () {
  "use strict";

  function text(node) {
    return (node.textContent || "").replace(/\s+/g, " ").trim();
  }

  function norm(value) {
    return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  }

  function el(tag, className, content) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (content != null) node.textContent = content;
    return node;
  }

  var ISSUE_LINK = 'a[href*="github.com"][href*="/issues/"]';

  /* ---- A + B. Features ---- */
  function featureName(h) {
    var clone = h.cloneNode(true);
    clone.querySelectorAll(".feature-heading__label, .headerlink, .visually-hidden, " + ISSUE_LINK).forEach(function (n) { n.remove(); });
    return text(clone);
  }

  function enhanceFeatures(root) {
    root.querySelectorAll("h4.feature-heading").forEach(function (h) {
      if (h.dataset.fbrFeature) return;
      h.dataset.fbrFeature = "1";
      var issue = h.querySelector(ISSUE_LINK);
      if (issue) {
        issue.classList.add("issue-chip");
        issue.setAttribute("aria-label", "Issue " + text(issue) + " no GitHub");
      }

      // Conteúdo da feature até o próximo título
      var block = [];
      var node = h.nextElementSibling;
      while (node && !/^H[1-4]$/.test(node.tagName) && node.tagName !== "HR") {
        block.push(node);
        node = node.nextElementSibling;
      }
      if (block.length !== 1 || !block[0].matches("details.req")) return;
      var card = block[0];
      var title = card.querySelector(".req__title");
      if (!title || norm(text(title)) !== norm(featureName(h))) return;

      // Mesmo nome e um único requisito: o título da feature fica só como âncora
      // (os links da Lista de features continuam funcionando) e o card ganha a etiqueta.
      h.classList.add("feature-heading--merged");
      card.classList.add("req--feature");
      var summary = card.querySelector("summary");
      var tag = el("span", "req__feature-tag", "Feature");
      tag.title = "Feature com um único requisito de mesmo nome";
      summary.querySelector(".req__id").after(tag);
      if (issue) {
        var chip = issue.cloneNode(true);
        chip.target = "_blank";
        chip.rel = "noopener";
        chip.addEventListener("click", function (e) { e.stopPropagation(); });
        summary.appendChild(chip);
      }
    });
  }

  /* ---- C. Decisão de MVP lida da página do Backlog ---- */
  var RNF_SHORT = {
    "Obrigatório para o MVP": ["MVP · obrigatório", "required"],
    "Associado a RF do MVP": ["MVP · associado", "linked"],
    "Evolutivo": ["MVP · evolutivo", "evolving"],
    "Não aplicável ao MVP": ["Fora do MVP", "na"]
  };

  function addSummaryTag(card, label, cls, title) {
    var summary = card.querySelector("summary");
    if (!summary || summary.querySelector(".mvp-tag")) return;
    var tag = el("span", "mvp-tag mvp-tag--" + cls, label);
    if (title) tag.title = title;
    var anchor = summary.querySelector(".req__title");
    if (anchor) anchor.after(tag); else summary.appendChild(tag);
  }

  function enhanceMvpTags(root) {
    var rfCards = root.querySelectorAll("details.req--rf[id]");
    var rnfCards = root.querySelectorAll("details.req--rnf[id]");
    if ((!rfCards.length && !rnfCards.length) || !window.FBRPriorizacao) return;
    window.FBRPriorizacao.load().then(function (data) {
      if (!data) return;
      var byCode = {};
      data.rfs.forEach(function (r) { byCode[r.code.toLowerCase()] = r; });

      rfCards.forEach(function (card) {
        var r = byCode[card.id];
        if (!r) return;
        addSummaryTag(card, r.mvp ? "MVP" : "Depois do MVP", r.mvp ? "in" : "later",
          (r.mvp ? "No recorte do MVP" : "Fora do recorte do MVP") + " — valor " + r.value + ", esforço " + r.effort + " (seção 10.2.3)");
      });

      rnfCards.forEach(function (card) {
        var cls = data.rnfs[card.id.toUpperCase()];
        var short = cls && RNF_SHORT[cls];
        if (!short) return;
        addSummaryTag(card, short[0], short[1], cls + " (seção 10.2.1.5)");
      });

      // Cabeçalho da CP: "MVP: x de y RFs"
      root.querySelectorAll("h3.cp-heading").forEach(function (h) {
        var meta = h.nextElementSibling;
        if (!meta || !meta.classList.contains("cp-meta") || meta.querySelector(".mvp-tag")) return;
        var items = data.rfs.filter(function (r) { return r.cp === h.dataset.cp; });
        if (!items.length || !rfCards.length) return;
        var inside = items.filter(function (r) { return r.mvp; }).length;
        var cls = inside === items.length ? "in" : inside === 0 ? "later" : "partial";
        meta.appendChild(el("span", "mvp-tag mvp-tag--" + cls, "MVP: " + inside + " de " + items.length + " RFs"));
      });
    });
  }

  /* ---- D. Etiquetas em colunas de decisão ---- */
  var CELL_TAGS = {
    "No MVP?": { "Sim": "in", "Não": "later" },
    "Situação": { "Completa no MVP": "in", "Parcial no MVP": "partial", "Fora do MVP": "later" },
    "Classificação": {
      "Obrigatório para o MVP": "required",
      "Associado a RF do MVP": "linked",
      "Evolutivo": "evolving",
      "Não aplicável ao MVP": "na"
    }
  };

  function enhanceCellTags(root) {
    root.querySelectorAll("table").forEach(function (table) {
      if (table.dataset.fbrTags) return;
      table.dataset.fbrTags = "1";
      var heads = Array.prototype.map.call(table.querySelectorAll("thead th"), text);
      heads.forEach(function (name, col) {
        var map = CELL_TAGS[name];
        if (!map) return;
        table.querySelectorAll("tbody tr").forEach(function (tr) {
          var td = tr.children[col];
          var key = td && text(td);
          if (!td || !map[key]) return;
          var cls = map[key];
          var prefix = name === "Classificação" ? "rnf-class rnf-class--" : "mvp-tag mvp-tag--";
          td.replaceChildren(el("span", prefix + cls, key));
        });
      });
    });
  }

  /* ---- E. Tabelas largas: rótulo de cada célula para o modo empilhado ---- */
  function enhanceStackTables(root) {
    root.querySelectorAll("table").forEach(function (table) {
      if (table.dataset.stack) return;
      var heads = Array.prototype.map.call(table.querySelectorAll("thead th"), text);
      if (heads.length < 5) return;
      table.dataset.stack = "1";
      table.querySelectorAll("tbody tr").forEach(function (tr) {
        Array.prototype.forEach.call(tr.children, function (td, i) {
          if (heads[i]) td.setAttribute("data-label", heads[i]);
        });
      });
    });
  }

  /* ---- F. Expandir / recolher tudo ---- */
  var FOLDS = "details.req, details.table-toggle, details.feature-area, details.cp-context, details.meeting, details.revision-note";

  function enhanceFoldAll(root) {
    if (root.querySelector(".fold-all")) return;
    var folds = root.querySelectorAll(FOLDS);
    if (folds.length < 6) return;
    var button = el("button", "fold-all");
    button.type = "button";
    function current() { return Array.prototype.every.call(root.querySelectorAll(FOLDS), function (d) { return d.open; }); }
    function label() {
      var all = current();
      button.textContent = all ? "Recolher tudo" : "Expandir tudo";
      button.setAttribute("aria-label", (all ? "Recolher" : "Expandir") + " todos os blocos desta página");
    }
    button.addEventListener("click", function () {
      var open = !current();
      root.querySelectorAll(FOLDS).forEach(function (d) { d.open = open; });
      label();
    });
    root.addEventListener("toggle", label, true);
    label();
    var meta = root.querySelector(".reading-meta");
    if (meta) {
      meta.appendChild(button);
    } else {
      var bar = el("p", "reading-meta reading-meta--tools");
      bar.appendChild(button);
      var first = root.querySelector(".mvp-summary") || root.querySelector("h1");
      if (first) first.after(bar); else root.prepend(bar);
    }
  }

  /* ---- G. Ampliação de figuras ---- */
  var dialog = null;
  function lightbox() {
    if (dialog) return dialog;
    dialog = el("dialog", "fbr-lightbox");
    dialog.setAttribute("aria-label", "Imagem ampliada");
    var close = el("button", "fbr-lightbox__close", "Fechar");
    close.type = "button";
    close.addEventListener("click", function () { dialog.close(); });
    var frame = el("div", "fbr-lightbox__frame");
    var img = el("img", "fbr-lightbox__img");
    var caption = el("p", "fbr-lightbox__caption");
    var original = el("a", "fbr-lightbox__original", "Abrir em tamanho original");
    original.target = "_blank";
    original.rel = "noopener";
    img.addEventListener("click", function () { dialog.classList.toggle("is-zoomed"); });
    dialog.addEventListener("close", function () { dialog.classList.remove("is-zoomed"); });
    frame.appendChild(img);
    dialog.append(close, frame, caption, original);
    dialog.addEventListener("click", function (e) { if (e.target === dialog) dialog.close(); });
    document.body.appendChild(dialog);
    return dialog;
  }

  function enhanceLightbox(root) {
    if (root.dataset.fbrLightbox || typeof HTMLDialogElement !== "function") return;
    root.dataset.fbrLightbox = "1";
    root.addEventListener("click", function (e) {
      var link = e.target.closest("a.figure-media__zoom");
      if (!link || e.ctrlKey || e.metaKey || e.shiftKey) return;
      var img = link.querySelector("img");
      if (!img) return;
      e.preventDefault();
      var box = lightbox();
      var big = box.querySelector(".fbr-lightbox__img");
      big.src = link.href;
      big.alt = img.alt || "";
      var fig = link.closest("p");
      var cap = fig && fig.nextElementSibling && fig.nextElementSibling.classList.contains("figure-caption") ? text(fig.nextElementSibling) : img.alt;
      box.querySelector(".fbr-lightbox__caption").textContent = cap || "";
      box.querySelector(".fbr-lightbox__original").href = link.href;
      box.showModal();
    });
  }

  function enhance() {
    var root = document.querySelector(".md-content__inner");
    if (!root || root.dataset.fbrMelhorias) return;
    root.dataset.fbrMelhorias = "1";
    enhanceFeatures(root);
    enhanceCellTags(root);
    enhanceStackTables(root);
    enhanceMvpTags(root);
    enhanceFoldAll(root);
    enhanceLightbox(root);
  }

  if (window.document$ && typeof window.document$.subscribe === "function") {
    window.document$.subscribe(enhance);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", enhance);
  } else {
    enhance();
  }
})();
