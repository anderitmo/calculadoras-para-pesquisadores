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
  var GROUP_DESCRIPTIONS = {
    "Estatística Descritiva": {
      definition: "É a etapa inicial da análise de dados que visa descrever, organizar e resumir um conjunto de observações de forma simples e compreensível, sem realizar generalizações para uma população.",
      purpose: "Serve para identificar padrões, tendências centrais (como média e mediana), dispersão (como desvio padrão e variância) e a forma da distribuição dos dados.",
      when: "Sempre que você coletar novos dados e precisar de uma visão geral sobre eles antes de aplicar testes de hipóteses avançados, ou quando o objetivo do estudo for puramente de caráter exploratório ou descritivo.",
      where: "Em relatórios de pesquisa científica, censos demográficos, resumos de desempenho de vendas, análise de notas escolares ou qualquer contexto que demande sumarização de dados brutos.",
      example: "Descrever a média de idade, a distribuição por gênero e a variação de renda de um grupo de participantes de uma pesquisa clínica."
    },
    "Probabilidade": {
      definition: "É o ramo da matemática que estuda a chance de ocorrência de eventos aleatórios e modela a incerteza por meio de distribuições teóricas.",
      purpose: "Serve para calcular a probabilidade de determinados resultados ocorrerem sob certas condições e fornecer a base estatística necessária para testes de hipóteses e estimação.",
      when: "Quando for necessário estimar a probabilidade de eventos futuros, avaliar riscos, modelar fenômenos de contagem/tempo de espera ou compreender o comportamento de variáveis aleatórias.",
      where: "No setor de seguros (cálculo de risco de sinistros), controle de qualidade industrial (peças defeituosas), modelação de filas de atendimento, genética de populações e finanças.",
      example: "Calcular a chance de exatamente 5 em 10 pacientes responderem a um tratamento específico usando a distribuição binomial, ou gerar números aleatórios para simulações de Monte Carlo."
    },
    "Inferência": {
      definition: "É o conjunto de técnicas estatísticas que permite generalizar e tirar conclusões para uma população inteira com base na análise de uma amostra representativa.",
      purpose: "Serve para testar hipóteses científicas (verificando se diferenças ou relações são estatisticamente significativas) e construir intervalos de confiança para parâmetros desconhecidos.",
      when: "Quando você tiver dados amostrais e quiser estender as conclusões para uma população maior, testar se dois ou mais grupos diferem entre si, ou avaliar o impacto de intervenções.",
      where: "Ensaios clínicos e testes de novos medicamentos, pesquisas de opinião pública, testes de mercado (A/B) e experimentos agrícolas.",
      example: "Realizar um teste t de Student para verificar se o novo método de ensino gerou notas significativamente maiores do que o método tradicional em uma escola."
    },
    "Não Paramétricos": {
      definition: "É uma classe de testes estatísticos que não exige pressupostos rígidos sobre a distribuição dos dados (como a suposição de normalidade) e baseia-se em postos ou ordenamentos (ranks).",
      purpose: "Serve para testar hipóteses de forma estatisticamente robusta quando os dados são ordinais, apresentam forte assimetria ou quando o tamanho amostral é muito pequeno para garantir normalidade.",
      when: "Quando os dados falharem nos testes de normalidade (como Kolmogorov-Smirnov), em dados qualitativos ordinais (escalas Likert) ou na presença de valores discrepantes (outliers) severos.",
      where: "Pesquisas comportamentais com escalas subjetivas, psicologia, ciências sociais e estudos biológicos com amostras reduzidas.",
      example: "Aplicar o Teste de Mann-Whitney para comparar a percepção de dor (escala de 1 a 10) entre dois grupos de pacientes sob tratamentos distintos."
    },
    "Multivariada": {
      definition: "É o conjunto de métodos estatísticos avançados destinados à análise simultânea de múltiplas variáveis medidas em cada unidade amostral.",
      purpose: "Serve para compreender e modelar a estrutura de dependências mútuas, simplificar a dimensionalidade de grandes conjuntos de dados e prever desfechos complexos com base em múltiplos fatores preditores.",
      when: "Quando as variáveis de interesse forem correlacionadas de forma complexa e isolar as análises individualmente puder ocultar efeitos combinados ou gerar interpretações errôneas.",
      where: "Genômica (expressão de múltiplos genes), segmentação de mercado (clusterização de clientes), previsão macroeconômica e modelos de satisfação do cliente.",
      example: "Executar uma análise de componentes principais (PCA) para simplificar 30 variáveis de comportamento do consumidor em apenas 3 dimensões fundamentais."
    },
    "Outras Ferramentas": {
      definition: "É um conjunto de utilitários auxiliares, conversores de dados e tabelas estatísticas de referência que complementam as análises e dão suporte operacional aos pesquisadores.",
      purpose: "Serve para facilitar a preparação e formatação de dados, a consulta a valores críticos teóricos de referência e a computação ágil de taxas de prevalência/risco em epidemiologia.",
      when: "No início do tratamento dos dados, na validação manual de testes ou quando for necessário realizar a limpeza e conversão de formatação decimal de dados copiados de planilhas eletrônicas.",
      where: "No suporte operacional do dia a dia de laboratórios de pesquisa, formatação de planilhas para exportação e conferência ágil de artigos científicos.",
      example: "Usar o Conversor de Dados para alterar o separador de dados copiados do Excel antes de alimentá-los em outras calculadoras de hipóteses."
    }
  };

  function renderHome() {
    renderSidebar("home");
    var box = document.getElementById("grupos");
    if (!box) return;
    var h = "";
    GROUPS.forEach(function (g) {
      var name = g[0];
      var desc = GROUP_DESCRIPTIONS[name];
      h += '<div class="card group-card" style="margin-bottom:2rem; padding:2rem;">' +
           '<h3 style="font-size:1.6rem; color:#1e3d32; border-bottom:2px solid #e1e9e5; padding-bottom:.5rem; margin-top:0; margin-bottom:1.25rem;">' + name + '</h3>';

      if (desc) {
        h += '<div class="group-info" style="font-size:.9rem; line-height:1.5; color:#555; margin-bottom:1.5rem; display:grid; gap:.8rem;">' +
             '<div><strong>O que é?</strong> ' + desc.definition + '</div>' +
             '<div><strong>Para que serve?</strong> ' + desc.purpose + '</div>' +
             '<div><strong>Quando usar?</strong> ' + desc.when + '</div>' +
             '<div><strong>Onde se aplica?</strong> ' + desc.where + '</div>' +
             '<div><strong>Exemplo rápido:</strong> <em>' + desc.example + '</em></div>' +
             '</div>';
      }

      h += '<h4 style="font-size:1rem; color:#333; margin-bottom:.5rem;">Calculadoras disponíveis:</h4>' +
           '<ul class="calc-list" style="margin-top:0;">';
      g[1].forEach(function (it) {
        h += '<li><a href="' + it[0] + '.html">' + it[1] + '</a></li>';
      });
      h += '</ul></div>';
    });
    box.innerHTML = h;
  }

  global.App = {
    renderSidebar: renderSidebar, mountCalculator: mountCalculator,
    renderHome: renderHome, copyMd: copyMd, toast: toast,
  };
})(typeof window !== "undefined" ? window : globalThis);
