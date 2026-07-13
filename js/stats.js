/*
 * stats.js — Núcleo de cálculo estatístico.
 *
 * Implementações em JavaScript puro, sem dependências.
 * Todas as funções de distribuição foram validadas contra valores tabelados
 * conhecidos (ver js/_tests/stats.test.js).
 *
 * Nível de informação (conforme diretrizes do projeto):
 *  - As fórmulas implementadas são FATOS estatísticos estabelecidos.
 *  - As aproximações numéricas (erf, beta/gama incompletas) têm erro pequeno
 *    porém não-nulo; ver tolerâncias nos testes.
 */
(function (global) {
  "use strict";

  var Stats = {};

  /* ============================================================= *
   *  Funções especiais                                            *
   * ============================================================= */

  // log da função Gama (Lanczos). Erro relativo ~1e-15.
  function logGamma(x) {
    var g = 7;
    var c = [
      0.99999999999980993, 676.5203681218851, -1259.1392167224028,
      771.32342877765313, -176.61502916214059, 12.507343278686905,
      -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
    ];
    if (x < 0.5) {
      // reflexão
      return (
        Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x)
      );
    }
    x -= 1;
    var a = c[0];
    var t = x + g + 0.5;
    for (var i = 1; i < g + 2; i++) {
      a += c[i] / (x + i);
    }
    return (
      0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a)
    );
  }
  Stats.logGamma = logGamma;

  // Função Gama
  Stats.gamma = function (x) {
    if (x <= 0 && x === Math.floor(x)) return NaN; // polos
    return Math.exp(logGamma(x));
  };

  // log da função Beta
  function logBeta(a, b) {
    return logGamma(a) + logGamma(b) - logGamma(a + b);
  }

  // Gama incompleta regularizada inferior P(a,x) = γ(a,x)/Γ(a)
  // Série + fração continuada (Numerical Recipes).
  function gammaP(a, x) {
    if (x < 0 || a <= 0) return NaN;
    if (x === 0) return 0;
    if (x < a + 1) {
      // série
      var ap = a;
      var sum = 1 / a;
      var del = sum;
      for (var n = 0; n < 1000; n++) {
        ap += 1;
        del *= x / ap;
        sum += del;
        if (Math.abs(del) < Math.abs(sum) * 1e-15) break;
      }
      return sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
    } else {
      // fração continuada para Q, então P = 1 - Q
      var fpmin = 1e-300;
      var b = x + 1 - a;
      var c = 1 / fpmin;
      var d = 1 / b;
      var h = d;
      for (var i = 1; i <= 1000; i++) {
        var an = -i * (i - a);
        b += 2;
        d = an * d + b;
        if (Math.abs(d) < fpmin) d = fpmin;
        c = b + an / c;
        if (Math.abs(c) < fpmin) c = fpmin;
        d = 1 / d;
        var del2 = d * c;
        h *= del2;
        if (Math.abs(del2 - 1) < 1e-15) break;
      }
      var Q = Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
      return 1 - Q;
    }
  }
  Stats.gammaP = gammaP;

  // Beta incompleta regularizada I_x(a,b). Fração continuada (Lentz).
  function betacf(a, b, x) {
    var fpmin = 1e-300;
    var qab = a + b;
    var qap = a + 1;
    var qam = a - 1;
    var c = 1;
    var d = 1 - (qab * x) / qap;
    if (Math.abs(d) < fpmin) d = fpmin;
    d = 1 / d;
    var h = d;
    for (var m = 1; m <= 1000; m++) {
      var m2 = 2 * m;
      var aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < fpmin) d = fpmin;
      c = 1 + aa / c;
      if (Math.abs(c) < fpmin) c = fpmin;
      d = 1 / d;
      h *= d * c;
      aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < fpmin) d = fpmin;
      c = 1 + aa / c;
      if (Math.abs(c) < fpmin) c = fpmin;
      d = 1 / d;
      var del = d * c;
      h *= del;
      if (Math.abs(del - 1) < 1e-15) break;
    }
    return h;
  }

  function betaI(x, a, b) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    var bt = Math.exp(
      a * Math.log(x) + b * Math.log(1 - x) - logBeta(a, b)
    );
    if (x < (a + 1) / (a + b + 2)) {
      return (bt * betacf(a, b, x)) / a;
    } else {
      return 1 - (bt * betacf(b, a, 1 - x)) / b;
    }
  }
  Stats.betaI = betaI;

  // erf via gammaP: erf(x) = sign(x) * P(1/2, x^2)
  function erf(x) {
    var s = x < 0 ? -1 : 1;
    return s * gammaP(0.5, x * x);
  }
  Stats.erf = erf;

  /* ============================================================= *
   *  Distribuições contínuas — CDF e inversas                     *
   * ============================================================= */

  // Normal padrão CDF
  Stats.normalCDF = function (x, mean, sd) {
    mean = mean || 0;
    sd = sd == null ? 1 : sd;
    var z = (x - mean) / sd;
    return 0.5 * (1 + erf(z / Math.SQRT2));
  };

  // Normal padrão PDF
  Stats.normalPDF = function (x, mean, sd) {
    mean = mean || 0;
    sd = sd == null ? 1 : sd;
    var z = (x - mean) / sd;
    return Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI));
  };

  // Inversa da normal padrão (Acklam). Erro relativo ~1.15e-9.
  Stats.normalInv = function (p, mean, sd) {
    mean = mean || 0;
    sd = sd == null ? 1 : sd;
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    var a = [
      -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
      1.38357751867269e2, -3.066479806614716e1, 2.506628277459239,
    ];
    var b = [
      -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
      6.680131188771972e1, -1.328068155288572e1,
    ];
    var c = [
      -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
      -2.549732539343734, 4.374664141464968, 2.938163982698783,
    ];
    var d = [
      7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
      3.754408661907416,
    ];
    var plow = 0.02425;
    var phigh = 1 - plow;
    var q, r, z;
    if (p < plow) {
      q = Math.sqrt(-2 * Math.log(p));
      z =
        (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    } else if (p <= phigh) {
      q = p - 0.5;
      r = q * q;
      z =
        ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) *
          q) /
        (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
    } else {
      q = Math.sqrt(-2 * Math.log(1 - p));
      z =
        -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
    // um passo de refino de Halley
    var e = Stats.normalCDF(z) - p;
    var u = e * Math.sqrt(2 * Math.PI) * Math.exp((z * z) / 2);
    z = z - u / (1 + (z * u) / 2);
    return mean + sd * z;
  };

  // t de Student CDF (df graus de liberdade)
  Stats.tCDF = function (t, df) {
    var x = df / (df + t * t);
    var ib = 0.5 * betaI(x, df / 2, 0.5);
    return t > 0 ? 1 - ib : ib;
  };

  // t de Student inversa (bisseção)
  Stats.tInv = function (p, df) {
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    return bisect(function (t) {
      return Stats.tCDF(t, df) - p;
    }, -1e6, 1e6);
  };

  // Qui-quadrado CDF
  Stats.chi2CDF = function (x, df) {
    if (x <= 0) return 0;
    return gammaP(df / 2, x / 2);
  };

  // Qui-quadrado inversa
  Stats.chi2Inv = function (p, df) {
    if (p <= 0) return 0;
    if (p >= 1) return Infinity;
    return bisect(function (x) {
      return Stats.chi2CDF(x, df) - p;
    }, 0, 1e7);
  };

  // F de Snedecor CDF
  Stats.fCDF = function (x, d1, d2) {
    if (x <= 0) return 0;
    var v = (d1 * x) / (d1 * x + d2);
    return betaI(v, d1 / 2, d2 / 2);
  };

  // F inversa
  Stats.fInv = function (p, d1, d2) {
    if (p <= 0) return 0;
    if (p >= 1) return Infinity;
    return bisect(function (x) {
      return Stats.fCDF(x, d1, d2) - p;
    }, 0, 1e7);
  };

  // raiz por bisseção para função monotônica crescente
  function bisect(f, lo, hi) {
    var flo = f(lo);
    var fhi = f(hi);
    if (flo > 0) return lo;
    if (fhi < 0) return hi;
    for (var i = 0; i < 200; i++) {
      var mid = (lo + hi) / 2;
      var fm = f(mid);
      if (Math.abs(fm) < 1e-12 || (hi - lo) / 2 < 1e-12) return mid;
      if (fm < 0) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  }
  Stats.bisect = bisect;

  /* ============================================================= *
   *  Distribuições discretas                                      *
   * ============================================================= */

  function logFactorial(n) {
    return logGamma(n + 1);
  }
  function logChoose(n, k) {
    return logFactorial(n) - logFactorial(k) - logFactorial(n - k);
  }

  // Binomial: P(X = k)
  Stats.binomPMF = function (k, n, p) {
    if (k < 0 || k > n) return 0;
    if (p === 0) return k === 0 ? 1 : 0;
    if (p === 1) return k === n ? 1 : 0;
    return Math.exp(logChoose(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p));
  };
  // Binomial: P(X <= k)
  Stats.binomCDF = function (k, n, p) {
    k = Math.floor(k);
    var s = 0;
    for (var i = 0; i <= k; i++) s += Stats.binomPMF(i, n, p);
    return Math.min(1, s);
  };

  // Poisson: P(X = k)
  Stats.poissonPMF = function (k, lambda) {
    if (k < 0) return 0;
    return Math.exp(-lambda + k * Math.log(lambda) - logFactorial(k));
  };
  // Poisson: P(X <= k)
  Stats.poissonCDF = function (k, lambda) {
    k = Math.floor(k);
    var s = 0;
    for (var i = 0; i <= k; i++) s += Stats.poissonPMF(i, lambda);
    return Math.min(1, s);
  };

  /* ============================================================= *
   *  Estatística descritiva                                       *
   * ============================================================= */

  Stats.sum = function (a) {
    return a.reduce(function (s, x) { return s + x; }, 0);
  };
  Stats.mean = function (a) {
    return Stats.sum(a) / a.length;
  };
  Stats.median = function (a) {
    var s = a.slice().sort(function (x, y) { return x - y; });
    var n = s.length;
    var mid = Math.floor(n / 2);
    return n % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  };
  Stats.mode = function (a) {
    var freq = {};
    a.forEach(function (x) { freq[x] = (freq[x] || 0) + 1; });
    var max = 0;
    Object.keys(freq).forEach(function (k) { if (freq[k] > max) max = freq[k]; });
    var modes = Object.keys(freq)
      .filter(function (k) { return freq[k] === max; })
      .map(Number)
      .sort(function (x, y) { return x - y; });
    return { modes: modes, frequency: max, allUnique: max === 1 };
  };
  // variância (population=false => amostral n-1)
  Stats.variance = function (a, population) {
    var m = Stats.mean(a);
    var ss = a.reduce(function (s, x) { return s + (x - m) * (x - m); }, 0);
    var denom = population ? a.length : a.length - 1;
    return ss / denom;
  };
  Stats.sd = function (a, population) {
    return Math.sqrt(Stats.variance(a, population));
  };
  Stats.range = function (a) {
    return Math.max.apply(null, a) - Math.min.apply(null, a);
  };
  Stats.cv = function (a, population) {
    return (Stats.sd(a, population) / Stats.mean(a)) * 100;
  };

  // Percentil — interpolação linear (método "linear"/R type 7), igual a Excel PERCENTILE.INC
  Stats.percentile = function (a, p) {
    var s = a.slice().sort(function (x, y) { return x - y; });
    var n = s.length;
    if (n === 1) return s[0];
    var rank = (p / 100) * (n - 1);
    var lo = Math.floor(rank);
    var frac = rank - lo;
    if (lo + 1 < n) return s[lo] + frac * (s[lo + 1] - s[lo]);
    return s[lo];
  };
  Stats.quartiles = function (a) {
    return {
      q1: Stats.percentile(a, 25),
      q2: Stats.percentile(a, 50),
      q3: Stats.percentile(a, 75),
      iqr: Stats.percentile(a, 75) - Stats.percentile(a, 25),
    };
  };

  // Assimetria (skewness) amostral — fórmula ajustada (Fisher-Pearson, igual ao Excel SKEW)
  Stats.skewness = function (a) {
    var n = a.length;
    var m = Stats.mean(a);
    var s = Stats.sd(a, false);
    if (s === 0 || n < 3) return NaN;
    var sum = a.reduce(function (acc, x) {
      return acc + Math.pow((x - m) / s, 3);
    }, 0);
    return (n / ((n - 1) * (n - 2))) * sum;
  };
  // Curtose excedente amostral (igual ao Excel KURT)
  Stats.kurtosis = function (a) {
    var n = a.length;
    var m = Stats.mean(a);
    var s = Stats.sd(a, false);
    if (s === 0 || n < 4) return NaN;
    var sum = a.reduce(function (acc, x) {
      return acc + Math.pow((x - m) / s, 4);
    }, 0);
    var term1 = (n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3));
    var term2 = (3 * (n - 1) * (n - 1)) / ((n - 2) * (n - 3));
    return term1 * sum - term2;
  };

  /* ============================================================= *
   *  Correlação e regressão                                       *
   * ============================================================= */

  Stats.pearson = function (x, y) {
    var n = x.length;
    var mx = Stats.mean(x);
    var my = Stats.mean(y);
    var num = 0, dx = 0, dy = 0;
    for (var i = 0; i < n; i++) {
      num += (x[i] - mx) * (y[i] - my);
      dx += (x[i] - mx) * (x[i] - mx);
      dy += (y[i] - my) * (y[i] - my);
    }
    return num / Math.sqrt(dx * dy);
  };

  // postos com tratamento de empates (média dos postos)
  Stats.ranks = function (a) {
    var idx = a.map(function (v, i) { return { v: v, i: i }; });
    idx.sort(function (p, q) { return p.v - q.v; });
    var ranks = new Array(a.length);
    var j = 0;
    while (j < idx.length) {
      var k = j;
      while (k + 1 < idx.length && idx[k + 1].v === idx[j].v) k++;
      var avg = (j + k + 2) / 2; // postos 1-based
      for (var m = j; m <= k; m++) ranks[idx[m].i] = avg;
      j = k + 1;
    }
    return ranks;
  };

  Stats.spearman = function (x, y) {
    return Stats.pearson(Stats.ranks(x), Stats.ranks(y));
  };

  // Regressão linear simples Y = a + bX
  Stats.linearRegression = function (x, y) {
    var n = x.length;
    var mx = Stats.mean(x);
    var my = Stats.mean(y);
    var sxy = 0, sxx = 0, syy = 0;
    for (var i = 0; i < n; i++) {
      sxy += (x[i] - mx) * (y[i] - my);
      sxx += (x[i] - mx) * (x[i] - mx);
      syy += (y[i] - my) * (y[i] - my);
    }
    var b = sxy / sxx;
    var a = my - b * mx;
    var r = sxy / Math.sqrt(sxx * syy);
    var r2 = r * r;
    // erro padrão dos coeficientes
    var sse = syy - b * sxy;
    var dfRes = n - 2;
    var mse = sse / dfRes;
    var seB = Math.sqrt(mse / sxx);
    var seA = Math.sqrt(mse * (1 / n + (mx * mx) / sxx));
    var tB = b / seB;
    var pB = 2 * (1 - Stats.tCDF(Math.abs(tB), dfRes));
    return {
      a: a, b: b, r: r, r2: r2,
      seA: seA, seB: seB, tB: tB, pValue: pB,
      df: dfRes, sse: sse, mse: mse,
    };
  };

  /* ============================================================= *
   *  Testes de hipótese paramétricos                              *
   * ============================================================= */

  // p-valor bilateral a partir de t e df
  Stats.tTestPValue = function (t, df) {
    return 2 * (1 - Stats.tCDF(Math.abs(t), df));
  };

  // Teste t para 1 amostra
  Stats.tTestOne = function (sample, mu0) {
    var n = sample.length;
    var m = Stats.mean(sample);
    var s = Stats.sd(sample, false);
    var t = (m - mu0) / (s / Math.sqrt(n));
    var df = n - 1;
    return { t: t, df: df, mean: m, sd: s, n: n, pValue: Stats.tTestPValue(t, df) };
  };

  // Teste t para 2 amostras independentes (Welch por padrão)
  Stats.tTestTwo = function (a, b, welch) {
    welch = welch !== false; // padrão Welch
    var na = a.length, nb = b.length;
    var ma = Stats.mean(a), mb = Stats.mean(b);
    var va = Stats.variance(a, false), vb = Stats.variance(b, false);
    var t, df;
    if (welch) {
      var se = Math.sqrt(va / na + vb / nb);
      t = (ma - mb) / se;
      var num = Math.pow(va / na + vb / nb, 2);
      var den =
        Math.pow(va / na, 2) / (na - 1) + Math.pow(vb / nb, 2) / (nb - 1);
      df = num / den;
    } else {
      var sp2 = ((na - 1) * va + (nb - 1) * vb) / (na + nb - 2);
      var se2 = Math.sqrt(sp2 * (1 / na + 1 / nb));
      t = (ma - mb) / se2;
      df = na + nb - 2;
    }
    return {
      t: t, df: df, meanA: ma, meanB: mb, welch: welch,
      pValue: Stats.tTestPValue(t, df),
    };
  };

  // Teste t pareado
  Stats.tTestPaired = function (a, b) {
    if (a.length !== b.length)
      throw new Error("As amostras pareadas devem ter o mesmo tamanho.");
    var d = a.map(function (v, i) { return v - b[i]; });
    var res = Stats.tTestOne(d, 0);
    res.meanDiff = res.mean;
    return res;
  };

  // Intervalo de confiança para a média (t)
  Stats.ciMean = function (sample, conf) {
    var n = sample.length;
    var m = Stats.mean(sample);
    var s = Stats.sd(sample, false);
    var alpha = 1 - conf;
    var tcrit = Stats.tInv(1 - alpha / 2, n - 1);
    var moe = tcrit * (s / Math.sqrt(n));
    return { mean: m, lower: m - moe, upper: m + moe, moe: moe, tcrit: tcrit, df: n - 1 };
  };

  // Tamanho de amostra para estimar média (sigma conhecido) com margem E
  Stats.sampleSizeMean = function (E, sigma, conf) {
    var alpha = 1 - conf;
    var z = Stats.normalInv(1 - alpha / 2);
    var n = Math.pow((z * sigma) / E, 2);
    return { n: Math.ceil(n), nRaw: n, z: z };
  };

  // ANOVA de 1 fator. groups: array de arrays.
  Stats.anovaOneWay = function (groups) {
    var k = groups.length;
    var all = [].concat.apply([], groups);
    var N = all.length;
    var grand = Stats.mean(all);
    var ssb = 0, ssw = 0;
    groups.forEach(function (g) {
      var mg = Stats.mean(g);
      ssb += g.length * (mg - grand) * (mg - grand);
      g.forEach(function (x) { ssw += (x - mg) * (x - mg); });
    });
    var dfb = k - 1;
    var dfw = N - k;
    var msb = ssb / dfb;
    var msw = ssw / dfw;
    var F = msb / msw;
    var p = 1 - Stats.fCDF(F, dfb, dfw);
    return {
      F: F, dfb: dfb, dfw: dfw, ssb: ssb, ssw: ssw,
      msb: msb, msw: msw, pValue: p, k: k, N: N,
    };
  };

  // Correlação de Pearson com teste de significância
  Stats.pearsonTest = function (x, y) {
    var n = x.length;
    var r = Stats.pearson(x, y);
    var df = n - 2;
    var t = (r * Math.sqrt(df)) / Math.sqrt(1 - r * r);
    var p = Stats.tTestPValue(t, df);
    return { r: r, t: t, df: df, pValue: p, n: n };
  };

  /* ============================================================= *
   *  Qui-quadrado                                                 *
   * ============================================================= */

  // Aderência (goodness of fit)
  Stats.chi2Goodness = function (observed, expected) {
    var chi2 = 0;
    for (var i = 0; i < observed.length; i++) {
      chi2 += Math.pow(observed[i] - expected[i], 2) / expected[i];
    }
    var df = observed.length - 1;
    return { chi2: chi2, df: df, pValue: 1 - Stats.chi2CDF(chi2, df) };
  };

  // Independência (tabela de contingência: matriz r x c)
  Stats.chi2Independence = function (table) {
    var r = table.length;
    var c = table[0].length;
    var rowSums = table.map(function (row) { return Stats.sum(row); });
    var colSums = [];
    for (var j = 0; j < c; j++) {
      var s = 0;
      for (var i = 0; i < r; i++) s += table[i][j];
      colSums.push(s);
    }
    var total = Stats.sum(rowSums);
    var chi2 = 0;
    var expected = [];
    for (var i2 = 0; i2 < r; i2++) {
      expected.push([]);
      for (var j2 = 0; j2 < c; j2++) {
        var e = (rowSums[i2] * colSums[j2]) / total;
        expected[i2].push(e);
        chi2 += Math.pow(table[i2][j2] - e, 2) / e;
      }
    }
    var df = (r - 1) * (c - 1);
    return {
      chi2: chi2, df: df, expected: expected,
      pValue: 1 - Stats.chi2CDF(chi2, df), total: total,
    };
  };

  /* ============================================================= *
   *  Testes não paramétricos                                      *
   * ============================================================= */

  // Mann-Whitney U (aproximação normal com correção de empates)
  Stats.mannWhitney = function (a, b) {
    var na = a.length, nb = b.length;
    var combined = a.map(function (v) { return { v: v, g: 0 }; })
      .concat(b.map(function (v) { return { v: v, g: 1 }; }));
    var ranks = Stats.ranks(combined.map(function (o) { return o.v; }));
    var Ra = 0;
    combined.forEach(function (o, i) { if (o.g === 0) Ra += ranks[i]; });
    var Ua = Ra - (na * (na + 1)) / 2;
    var Ub = na * nb - Ua;
    var U = Math.min(Ua, Ub);
    var mu = (na * nb) / 2;
    // correção de empates
    var n = na + nb;
    var freq = {};
    combined.forEach(function (o) { freq[o.v] = (freq[o.v] || 0) + 1; });
    var tieSum = 0;
    Object.keys(freq).forEach(function (k) {
      var t = freq[k];
      tieSum += t * t * t - t;
    });
    var sigma = Math.sqrt(
      ((na * nb) / 12) * (n + 1 - tieSum / (n * (n - 1)))
    );
    var z = (U - mu + 0.5 * Math.sign(mu - U)) / sigma; // correção de continuidade
    var p = 2 * (1 - Stats.normalCDF(Math.abs(z)));
    return { U: U, Ua: Ua, Ub: Ub, z: z, pValue: Math.min(1, p), na: na, nb: nb };
  };

  // Wilcoxon signed-rank (pareado, aproximação normal)
  Stats.wilcoxon = function (a, b) {
    var diffs = [];
    for (var i = 0; i < a.length; i++) {
      var d = a[i] - b[i];
      if (d !== 0) diffs.push(d);
    }
    var n = diffs.length;
    var absd = diffs.map(Math.abs);
    var ranks = Stats.ranks(absd);
    var Wpos = 0, Wneg = 0;
    diffs.forEach(function (d, i) {
      if (d > 0) Wpos += ranks[i];
      else Wneg += ranks[i];
    });
    var W = Math.min(Wpos, Wneg);
    var mu = (n * (n + 1)) / 4;
    var sigma = Math.sqrt((n * (n + 1) * (2 * n + 1)) / 24);
    var z = (W - mu + 0.5 * Math.sign(mu - W)) / sigma;
    var p = 2 * (1 - Stats.normalCDF(Math.abs(z)));
    return { W: W, Wpos: Wpos, Wneg: Wneg, z: z, n: n, pValue: Math.min(1, p) };
  };

  // Kruskal-Wallis H
  Stats.kruskalWallis = function (groups) {
    var all = [];
    groups.forEach(function (g, gi) {
      g.forEach(function (v) { all.push({ v: v, g: gi }); });
    });
    var ranks = Stats.ranks(all.map(function (o) { return o.v; }));
    var N = all.length;
    var k = groups.length;
    var rankSums = new Array(k).fill(0);
    var ns = new Array(k).fill(0);
    all.forEach(function (o, i) {
      rankSums[o.g] += ranks[i];
      ns[o.g] += 1;
    });
    var H = 0;
    for (var j = 0; j < k; j++) {
      H += (rankSums[j] * rankSums[j]) / ns[j];
    }
    H = (12 / (N * (N + 1))) * H - 3 * (N + 1);
    // correção de empates
    var freq = {};
    all.forEach(function (o) { freq[o.v] = (freq[o.v] || 0) + 1; });
    var tieSum = 0;
    Object.keys(freq).forEach(function (key) {
      var t = freq[key];
      tieSum += t * t * t - t;
    });
    var C = 1 - tieSum / (N * N * N - N);
    if (C > 0) H = H / C;
    var df = k - 1;
    return { H: H, df: df, pValue: 1 - Stats.chi2CDF(H, df), N: N, k: k };
  };

  // Friedman (medidas repetidas). data: matriz [blocos][tratamentos]
  Stats.friedman = function (data) {
    var n = data.length; // blocos
    var k = data[0].length; // tratamentos
    var rankSums = new Array(k).fill(0);
    data.forEach(function (row) {
      var ranks = Stats.ranks(row);
      for (var j = 0; j < k; j++) rankSums[j] += ranks[j];
    });
    var sum = 0;
    rankSums.forEach(function (R) { sum += R * R; });
    var Q = (12 / (n * k * (k + 1))) * sum - 3 * n * (k + 1);
    var df = k - 1;
    return { Q: Q, df: df, pValue: 1 - Stats.chi2CDF(Q, df), n: n, k: k };
  };

  Stats.spearmanTest = function (x, y) {
    var n = x.length;
    var rho = Stats.spearman(x, y);
    var df = n - 2;
    var t = (rho * Math.sqrt(df)) / Math.sqrt(1 - rho * rho);
    var p = Stats.tTestPValue(t, df);
    return { rho: rho, t: t, df: df, pValue: p, n: n };
  };

  /* ============================================================= *
   *  Multivariada                                                 *
   * ============================================================= */

  // Matriz de correlação (colunas = variáveis)
  Stats.correlationMatrix = function (cols) {
    var p = cols.length;
    var M = [];
    for (var i = 0; i < p; i++) {
      M.push([]);
      for (var j = 0; j < p; j++) {
        M[i].push(i === j ? 1 : Stats.pearson(cols[i], cols[j]));
      }
    }
    return M;
  };

  // Regressão linear múltipla por equações normais (X'X)^-1 X'y, com intercepto.
  // X: matriz [n][p] (sem coluna de 1s). y: vetor [n].
  Stats.multipleRegression = function (X, y) {
    var n = X.length;
    var p = X[0].length;
    // adiciona intercepto
    var Xa = X.map(function (row) { return [1].concat(row); });
    var cols = p + 1;
    // X'X
    var XtX = zeros(cols, cols);
    var Xty = new Array(cols).fill(0);
    for (var i = 0; i < n; i++) {
      for (var a = 0; a < cols; a++) {
        Xty[a] += Xa[i][a] * y[i];
        for (var b = 0; b < cols; b++) {
          XtX[a][b] += Xa[i][a] * Xa[i][b];
        }
      }
    }
    var inv = invert(XtX);
    if (!inv) return null;
    var beta = matVec(inv, Xty);
    // predições e R²
    var yhat = Xa.map(function (row) {
      return row.reduce(function (s, v, idx) { return s + v * beta[idx]; }, 0);
    });
    var my = Stats.mean(y);
    var ssTot = 0, ssRes = 0;
    for (var k = 0; k < n; k++) {
      ssTot += (y[k] - my) * (y[k] - my);
      ssRes += (y[k] - yhat[k]) * (y[k] - yhat[k]);
    }
    var r2 = 1 - ssRes / ssTot;
    var dfRes = n - cols;
    var r2adj = 1 - ((1 - r2) * (n - 1)) / dfRes;
    var mse = ssRes / dfRes;
    // erros padrão e p-valores
    var se = [], tStat = [], pVal = [];
    for (var c = 0; c < cols; c++) {
      var seC = Math.sqrt(mse * inv[c][c]);
      se.push(seC);
      var tt = beta[c] / seC;
      tStat.push(tt);
      pVal.push(Stats.tTestPValue(tt, dfRes));
    }
    // F global
    var dfModel = cols - 1;
    var F = (r2 / dfModel) / ((1 - r2) / dfRes);
    var pF = 1 - Stats.fCDF(F, dfModel, dfRes);
    return {
      beta: beta, se: se, t: tStat, pValue: pVal,
      r2: r2, r2adj: r2adj, df: dfRes, F: F, pF: pF, mse: mse,
    };
  };

  // PCA via Jacobi sobre a matriz de correlação (dados padronizados)
  Stats.pca = function (cols) {
    var p = cols.length;
    var R = Stats.correlationMatrix(cols);
    var eig = jacobiEigen(R);
    // ordena autovalores decrescente
    var order = eig.values
      .map(function (v, i) { return { v: v, i: i }; })
      .sort(function (a, b) { return b.v - a.v; });
    var values = order.map(function (o) { return o.v; });
    var vectors = order.map(function (o) {
      return eig.vectors.map(function (row) { return row[o.i]; });
    });
    var totalVar = values.reduce(function (s, v) { return s + v; }, 0);
    var explained = values.map(function (v) { return v / totalVar; });
    return { values: values, vectors: vectors, explained: explained };
  };

  /* ---- utilitários de matriz ---- */
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
  // inversão por Gauss-Jordan
  function invert(M) {
    var n = M.length;
    var A = M.map(function (row, i) {
      return row.slice().concat(
        Array.from({ length: n }, function (_, j) { return i === j ? 1 : 0; })
      );
    });
    for (var col = 0; col < n; col++) {
      // pivô
      var piv = col;
      for (var r = col + 1; r < n; r++) {
        if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r;
      }
      if (Math.abs(A[piv][col]) < 1e-12) return null; // singular
      var tmp = A[col]; A[col] = A[piv]; A[piv] = tmp;
      var pivVal = A[col][col];
      for (var c = 0; c < 2 * n; c++) A[col][c] /= pivVal;
      for (var r2 = 0; r2 < n; r2++) {
        if (r2 === col) continue;
        var factor = A[r2][col];
        for (var c2 = 0; c2 < 2 * n; c2++) A[r2][c2] -= factor * A[col][c2];
      }
    }
    return A.map(function (row) { return row.slice(n); });
  }
  Stats.invertMatrix = invert;

  // autovalores/autovetores de matriz simétrica (Jacobi)
  function jacobiEigen(matrix) {
    var n = matrix.length;
    var A = matrix.map(function (row) { return row.slice(); });
    var V = zeros(n, n);
    for (var i = 0; i < n; i++) V[i][i] = 1;
    for (var iter = 0; iter < 100; iter++) {
      // maior off-diagonal
      var p = 0, q = 1, max = 0;
      for (var a = 0; a < n; a++) {
        for (var b = a + 1; b < n; b++) {
          if (Math.abs(A[a][b]) > max) { max = Math.abs(A[a][b]); p = a; q = b; }
        }
      }
      if (max < 1e-12) break;
      var app = A[p][p], aqq = A[q][q], apq = A[p][q];
      var phi = 0.5 * Math.atan2(2 * apq, aqq - app);
      var c = Math.cos(phi), s = Math.sin(phi);
      for (var k = 0; k < n; k++) {
        var akp = A[k][p], akq = A[k][q];
        A[k][p] = c * akp - s * akq;
        A[k][q] = s * akp + c * akq;
      }
      for (var k2 = 0; k2 < n; k2++) {
        var apk = A[p][k2], aqk = A[q][k2];
        A[p][k2] = c * apk - s * aqk;
        A[q][k2] = s * apk + c * aqk;
      }
      for (var k3 = 0; k3 < n; k3++) {
        var vkp = V[k3][p], vkq = V[k3][q];
        V[k3][p] = c * vkp - s * vkq;
        V[k3][q] = s * vkp + c * vkq;
      }
    }
    var values = [];
    for (var d = 0; d < n; d++) values.push(A[d][d]);
    return { values: values, vectors: V };
  }
  Stats.jacobiEigen = jacobiEigen;

  /* ============================================================= *
   *  Geração de números aleatórios                                *
   * ============================================================= */

  Stats.randomNormal = function (n, mean, sd) {
    mean = mean || 0; sd = sd == null ? 1 : sd;
    var out = [];
    for (var i = 0; i < n; i++) {
      // Box-Muller
      var u1 = Math.random(), u2 = Math.random();
      var z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      out.push(mean + sd * z);
    }
    return out;
  };
  Stats.randomUniform = function (n, min, max) {
    var out = [];
    for (var i = 0; i < n; i++) out.push(min + Math.random() * (max - min));
    return out;
  };
  Stats.randomPoisson = function (n, lambda) {
    var out = [];
    for (var i = 0; i < n; i++) {
      var L = Math.exp(-lambda), k = 0, p = 1;
      do { k++; p *= Math.random(); } while (p > L);
      out.push(k - 1);
    }
    return out;
  };

  // export
  if (typeof module !== "undefined" && module.exports) {
    module.exports = Stats;
  }
  global.Stats = Stats;
})(typeof window !== "undefined" ? window : globalThis);
