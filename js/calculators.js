/*
 * calculators.js — registro das 42 calculadoras.
 * Cada entrada: { inputs:[...], compute(vals, U) -> spec }
 * spec = { stats:[[rótulo,valor]], notes:[], alert:{type,html}, tables:[], md:{title,lines,extra}, error }
 * Os cálculos usam Stats (stats.js) e Extra (stats_extra.js), já validados.
 */
(function (global) {
  "use strict";
  var U = global.U || (typeof require !== "undefined" ? require("./utils.js") : null);
  var Stats = global.Stats || (typeof require !== "undefined" ? require("./stats.js") : null);
  var Extra = global.Extra || (typeof require !== "undefined" ? require("./stats_extra.js") : null);

  var f  = function (x, d) { return U.fmt(x, d == null ? 4 : d); };
  var fp = function (p) { return U.fmtP(p); };
  var decide = function (p, a) { return p < a ? "Rejeita H₀ (diferença significativa)" : "Não rejeita H₀ (sem evidência de diferença)"; };
  function need(v, n, msg) { if (!U.validVector(v, n)) throw new Error(msg || ("Informe ao menos " + n + " números válidos.")); }
  function mdLines(stats) { return stats.map(function (s) { return [s[0], s[1]]; }); }

  var R = {};

  /* =========================== DESCRITIVA =========================== */
  R["media-aritmetica"] = {
    inputs: [{ id: "dados", label: "Números", type: "numbers", placeholder: "Ex.: 7; 8; 6; 9; 5; 7; 8; 6; 7; 9", hint: "Separe por ; espaço, tabulação ou quebra de linha." }],
    compute: function (v) {
      var d = v.dados; need(d, 1);
      var stats = [["Média", f(Stats.mean(d))], ["Soma", f(Stats.sum(d))], ["Quantidade (n)", String(d.length)]];
      return { stats: stats, md: { title: "Média Aritmética", lines: mdLines(stats) } };
    }
  };
  R["mediana"] = {
    inputs: [{ id: "dados", label: "Números", type: "numbers", placeholder: "Ex.: 7; 8; 6; 9; 5" }],
    compute: function (v) {
      var d = v.dados; need(d, 1);
      var stats = [["Mediana", f(Stats.median(d))], ["n", String(d.length)], ["Mínimo", f(Math.min.apply(null, d))], ["Máximo", f(Math.max.apply(null, d))]];
      return { stats: stats, md: { title: "Mediana", lines: mdLines(stats) } };
    }
  };
  R["moda"] = {
    inputs: [{ id: "dados", label: "Números", type: "numbers", placeholder: "Ex.: 2; 3; 3; 4; 4; 4; 5" }],
    compute: function (v) {
      var d = v.dados; need(d, 1);
      var m = Stats.mode(d);
      var modas = m.allUnique ? "Amodal (sem repetição)" : m.modes.map(function (x) { return f(x, 2); }).join("; ");
      var stats = [["Moda(s)", modas], ["Frequência", String(m.frequency)], ["n", String(d.length)]];
      var notes = m.modes.length > 1 && !m.allUnique ? ["Conjunto multimodal: há mais de um valor com a frequência máxima."] : [];
      return { stats: stats, notes: notes, md: { title: "Moda", lines: mdLines(stats) } };
    }
  };
  R["desvio-padrao"] = {
    inputs: [{ id: "dados", label: "Números", type: "numbers", placeholder: "Ex.: 7; 8; 6; 9; 5" }],
    compute: function (v) {
      var d = v.dados; need(d, 2);
      var stats = [
        ["Desvio padrão (amostral)", f(Stats.sd(d, false))],
        ["Variância (amostral)", f(Stats.variance(d, false))],
        ["Coef. de variação", f(Stats.cv(d, false), 2) + "%"],
        ["Média", f(Stats.mean(d))],
      ];
      return { stats: stats, notes: ["Usa denominador n−1 (amostral). Para população, veja a calculadora de Variância."], md: { title: "Desvio Padrão", lines: mdLines(stats) } };
    }
  };
  R["variancia"] = {
    inputs: [{ id: "dados", label: "Números", type: "numbers", placeholder: "Ex.: 7; 8; 6; 9; 5" }],
    compute: function (v) {
      var d = v.dados; need(d, 2);
      var stats = [
        ["Variância amostral (n−1)", f(Stats.variance(d, false))],
        ["Variância populacional (n)", f(Stats.variance(d, true))],
        ["Desvio padrão amostral", f(Stats.sd(d, false))],
        ["Média", f(Stats.mean(d))],
      ];
      return { stats: stats, md: { title: "Variância", lines: mdLines(stats) } };
    }
  };
  R["quartis"] = {
    inputs: [{ id: "dados", label: "Números", type: "numbers", placeholder: "Ex.: 1; 2; 3; 4; 5; 6; 7; 8; 9; 10" }],
    compute: function (v) {
      var d = v.dados; need(d, 1);
      var q = Stats.quartiles(d);
      var stats = [
        ["Q1 (25%)", f(q.q1)], ["Q2 (mediana)", f(q.q2)], ["Q3 (75%)", f(q.q3)],
        ["IIQ (Q3−Q1)", f(q.iqr)], ["Mínimo", f(Math.min.apply(null, d))], ["Máximo", f(Math.max.apply(null, d))],
      ];
      return { stats: stats, notes: ["Método de interpolação linear (tipo 7 do R / PERCENTILE.INC do Excel). Outros softwares podem usar definições diferentes de quartil."], md: { title: "Quartis", lines: mdLines(stats) } };
    }
  };
  R["amplitude"] = {
    inputs: [{ id: "dados", label: "Números", type: "numbers", placeholder: "Ex.: 4; 8; 15; 16; 23; 42" }],
    compute: function (v) {
      var d = v.dados; need(d, 1);
      var stats = [["Amplitude", f(Stats.range(d))], ["Mínimo", f(Math.min.apply(null, d))], ["Máximo", f(Math.max.apply(null, d))], ["n", String(d.length)]];
      return { stats: stats, md: { title: "Amplitude", lines: mdLines(stats) } };
    }
  };
  R["coeficiente-variacao"] = {
    inputs: [{ id: "dados", label: "Números", type: "numbers", placeholder: "Ex.: 10; 12; 9; 11; 13" }],
    compute: function (v) {
      var d = v.dados; need(d, 2);
      var cv = Stats.cv(d, false);
      var classe = cv < 15 ? "baixa dispersão" : cv < 30 ? "dispersão média" : "alta dispersão";
      var stats = [["Coef. de variação", f(cv, 2) + "%"], ["Desvio padrão", f(Stats.sd(d, false))], ["Média", f(Stats.mean(d))]];
      return { stats: stats, notes: ["Classificação referencial: " + classe + ". Os cortes (15%/30%) variam por área."], md: { title: "Coeficiente de Variação", lines: mdLines(stats) } };
    }
  };
  R["assimetria-curtose"] = {
    inputs: [{ id: "dados", label: "Números", type: "numbers", placeholder: "Ex.: 1; 2; 2; 3; 3; 3; 4; 4; 4; 4" }],
    compute: function (v) {
      var d = v.dados; need(d, 4);
      var sk = Stats.skewness(d), ku = Stats.kurtosis(d);
      var aSk = sk > 0.1 ? "assimetria à direita (positiva)" : sk < -0.1 ? "assimetria à esquerda (negativa)" : "aproximadamente simétrica";
      var aKu = ku > 0.5 ? "leptocúrtica (mais pontuda)" : ku < -0.5 ? "platicúrtica (mais achatada)" : "mesocúrtica (próxima da normal)";
      var stats = [["Assimetria (skewness)", f(sk)], ["Curtose (excesso)", f(ku)], ["Média", f(Stats.mean(d))], ["Desvio padrão", f(Stats.sd(d, false))]];
      return { stats: stats, notes: ["Forma: " + aSk + "; " + aKu + ".", "Fórmulas amostrais de Fisher-Pearson (equivalentes a SKEW/KURT do Excel)."], md: { title: "Assimetria e Curtose", lines: mdLines(stats) } };
    }
  };
  R["tabela-frequencias"] = {
    inputs: [
      { id: "dados", label: "Números", type: "numbers", placeholder: "Ex.: valores contínuos" },
      { id: "k", label: "Nº de classes (vazio = regra de Sturges)", type: "text", placeholder: "auto", hint: "Deixe vazio para usar k = 1 + 3,322·log10(n)." },
    ],
    compute: function (v) {
      var d = v.dados; need(d, 2);
      var n = d.length, mn = Math.min.apply(null, d), mx = Math.max.apply(null, d);
      var k = parseInt(v.k, 10); if (!k || k < 1) k = Math.ceil(1 + 3.322 * Math.log10(n));
      var w = (mx - mn) / k || 1;
      var rows = [], acc = 0;
      for (var i = 0; i < k; i++) {
        var lo = mn + i * w, hi = (i === k - 1) ? mx : mn + (i + 1) * w;
        var fa = d.filter(function (x) { return (i === k - 1) ? (x >= lo && x <= hi) : (x >= lo && x < hi); }).length;
        acc += fa;
        rows.push(["[" + f(lo, 2) + " ; " + f(hi, 2) + (i === k - 1 ? "]" : ")"), String(fa), f(fa / n * 100, 1) + "%", String(acc)]);
      }
      var table = { caption: "Distribuição de frequências (" + k + " classes)", headers: ["Classe", "Fa", "Fr%", "Facum"], rows: rows, rowHeader: false };
      var md = "## Tabela de Frequências\n\n" + U_mdTable(["Classe", "Fa", "Fr%", "Facum"], rows);
      return { stats: [["n", String(n)], ["Classes (k)", String(k)], ["Amplitude de classe", f(w, 3)]], tables: [table], md: { title: "Tabela de Frequências", lines: [["n", String(n)], ["Classes", String(k)]], extra: U_mdTable(["Classe", "Fa", "Fr%", "Facum"], rows) } };
    }
  };
  R["histograma"] = {
    inputs: [
      { id: "dados", label: "Números", type: "numbers", placeholder: "Ex.: valores contínuos" },
      { id: "k", label: "Nº de classes (vazio = Sturges)", type: "text", placeholder: "auto" },
    ],
    compute: function (v) {
      var d = v.dados; need(d, 2);
      var n = d.length, mn = Math.min.apply(null, d), mx = Math.max.apply(null, d);
      var k = parseInt(v.k, 10); if (!k || k < 1) k = Math.ceil(1 + 3.322 * Math.log10(n));
      var w = (mx - mn) / k || 1, freqs = [];
      for (var i = 0; i < k; i++) {
        var lo = mn + i * w, hi = (i === k - 1) ? mx : mn + (i + 1) * w;
        freqs.push({ lo: lo, hi: hi, fa: d.filter(function (x) { return (i === k - 1) ? (x >= lo && x <= hi) : (x >= lo && x < hi); }).length });
      }
      var maxF = Math.max.apply(null, freqs.map(function (x) { return x.fa; })) || 1;
      var W = 560, H = 240, pad = 30, bw = (W - 2 * pad) / k;
      var bars = freqs.map(function (b, i) {
        var bh = (b.fa / maxF) * (H - 2 * pad);
        var x = pad + i * bw, y = H - pad - bh;
        return '<rect x="' + (x + 2) + '" y="' + y + '" width="' + (bw - 4) + '" height="' + bh + '" fill="#1d6b53"></rect>' +
               '<text x="' + (x + bw / 2) + '" y="' + (H - pad + 14) + '" font-size="10" text-anchor="middle" fill="#5c635d">' + f((b.lo + b.hi) / 2, 1) + '</text>' +
               '<text x="' + (x + bw / 2) + '" y="' + (y - 4) + '" font-size="10" text-anchor="middle" fill="#1f2421">' + b.fa + '</text>';
      }).join("");
      var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;max-width:600px;background:#faf8f2;border:1px solid #e3ddcd;border-radius:8px"><line x1="' + pad + '" y1="' + (H - pad) + '" x2="' + (W - pad) + '" y2="' + (H - pad) + '" stroke="#5c635d"></line>' + bars + '</svg>';
      var rows = freqs.map(function (b) { return ["[" + f(b.lo, 2) + " ; " + f(b.hi, 2) + "]", String(b.fa)]; });
      return { stats: [["n", String(n)], ["Classes", String(k)]], extraHtml: '<div style="margin-top:1rem">' + svg + "</div>", md: { title: "Histograma", lines: [["n", String(n)], ["Classes", String(k)]], extra: U_mdTable(["Classe", "Frequência"], rows) } };
    }
  };
  R["boxplot"] = {
    inputs: [{ id: "dados", label: "Números", type: "numbers", placeholder: "Ex.: 4; 8; 15; 16; 23; 42" }],
    compute: function (v) {
      var d = v.dados; need(d, 1);
      var q = Stats.quartiles(d);
      var lo = q.q1 - 1.5 * q.iqr, hi = q.q3 + 1.5 * q.iqr;
      var outliers = d.filter(function (x) { return x < lo || x > hi; });
      var inliers = d.filter(function (x) { return x >= lo && x <= hi; });
      var whiskLo = Math.min.apply(null, inliers), whiskHi = Math.max.apply(null, inliers);
      var mn = Math.min.apply(null, d), mx = Math.max.apply(null, d);
      var W = 560, H = 120, pad = 30, scale = function (x) { return pad + (x - mn) / ((mx - mn) || 1) * (W - 2 * pad); };
      var cy = H / 2, bh = 36;
      var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;max-width:600px;background:#faf8f2;border:1px solid #e3ddcd;border-radius:8px">' +
        '<line x1="' + scale(whiskLo) + '" y1="' + cy + '" x2="' + scale(q.q1) + '" y2="' + cy + '" stroke="#5c635d"></line>' +
        '<line x1="' + scale(q.q3) + '" y1="' + cy + '" x2="' + scale(whiskHi) + '" y2="' + cy + '" stroke="#5c635d"></line>' +
        '<rect x="' + scale(q.q1) + '" y="' + (cy - bh / 2) + '" width="' + (scale(q.q3) - scale(q.q1)) + '" height="' + bh + '" fill="#e7f1ec" stroke="#1d6b53"></rect>' +
        '<line x1="' + scale(q.q2) + '" y1="' + (cy - bh / 2) + '" x2="' + scale(q.q2) + '" y2="' + (cy + bh / 2) + '" stroke="#14513f" stroke-width="2"></line>' +
        outliers.map(function (o) { return '<circle cx="' + scale(o) + '" cy="' + cy + '" r="4" fill="#9c3b2e"></circle>'; }).join("") +
        '</svg>';
      var stats = [["Mínimo", f(mn)], ["Q1", f(q.q1)], ["Mediana", f(q.q2)], ["Q3", f(q.q3)], ["Máximo", f(mx)], ["Outliers", outliers.length ? outliers.map(function (x) { return f(x, 2); }).join("; ") : "nenhum"]];
      return { stats: stats, extraHtml: '<div style="margin-top:1rem">' + svg + "</div>", md: { title: "Boxplot (resumo de 5 números)", lines: mdLines(stats) } };
    }
  };

  /* =========================== PROBABILIDADE =========================== */
  R["distribuicao-normal"] = {
    inputs: [
      { id: "media", label: "Média (μ)", type: "number", default: "0" },
      { id: "dp", label: "Desvio padrão (σ)", type: "number", default: "1" },
      { id: "x", label: "Valor X", type: "number", default: "1.96" },
    ],
    compute: function (v) {
      var mu = v.media, s = v.dp, x = v.x;
      if (!isFinite(mu) || !isFinite(s) || !isFinite(x) || s <= 0) throw new Error("Informe μ, σ>0 e X válidos.");
      var z = (x - mu) / s, p = Stats.normalCDF(z);
      var stats = [["z", f(z)], ["P(X ≤ " + f(x, 2) + ")", f(p)], ["P(X ≥ " + f(x, 2) + ")", f(1 - p)], ["Densidade f(x)", f(Stats.normalPDF(x, mu, s))]];
      return { stats: stats, md: { title: "Distribuição Normal", lines: mdLines(stats) } };
    }
  };
  R["distribuicao-binomial"] = {
    inputs: [
      { id: "n", label: "Tentativas (n)", type: "int", default: "10" },
      { id: "p", label: "Probabilidade de sucesso (p)", type: "number", default: "0.3" },
      { id: "k", label: "Sucessos (k)", type: "int", default: "2" },
    ],
    compute: function (v) {
      var n = v.n, p = v.p, k = v.k;
      if (!(n >= 0) || !(p >= 0 && p <= 1) || !(k >= 0 && k <= n)) throw new Error("Verifique: n≥0, 0≤p≤1, 0≤k≤n.");
      var stats = [["P(X = " + k + ")", f(Stats.binomPMF(k, n, p))], ["P(X ≤ " + k + ")", f(Stats.binomCDF(k, n, p))], ["Média (np)", f(n * p)], ["Variância np(1−p)", f(n * p * (1 - p))]];
      return { stats: stats, md: { title: "Distribuição Binomial", lines: mdLines(stats) } };
    }
  };
  R["distribuicao-poisson"] = {
    inputs: [
      { id: "lambda", label: "Taxa média (λ)", type: "number", default: "2" },
      { id: "k", label: "Eventos (k)", type: "int", default: "3" },
    ],
    compute: function (v) {
      var l = v.lambda, k = v.k;
      if (!(l > 0) || !(k >= 0)) throw new Error("Informe λ>0 e k≥0.");
      var stats = [["P(X = " + k + ")", f(Stats.poissonPMF(k, l))], ["P(X ≤ " + k + ")", f(Stats.poissonCDF(k, l))], ["Média = Variância (λ)", f(l)]];
      return { stats: stats, md: { title: "Distribuição de Poisson", lines: mdLines(stats) } };
    }
  };
  R["distribuicao-t"] = {
    inputs: [
      { id: "df", label: "Graus de liberdade", type: "int", default: "10" },
      { id: "t", label: "Valor t", type: "number", default: "2.228" },
    ],
    compute: function (v) {
      var df = v.df, t = v.t;
      if (!(df > 0) || !isFinite(t)) throw new Error("Informe gl>0 e t válido.");
      var p = Stats.tCDF(t, df);
      var stats = [["P(T ≤ " + f(t, 3) + ")", f(p)], ["P(T ≥ " + f(t, 3) + ")", f(1 - p)], ["P bilateral (|T|≥)", fp(2 * (1 - Stats.tCDF(Math.abs(t), df)))]];
      return { stats: stats, md: { title: "Distribuição t de Student", lines: mdLines(stats) } };
    }
  };
  R["distribuicao-qui"] = {
    inputs: [
      { id: "df", label: "Graus de liberdade", type: "int", default: "5" },
      { id: "x", label: "Valor χ²", type: "number", default: "11.07" },
    ],
    compute: function (v) {
      var df = v.df, x = v.x;
      if (!(df > 0) || !(x >= 0)) throw new Error("Informe gl>0 e χ²≥0.");
      var p = Stats.chi2CDF(x, df);
      var stats = [["P(χ² ≤ " + f(x, 2) + ")", f(p)], ["P(χ² ≥ " + f(x, 2) + ")", f(1 - p)]];
      return { stats: stats, md: { title: "Distribuição Qui-Quadrado", lines: mdLines(stats) } };
    }
  };
  R["distribuicao-f"] = {
    inputs: [
      { id: "d1", label: "gl do numerador (n1)", type: "int", default: "3" },
      { id: "d2", label: "gl do denominador (n2)", type: "int", default: "16" },
      { id: "x", label: "Valor F", type: "number", default: "3.24" },
    ],
    compute: function (v) {
      var d1 = v.d1, d2 = v.d2, x = v.x;
      if (!(d1 > 0) || !(d2 > 0) || !(x >= 0)) throw new Error("Informe n1>0, n2>0 e F≥0.");
      var p = Stats.fCDF(x, d1, d2);
      var stats = [["P(F ≤ " + f(x, 2) + ")", f(p)], ["P(F ≥ " + f(x, 2) + ")", f(1 - p)]];
      return { stats: stats, md: { title: "Distribuição F de Snedecor", lines: mdLines(stats) } };
    }
  };

  /* =========================== INFERÊNCIA =========================== */
  R["intervalo-confianca-media"] = {
    inputs: [
      { id: "dados", label: "Amostra", type: "numbers", placeholder: "Ex.: 9,5; 10,1; 9,8; 10,3" },
      { id: "conf", label: "Nível de confiança", type: "select", default: "0.95", options: [["0.90", "90%"], ["0.95", "95%"], ["0.99", "99%"]] },
    ],
    compute: function (v) {
      var d = v.dados; need(d, 2);
      var ci = Stats.ciMean(d, parseFloat(v.conf));
      var stats = [["Média", f(ci.mean)], ["Limite inferior", f(ci.lower)], ["Limite superior", f(ci.upper)], ["Margem de erro", f(ci.moe)], ["t crítico (gl=" + ci.df + ")", f(ci.tcrit)]];
      return { stats: stats, notes: ["Baseado na distribuição t (σ populacional desconhecido)."], md: { title: "Intervalo de Confiança (Média)", lines: mdLines(stats) } };
    }
  };
  R["tamanho-amostra"] = {
    inputs: [
      { id: "E", label: "Margem de erro (E)", type: "number", default: "0.5" },
      { id: "sigma", label: "Desvio padrão estimado (σ)", type: "number", default: "2" },
      { id: "conf", label: "Nível de confiança", type: "select", default: "0.95", options: [["0.90", "90%"], ["0.95", "95%"], ["0.99", "99%"]] },
    ],
    compute: function (v) {
      if (!(v.E > 0) || !(v.sigma > 0)) throw new Error("Informe E>0 e σ>0.");
      var r = Stats.sampleSizeMean(v.E, v.sigma, parseFloat(v.conf));
      var stats = [["Tamanho mínimo (n)", String(r.n)], ["n (sem arredondar)", f(r.nRaw, 2)], ["z crítico", f(r.z)]];
      return { stats: stats, notes: ["Fórmula n = (z·σ/E)². Pressupõe σ conhecido/estimado e amostragem aleatória simples."], md: { title: "Tamanho de Amostra (Média)", lines: mdLines(stats) } };
    }
  };
  R["teste-t-1amostra"] = {
    inputs: [
      { id: "dados", label: "Amostra", type: "numbers", placeholder: "Ex.: 5,1; 4,9; 5,2; 5,0" },
      { id: "mu0", label: "Valor de referência (μ₀)", type: "number", default: "5" },
      { id: "alfa", label: "Significância (α)", type: "select", default: "0.05", options: [["0.10", "0,10"], ["0.05", "0,05"], ["0.01", "0,01"]] },
    ],
    compute: function (v) {
      var d = v.dados; need(d, 2);
      var r = Stats.tTestOne(d, v.mu0), a = parseFloat(v.alfa);
      var stats = [["Estatística t", f(r.t)], ["gl", String(r.df)], ["p-valor", fp(r.pValue)], ["Média", f(r.mean)], ["Decisão (α=" + v.alfa.replace(".", ",") + ")", decide(r.pValue, a)]];
      return { stats: stats, notes: ["Teste bilateral. Pressupõe normalidade aproximada dos dados."], md: { title: "Teste t (1 Amostra)", lines: mdLines(stats) } };
    }
  };
  R["teste-t-2amostras"] = {
    inputs: [
      { id: "a", label: "Amostra 1", type: "numbers", placeholder: "Ex.: 23; 25; 21; 24" },
      { id: "b", label: "Amostra 2", type: "numbers", placeholder: "Ex.: 28; 30; 27; 29" },
      { id: "tipo", label: "Variâncias", type: "select", default: "welch", options: [["welch", "Não assumir iguais (Welch)"], ["pooled", "Assumir iguais (agrupada)"]] },
      { id: "alfa", label: "Significância (α)", type: "select", default: "0.05", options: [["0.10", "0,10"], ["0.05", "0,05"], ["0.01", "0,01"]] },
    ],
    compute: function (v) {
      var a = v.a, b = v.b; need(a, 2); need(b, 2);
      var r = Stats.tTestTwo(a, b, v.tipo === "welch"), al = parseFloat(v.alfa);
      var stats = [["Estatística t", f(r.t)], ["gl", f(r.df, 3)], ["p-valor", fp(r.pValue)], ["Média 1", f(r.meanA)], ["Média 2", f(r.meanB)], ["Decisão (α=" + v.alfa.replace(".", ",") + ")", decide(r.pValue, al)]];
      return { stats: stats, notes: ["Teste bilateral. " + (v.tipo === "welch" ? "Welch (não exige variâncias iguais)." : "Variância agrupada (exige homogeneidade).")], md: { title: "Teste t (2 Amostras)", lines: mdLines(stats) } };
    }
  };
  R["teste-t-pareado"] = {
    inputs: [
      { id: "pares", label: "Pares (antes; depois por linha)", type: "matrix", placeholder: "200; 195\n212; 205\n190; 185", hint: "Uma linha por par: valor1 ; valor2." },
      { id: "alfa", label: "Significância (α)", type: "select", default: "0.05", options: [["0.10", "0,10"], ["0.05", "0,05"], ["0.01", "0,01"]] },
    ],
    compute: function (v) {
      var rows = v.pares.filter(function (r) { return r.length >= 2; });
      if (rows.length < 2) throw new Error("Informe ao menos 2 pares (duas colunas por linha).");
      var a = rows.map(function (r) { return r[0]; }), b = rows.map(function (r) { return r[1]; });
      var r = Stats.tTestPaired(a, b), al = parseFloat(v.alfa);
      var stats = [["Estatística t", f(r.t)], ["gl", String(r.df)], ["p-valor", fp(r.pValue)], ["Diferença média", f(r.meanDiff)], ["Decisão (α=" + v.alfa.replace(".", ",") + ")", decide(r.pValue, al)]];
      return { stats: stats, notes: ["Compara duas medidas relacionadas (mesmos sujeitos)."], md: { title: "Teste t Pareado", lines: mdLines(stats) } };
    }
  };
  R["qui-quadrado"] = {
    inputs: [
      { id: "tipo", label: "Tipo de teste", type: "select", default: "independencia", options: [["independencia", "Independência (tabela de contingência)"], ["aderencia", "Aderência (observado vs esperado)"]] },
      { id: "tab", label: "Dados observados", type: "matrix", placeholder: "18; 12\n7; 23", hint: "Independência: tabela r×c. Aderência: 1ª linha = observados; 2ª linha = esperados (opcional; vazio = uniforme)." },
      { id: "yates", label: "Correção de Yates (2×2)", type: "select", default: "nao", options: [["nao", "Não"], ["sim", "Sim"]] },
    ],
    compute: function (v) {
      var T = v.tab.filter(function (r) { return r.length > 0; });
      if (!T.length) throw new Error("Informe a tabela de dados.");
      if (v.tipo === "aderencia") {
        var obs = T[0];
        var esp = (T[1] && T[1].length === obs.length) ? T[1] : obs.map(function () { return Stats.sum(obs) / obs.length; });
        var r0 = Stats.chi2Goodness(obs, esp);
        var stats0 = [["χ²", f(r0.chi2)], ["gl", String(r0.df)], ["p-valor", fp(r0.pValue)]];
        var rows0 = obs.map(function (o, i) { return ["Cat " + (i + 1), f(o, 0), f(esp[i], 2), f(Math.pow(o - esp[i], 2) / esp[i], 3)]; });
        return { stats: stats0, tables: [{ caption: "Observado × Esperado", headers: ["", "O", "E", "(O−E)²/E"], rows: rows0, rowHeader: true }], md: { title: "Qui-quadrado (aderência)", lines: stats0.map(function (s) { return s; }) } };
      }
      var r = T.length, c = T[0].length;
      var res = Stats.chi2Independence(T);
      var chi2 = res.chi2, df = res.df, exp = res.expected, yates = false;
      if (v.yates === "sim" && r === 2 && c === 2) {
        chi2 = 0; for (var i = 0; i < 2; i++) for (var j = 0; j < 2; j++) chi2 += Math.pow(Math.abs(T[i][j] - exp[i][j]) - 0.5, 2) / exp[i][j];
        yates = true;
      }
      var n = res.total, p = 1 - Stats.chi2CDF(chi2, df);
      var cramer = Math.sqrt(chi2 / (n * (Math.min(r, c) - 1)));
      var forca = cramer < 0.1 ? "desprezível" : cramer < 0.3 ? "fraca" : cramer < 0.5 ? "moderada" : "forte";
      var lbl = function (i) { return "L" + (i + 1); }, clbl = function (j) { return "C" + (j + 1); };
      var head = [""].concat(T[0].map(function (_, j) { return clbl(j); }));
      var espTab = { caption: "Esperados", headers: head, rows: exp.map(function (row, i) { return [lbl(i)].concat(row.map(function (e) { return f(e, 1); })); }) };
      var resTab = { caption: "Resíduos padronizados", headers: head, rows: T.map(function (row, i) { return [lbl(i)].concat(row.map(function (o, j) { return f((o - exp[i][j]) / Math.sqrt(exp[i][j]), 2); })); }) };
      var conTab = { caption: "Contribuição p/ χ²", headers: head, rows: T.map(function (row, i) { return [lbl(i)].concat(row.map(function (o, j) { return f(Math.pow(o - exp[i][j], 2) / exp[i][j], 2); })); }) };
      var stats = [["χ²" + (yates ? " (Yates)" : ""), f(chi2)], ["gl", String(df)], ["p-valor", fp(p)], ["V de Cramér", f(cramer) + " (" + forca + ")"], ["n total", String(n)]];
      var notes = ["Frequências esperadas muito baixas (<5) podem invalidar a aproximação qui-quadrado.", "Em tabelas 2×2 com células pequenas, considere o teste exato de Fisher."];
      return { stats: stats, notes: notes, tables: [espTab, resTab, conTab], md: { title: "Qui-quadrado", lines: [["Tipo", "independência"], ["Dimensão", r + "×" + c], ["n total", String(n)], ["Estatística", "χ²(" + df + ") = " + f(chi2)], ["p-valor", f(p)], ["V de Cramér", f(cramer) + " (" + forca + ")"]] } };
    }
  };
  R["anova"] = {
    inputs: [{ id: "grupos", label: "Grupos (um por linha)", type: "groups", placeholder: "6; 8; 4; 5; 3; 4\n8; 12; 9; 11; 6; 8\n13; 9; 11; 8; 7; 12", hint: "Cada linha é um grupo; valores por ; espaço ou tab." },
      { id: "alfa", label: "Significância (α)", type: "select", default: "0.05", options: [["0.10", "0,10"], ["0.05", "0,05"], ["0.01", "0,01"]] }],
    compute: function (v) {
      var g = v.grupos.filter(function (x) { return x.length > 0; });
      if (g.length < 2) throw new Error("Informe ao menos 2 grupos (2 linhas).");
      var r = Stats.anovaOneWay(g), a = parseFloat(v.alfa);
      var stats = [["Estatística F", f(r.F)], ["gl entre", String(r.dfb)], ["gl dentro", String(r.dfw)], ["p-valor", fp(r.pValue)], ["Decisão (α=" + v.alfa.replace(".", ",") + ")", decide(r.pValue, a)]];
      var tab = { caption: "Tabela ANOVA", headers: ["Fonte", "SQ", "gl", "QM"], rows: [["Entre", f(r.ssb, 3), String(r.dfb), f(r.msb, 3)], ["Dentro", f(r.ssw, 3), String(r.dfw), f(r.msw, 3)]], rowHeader: true };
      return { stats: stats, tables: [tab], notes: ["Pressupõe normalidade e homogeneidade de variâncias. Post-hoc (Tukey) não incluído."], md: { title: "ANOVA (1 fator)", lines: mdLines(stats) } };
    }
  };
  R["correlacao-pearson"] = {
    inputs: [{ id: "pares", label: "Pares X;Y (um por linha)", type: "matrix", placeholder: "1; 2\n2; 4\n3; 5\n4; 4\n5; 5" }],
    compute: function (v) {
      var rows = v.pares.filter(function (r) { return r.length >= 2; });
      if (rows.length < 3) throw new Error("Informe ao menos 3 pares.");
      var x = rows.map(function (r) { return r[0]; }), y = rows.map(function (r) { return r[1]; });
      var r = Stats.pearsonTest(x, y);
      var grau = Math.abs(r.r) < 0.3 ? "fraca" : Math.abs(r.r) < 0.7 ? "moderada" : "forte";
      var stats = [["Coeficiente r", f(r.r)], ["r²", f(r.r * r.r)], ["t", f(r.t)], ["gl", String(r.df)], ["p-valor", fp(r.pValue)]];
      return { stats: stats, notes: ["Associação linear " + grau + " (" + (r.r < 0 ? "negativa" : "positiva") + "). Mede apenas relação linear."], md: { title: "Correlação de Pearson", lines: mdLines(stats) } };
    }
  };
  R["regressao-linear"] = {
    inputs: [{ id: "pares", label: "Pares X;Y (um por linha)", type: "matrix", placeholder: "1; 2\n2; 4\n3; 5\n4; 4\n5; 5" }],
    compute: function (v) {
      var rows = v.pares.filter(function (r) { return r.length >= 2; });
      if (rows.length < 3) throw new Error("Informe ao menos 3 pares.");
      var x = rows.map(function (r) { return r[0]; }), y = rows.map(function (r) { return r[1]; });
      var r = Stats.linearRegression(x, y);
      var eq = "Y = " + f(r.a, 4) + (r.b >= 0 ? " + " : " − ") + f(Math.abs(r.b), 4) + "·X";
      var stats = [["Intercepto (a)", f(r.a)], ["Inclinação (b)", f(r.b)], ["R²", f(r.r2)], ["p-valor (b)", fp(r.pValue)], ["Equação", eq]];
      return { stats: stats, notes: ["Mínimos quadrados ordinários. Pressupõe linearidade, independência e resíduos homocedásticos."], md: { title: "Regressão Linear Simples", lines: mdLines(stats) } };
    }
  };
  R["regressao-logistica"] = {
    inputs: [{ id: "dados", label: "Dados (preditores...; Y) — Y na última coluna (0/1)", type: "matrix", placeholder: "0,5; 0\n1,75; 1\n2,75; 1\n3,5; 0\n4,5; 1", hint: "Cada linha: X1 ; X2 ; ... ; Y. Y deve ser 0 ou 1." }],
    compute: function (v) {
      var rows = v.dados.filter(function (r) { return r.length >= 2; });
      if (rows.length < 4) throw new Error("Informe ao menos 4 observações.");
      var X = rows.map(function (r) { return r.slice(0, r.length - 1); });
      var y = rows.map(function (r) { return r[r.length - 1]; });
      if (!y.every(function (v) { return v === 0 || v === 1; })) throw new Error("A última coluna (Y) deve conter apenas 0 ou 1.");
      var r = Extra.logisticRegression(X, y);
      if (r.error) throw new Error(r.error);
      var headers = ["Termo", "β", "EP", "z", "p", "OR"];
      var names = ["Intercepto"].concat(X[0].map(function (_, i) { return "X" + (i + 1); }));
      var rows2 = r.beta.map(function (b, i) { return [names[i], f(b, 4), f(r.se[i], 4), f(r.z[i], 3), fp(r.pValue[i]), f(r.oddsRatio[i], 4)]; });
      var stats = [["Nº preditores", String(r.p)], ["Log-verossimilhança", f(r.logLik, 3)], ["Pseudo-R² (McFadden)", f(r.mcfaddenR2)], ["Convergiu", r.converged ? "sim" : "não"]];
      return { stats: stats, tables: [{ caption: "Coeficientes", headers: headers, rows: rows2, rowHeader: true }], notes: ["OR = exp(β). Erros-padrão de Wald. Para amostras pequenas, interprete com cautela."], md: { title: "Regressão Logística", lines: mdLines(stats), extra: U_mdTable(headers, rows2) } };
    }
  };

  /* =========================== NÃO PARAMÉTRICOS =========================== */
  R["wilcoxon"] = {
    inputs: [{ id: "pares", label: "Pares (col1; col2 por linha)", type: "matrix", placeholder: "200; 195\n212; 205\n190; 185" }],
    compute: function (v) {
      var rows = v.pares.filter(function (r) { return r.length >= 2; });
      if (rows.length < 5) throw new Error("Aproximação normal: recomende ao menos 5 pares.");
      var a = rows.map(function (r) { return r[0]; }), b = rows.map(function (r) { return r[1]; });
      var r = Stats.wilcoxon(a, b);
      var stats = [["Estatística W", f(r.W, 1)], ["z", f(r.z)], ["p-valor", fp(r.pValue)], ["n (≠0)", String(r.n)]];
      return { stats: stats, notes: ["Aproximação normal com correção de continuidade. Alternativa ao t pareado para dados não normais."], md: { title: "Teste de Wilcoxon", lines: mdLines(stats) } };
    }
  };
  R["mann-whitney"] = {
    inputs: [{ id: "a", label: "Amostra 1", type: "numbers", placeholder: "1; 2; 3; 4; 5" }, { id: "b", label: "Amostra 2", type: "numbers", placeholder: "6; 7; 8; 9; 10" }],
    compute: function (v) {
      need(v.a, 3); need(v.b, 3);
      var r = Stats.mannWhitney(v.a, v.b);
      var stats = [["Estatística U", f(r.U, 1)], ["z", f(r.z)], ["p-valor", fp(r.pValue)]];
      return { stats: stats, notes: ["Aproximação normal com correção de empates. Alternativa ao t para amostras independentes."], md: { title: "Teste de Mann-Whitney", lines: mdLines(stats) } };
    }
  };
  R["kruskal-wallis"] = {
    inputs: [{ id: "grupos", label: "Grupos (um por linha)", type: "groups", placeholder: "1; 2; 3\n4; 5; 6\n7; 8; 9" }],
    compute: function (v) {
      var g = v.grupos.filter(function (x) { return x.length > 0; });
      if (g.length < 2) throw new Error("Informe ao menos 2 grupos.");
      var r = Stats.kruskalWallis(g);
      var stats = [["Estatística H", f(r.H)], ["gl", String(r.df)], ["p-valor", fp(r.pValue)]];
      return { stats: stats, notes: ["Alternativa não paramétrica à ANOVA de 1 fator."], md: { title: "Teste de Kruskal-Wallis", lines: mdLines(stats) } };
    }
  };
  R["friedman"] = {
    inputs: [{ id: "dados", label: "Blocos × tratamentos (um bloco por linha)", type: "matrix", placeholder: "1; 2; 3\n1; 2; 3\n2; 1; 3" }],
    compute: function (v) {
      var rows = v.dados.filter(function (r) { return r.length >= 2; });
      if (rows.length < 2) throw new Error("Informe ao menos 2 blocos com ≥2 tratamentos.");
      var r = Stats.friedman(rows);
      var stats = [["Estatística Q", f(r.Q)], ["gl", String(r.df)], ["p-valor", fp(r.pValue)]];
      return { stats: stats, notes: ["ANOVA não paramétrica para medidas repetidas."], md: { title: "Teste de Friedman", lines: mdLines(stats) } };
    }
  };
  R["spearman"] = {
    inputs: [{ id: "pares", label: "Pares X;Y (um por linha)", type: "matrix", placeholder: "1; 2\n2; 4\n3; 6" }],
    compute: function (v) {
      var rows = v.pares.filter(function (r) { return r.length >= 2; });
      if (rows.length < 3) throw new Error("Informe ao menos 3 pares.");
      var x = rows.map(function (r) { return r[0]; }), y = rows.map(function (r) { return r[1]; });
      var r = Stats.spearmanTest(x, y);
      var stats = [["Coeficiente ρ", f(r.rho)], ["t", f(r.t)], ["gl", String(r.df)], ["p-valor", fp(r.pValue)]];
      return { stats: stats, notes: ["Correlação de postos (dados ordinais ou relação monótona não linear)."], md: { title: "Correlação de Spearman", lines: mdLines(stats) } };
    }
  };

  /* =========================== MULTIVARIADA =========================== */
  R["matriz-correlacao"] = {
    inputs: [{ id: "dados", label: "Matriz (observações nas linhas, variáveis nas colunas)", type: "matrix", placeholder: "1; 2; 5\n2; 4; 3\n3; 6; 8\n4; 8; 1\n5; 10; 9" }],
    compute: function (v) {
      var rows = v.dados.filter(function (r) { return r.length >= 2; });
      if (rows.length < 3) throw new Error("Informe ao menos 3 observações.");
      var p = rows[0].length, cols = [];
      for (var j = 0; j < p; j++) cols.push(rows.map(function (r) { return r[j]; }));
      var M = Stats.correlationMatrix(cols);
      var head = [""].concat(cols.map(function (_, j) { return "V" + (j + 1); }));
      var tab = { caption: "Matriz de correlação (Pearson)", headers: head, rows: M.map(function (row, i) { return ["V" + (i + 1)].concat(row.map(function (x) { return f(x, 3); })); }) };
      return { stats: [["Variáveis", String(p)], ["Observações", String(rows.length)]], tables: [tab], md: { title: "Matriz de Correlação", lines: [["Variáveis", String(p)]], extra: U_mdTable(head, M.map(function (row, i) { return ["V" + (i + 1)].concat(row.map(function (x) { return f(x, 3); })); })) } };
    }
  };
  R["pca"] = {
    inputs: [{ id: "dados", label: "Matriz (observações × variáveis)", type: "matrix", placeholder: "1; 2; 5\n2; 4; 3\n3; 6; 8" }],
    compute: function (v) {
      var rows = v.dados.filter(function (r) { return r.length >= 2; });
      if (rows.length < 3) throw new Error("Informe ao menos 3 observações.");
      var p = rows[0].length, cols = [];
      for (var j = 0; j < p; j++) cols.push(rows.map(function (r) { return r[j]; }));
      var r = Stats.pca(cols), acc = 0;
      var tab = { caption: "Componentes principais (matriz de correlação)", headers: ["Comp.", "Autovalor", "Var. explicada", "Acumulada"], rows: r.values.map(function (val, i) { acc += r.explained[i]; return ["PC" + (i + 1), f(val, 4), f(r.explained[i] * 100, 1) + "%", f(acc * 100, 1) + "%"]; }), rowHeader: true };
      return { stats: [["Variáveis", String(p)], ["1º autovalor", f(r.values[0], 4)], ["Var. PC1", f(r.explained[0] * 100, 1) + "%"]], tables: [tab], notes: ["PCA sobre a matriz de correlação (variáveis padronizadas)."], md: { title: "Análise de Componentes Principais", lines: [["Variáveis", String(p)]], extra: U_mdTable(["Comp.", "Autovalor", "Var%", "Acum%"], tab.rows) } };
    }
  };
  R["regressao-multipla"] = {
    inputs: [{ id: "dados", label: "Dados (X1; X2; …; Y) — Y na última coluna", type: "matrix", placeholder: "1; 2; 3\n2; 1; 2\n3; 4; 7\n4; 3; 6\n5; 6; 11" }],
    compute: function (v) {
      var rows = v.dados.filter(function (r) { return r.length >= 2; });
      if (rows.length < 3) throw new Error("Informe ao menos 3 observações.");
      var X = rows.map(function (r) { return r.slice(0, r.length - 1); });
      var y = rows.map(function (r) { return r[r.length - 1]; });
      var r = Stats.multipleRegression(X, y);
      if (!r) throw new Error("Matriz singular (colinearidade ou poucas observações).");
      var names = ["Intercepto"].concat(X[0].map(function (_, i) { return "X" + (i + 1); }));
      var headers = ["Termo", "Coef.", "EP", "t", "p"];
      var rows2 = r.beta.map(function (b, i) { return [names[i], f(b, 4), f(r.se[i], 4), f(r.t[i], 3), fp(r.pValue[i])]; });
      var stats = [["R²", f(r.r2)], ["R² ajustado", f(r.r2adj)], ["F", f(r.F)], ["p (modelo)", fp(r.pF)]];
      return { stats: stats, tables: [{ caption: "Coeficientes", headers: headers, rows: rows2, rowHeader: true }], notes: ["MQO via equações normais. Verifique pressupostos e colinearidade."], md: { title: "Regressão Múltipla", lines: mdLines(stats), extra: U_mdTable(headers, rows2) } };
    }
  };

  /* =========================== OUTRAS =========================== */
  R["epidemiologia-2x2"] = {
    inputs: [
      { id: "a", label: "a — Exposto & Desfecho+ (ou VP)", type: "number", default: "20" },
      { id: "b", label: "b — Exposto & Desfecho− (ou FP)", type: "number", default: "80" },
      { id: "c", label: "c — Não exposto & Desfecho+ (ou FN)", type: "number", default: "10" },
      { id: "d", label: "d — Não exposto & Desfecho− (ou VN)", type: "number", default: "90" },
    ],
    compute: function (v) {
      var a = v.a, b = v.b, c = v.c, d = v.d;
      if ([a, b, c, d].some(function (x) { return !(x >= 0) || !isFinite(x); })) throw new Error("Informe as 4 frequências (≥0).");
      var e = Extra.epi2x2(a, b, c, d);
      var stats = [
        ["Risco relativo (RR)", f(e.rr) + " [" + f(e.rrCI[0], 2) + "; " + f(e.rrCI[1], 2) + "]"],
        ["Odds ratio (OR)", f(e.or) + " [" + f(e.orCI[0], 2) + "; " + f(e.orCI[1], 2) + "]"],
        ["Diferença de risco (RD)", f(e.rd)],
        ["χ² (independência)", f(e.chi2) + " (p=" + fp(e.pValue) + ")"],
      ];
      var diag = { caption: "Interpretação diagnóstica (a=VP, b=FP, c=FN, d=VN)", headers: ["Medida", "Valor"], rows: [["Sensibilidade", f(e.sens)], ["Especificidade", f(e.spec)], ["VPP", f(e.ppv)], ["VPN", f(e.npv)], ["Acurácia", f(e.accuracy)]], rowHeader: true };
      return { stats: stats, tables: [diag], notes: ["IC95% de RR/OR pelo método logarítmico (Woolf). A interpretação (associação vs. diagnóstico) depende do desenho do estudo."], md: { title: "Epidemiologia 2×2", lines: mdLines(stats) } };
    }
  };
  R["alfa-cronbach"] = {
    inputs: [{ id: "dados", label: "Respostas (respondentes nas linhas, itens nas colunas)", type: "matrix", placeholder: "4; 3; 5; 4\n5; 5; 4; 5\n2; 3; 2; 3\n4; 4; 4; 5", hint: "Cada linha é um respondente; cada coluna é um item da escala." }],
    compute: function (v) {
      var rows = v.dados.filter(function (r) { return r.length >= 2; });
      if (rows.length < 2) throw new Error("Informe ao menos 2 respondentes e 2 itens.");
      var k = rows[0].length;
      if (!rows.every(function (r) { return r.length === k; })) throw new Error("Todas as linhas devem ter o mesmo número de itens.");
      var r = Extra.cronbachAlpha(rows);
      var classe = r.alpha >= 0.9 ? "excelente" : r.alpha >= 0.8 ? "boa" : r.alpha >= 0.7 ? "aceitável" : r.alpha >= 0.6 ? "questionável" : "baixa";
      var stats = [["Alfa de Cronbach (α)", f(r.alpha)], ["Itens (k)", String(r.k)], ["Respondentes (n)", String(r.n)], ["Consistência", classe]];
      var tab = { caption: "α se o item for removido", headers: ["Item", "α sem o item"], rows: r.alphaIfDeleted.map(function (av, i) { return ["Item " + (i + 1), isNaN(av) ? "—" : f(av)]; }), rowHeader: true };
      var alert = {
        type: "", html: "<strong>Atenção metodológica.</strong> O alfa de Cronbach (1951) pressupõe " +
          "<em>tau-equivalência</em> (cargas iguais entre itens); quando isso não se verifica, ele tende a " +
          "<em>subestimar</em> a confiabilidade. Estimadores frequentemente recomendados em substituição incluem o " +
          "<em>ômega de McDonald (ω)</em> e o maior limite inferior (GLB). Use o α com essa ressalva. " +
          "(Refs.: Sijtsma, 2009; McDonald, 1999.)"
      };
      return { stats: stats, alert: alert, tables: [tab], md: { title: "Alfa de Cronbach", lines: mdLines(stats), extra: "> Nota: o α pressupõe tau-equivalência e pode subestimar a confiabilidade; considere o ômega de McDonald (Sijtsma, 2009)." } };
    }
  };
  R["gerador-aleatorios"] = {
    inputs: [
      { id: "n", label: "Quantidade (n)", type: "int", default: "10" },
      { id: "dist", label: "Distribuição", type: "select", default: "normal", options: [["normal", "Normal"], ["uniforme", "Uniforme"], ["poisson", "Poisson"]] },
      { id: "p1", label: "Parâmetro 1 (μ / mín / λ)", type: "number", default: "0" },
      { id: "p2", label: "Parâmetro 2 (σ / máx) — Poisson ignora", type: "number", default: "1" },
    ],
    compute: function (v) {
      var n = v.n; if (!(n > 0) || n > 100000) throw new Error("Informe 1 ≤ n ≤ 100000.");
      var out;
      if (v.dist === "normal") out = Stats.randomNormal(n, v.p1, v.p2);
      else if (v.dist === "uniforme") out = Stats.randomUniform(n, v.p1, v.p2);
      else out = Stats.randomPoisson(n, v.p1);
      var show = out.slice(0, 1000).map(function (x) { return f(x, v.dist === "poisson" ? 0 : 4); });
      var stats = [["n gerado", String(out.length)], ["Média amostral", f(Stats.mean(out))], ["Desvio padrão", f(Stats.sd(out, false))]];
      var listStr = show.join("; ");
      return { stats: stats, extraHtml: '<h3>Valores</h3><textarea readonly style="min-height:120px">' + U.esc(listStr) + "</textarea>", md: { title: "Gerador de Números Aleatórios", lines: mdLines(stats), extra: "```\n" + listStr + "\n```" } };
    }
  };
  R["tabela-normal"] = {
    inputs: [
      { id: "modo", label: "Direção", type: "select", default: "z2p", options: [["z2p", "De Z → probabilidade"], ["p2z", "De probabilidade → Z"]] },
      { id: "valor", label: "Valor (Z ou probabilidade)", type: "number", default: "1.96" },
    ],
    compute: function (v) {
      var stats;
      if (v.modo === "z2p") {
        var z = v.valor; if (!isFinite(z)) throw new Error("Informe um Z válido.");
        var p = Stats.normalCDF(z);
        stats = [["Z", f(z)], ["P(Z ≤ z) = Φ(z)", f(p)], ["P(Z ≥ z)", f(1 - p)], ["P(0 ≤ Z ≤ z)", f(Math.abs(p - 0.5))]];
      } else {
        var pr = v.valor; if (!(pr > 0 && pr < 1)) throw new Error("Informe uma probabilidade entre 0 e 1.");
        stats = [["Probabilidade acumulada", f(pr)], ["Z crítico", f(Stats.normalInv(pr))]];
      }
      return { stats: stats, md: { title: "Tabela da Distribuição Normal (Z)", lines: mdLines(stats) } };
    }
  };
  R["conversor-dados"] = {
    inputs: [{ id: "texto", label: "Dados brutos", type: "textarea", placeholder: "1 2 3\n4 5 6\nou: 1 2 3; 4 5 6", hint: "Converte texto livre em matriz padronizada (linhas e colunas)." }],
    compute: function (v) {
      var M = U.parseGroups(v.texto);
      M = M.filter(function (r) { return r.length > 0; });
      if (!M.length) throw new Error("Nenhum dado reconhecido.");
      var sep = U.getDecimalSep();
      var fmtRow = function (r) { return r.map(function (x) { return U.fmt(x, 4); }).join(sep === "," ? " " : ", "); };
      var matStr = M.map(fmtRow).join("; \n");
      var headers = M[0].map(function (_, j) { return "C" + (j + 1); });
      var mdRows = M.map(function (r) { return r.map(function (x) { return U.fmt(x, 4); }); });
      return { stats: [["Linhas", String(M.length)], ["Colunas", String(M[0].length)]], extraHtml: '<h3>Matriz padronizada</h3><textarea readonly style="min-height:120px">' + U.esc(matStr) + "</textarea>", md: { title: "Conversor de Dados", lines: [["Linhas", String(M.length)], ["Colunas", String(M[0].length)]], extra: U_mdTable(headers, mdRows) } };
    }
  };

  /* =========================== NOVAS CALCULADORAS =========================== */
  R["media-geometrica-harmonica"] = {
    inputs: [{ id: "dados", label: "Números", type: "numbers", placeholder: "Ex.: 2; 4; 8; 16", hint: "Os valores devem ser estritamente positivos (>0)." }],
    compute: function (v) {
      var d = v.dados; need(d, 1);
      var g = Stats.geometricMean(d);
      var h = Stats.harmonicMean(d);
      var stats = [
        ["Média Geométrica", f(g)],
        ["Média Harmônica", f(h)],
        ["Média Aritmética", f(Stats.mean(d))],
        ["Quantidade (n)", String(d.length)]
      ];
      return { stats: stats, md: { title: "Média Geométrica e Harmônica", lines: mdLines(stats) } };
    }
  };

  R["teste-homocedasticidade"] = {
    inputs: [
      { id: "a", label: "Amostra 1", type: "numbers", placeholder: "Ex.: 10; 12; 15; 11; 14" },
      { id: "b", label: "Amostra 2", type: "numbers", placeholder: "Ex.: 14; 16; 18; 12; 15" }
    ],
    compute: function (v) {
      var a = v.a, b = v.b; need(a, 2); need(b, 2);
      var r = Stats.fTestTwoVariances(a, b);
      var stats = [
        ["Estatística F", f(r.F)],
        ["gl Numerador", String(r.df1)],
        ["gl Denominador", String(r.df2)],
        ["p-valor", fp(r.pValue)],
        ["Variância Amostra 1", f(Stats.variance(a, false))],
        ["Variância Amostra 2", f(Stats.variance(b, false))],
        ["Decisão (α=0,05)", decide(r.pValue, 0.05)]
      ];
      return { stats: stats, notes: ["Teste F de igualdade de duas variâncias. Pressupõe que ambas as populações são normalmente distribuídas."], md: { title: "Teste de Homocedasticidade (Teste F)", lines: mdLines(stats) } };
    }
  };

  R["teste-exato-fisher"] = {
    inputs: [
      { id: "a", label: "a (Grupo 1 & Desfecho+)", type: "number", default: "2" },
      { id: "b", label: "b (Grupo 1 & Desfecho-)", type: "number", default: "8" },
      { id: "c", label: "c (Grupo 2 & Desfecho+)", type: "number", default: "9" },
      { id: "d", label: "d (Grupo 2 & Desfecho-)", type: "number", default: "3" }
    ],
    compute: function (v) {
      var a = v.a, b = v.b, c = v.c, d = v.d;
      if ([a, b, c, d].some(function (x) { return !(x >= 0) || !isFinite(x); })) throw new Error("Informe as 4 frequências (≥0).");
      var r = Stats.fisherExact(a, b, c, d);
      var stats = [
        ["p-valor (Bilateral)", fp(r.pValue)],
        ["Prob. da tabela observada", fp(r.observedP)],
        ["Total (N)", String(a + b + c + d)]
      ];
      var tab = { caption: "Tabela de Contingência Observada", headers: ["", "Desfecho+", "Desfecho-", "Total"], rows: [["Grupo 1", String(a), String(b), String(a + b)], ["Grupo 2", String(c), String(d), String(c + d)], ["Total", String(a + c), String(b + d), String(a + b + c + d)]], rowHeader: true };
      return { stats: stats, tables: [tab], notes: ["Ideal para tabelas 2x2 com pequenas frequências esperadas onde a aproximação qui-quadrado não é recomendada."], md: { title: "Teste Exato de Fisher", lines: mdLines(stats) } };
    }
  };

  R["teste-normalidade"] = {
    inputs: [
      { id: "dados", label: "Amostra de dados", type: "numbers", placeholder: "Ex.: 10; 12; 15; 11; 14; 13; 12; 11; 15; 14" },
      { id: "modo", label: "Tipo de Teste", type: "select", default: "lilliefors", options: [["lilliefors", "Parâmetros estimados da amostra"], ["user", "Parâmetros definidos pelo usuário"]] },
      { id: "mu", label: "Média hipotética (se definido pelo usuário)", type: "number", default: "0" },
      { id: "sigma", label: "Desvio padrão hipotético (se definido pelo usuário)", type: "number", default: "1" }
    ],
    compute: function (v) {
      var d = v.dados; need(d, 3);
      var mu = v.mu, sigma = v.sigma;
      var est = v.modo === "lilliefors";
      if (est) {
        mu = Stats.mean(d);
        sigma = Stats.sd(d, false);
      }
      if (sigma <= 0) throw new Error("O desvio padrão deve ser maior que zero.");
      var r = Stats.kolmogorovSmirnov(d, mu, sigma);
      var decision = r.pValue < 0.05 ? "Rejeita H₀ (Dados não normais)" : "Não rejeita H₀ (Dados aproximadamente normais)";
      var stats = [
        ["Estatística D (KS)", f(r.D)],
        ["p-valor (asintótico)", fp(r.pValue)],
        ["Média utilizada", f(r.mean)],
        ["Desvio padrão utilizado", f(r.sd)],
        ["Decisão (α=0,05)", decision]
      ];
      var notes = ["O teste de Kolmogorov-Smirnov padrão assume parâmetros conhecidos a priori. Ao estimar a média e desvio padrão da amostra, o teste se torna conservador (o Lilliefors é o ajuste ideal)."];
      return { stats: stats, notes: notes, md: { title: "Teste de Normalidade (Kolmogorov-Smirnov)", lines: mdLines(stats) } };
    }
  };

  R["testes-z-proporcoes"] = {
    inputs: [
      { id: "tipo", label: "Tipo de teste", type: "select", default: "one", options: [["one", "1 Proporção (observado vs referência)"], ["two", "2 Proporções (duas amostras)"]] },
      { id: "x1", label: "Sucessos (x1) - Amostra 1", type: "number", default: "15" },
      { id: "n1", label: "Tentativas (n1) - Amostra 1", type: "number", default: "50" },
      { id: "x2", label: "Sucessos (x2) - Amostra 2 (para 2 proporções)", type: "number", default: "25" },
      { id: "n2", label: "Tentativas (n2) - Amostra 2 (para 2 proporções)", type: "number", default: "60" },
      { id: "p0", label: "Proporção de referência (p0 - para 1 proporção)", type: "number", default: "0.5" }
    ],
    compute: function (v) {
      var x1 = parseInt(v.x1, 10), n1 = parseInt(v.n1, 10);
      var stats;
      if (v.tipo === "one") {
        var p0 = parseFloat(v.p0);
        var r1 = Stats.zTestOneProportion(x1, n1, p0);
        stats = [
          ["Proporção amostral (p̂)", f(r1.pHat)],
          ["Estatística Z", f(r1.z)],
          ["p-valor", fp(r1.pValue)],
          ["IC 95% Inferior (Wilson)", f(r1.lower)],
          ["IC 95% Superior (Wilson)", f(r1.upper)],
          ["Decisão (α=0,05)", decide(r1.pValue, 0.05)]
        ];
      } else {
        var x2 = parseInt(v.x2, 10), n2 = parseInt(v.n2, 10);
        var r2 = Stats.zTestTwoProportions(x1, n1, x2, n2);
        stats = [
          ["Proporção 1 (p̂1)", f(r2.p1)],
          ["Proporção 2 (p̂2)", f(r2.p2)],
          ["Diferença (p̂1 - p̂2)", f(r2.diff)],
          ["Estatística Z", f(r2.z)],
          ["p-valor", fp(r2.pValue)],
          ["IC 95% Diferença Inferior", f(r2.lower)],
          ["IC 95% Diferença Superior", f(r2.upper)],
          ["Decisão (α=0,05)", decide(r2.pValue, 0.05)]
        ];
      }
      return { stats: stats, notes: ["Utiliza a aproximação normal. Para amostras pequenas de proporções, considere o Teste Exato de Fisher."], md: { title: "Testes Z para Proporções", lines: mdLines(stats) } };
    }
  };

  R["tamanho-efeito"] = {
    inputs: [
      { id: "tipo", label: "Métrica / Desenho", type: "select", default: "two", options: [
        ["one", "d de Cohen (1 Amostra vs Referência)"],
        ["two", "d de Cohen (2 Amostras Independentes)"],
        ["paired", "d de Cohen (Amostras Pareadas / Diferença)"],
        ["anova", "Eta-quadrado - η² (para ANOVA de 1 fator)"]
      ]},
      { id: "m1", label: "Média 1 (ou Média da Diferença / Amostra)", type: "number", default: "15" },
      { id: "sd1", label: "Desvio Padrão 1 (ou Desvio da Diferença / Amostra)", type: "number", default: "3" },
      { id: "n1", label: "Tamanho da Amostra 1 (opcional para pareado/1 amostra)", type: "number", default: "30" },
      { id: "m2", label: "Média 2 (ou Referência μ₀)", type: "number", default: "12" },
      { id: "sd2", label: "Desvio Padrão 2 (não usado para pareado/1 amostra)", type: "number", default: "4" },
      { id: "n2", label: "Tamanho da Amostra 2 (não usado para pareado/1 amostra)", type: "number", default: "30" },
      { id: "ssb", label: "Soma de Quadrados Entre grupos (SQEntre - apenas p/ ANOVA)", type: "number", default: "25" },
      { id: "sst", label: "Soma de Quadrados Total (SQTotal - apenas p/ ANOVA)", type: "number", default: "100" }
    ],
    compute: function (v) {
      var stats, val, interp;
      if (v.tipo === "one") {
        val = Stats.cohensDOneSample(parseFloat(v.m1), parseFloat(v.m2), parseFloat(v.sd1));
        interp = val < 0.2 ? "efeito negligenciável" : val < 0.5 ? "efeito pequeno" : val < 0.8 ? "efeito médio" : "efeito grande";
        stats = [["d de Cohen", f(val)], ["Interpretação", interp]];
      } else if (v.tipo === "two") {
        val = Stats.cohensDTwoSamples(parseFloat(v.m1), parseFloat(v.sd1), parseInt(v.n1,10), parseFloat(v.m2), parseFloat(v.sd2), parseInt(v.n2,10));
        interp = val < 0.2 ? "efeito negligenciável" : val < 0.5 ? "efeito pequeno" : val < 0.8 ? "efeito médio" : "efeito grande";
        stats = [["d de Cohen (pooled)", f(val)], ["Interpretação", interp]];
      } else if (v.tipo === "paired") {
        val = Stats.cohensDPaired(parseFloat(v.m1), parseFloat(v.sd1));
        interp = val < 0.2 ? "efeito negligenciável" : val < 0.5 ? "efeito pequeno" : val < 0.8 ? "efeito médio" : "efeito grande";
        stats = [["d de Cohen (pareado)", f(val)], ["Interpretação", interp]];
      } else {
        var ssb = parseFloat(v.ssb), sst = parseFloat(v.sst);
        if (ssb > sst) throw new Error("A Soma de Quadrados Entre (SQEntre) não pode ser maior que a Soma de Quadrados Total (SQTotal).");
        val = Stats.etaSquared(ssb, sst);
        interp = val < 0.01 ? "efeito negligenciável" : val < 0.06 ? "efeito pequeno" : val < 0.14 ? "efeito médio" : "efeito grande";
        stats = [["Eta-quadrado (η²)", f(val)], ["Interpretação", interp]];
      }
      return { stats: stats, notes: ["Corte referencial para Cohen (1988): Pequeno (~0,2), Médio (~0,5), Grande (~0,8). Para Eta-quadrado: Pequeno (~0,01), Médio (~0,06), Grande (~0,14)."], md: { title: "Tamanho do Efeito (Effect Size)", lines: mdLines(stats) } };
    }
  };

  /* tabela em Markdown (helper local) */
  function U_mdTable(headers, rows) {
    var md = "| " + headers.join(" | ") + " |\n|" + headers.map(function () { return "---"; }).join("|") + "|\n";
    rows.forEach(function (r) { md += "| " + r.join(" | ") + " |\n"; });
    return md.trimEnd();
  }

  global.CALC_REGISTRY = R;
  if (typeof module !== "undefined" && module.exports) module.exports = R;
})(typeof window !== "undefined" ? window : globalThis);
