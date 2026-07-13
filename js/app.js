/*
 * app.js — camada de interface das Calculadoras para Pesquisadores.
 * Lê o registro CALC_REGISTRY (calculators.js) e monta cada página de forma
 * declarativa: campos de entrada, botão, resultados, tabelas e saída Markdown.
 */
(function (global) {
  "use strict";
  var U = global.U;

  /* ----- Registro de navegação (grupos -> [slug, nome]) ----- */
  var GROUPS = [
    ["Estatística Descritiva", [
      ["media-aritmetica","Média Aritmética"],["media-geometrica-harmonica","Média Geométrica e Harmônica"],["mediana","Mediana"],["moda","Moda"],
      ["desvio-padrao","Desvio Padrão"],["variancia","Variância"],["quartis","Quartis"],
      ["amplitude","Amplitude"],["coeficiente-variacao","Coeficiente de Variação"],
      ["assimetria-curtose","Assimetria e Curtose"],["tabela-frequencias","Tabela de Frequências"],
      ["histograma","Histograma"],["boxplot","Boxplot"],
      ["correlacao-pearson","Correlação de Pearson"],["tamanho-efeito","Tamanho do Efeito (Effect Size)"],
    ]],
    ["Probabilidade", [
      ["distribuicao-normal","Distribuição Normal (Z)"],["distribuicao-binomial","Distribuição Binomial"],
      ["distribuicao-poisson","Distribuição de Poisson"],["distribuicao-t","Distribuição t de Student"],
      ["distribuicao-qui","Distribuição Qui-Quadrado"],["distribuicao-f","Distribuição F de Snedecor"],
      ["tabela-normal","Tabela Normal (Z)"],["gerador-aleatorios","Gerador de Números Aleatórios"],
    ]],
    ["Inferência", [
      ["intervalo-confianca-media","Intervalo de Confiança (Média)"],["tamanho-amostra","Tamanho de Amostra"],
      ["teste-t-1amostra","Teste t (1 Amostra)"],["teste-t-2amostras","Teste t (2 Amostras)"],
      ["teste-t-pareado","Teste t Pareado"],["qui-quadrado","Qui-Quadrado"],["anova","ANOVA (1 Fator)"],
      ["correlacao-pearson","Correlação de Pearson"],["regressao-linear","Regressão Linear Simples"],
      ["regressao-logistica","Regressão Logística"],
      ["teste-normalidade","Teste de Normalidade"],["teste-homocedasticidade","Teste de Homocedasticidade"],
      ["teste-exato-fisher","Teste Exato de Fisher"],["testes-z-proporcoes","Testes Z para Proporções"],
      ["tamanho-efeito","Tamanho do Efeito (Effect Size)"],["spearman","Correlação de Spearman"],
    ]],
    ["Não Paramétricos", [
      ["wilcoxon","Teste de Wilcoxon"],["mann-whitney","Teste de Mann-Whitney"],
      ["kruskal-wallis","Teste de Kruskal-Wallis"],["friedman","Teste de Friedman"],
      ["spearman","Correlação de Spearman"],["qui-quadrado","Qui-Quadrado"],
      ["teste-exato-fisher","Teste Exato de Fisher"],
    ]],
    ["Multivariada", [
      ["matriz-correlacao","Matriz de Correlação"],["pca","Componentes Principais (PCA)"],
      ["regressao-multipla","Regressão Múltipla"],["regressao-linear","Regressão Linear Simples"],
      ["alfa-cronbach","Alfa de Cronbach"],
    ]],
    ["Outras Ferramentas", [
      ["epidemiologia-2x2","Epidemiologia 2x2"],["alfa-cronbach","Alfa de Cronbach"],
      ["gerador-aleatorios","Gerador de Números Aleatórios"],["tabela-normal","Tabela Normal (Z)"],
      ["conversor-dados","Conversor de Dados"],["teste-normalidade","Teste de Normalidade"],
    ]],
  ];
  global.GROUPS = GROUPS;

  /* ----- Barra lateral ----- */
  function renderSidebar(active) {
    var el = document.getElementById("sidebar");
    if (!el) return;
    var sep = U.getDecimalSep();
    var h = '<p class="config-label">Configurações</p>' +
      '<label for="sep-select" style="display:block;font-weight:700;margin:.2rem 0 .35rem">Separador decimal</label>' +
      '<select id="sep-select" aria-label="Separador decimal">' +
        '<option value=","' + (sep === "," ? " selected" : "") + '>Vírgula (5,5)</option>' +
        '<option value="."' + (sep === "." ? " selected" : "") + '>Ponto (5.5)</option>' +
      '</select><nav aria-label="Calculadoras">' +
      '<a href="index.html"' + (active === "home" ? ' class="active"' : "") + ">Início</a>";
    GROUPS.forEach(function (g) {
      h += '<p class="nav-group">' + g[0] + "</p>";
      g[1].forEach(function (it) {
        h += '<a href="' + it[0] + '.html"' + (it[0] === active ? ' class="active"' : "") + ">" + it[1] + "</a>";
      });
    });
    h += "</nav>";
    el.innerHTML = h;
    var sel = document.getElementById("sep-select");
    if (sel) sel.addEventListener("change", function () {
      U.setDecimalSep(sel.value);
      updateBanner();
      if (typeof global._recalc === "function") global._recalc();
    });
    updateBanner();
  }

  function updateBanner() {
    var b = document.getElementById("sep-banner");
    if (!b) return;
    var comma = U.getDecimalSep() === ",";
    b.innerHTML = "<strong>Separador decimal: " + (comma ? "vírgula (,)" : "ponto (.)") +
      "</strong> — Exemplo: " + (comma ? "72,5" : "72.5") +
      " &nbsp;|&nbsp; Separadores de valores: <code>;</code> espaço, tabulação ou quebra de linha";
  }

  /* ----- Construção de campos ----- */
  function buildFields(inputs) {
    var box = document.getElementById("campos");
    if (!box) return;
    var multiline = { textarea: 1, numbers: 1, matrix: 1, groups: 1, pairs: 1 };
    var h = "";
    inputs.forEach(function (inp) {
      h += '<label class="field-label" for="' + inp.id + '">' + inp.label + "</label>";
      if (multiline[inp.type]) {
        var rows = (inp.type === "matrix" || inp.type === "groups" || inp.type === "pairs") ? 6 : 4;
        h += '<textarea id="' + inp.id + '" rows="' + rows + '" placeholder="' + (inp.placeholder || "") + '">' +
             (inp.default || "") + "</textarea>";
      } else if (inp.type === "select") {
        h += '<select class="inline" id="' + inp.id + '">' +
          inp.options.map(function (o) {
            return '<option value="' + o[0] + '"' + (o[0] == inp.default ? " selected" : "") + ">" + o[1] + "</option>";
          }).join("") + "</select>";
      } else {
        h += '<input type="' + (inp.type === "number" || inp.type === "int" ? "text" : (inp.type || "text")) +
             '" inputmode="' + (inp.type === "number" || inp.type === "int" ? "decimal" : "text") +
             '" id="' + inp.id + '" placeholder="' + (inp.placeholder || "") + '" value="' + (inp.default != null ? inp.default : "") + '">';
      }
      if (inp.hint) h += '<p class="hint">' + inp.hint + "</p>";
    });
    box.innerHTML = h;
  }

  /* lê o valor de um campo de acordo com o tipo declarado */
  function readField(inp) {
    var elV = document.getElementById(inp.id);
    var raw = elV ? elV.value : "";
    switch (inp.type) {
      case "numbers": return U.parseVector(raw);
      case "matrix":  return U.parseGroups(raw);  // linha=linha; ; espaço tab=colunas
      case "groups":  return U.parseGroups(raw);
      case "pairs":   return parsePairs(raw);
      case "number":  return U.tokenToNumber(raw, U.getDecimalSep());
      case "int":     return parseInt(raw, 10);
      case "select":  return raw;
      default:        return raw;
    }
  }

  function parsePairs(raw) {
    var sep = U.getDecimalSep();
    var rows = U.parseMatrix(raw, sep);
    var x = [], y = [];
    rows.forEach(function (r) { if (r.length >= 2) { x.push(r[0]); y.push(r[1]); } });
    return { x: x, y: y, rows: rows };
  }

  /* ----- Renderização de resultados ----- */
  function renderResult(spec) {
    var box = document.getElementById("resultado");
    if (!box) return;
    var h = "";
    if (spec.error) {
      h = '<div class="alert danger"><strong>Não foi possível calcular.</strong> ' + spec.error + "</div>";
      box.innerHTML = h; box.dataset.calculado = "0"; clearMd(); return;
    }
    if (spec.stats && spec.stats.length) {
      h += '<div class="result-grid">';
      spec.stats.forEach(function (s) {
        h += '<div class="stat"><div class="k">' + s[0] + '</div><div class="v">' + s[1] + "</div></div>";
      });
      h += "</div>";
    }
    if (spec.notes && spec.notes.length) {
      h += '<ul class="notes">' + spec.notes.map(function (n) { return "<li>" + n + "</li>"; }).join("") + "</ul>";
    }
    if (spec.alert) {
      h += '<div class="alert ' + (spec.alert.type || "") + '">' + spec.alert.html + "</div>";
    }
    if (spec.tables && spec.tables.length) {
      h += '<div class="tables">';
      spec.tables.forEach(function (t) { h += tableHtml(t); });
      h += "</div>";
    }
    if (spec.extraHtml) h += spec.extraHtml;
    box.innerHTML = h;
    box.dataset.calculado = "1";
    // Markdown
    if (spec.md) U.renderMd ? U.renderMd(spec.md) : renderMd(spec.md);
  }

  function tableHtml(t) {
    var h = '<table class="aux">';
    if (t.caption) h += "<caption>" + t.caption + "</caption>";
    if (t.headers) {
      h += "<tr>" + t.headers.map(function (x) { return "<th>" + x + "</th>"; }).join("") + "</tr>";
    }
    t.rows.forEach(function (r) {
      h += "<tr>" + r.map(function (c, i) {
        return (i === 0 && t.rowHeader !== false) ? "<th>" + c + "</th>" : "<td>" + c + "</td>";
      }).join("") + "</tr>";
    });
    return h + "</table>";
  }

  /* ----- Saída Markdown ----- */
  function renderMd(md) {
    var ta = document.getElementById("md-out");
    if (!ta) return;
    var out = "## " + md.title + "\n\n";
    (md.lines || []).forEach(function (l) { out += "- " + l[0] + ": **" + l[1] + "**\n"; });
    if (md.extra) out += "\n" + md.extra + "\n";
    ta.value = out.trimEnd();
  }
  function clearMd() { var ta = document.getElementById("md-out"); if (ta) ta.value = ""; }

  function copyMd() {
    var ta = document.getElementById("md-out");
    if (!ta || !ta.value) return;
    var done = function () { toast("Markdown copiado"); };
    if (navigator.clipboard && navigator.clipboard.writeText)
      navigator.clipboard.writeText(ta.value).then(done).catch(function () { ta.select(); document.execCommand("copy"); done(); });
    else { ta.select(); document.execCommand("copy"); done(); }
  }

  var _tt;
  function toast(msg) {
    var t = document.getElementById("toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("show");
    clearTimeout(_tt); _tt = setTimeout(function () { t.classList.remove("show"); }, 1800);
  }

  /* ----- Montagem da página ----- */
  function mountCalculator(slug) {
    renderSidebar(slug);
    var reg = global.CALC_REGISTRY && global.CALC_REGISTRY[slug];
    if (!reg) { return; } // página sem lógica registrada (em construção)
    buildFields(reg.inputs || []);
    var btn = document.getElementById("calcular");
    function run() {
      try {
        var vals = {};
        (reg.inputs || []).forEach(function (inp) { vals[inp.id] = readField(inp); });
        var spec = reg.compute(vals, U);
        renderResult(spec || { error: "Sem resultado." });
      } catch (e) {
        renderResult({ error: U.esc(e.message || String(e)) });
      }
    }
    if (btn) btn.addEventListener("click", run);
    var cp = document.getElementById("copiar-md");
    if (cp) cp.addEventListener("click", copyMd);
    global._recalc = function () {
      var box = document.getElementById("resultado");
      if (box && box.dataset.calculado === "1") run();
    };
  }

  /* ----- Home ----- */
  function renderHome() {
    renderSidebar("home");
    var box = document.getElementById("grupos");
    if (!box) return;
    var h = "";
    GROUPS.forEach(function (g) {
      h += '<div class="card group-card"><h3>' + g[0] + "</h3><ul class=\"calc-list\">";
      g[1].forEach(function (it) { h += '<li><a href="' + it[0] + '.html">' + it[1] + "</a></li>"; });
      h += "</ul></div>";
    });
    box.innerHTML = h;
  }

  global.App = {
    renderSidebar: renderSidebar, mountCalculator: mountCalculator,
    renderHome: renderHome, copyMd: copyMd, toast: toast,
  };
})(typeof window !== "undefined" ? window : globalThis);
