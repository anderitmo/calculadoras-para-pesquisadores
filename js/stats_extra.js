/*
 * stats_extra.js — funções adicionais que complementam stats.js
 * (Regressão logística, Alfa de Cronbach, Epidemiologia 2x2).
 * Depende de stats.js (Stats) para normalCDF, chi2CDF, sd, etc.
 */
(function (global) {
  "use strict";
  var Stats = global.Stats || (typeof require !== "undefined" ? require("./stats.js") : null);
  var Extra = {};

  /* ---------------------------------------------------------------- *
   * Regressão logística binária (IRLS / Newton-Raphson)
   * X: matriz [n][p] (sem intercepto). y: vetor 0/1.
   * Retorna coeficientes (com intercepto na posição 0), erros-padrão,
   * z de Wald, p-valores, log-verossimilhança e pseudo-R² de McFadden.
   * ---------------------------------------------------------------- */
  Extra.logisticRegression = function (X, y, opts) {
    opts = opts || {};
    var maxIter = opts.maxIter || 50;
    var tol = opts.tol || 1e-8;
    var n = X.length;
    var p = X[0].length + 1; // +intercepto
    var Xa = X.map(function (row) { return [1].concat(row); });
    var beta = new Array(p).fill(0);

    function sigmoid(z) { return 1 / (1 + Math.exp(-z)); }

    var lastLL = -Infinity, converged = false;
    for (var iter = 0; iter < maxIter; iter++) {
      var XtWX = zeros(p, p);
      var XtWz = new Array(p).fill(0); // gradiente acumulado (X'(y-pi))
      var ll = 0;
      var W = new Array(n);
      var pi = new Array(n);
      for (var i = 0; i < n; i++) {
        var eta = 0;
        for (var a = 0; a < p; a++) eta += Xa[i][a] * beta[a];
        var pr = sigmoid(eta);
        pr = Math.min(Math.max(pr, 1e-10), 1 - 1e-10);
        pi[i] = pr;
        W[i] = pr * (1 - pr);
        ll += y[i] * Math.log(pr) + (1 - y[i]) * Math.log(1 - pr);
        for (var b = 0; b < p; b++) {
          XtWz[b] += Xa[i][b] * (y[i] - pr);
          for (var c = 0; c < p; c++) XtWX[b][c] += Xa[i][b] * Xa[i][c] * W[i];
        }
      }
      var inv = Stats.invertMatrix(XtWX);
      if (!inv) return { error: "Matriz de informação singular (verifique separação ou colinearidade)." };
      var delta = matVec(inv, XtWz);
      for (var d = 0; d < p; d++) beta[d] += delta[d];
      if (Math.abs(ll - lastLL) < tol) { converged = true; lastLL = ll; break; }
      lastLL = ll;
    }

    // erros-padrão a partir da inversa da matriz de informação final
    var XtWXf = zeros(p, p);
    for (var i2 = 0; i2 < n; i2++) {
      var eta2 = 0;
      for (var a2 = 0; a2 < p; a2++) eta2 += Xa[i2][a2] * beta[a2];
      var pr2 = sigmoid(eta2); var w2 = pr2 * (1 - pr2);
      for (var b2 = 0; b2 < p; b2++)
        for (var c2 = 0; c2 < p; c2++) XtWXf[b2][c2] += Xa[i2][b2] * Xa[i2][c2] * w2;
    }
    var cov = Stats.invertMatrix(XtWXf);
    var se = [], z = [], pval = [], or = [];
    for (var k = 0; k < p; k++) {
      var s = cov ? Math.sqrt(cov[k][k]) : NaN;
      se.push(s);
      var zz = beta[k] / s;
      z.push(zz);
      pval.push(2 * (1 - Stats.normalCDF(Math.abs(zz))));
      or.push(Math.exp(beta[k]));
    }
    // log-verossimilhança do modelo nulo (só intercepto)
    var ybar = Stats.mean(y);
    var llNull = 0;
    for (var t = 0; t < n; t++) llNull += y[t] * Math.log(ybar) + (1 - y[t]) * Math.log(1 - ybar);
    var mcfadden = 1 - lastLL / llNull;

    return {
      beta: beta, se: se, z: z, pValue: pval, oddsRatio: or,
      logLik: lastLL, logLikNull: llNull, mcfaddenR2: mcfadden,
      n: n, p: p - 1, converged: converged,
    };
  };

  /* ---------------------------------------------------------------- *
   * Alfa de Cronbach.
   * items: matriz [respondentes][itens] (cada coluna = um item).
   * Retorna alpha, k, variância total, e alpha-se-item-removido.
   * ---------------------------------------------------------------- */
  Extra.cronbachAlpha = function (items) {
    var n = items.length;          // respondentes
    var k = items[0].length;       // itens
    // colunas
    var cols = [];
    for (var j = 0; j < k; j++) cols.push(items.map(function (row) { return row[j]; }));
    var itemVars = cols.map(function (c) { return Stats.variance(c, false); });
    var sumItemVar = itemVars.reduce(function (s, v) { return s + v; }, 0);
    var totals = items.map(function (row) { return row.reduce(function (s, v) { return s + v; }, 0); });
    var totalVar = Stats.variance(totals, false);
    var alpha = (k / (k - 1)) * (1 - sumItemVar / totalVar);

    // alpha se um item for removido
    var alphaIfDeleted = [];
    for (var d = 0; d < k; d++) {
      var kk = k - 1;
      if (kk < 2) { alphaIfDeleted.push(NaN); continue; }
      var sub = items.map(function (row) {
        return row.filter(function (_, idx) { return idx !== d; });
      });
      var subVars = 0;
      for (var j2 = 0; j2 < k; j2++) if (j2 !== d) subVars += itemVars[j2];
      var subTotals = sub.map(function (row) { return row.reduce(function (s, v) { return s + v; }, 0); });
      var subTotalVar = Stats.variance(subTotals, false);
      alphaIfDeleted.push((kk / (kk - 1)) * (1 - subVars / subTotalVar));
    }
    return {
      alpha: alpha, k: k, n: n,
      sumItemVar: sumItemVar, totalVar: totalVar,
      itemVars: itemVars, alphaIfDeleted: alphaIfDeleted,
    };
  };

  /* ---------------------------------------------------------------- *
   * Epidemiologia 2x2.
   * Tabela:            Desfecho+   Desfecho-
   *   Exposto/Teste+      a            b
   *   Não exp./Teste-     c            d
   * Retorna medidas de associação (RR, OR, RD) e de teste diagnóstico
   * (sensibilidade, especificidade, VPP, VPN), com IC95% quando aplicável.
   * ---------------------------------------------------------------- */
  Extra.epi2x2 = function (a, b, c, d) {
    var z = Stats.normalInv(0.975); // 1.959964
    function ciLog(est, selog) {
      return [est * Math.exp(-z * selog), est * Math.exp(z * selog)];
    }
    // Risco e Odds
    var riskExp = a / (a + b);
    var riskUnexp = c / (c + d);
    var rr = riskExp / riskUnexp;
    var rd = riskExp - riskUnexp;
    var or = (a * d) / (b * c);

    var seLnRR = Math.sqrt(1 / a - 1 / (a + b) + 1 / c - 1 / (c + d));
    var seLnOR = Math.sqrt(1 / a + 1 / b + 1 / c + 1 / d);
    var rrCI = ciLog(rr, seLnRR);
    var orCI = ciLog(or, seLnOR);

    // Diagnóstico (assumindo a=VP, b=FP, c=FN, d=VN)
    var sens = a / (a + c);
    var spec = d / (b + d);
    var ppv = a / (a + b);
    var npv = d / (c + d);
    var accuracy = (a + d) / (a + b + c + d);

    // Qui-quadrado de independência da tabela (sem Yates)
    var chi = Stats.chi2Independence([[a, b], [c, d]]);

    return {
      a: a, b: b, c: c, d: d,
      riskExp: riskExp, riskUnexp: riskUnexp,
      rr: rr, rrCI: rrCI, rd: rd, or: or, orCI: orCI,
      sens: sens, spec: spec, ppv: ppv, npv: npv, accuracy: accuracy,
      chi2: chi.chi2, df: chi.df, pValue: chi.pValue,
    };
  };

  /* ---- utilitários de matriz locais ---- */
  function zeros(r, c) {
    var m = [];
    for (var i = 0; i < r; i++) m.push(new Array(c).fill(0));
    return m;
  }
  function matVec(M, v) {
    return M.map(function (row) {
      return row.reduce(function (s, x, i) { return s + x * v[i]; }, 0);
    });
  }

  if (typeof module !== "undefined" && module.exports) module.exports = Extra;
  global.Extra = Extra;
})(typeof window !== "undefined" ? window : globalThis);
