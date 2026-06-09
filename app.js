const $ = (id) => document.getElementById(id);

const fmt = (value, digits = 4) => {
  if (!Number.isFinite(value)) return "NA";
  const abs = Math.abs(value);
  if (abs !== 0 && abs < 0.0001) return value.toExponential(3);
  return Number(value.toFixed(digits)).toLocaleString("pt-BR", { maximumFractionDigits: digits });
};

const pct = (value, digits = 2) => `${fmt(value * 100, digits)}%`;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[char]));
}

function readNumber(id, name, min = -Infinity) {
  const value = Number($(id).value.replace?.(",", ".") ?? $(id).value);
  if (!Number.isFinite(value) || value < min) throw new Error(`${name} precisa ser um número válido${Number.isFinite(min) ? ` maior ou igual a ${min}` : ""}.`);
  return value;
}

function lnGamma(z) {
  const p = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7
  ];
  if (z < 0.5) return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - lnGamma(1 - z);
  z -= 1;
  let x = p[0];
  for (let i = 1; i < p.length; i++) x += p[i] / (z + i);
  const t = z + 7.5;
  return 0.9189385332046727 + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

function betacf(a, b, x) {
  const maxIter = 200;
  const eps = 3e-12;
  const fpmin = 1e-30;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - qab * x / qap;
  if (Math.abs(d) < fpmin) d = fpmin;
  d = 1 / d;
  let h = d;

  for (let m = 1; m <= maxIter; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < fpmin) d = fpmin;
    c = 1 + aa / c;
    if (Math.abs(c) < fpmin) c = fpmin;
    d = 1 / d;
    h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < fpmin) d = fpmin;
    c = 1 + aa / c;
    if (Math.abs(c) < fpmin) c = fpmin;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < eps) break;
  }
  return h;
}

function ibeta(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  if (x < (a + 1) / (a + b + 2)) return bt * betacf(a, b, x) / a;
  return 1 - bt * betacf(b, a, 1 - x) / b;
}

function gammp(a, x) {
  if (x <= 0) return 0;
  if (x < a + 1) {
    let ap = a;
    let sum = 1 / a;
    let del = sum;
    for (let n = 1; n <= 200; n++) {
      ap += 1;
      del *= x / ap;
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * 3e-12) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - lnGamma(a));
  }
  return 1 - gammq(a, x);
}

function gammq(a, x) {
  if (x <= 0) return 1;
  let b = x + 1 - a;
  let c = 1 / 1e-30;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i <= 200; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = b + an / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 3e-12) break;
  }
  return Math.exp(-x + a * Math.log(x) - lnGamma(a)) * h;
}

function normalCdf(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp(-x * x / 2);
  const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x > 0 ? 1 - p : p;
}

function invNormal(p) {
  if (p <= 0 || p >= 1) throw new Error("Probabilidade inválida para quantil normal.");
  const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924];
  const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857];
  const c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878];
  const d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742];
  const plow = 0.02425;
  const phigh = 1 - plow;
  let q;
  if (p < plow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > phigh) {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  q = p - 0.5;
  const r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

function tCdf(t, df) {
  const x = df / (df + t * t);
  const ib = ibeta(x, df / 2, 0.5);
  return t >= 0 ? 1 - ib / 2 : ib / 2;
}

function tPValue(t, df, tail) {
  const c = tCdf(t, df);
  if (tail === "greater") return 1 - c;
  if (tail === "less") return c;
  return Math.min(1, 2 * Math.min(c, 1 - c));
}

function invTCdf(p, df) {
  let low = -100;
  let high = 100;
  for (let i = 0; i < 120; i++) {
    const mid = (low + high) / 2;
    if (tCdf(mid, df) < p) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

function chiSquarePValue(x, df) {
  return gammq(df / 2, x / 2);
}

function fPValue(f, df1, df2) {
  if (!Number.isFinite(f) || f < 0) throw new Error("Estatística F inválida.");
  const x = (df1 * f) / (df1 * f + df2);
  return 1 - ibeta(x, df1 / 2, df2 / 2);
}

function parseVector(text) {
  return text.trim().split(/[;,\s]+/).filter(Boolean).map((value) => Number(value.replace?.(",", ".") ?? value));
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sampleSd(values) {
  const avg = mean(values);
  const ss = values.reduce((sum, value) => sum + (value - avg) ** 2, 0);
  return Math.sqrt(ss / (values.length - 1));
}

function validateVector(values, label, minN = 2) {
  if (values.length < minN || values.some((value) => !Number.isFinite(value))) {
    throw new Error(`${label} precisa conter pelo menos ${minN} números válidos.`);
  }
  if (sampleSd(values) === 0) throw new Error(`${label} tem variância zero; o teste não pode ser calculado.`);
}

function sortedValues(values) {
  return [...values].sort((a, b) => a - b);
}

function quantile(values, q) {
  const sorted = sortedValues(values);
  const pos = (sorted.length - 1) * q;
  const lower = Math.floor(pos);
  const upper = Math.ceil(pos);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (pos - lower);
}

function median(values) {
  return quantile(values, 0.5);
}

function renderResult(targetId, metrics, markdown, assumptions = [], extraHtml = "") {
  const target = $(targetId);
  const metricHtml = metrics.map(([label, value]) => `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`).join("");
  const assumptionHtml = assumptions.length
    ? `<ul class="assumptions">${assumptions.map((item) => `<li>${item}</li>`).join("")}</ul>`
    : "";
  target.innerHTML = `
    <div class="summary">${metricHtml}</div>
    ${assumptionHtml}
    ${extraHtml}
    <div class="markdown-box">
      <label>Saída Markdown
        <textarea readonly>${markdown}</textarea>
      </label>
      <button class="copy" type="button">Copiar Markdown</button>
    </div>`;
  target.classList.add("is-visible");
  target.querySelector(".copy").addEventListener("click", async () => {
    const text = target.querySelector("textarea").value;
    await navigator.clipboard.writeText(text);
    target.querySelector(".copy").textContent = "Copiado";
    setTimeout(() => target.querySelector(".copy").textContent = "Copiar Markdown", 1400);
  });
}

function renderError(targetId, error) {
  const target = $(targetId);
  target.innerHTML = `<div class="error">${error.message}</div>`;
  target.classList.add("is-visible");
}

function sampleSize() {
  const type = $("sample-type").value;
  const confidence = readNumber("sample-confidence", "Nível de confiança", 50, 99.99) / 100;
  if (confidence >= 1) throw new Error("O nível de confiança precisa ser menor que 100%.");
  const z = invNormal(1 - (1 - confidence) / 2);
  const loss = readNumber("sample-loss", "Acréscimo para perdas", 0) / 100;
  if (loss >= 0.9) throw new Error("O acréscimo para perdas precisa ser menor que 90%.");
  let n;
  let detail;

  if (type === "mean") {
    const sd = readNumber("sample-sd", "Desvio-padrão", 0.000001);
    const margin = readNumber("sample-margin-mean", "Margem de erro", 0.000001);
    n = Math.ceil((z * sd / margin) ** 2);
    detail = `estimativa de média com DP=${fmt(sd)} e erro máximo=${fmt(margin)}`;
  } else if (type === "proportion") {
    const p = readNumber("sample-p1", "Proporção esperada", 0.000001) / 100;
    if (p <= 0 || p >= 1) throw new Error("A proporção esperada precisa ficar entre 0% e 100%.");
    const margin = readNumber("sample-margin-prop", "Margem de erro percentual", 0.000001) / 100;
    if (margin >= 1) throw new Error("A margem de erro percentual precisa ser menor que 100%.");
    n = Math.ceil((z ** 2 * p * (1 - p)) / margin ** 2);
    detail = `estimativa de proporção com p=${pct(p)} e erro máximo=${pct(margin)}`;
  } else if (type === "twoMeans") {
    const sd = readNumber("sample-sd", "Desvio-padrão", 0.000001);
    const delta = readNumber("sample-delta-mean", "Diferença mínima relevante", 0.000001);
    const power = readNumber("sample-power", "Poder estatístico", 50) / 100;
    const zPower = invNormal(power);
    n = Math.ceil(2 * ((z + zPower) * sd / delta) ** 2);
    detail = `comparação de duas médias independentes com DP comum=${fmt(sd)}, diferença mínima=${fmt(delta)} e poder=${pct(power)}`;
  } else {
    const p1 = readNumber("sample-p1", "Proporção grupo 1", 0.000001) / 100;
    const p2 = readNumber("sample-p2", "Proporção grupo 2", 0.000001) / 100;
    if (p1 <= 0 || p1 >= 1 || p2 <= 0 || p2 >= 1) throw new Error("As proporções precisam ficar entre 0% e 100%.");
    if (p1 === p2) throw new Error("As proporções dos grupos precisam ser diferentes para calcular comparação entre proporções.");
    const power = readNumber("sample-power", "Poder estatístico", 50) / 100;
    const pbar = (p1 + p2) / 2;
    const zPower = invNormal(power);
    n = Math.ceil(((z * Math.sqrt(2 * pbar * (1 - pbar)) + zPower * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2) / ((p1 - p2) ** 2));
    detail = `comparação de duas proporções independentes com p1=${pct(p1)}, p2=${pct(p2)} e poder=${pct(power)}`;
  }

  const adjusted = Math.ceil(n / (1 - loss));
  const perGroup = type.startsWith("two") ? " por grupo" : "";
  const md = `## Tamanho amostral\n\n- Cenário: ${detail}.\n- Confiança: ${pct(confidence)}.\n- n mínimo: **${n}${perGroup}**.\n- n ajustado para perdas (${pct(loss)}): **${adjusted}${perGroup}**.\n\n> Interpretação: recomenda-se planejar pelo menos ${adjusted}${perGroup} para preservar o objetivo analítico informado.`;
  renderResult("sample-result", [["n mínimo", `${n}${perGroup}`], ["com perdas", `${adjusted}${perGroup}`], ["z crítico", fmt(z, 3)]], md, [
    "As fórmulas assumem amostragem independente e parâmetros prévios plausíveis.",
    "Para desenhos complexos, clusters, não inferioridade ou medidas repetidas, aplique efeito de desenho ou análise específica."
  ]);
}

function runTTest() {
  const type = $("ttest-type").value;
  const tail = $("ttest-tail").value;
  const inputMode = $("ttest-input-mode")?.value ?? "summary";
  let t, df, effect, estimate, ciLow, ciHigh, label;
  let inputDetail = "estatísticas resumidas";
  const alerts = [
    "Pressupõe independência das observações e variável aproximadamente contínua.",
    "No teste independente foi usado Welch para graus de liberdade, mais robusto a variâncias desiguais."
  ];

  if (type === "independent") {
    let m1, sd1, n1, m2, sd2, n2;
    if (inputMode === "raw") {
      const g1 = parseVector($("ttest-raw-1").value);
      const g2 = parseVector($("ttest-raw-2").value);
      validateVector(g1, "Dados do grupo 1");
      validateVector(g2, "Dados do grupo 2");
      m1 = mean(g1); sd1 = sampleSd(g1); n1 = g1.length;
      m2 = mean(g2); sd2 = sampleSd(g2); n2 = g2.length;
      inputDetail = `dados brutos (${n1} no grupo 1; ${n2} no grupo 2)`;
    } else {
      m1 = readNumber("ttest-g1-mean", "Média grupo 1");
      sd1 = readNumber("ttest-g1-sd", "DP grupo 1", 0.000001);
      n1 = readNumber("ttest-g1-n", "n grupo 1", 2);
      m2 = readNumber("ttest-g2-mean", "Média grupo 2");
      sd2 = readNumber("ttest-g2-sd", "DP grupo 2", 0.000001);
      n2 = readNumber("ttest-g2-n", "n grupo 2", 2);
    }
    const se = Math.sqrt(sd1 ** 2 / n1 + sd2 ** 2 / n2);
    estimate = m1 - m2;
    t = estimate / se;
    df = (sd1 ** 2 / n1 + sd2 ** 2 / n2) ** 2 / ((sd1 ** 2 / n1) ** 2 / (n1 - 1) + (sd2 ** 2 / n2) ** 2 / (n2 - 1));
    const pooled = Math.sqrt(((n1 - 1) * sd1 ** 2 + (n2 - 1) * sd2 ** 2) / (n1 + n2 - 2));
    effect = estimate / pooled;
    const tcrit = invTCdf(0.975, df);
    ciLow = estimate - tcrit * se;
    ciHigh = estimate + tcrit * se;
    label = "diferença entre médias independentes";
    if (Math.max(sd1, sd2) / Math.min(sd1, sd2) > 2) alerts.push("Os desvios-padrão diferem bastante; Welch ajuda, mas investigue distribuição e outliers.");
    if (Math.min(n1, n2) < 15) alerts.push("Há grupo com n pequeno; verifique gráficos, assimetria e pontos extremos antes de interpretar.");
  } else {
    let observedMean, sd, n;
    if (inputMode === "raw") {
      const values = parseVector($("ttest-raw-1").value);
      validateVector(values, type === "one" ? "Dados da amostra" : "Diferenças pareadas");
      observedMean = mean(values);
      sd = sampleSd(values);
      n = values.length;
      inputDetail = type === "one" ? `dados brutos (${n} observações)` : `diferenças pareadas brutas (${n} pares)`;
    } else {
      observedMean = readNumber("ttest-mean1", "Média observada");
      sd = readNumber("ttest-sd1", "Desvio-padrão", 0.000001);
      n = readNumber("ttest-n1", "n", 2);
    }
    const mu = type === "one" ? readNumber("ttest-mu", "Média hipotética") : 0;
    const se = sd / Math.sqrt(n);
    estimate = observedMean - mu;
    t = estimate / se;
    df = n - 1;
    effect = estimate / sd;
    const tcrit = invTCdf(0.975, df);
    ciLow = estimate - tcrit * se;
    ciHigh = estimate + tcrit * se;
    label = type === "one" ? "diferença em relação à média hipotética" : "diferença média pareada";
    if (n < 15) alerts.push("A amostra é pequena; verifique assimetria e outliers, pois eles podem dominar o teste.");
  }

  const p = tPValue(t, df, tail);
  const significance = p < 0.05 ? "estatisticamente significativo ao nível de 5%" : "não estatisticamente significativo ao nível de 5%";
  const magnitude = Math.abs(effect) < 0.2 ? "muito pequeno" : Math.abs(effect) < 0.5 ? "pequeno" : Math.abs(effect) < 0.8 ? "moderado" : "grande";
  const md = `## Teste t\n\n- Entrada: **${inputDetail}**.\n- Análise: ${label}.\n- Estimativa: **${fmt(estimate)}**.\n- IC95%: **[${fmt(ciLow)}, ${fmt(ciHigh)}]**.\n- Estatística: **t(${fmt(df, 2)}) = ${fmt(t)}**.\n- p-valor: **${fmt(p, 5)}** (${significance}).\n- Tamanho de efeito (Cohen d): **${fmt(effect)}** (${magnitude}).\n\n> Relato sugerido: observou-se ${label} de ${fmt(estimate)}, t(${fmt(df, 2)}) = ${fmt(t)}, p = ${fmt(p, 5)}, d = ${fmt(effect)}.`;
  renderResult("ttest-result", [["t", fmt(t)], ["gl", fmt(df, 2)], ["p", fmt(p, 5)]], md, [
    ...alerts,
    "Significância estatística não substitui avaliação de relevância prática, desenho do estudo e qualidade dos dados."
  ]);
}

function parseMatrix(text) {
  return text.trim().split(/\n+/).map((row) => row.trim().split(/[;,\t ]+/).filter(Boolean).map(Number));
}

function matrixToMarkdown(matrix, digits = 2) {
  const cols = matrix[0]?.length ?? 0;
  const header = ["", ...Array.from({ length: cols }, (_, i) => `C${i + 1}`)];
  const align = header.map(() => "---");
  const rows = matrix.map((row, i) => [`L${i + 1}`, ...row.map((v) => fmt(v, digits))]);
  return [header, align, ...rows].map((row) => `| ${row.join(" | ")} |`).join("\n");
}

function matrixToHtml(title, matrix, digits = 2) {
  const cols = matrix[0]?.length ?? 0;
  const head = Array.from({ length: cols }, (_, i) => `<th>C${i + 1}</th>`).join("");
  const rows = matrix.map((row, i) => `<tr><th class="row-head">L${i + 1}</th>${row.map((v) => `<td>${fmt(v, digits)}</td>`).join("")}</tr>`).join("");
  return `<section><h3>${title}</h3><table class="matrix-table"><thead><tr><th></th>${head}</tr></thead><tbody>${rows}</tbody></table></section>`;
}

function chiMagnitude(v) {
  if (v < 0.1) return "muito pequena";
  if (v < 0.3) return "pequena";
  if (v < 0.5) return "moderada";
  return "alta";
}

function runChi() {
  const type = $("chi-type").value;
  const yates = $("chi-yates").value === "yes";
  const observed = parseMatrix($("chi-observed").value);
  if (!observed.length || observed.some((row) => row.some((v) => !Number.isFinite(v) || v < 0))) throw new Error("Informe frequências observadas válidas.");
  if (observed.some((row) => row.length !== observed[0].length)) throw new Error("Todas as linhas precisam ter o mesmo número de colunas.");
  const rowTotalsObserved = observed.map((row) => row.reduce((sum, value) => sum + value, 0));
  if (rowTotalsObserved.some((value) => value === 0)) throw new Error("Nenhuma linha pode ter total zero.");
  let chi = 0, df, expected, n, cramer = null, residuals = [], contributions = [], lowExpected = 0;

  if (type === "goodness") {
    const obs = observed.flat();
    const expectedFlat = parseMatrix($("chi-expected").value).flat();
    if (obs.length !== expectedFlat.length || expectedFlat.some((v) => !Number.isFinite(v) || v <= 0)) throw new Error("Os esperados devem ser positivos e ter o mesmo tamanho dos observados.");
    n = obs.reduce((a, b) => a + b, 0);
    const expectedTotal = expectedFlat.reduce((a, b) => a + b, 0);
    if (Math.abs(expectedTotal - n) > 1e-8) throw new Error("Em aderência, a soma das frequências esperadas deve ser igual à soma observada.");
    const cols = observed[0].length;
    expected = observed.map((row, i) => row.map((_, j) => expectedFlat[i * cols + j]));
    contributions = observed.map((row, i) => row.map((o, j) => (o - expected[i][j]) ** 2 / expected[i][j]));
    residuals = observed.map((row, i) => row.map((o, j) => (o - expected[i][j]) / Math.sqrt(expected[i][j])));
    chi = contributions.flat().reduce((sum, value) => sum + value, 0);
    df = obs.length - 1;
  } else {
    const cols = observed[0].length;
    if (observed.some((row) => row.length !== cols) || observed.length < 2 || cols < 2) throw new Error("A tabela de independência precisa ter pelo menos 2 linhas e 2 colunas, com mesmo número de colunas por linha.");
    const rows = observed.length;
    const rowTotals = observed.map((row) => row.reduce((a, b) => a + b, 0));
    const colTotals = Array.from({ length: cols }, (_, j) => observed.reduce((sum, row) => sum + row[j], 0));
    if (colTotals.some((value) => value === 0)) throw new Error("Nenhuma coluna pode ter total zero.");
    n = rowTotals.reduce((a, b) => a + b, 0);
    if (n === 0) throw new Error("O total da tabela precisa ser maior que zero.");
    expected = observed.map((row, i) => row.map((_, j) => rowTotals[i] * colTotals[j] / n));
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const diff = Math.abs(observed[i][j] - expected[i][j]);
        const adjustedDiff = yates && rows === 2 && cols === 2 ? Math.max(0, diff - 0.5) : diff;
        const contribution = adjustedDiff ** 2 / expected[i][j];
        chi += contribution;
        contributions[i] ??= [];
        residuals[i] ??= [];
        contributions[i][j] = contribution;
        residuals[i][j] = (observed[i][j] - expected[i][j]) / Math.sqrt(expected[i][j]);
      }
    }
    df = (rows - 1) * (cols - 1);
    cramer = Math.sqrt(chi / (n * Math.min(rows - 1, cols - 1)));
  }

  lowExpected = expected.flat().filter((value) => value < 5).length;
  const lowExpectedPct = lowExpected / expected.flat().length;
  const p = chiSquarePValue(chi, df);
  const warning = lowExpected ? `\n- Atenção: **${lowExpected}** célula(s) esperada(s) abaixo de 5 (${pct(lowExpectedPct)} das células).` : "";
  const md = `## Qui-quadrado\n\n- Tipo: ${type === "goodness" ? "aderência" : "independência"}.\n- Dimensão: **${observed.length}x${observed[0].length}**.\n- n total: **${fmt(n, 0)}**.\n- Estatística: **χ²(${df}) = ${fmt(chi)}**.\n- p-valor: **${fmt(p, 5)}**.${cramer !== null ? `\n- V de Cramér: **${fmt(cramer)}** (${chiMagnitude(cramer)}).` : ""}${warning}\n\n### Frequências esperadas\n\n${matrixToMarkdown(expected, 2)}\n\n### Resíduos padronizados\n\n${matrixToMarkdown(residuals, 2)}\n\n### Contribuição para χ²\n\n${matrixToMarkdown(contributions, 2)}\n\n> Relato sugerido: o teste qui-quadrado indicou χ²(${df}) = ${fmt(chi)}, p = ${fmt(p, 5)}${cramer !== null ? `, V = ${fmt(cramer)} (${chiMagnitude(cramer)})` : ""}.`;
  const extra = `<div class="diagnostics">
    <div class="diagnostic-grid">
      ${matrixToHtml("Esperados", expected, 2)}
      ${matrixToHtml("Resíduos", residuals, 2)}
      ${matrixToHtml("Contribuição", contributions, 2)}
    </div>
  </div>`;
  renderResult("chi-result", [["χ²", fmt(chi)], ["gl", fmt(df, 0)], ["p", fmt(p, 5)]], md, [
    "Frequências esperadas muito baixas podem invalidar a aproximação qui-quadrado.",
    "Para tabelas 2x2 com células pequenas, considere teste exato de Fisher em validação posterior.",
    "Resíduos e pós-testes devem ser interpretados com ajuste quando houver muitas comparações."
  ], extra);
}

function rank(values) {
  const sorted = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const ranks = Array(values.length);
  for (let i = 0; i < sorted.length;) {
    let j = i + 1;
    while (j < sorted.length && sorted[j].v === sorted[i].v) j++;
    const r = (i + j + 1) / 2;
    for (let k = i; k < j; k++) ranks[sorted[k].i] = r;
    i = j;
  }
  return ranks;
}

function rankWithTies(values) {
  const sorted = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const ranks = Array(values.length);
  const ties = [];
  for (let i = 0; i < sorted.length;) {
    let j = i + 1;
    while (j < sorted.length && sorted[j].v === sorted[i].v) j++;
    const size = j - i;
    const r = (i + j + 1) / 2;
    for (let k = i; k < j; k++) ranks[sorted[k].i] = r;
    if (size > 1) ties.push(size);
    i = j;
  }
  return { ranks, ties };
}

function correlation(x, y) {
  const n = x.length;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, sx = 0, sy = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    num += dx * dy;
    sx += dx * dx;
    sy += dy * dy;
  }
  return num / Math.sqrt(sx * sy);
}

function hasExtremePoint(values) {
  if (values.length < 5) return false;
  const avg = mean(values);
  const sd = sampleSd(values);
  if (sd === 0) return false;
  return values.some((value) => Math.abs((value - avg) / sd) > 2.5);
}

function scatterPlotSvg(originalX, originalY, options = {}) {
  const width = 640;
  const height = 320;
  const pad = 42;
  const minX = Math.min(...originalX);
  const maxX = Math.max(...originalX);
  const minY = Math.min(...originalY);
  const maxY = Math.max(...originalY);
  const xSpan = maxX - minX || 1;
  const ySpan = maxY - minY || 1;
  const sx = (value) => pad + ((value - minX) / xSpan) * (width - pad * 2);
  const sy = (value) => height - pad - ((value - minY) / ySpan) * (height - pad * 2);
  const mx = mean(originalX);
  const my = mean(originalY);
  const slopeDen = originalX.reduce((sum, value) => sum + (value - mx) ** 2, 0);
  const slope = options.slope ?? (slopeDen === 0 ? 0 : originalX.reduce((sum, value, i) => sum + (value - mx) * (originalY[i] - my), 0) / slopeDen);
  const intercept = options.intercept ?? (my - slope * mx);
  const yAtMin = intercept + slope * minX;
  const yAtMax = intercept + slope * maxX;
  const points = originalX.map((x, i) => `<circle class="point" cx="${sx(x)}" cy="${sy(originalY[i])}" r="4"><title>x=${fmt(x)}, y=${fmt(originalY[i])}</title></circle>`).join("");
  return `<div class="chart-card"><h3>${escapeHtml(options.title ?? "Dispersão dos dados")}</h3><svg class="scatter" viewBox="0 0 ${width} ${height}" role="img" aria-label="Gráfico de dispersão dos pares informados">
    <line class="axis" x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}"></line>
    <line class="axis" x1="${pad}" y1="${pad}" x2="${pad}" y2="${height - pad}"></line>
    <line class="grid-line" x1="${pad}" y1="${pad}" x2="${width - pad}" y2="${pad}"></line>
    <line class="grid-line" x1="${width - pad}" y1="${pad}" x2="${width - pad}" y2="${height - pad}"></line>
    <line class="trend" x1="${sx(minX)}" y1="${sy(yAtMin)}" x2="${sx(maxX)}" y2="${sy(yAtMax)}"></line>
    ${points}
    <text x="${pad}" y="${height - 12}">${escapeHtml(options.xName ?? "x")}: ${fmt(minX)} a ${fmt(maxX)}</text>
    <text x="${pad}" y="22">${escapeHtml(options.yName ?? "y")}: ${fmt(minY)} a ${fmt(maxY)}</text>
  </svg></div>`;
}

function runCorrelation() {
  const method = $("cor-method").value;
  const tail = $("cor-tail").value;
  const pairs = parseMatrix($("cor-pairs").value);
  if (pairs.length < 4 || pairs.some((row) => row.length !== 2 || row.some((v) => !Number.isFinite(v)))) throw new Error("Informe pelo menos 4 pares numéricos x,y.");
  const originalX = pairs.map((p) => p[0]);
  const originalY = pairs.map((p) => p[1]);
  validateVector(originalX, "Valores de x", 4);
  validateVector(originalY, "Valores de y", 4);
  let x = [...originalX];
  let y = [...originalY];
  if (method === "spearman") {
    x = rank(x);
    y = rank(y);
  }
  const n = x.length;
  const r = correlation(x, y);
  const t = r * Math.sqrt((n - 2) / (1 - r * r));
  const p = tPValue(t, n - 2, tail);
  const z = Math.atanh(Math.max(-0.999999, Math.min(0.999999, r)));
  const se = 1 / Math.sqrt(n - 3);
  const ciLow = Math.tanh(z - 1.959963984540054 * se);
  const ciHigh = Math.tanh(z + 1.959963984540054 * se);
  const significance = p < 0.05 ? "estatisticamente significativa ao nível de 5%" : "não estatisticamente significativa ao nível de 5%";
  const alerts = [
    "Pearson avalia relação linear; Spearman avalia associação monotônica por postos.",
    "Correlação não implica causalidade e pode ser distorcida por outliers."
  ];
  if (n < 10) alerts.push("A amostra é pequena; o intervalo de confiança tende a ser amplo e instável.");
  if (hasExtremePoint(originalX) || hasExtremePoint(originalY)) alerts.push("Há indício de ponto extremo em x ou y; confira o gráfico antes de interpretar.");
  if (method === "spearman" && (new Set(originalX).size < originalX.length || new Set(originalY).size < originalY.length)) alerts.push("Há empates nos dados; Spearman foi calculado com postos médios.");
  const md = `## Correlação\n\n- Método: **${method === "pearson" ? "Pearson" : "Spearman"}**.\n- n: **${n}**.\n- Coeficiente: **r = ${fmt(r)}**.\n- IC95% de Fisher: **[${fmt(ciLow)}, ${fmt(ciHigh)}]**.\n- Estatística: **t(${n - 2}) = ${fmt(t)}**.\n- p-valor: **${fmt(p, 5)}** (${significance}).\n\n> Relato sugerido: houve correlação ${r >= 0 ? "positiva" : "negativa"} de magnitude ${Math.abs(r) < .3 ? "baixa" : Math.abs(r) < .5 ? "moderada" : "alta"} (${method}, r = ${fmt(r)}, p = ${fmt(p, 5)}).`;
  renderResult("cor-result", [["r", fmt(r)], ["IC95%", `[${fmt(ciLow)}, ${fmt(ciHigh)}]`], ["p", fmt(p, 5)]], md, [
    ...alerts,
    "O IC de Fisher exige n > 3 e é uma aproximação."
  ], scatterPlotSvg(originalX, originalY));
}

function residualTableHtml(rows) {
  const body = rows.map((row, i) => `<tr><th class="row-head">${i + 1}</th><td>${fmt(row.x)}</td><td>${fmt(row.y)}</td><td>${fmt(row.fitted)}</td><td>${fmt(row.residual)}</td></tr>`).join("");
  return `<section class="chart-card"><h3>Resíduos</h3><table class="matrix-table"><thead><tr><th>#</th><th>X</th><th>Y</th><th>Y estimado</th><th>Resíduo</th></tr></thead><tbody>${body}</tbody></table></section>`;
}

function residualTableMarkdown(rows) {
  const table = [
    ["#", "X", "Y", "Y estimado", "Resíduo"],
    ["---", "---", "---", "---", "---"],
    ...rows.map((row, i) => [i + 1, fmt(row.x), fmt(row.y), fmt(row.fitted), fmt(row.residual)])
  ];
  return table.map((row) => `| ${row.join(" | ")} |`).join("\n");
}

function parseGroups(text) {
  return text.trim().split(/\n+/).map((line, index) => {
    const parts = line.split(":");
    const hasName = parts.length > 1;
    const name = hasName ? parts.shift().trim() : `Grupo ${index + 1}`;
    const valuesText = hasName ? parts.join(":") : line;
    const values = parseVector(valuesText);
    validateVector(values, name || `Grupo ${index + 1}`, 2);
    return { name: name || `Grupo ${index + 1}`, values };
  }).filter((group) => group.values.length);
}

function namedTableHtml(title, headers, rows, options = {}) {
  const head = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
  const wrapCols = options.wrapCols ?? [0];
  const body = rows.map((row) => `<tr>${row.map((cell, i) => {
    const className = i === 0 ? "row-head" : wrapCols.includes(i) ? "wrap" : "";
    return i === 0 ? `<th class="${className}">${escapeHtml(cell)}</th>` : `<td class="${className}">${escapeHtml(cell)}</td>`;
  }).join("")}</tr>`).join("");
  const tableClass = `matrix-table ${options.compact ? "compact-table" : ""}`.trim();
  return `<section class="chart-card"><h3>${escapeHtml(title)}</h3><div class="table-scroll"><table class="${tableClass}"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div></section>`;
}

function namedTableMarkdown(headers, rows) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`)
  ].join("\n");
}

function transpose(matrix) {
  return Array.from({ length: matrix[0].length }, (_, j) => matrix.map((row) => row[j]));
}

function rowSums(matrix) {
  return matrix.map((row) => row.reduce((sum, value) => sum + value, 0));
}

function cronbachAlpha(matrix) {
  const k = matrix[0].length;
  if (k < 2) throw new Error("O alfa exige pelo menos 2 itens.");
  const itemVars = transpose(matrix).map((col) => sampleSd(col) ** 2);
  const totalVar = sampleSd(rowSums(matrix)) ** 2;
  if (totalVar === 0) throw new Error("A pontuação total tem variância zero; o alfa não pode ser calculado.");
  return (k / (k - 1)) * (1 - itemVars.reduce((sum, value) => sum + value, 0) / totalVar);
}

function cronbachInterpretation(alpha) {
  if (alpha < 0.5) return "muito baixa";
  if (alpha < 0.6) return "baixa";
  if (alpha < 0.7) return "questionável";
  if (alpha < 0.8) return "aceitável";
  if (alpha < 0.9) return "boa";
  return "muito alta";
}

function runCronbach() {
  const matrix = parseMatrix($("cronbach-data").value);
  if (matrix.length < 3) throw new Error("Informe pelo menos 3 respondentes.");
  if (matrix.some((row) => row.length !== matrix[0].length)) throw new Error("Todas as linhas precisam ter o mesmo número de itens.");
  if (matrix.some((row) => row.some((value) => !Number.isFinite(value)))) throw new Error("A matriz deve conter apenas números válidos.");
  const n = matrix.length;
  const k = matrix[0].length;
  if (k < 2) throw new Error("Informe pelo menos 2 itens.");
  const columns = transpose(matrix);
  if (columns.some((col) => sampleSd(col) === 0)) throw new Error("Há item com variância zero; remova ou revise esse item antes de calcular.");

  const alpha = cronbachAlpha(matrix);
  const totalScores = rowSums(matrix);
  const itemRows = columns.map((col, j) => {
    const correctedTotals = totalScores.map((score, i) => score - matrix[i][j]);
    const itemTotal = correlation(col, correctedTotals);
    const reduced = matrix.map((row) => row.filter((_, idx) => idx !== j));
    const alphaRemoved = reduced[0].length >= 2 ? cronbachAlpha(reduced) : NaN;
    return {
      name: `Item ${j + 1}`,
      mean: mean(col),
      sd: sampleSd(col),
      itemTotal,
      alphaRemoved
    };
  });

  const itemTableRows = itemRows.map((item) => [
    item.name,
    fmt(item.mean),
    fmt(item.sd),
    fmt(item.itemTotal),
    Number.isFinite(item.alphaRemoved) ? fmt(item.alphaRemoved) : "NA"
  ]);
  const alerts = [
    "Alfa de Cronbach avalia consistência interna; não prova validade do instrumento.",
    "Itens invertidos precisam ser recodificados antes do cálculo.",
    "Alfa muito alto pode indicar itens redundantes, não necessariamente melhor escala."
  ];
  if (n < 30) alerts.push("Há poucos respondentes; a estimativa de confiabilidade pode ser instável.");
  if (k < 4) alerts.push("Há poucos itens; o alfa pode subestimar ou oscilar bastante.");
  if (itemRows.some((item) => item.itemTotal < 0.2)) alerts.push("Há item com correlação item-total corrigida baixa; revise sua redação, recodificação ou pertinência.");
  if (alpha < 0) alerts.push("Alfa negativo sugere itens em direções opostas, erro de recodificação ou escala inadequada.");

  const md = `## Alfa de Cronbach\n\n- Respondentes: **${n}**.\n- Itens: **${k}**.\n- Alfa de Cronbach: **${fmt(alpha)}** (${cronbachInterpretation(alpha)}).\n\n### Diagnóstico por item\n\n${namedTableMarkdown(["Item", "Média", "DP", "Item-total", "α se removido"], itemTableRows)}\n\n> Relato sugerido: a escala apresentou alfa de Cronbach de ${fmt(alpha)}, classificado como ${cronbachInterpretation(alpha)}. A interpretação deve considerar dimensionalidade, conteúdo dos itens e evidências adicionais de validade.`;
  const extra = `<div class="diagnostics">
    ${namedTableHtml("Diagnóstico por item", ["Item", "Média", "DP", "Item-total", "α se removido"], itemTableRows, { compact: true })}
  </div>`;
  renderResult("cronbach-result", [["α", fmt(alpha)], ["itens", fmt(k, 0)], ["respondentes", fmt(n, 0)]], md, alerts, extra);
}

function runDescriptive() {
  const values = parseVector($("desc-values").value);
  validateVector(values, "Valores", 3);
  const n = values.length;
  const avg = mean(values);
  const sd = sampleSd(values);
  const se = sd / Math.sqrt(n);
  const tcrit = invTCdf(0.975, n - 1);
  const ci = [avg - tcrit * se, avg + tcrit * se];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const q1 = quantile(values, 0.25);
  const med = median(values);
  const q3 = quantile(values, 0.75);
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  const outliers = values.filter((value) => value < lowerFence || value > upperFence);
  const m2 = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / n;
  const m3 = values.reduce((sum, value) => sum + (value - avg) ** 3, 0) / n;
  const m4 = values.reduce((sum, value) => sum + (value - avg) ** 4, 0) / n;
  const skew = m3 / Math.pow(m2, 1.5);
  const kurtExcess = m4 / (m2 ** 2) - 3;
  const jb = (n / 6) * (skew ** 2 + (kurtExcess ** 2) / 4);
  const jbP = chiSquarePValue(jb, 2);
  const cv = sd / Math.abs(avg);
  const rows = [
    ["n", fmt(n, 0)],
    ["Média", fmt(avg)],
    ["IC95% da média", `[${fmt(ci[0])}, ${fmt(ci[1])}]`],
    ["Mediana", fmt(med)],
    ["DP", fmt(sd)],
    ["Erro-padrão", fmt(se)],
    ["Mínimo", fmt(min)],
    ["Q1", fmt(q1)],
    ["Q3", fmt(q3)],
    ["Máximo", fmt(max)],
    ["IQR", fmt(iqr)],
    ["Coeficiente de variação", Number.isFinite(cv) ? pct(cv) : "NA"],
    ["Assimetria", fmt(skew)],
    ["Curtose excessiva", fmt(kurtExcess)],
    ["Jarque-Bera", `${fmt(jb)}; p=${fmt(jbP, 5)}`],
    ["Outliers 1,5×IQR", outliers.length ? outliers.map((value) => fmt(value)).join(", ") : "nenhum"]
  ];
  const normalHint = jbP < 0.05 ? "há indício de afastamento da normalidade pelo Jarque-Bera" : "não houve indício forte de afastamento da normalidade pelo Jarque-Bera";
  const alerts = [
    "Descritivas devem ser interpretadas junto com gráfico, contexto e qualidade da coleta.",
    "Jarque-Bera é uma triagem baseada em assimetria e curtose; não substitui inspeção visual nem análise dos pressupostos do teste final.",
    "Outliers pela regra 1,5×IQR são pontos para revisão, não valores a remover automaticamente."
  ];
  if (n < 20) alerts.push("A amostra é pequena; indicadores de normalidade e curtose podem oscilar bastante.");
  if (outliers.length) alerts.push(`Foram identificados ${outliers.length} possível(is) outlier(s) pela regra 1,5×IQR.`);
  if (Math.abs(skew) > 1) alerts.push("A assimetria absoluta é maior que 1; considere mediana/IQR e métodos robustos ou não paramétricos.");

  const md = `## Estatísticas descritivas\n\n- n: **${n}**.\n- Média: **${fmt(avg)}**, IC95% **[${fmt(ci[0])}, ${fmt(ci[1])}]**.\n- Mediana: **${fmt(med)}**.\n- DP: **${fmt(sd)}**.\n- Mínimo-Máximo: **${fmt(min)} a ${fmt(max)}**.\n- Q1-Q3: **${fmt(q1)} a ${fmt(q3)}**; IQR = **${fmt(iqr)}**.\n- Assimetria: **${fmt(skew)}**.\n- Curtose excessiva: **${fmt(kurtExcess)}**.\n- Jarque-Bera: **${fmt(jb)}**, p = **${fmt(jbP, 5)}**; ${normalHint}.\n- Outliers pela regra 1,5×IQR: **${outliers.length ? outliers.map((value) => fmt(value)).join(", ") : "nenhum"}**.\n\n### Tabela resumo\n\n${namedTableMarkdown(["Medida", "Valor"], rows)}\n\n> Relato sugerido: a variável apresentou média ${fmt(avg)} (DP = ${fmt(sd)}) e mediana ${fmt(med)} [Q1 = ${fmt(q1)}; Q3 = ${fmt(q3)}]. ${normalHint}.`;
  const extra = `<div class="diagnostics">
    ${namedTableHtml("Resumo descritivo", ["Medida", "Valor"], rows, { compact: true })}
  </div>`;
  renderResult("descriptive-result", [["média", fmt(avg)], ["mediana", fmt(med)], ["DP", fmt(sd)]], md, alerts, extra);
}

function normalPFromZ(z, tail) {
  const cdf = normalCdf(z);
  if (tail === "greater") return 1 - cdf;
  if (tail === "less") return cdf;
  return Math.min(1, 2 * Math.min(cdf, 1 - cdf));
}

function continuityAdjustedZ(stat, meanStat, sdStat) {
  const corrected = stat > meanStat ? stat - 0.5 : stat < meanStat ? stat + 0.5 : stat;
  return (corrected - meanStat) / sdStat;
}

function runNonparametric() {
  const type = $("np-type").value;
  const tail = $("np-tail").value;
  const alerts = [
    "Testes não paramétricos por postos não dispensam avaliação do desenho, independência e qualidade dos dados.",
    "Os p-valores usam aproximação normal com correção de continuidade; amostras muito pequenas podem exigir cálculo exato."
  ];

  if (type === "mann") {
    const g1 = parseVector($("np-values-1").value);
    const g2 = parseVector($("np-values-2").value);
    validateVector(g1, "Grupo 1", 2);
    validateVector(g2, "Grupo 2", 2);
    const combined = [...g1.map((value) => ({ value, group: 1 })), ...g2.map((value) => ({ value, group: 2 }))];
    const { ranks, ties } = rankWithTies(combined.map((item) => item.value));
    const n1 = g1.length;
    const n2 = g2.length;
    const n = n1 + n2;
    const r1 = ranks.reduce((sum, rankValue, i) => sum + (combined[i].group === 1 ? rankValue : 0), 0);
    const u1 = r1 - n1 * (n1 + 1) / 2;
    const u2 = n1 * n2 - u1;
    const meanU = n1 * n2 / 2;
    const tieCorrection = ties.reduce((sum, t) => sum + (t ** 3 - t), 0);
    const varU = (n1 * n2 / 12) * ((n + 1) - tieCorrection / (n * (n - 1)));
    const z = continuityAdjustedZ(u1, meanU, Math.sqrt(varU));
    const p = normalPFromZ(z, tail);
    const effect = Math.abs(z) / Math.sqrt(n);
    const cl = u1 / (n1 * n2);
    if (Math.min(n1, n2) < 10) alerts.push("Há grupo com menos de 10 observações; considere confirmar por método exato.");
    if (ties.length) alerts.push("Há empates nos dados; os postos médios e correção de empates foram aplicados.");
    const rows = [
      ["Grupo 1", fmt(n1, 0), fmt(mean(g1)), fmt(median(g1)), fmt(r1), fmt(u1)],
      ["Grupo 2", fmt(n2, 0), fmt(mean(g2)), fmt(median(g2)), fmt(ranks.reduce((sum, rankValue, i) => sum + (combined[i].group === 2 ? rankValue : 0), 0)), fmt(u2)]
    ];
    const md = `## Mann-Whitney U\n\n- n grupo 1: **${n1}**; n grupo 2: **${n2}**.\n- U grupo 1: **${fmt(u1)}**; U grupo 2: **${fmt(u2)}**.\n- Estatística z: **${fmt(z)}**.\n- p-valor: **${fmt(p, 5)}**.\n- Tamanho de efeito r: **${fmt(effect)}**.\n- Probabilidade comum aproximada: **${pct(cl)}**.\n\n### Resumo por grupo\n\n${namedTableMarkdown(["Grupo", "n", "Média", "Mediana", "Soma postos", "U"], rows)}\n\n> Relato sugerido: o teste de Mann-Whitney indicou U = ${fmt(u1)}, z = ${fmt(z)}, p = ${fmt(p, 5)}, r = ${fmt(effect)}.`;
    const extra = `<div class="diagnostics">${namedTableHtml("Resumo por grupo", ["Grupo", "n", "Média", "Mediana", "Soma postos", "U"], rows, { compact: true })}</div>`;
    renderResult("nonparametric-result", [["U", fmt(u1)], ["z", fmt(z)], ["p", fmt(p, 5)]], md, alerts, extra);
    return;
  }

  const rawDiffs = parseVector($("np-values-1").value);
  if (rawDiffs.length < 3 || rawDiffs.some((value) => !Number.isFinite(value))) throw new Error("Informe pelo menos 3 diferenças pareadas válidas.");
  const diffs = rawDiffs.filter((value) => value !== 0);
  if (diffs.length < 3) throw new Error("Após remover diferenças zero, restaram menos de 3 pares válidos.");
  const absDiffs = diffs.map(Math.abs);
  const { ranks, ties } = rankWithTies(absDiffs);
  const wPlus = ranks.reduce((sum, rankValue, i) => sum + (diffs[i] > 0 ? rankValue : 0), 0);
  const wMinus = ranks.reduce((sum, rankValue, i) => sum + (diffs[i] < 0 ? rankValue : 0), 0);
  const n = diffs.length;
  const meanW = n * (n + 1) / 4;
  const tieCorrection = ties.reduce((sum, t) => sum + (t ** 3 - t), 0) / 48;
  const varW = n * (n + 1) * (2 * n + 1) / 24 - tieCorrection;
  const z = continuityAdjustedZ(wPlus, meanW, Math.sqrt(varW));
  const p = normalPFromZ(z, tail);
  const effect = Math.abs(z) / Math.sqrt(n);
  const positive = diffs.filter((value) => value > 0).length;
  const negative = diffs.filter((value) => value < 0).length;
  if (rawDiffs.length !== diffs.length) alerts.push(`${rawDiffs.length - diffs.length} diferença(s) igual(is) a zero foram removidas.`);
  if (n < 10) alerts.push("Há menos de 10 pares não nulos; considere confirmar por método exato.");
  if (ties.length) alerts.push("Há empates nos valores absolutos das diferenças; postos médios foram aplicados.");
  const rows = diffs.map((value, i) => [`Par ${i + 1}`, fmt(value), fmt(Math.abs(value)), fmt(ranks[i]), value > 0 ? "positiva" : "negativa"]);
  const md = `## Wilcoxon pareado\n\n- Pares não nulos: **${n}**.\n- Diferenças positivas: **${positive}**; negativas: **${negative}**.\n- W+: **${fmt(wPlus)}**; W-: **${fmt(wMinus)}**.\n- Estatística z: **${fmt(z)}**.\n- p-valor: **${fmt(p, 5)}**.\n- Tamanho de efeito r: **${fmt(effect)}**.\n\n### Postos das diferenças\n\n${namedTableMarkdown(["Par", "Diferença", "|Dif.|", "Posto", "Sinal"], rows)}\n\n> Relato sugerido: o teste de Wilcoxon pareado indicou W+ = ${fmt(wPlus)}, z = ${fmt(z)}, p = ${fmt(p, 5)}, r = ${fmt(effect)}.`;
  const extra = `<div class="diagnostics">${namedTableHtml("Postos das diferenças", ["Par", "Diferença", "|Dif.|", "Posto", "Sinal"], rows, { compact: true })}</div>`;
  renderResult("nonparametric-result", [["W+", fmt(wPlus)], ["z", fmt(z)], ["p", fmt(p, 5)]], md, alerts, extra);
}

function meanPlotSvg(groups) {
  const width = 640;
  const height = 320;
  const pad = 46;
  const means = groups.map((group) => group.mean);
  const ciLows = groups.map((group) => group.ciLow);
  const ciHighs = groups.map((group) => group.ciHigh);
  const minY = Math.min(...ciLows);
  const maxY = Math.max(...ciHighs);
  const span = maxY - minY || 1;
  const y = (value) => height - pad - ((value - minY) / span) * (height - pad * 2);
  const step = (width - pad * 2) / Math.max(1, groups.length - 1);
  const items = groups.map((group, i) => {
    const x = groups.length === 1 ? width / 2 : pad + i * step;
    return `<g>
      <line class="axis" x1="${x}" y1="${y(group.ciLow)}" x2="${x}" y2="${y(group.ciHigh)}"></line>
      <line class="axis" x1="${x - 8}" y1="${y(group.ciLow)}" x2="${x + 8}" y2="${y(group.ciLow)}"></line>
      <line class="axis" x1="${x - 8}" y1="${y(group.ciHigh)}" x2="${x + 8}" y2="${y(group.ciHigh)}"></line>
      <circle class="point" cx="${x}" cy="${y(group.mean)}" r="5"><title>${escapeHtml(group.name)}: média=${fmt(group.mean)}</title></circle>
      <text x="${x}" y="${height - 14}" text-anchor="middle">${escapeHtml(group.name.slice(0, 12))}</text>
    </g>`;
  }).join("");
  return `<div class="chart-card"><h3>Médias com IC95%</h3><svg class="scatter" viewBox="0 0 ${width} ${height}" role="img" aria-label="Gráfico de médias por grupo com intervalo de confiança">
    <line class="axis" x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}"></line>
    <line class="axis" x1="${pad}" y1="${pad}" x2="${pad}" y2="${height - pad}"></line>
    <text x="${pad}" y="22">média: ${fmt(Math.min(...means))} a ${fmt(Math.max(...means))}</text>
    ${items}
  </svg></div>`;
}

function holmComparisons(comparisons) {
  const sorted = comparisons.map((item, index) => ({ ...item, index })).sort((a, b) => a.p - b.p);
  const adjusted = Array(comparisons.length);
  let running = 0;
  sorted.forEach((item, rank) => {
    const value = Math.min(1, item.p * (comparisons.length - rank));
    running = Math.max(running, value);
    adjusted[item.index] = running;
  });
  return comparisons.map((item, index) => ({ ...item, pHolm: adjusted[index] }));
}

function runAnova() {
  const groups = parseGroups($("anova-groups").value);
  if (groups.length < 3) throw new Error("ANOVA exige pelo menos 3 grupos.");
  const allValues = groups.flatMap((group) => group.values);
  const nTotal = allValues.length;
  const k = groups.length;
  if (nTotal <= k) throw new Error("É necessário haver mais observações do que grupos.");
  const grandMean = mean(allValues);
  const summaries = groups.map((group) => {
    const n = group.values.length;
    const groupMean = mean(group.values);
    const sd = sampleSd(group.values);
    return { ...group, n, mean: groupMean, sd, se: sd / Math.sqrt(n) };
  });
  if (summaries.some((group) => group.sd === 0)) {
    throw new Error("Cada grupo precisa ter variabilidade interna maior que zero para estimar ANOVA.");
  }

  const ssBetween = summaries.reduce((sum, group) => sum + group.n * (group.mean - grandMean) ** 2, 0);
  const ssWithin = summaries.reduce((sum, group) => sum + group.values.reduce((acc, value) => acc + (value - group.mean) ** 2, 0), 0);
  const ssTotal = ssBetween + ssWithin;
  const dfBetween = k - 1;
  const dfWithin = nTotal - k;
  const msBetween = ssBetween / dfBetween;
  const msWithin = ssWithin / dfWithin;
  const f = msBetween / msWithin;
  const p = fPValue(f, dfBetween, dfWithin);
  const eta2 = ssBetween / ssTotal;
  const omega2 = Math.max(0, (ssBetween - dfBetween * msWithin) / (ssTotal + msWithin));
  const tcritWithin = invTCdf(0.975, dfWithin);
  summaries.forEach((group) => {
    group.ciLow = group.mean - tcritWithin * group.se;
    group.ciHigh = group.mean + tcritWithin * group.se;
  });

  const rawComparisons = [];
  for (let i = 0; i < summaries.length; i++) {
    for (let j = i + 1; j < summaries.length; j++) {
      const a = summaries[i];
      const b = summaries[j];
      const diff = a.mean - b.mean;
      const se = Math.sqrt(msWithin * (1 / a.n + 1 / b.n));
      const t = diff / se;
      rawComparisons.push({ pair: `${a.name} - ${b.name}`, diff, t, p: tPValue(t, dfWithin, "two") });
    }
  }
  const comparisons = holmComparisons(rawComparisons);
  const effectMagnitude = eta2 < 0.01 ? "muito pequeno" : eta2 < 0.06 ? "pequeno" : eta2 < 0.14 ? "moderado" : "grande";
  const significance = p < 0.05 ? "estatisticamente significativo ao nível de 5%" : "não estatisticamente significativo ao nível de 5%";

  const descRows = summaries.map((group) => [group.name, fmt(group.n, 0), fmt(group.mean), fmt(group.sd), `[${fmt(group.ciLow)}, ${fmt(group.ciHigh)}]`]);
  const anovaRows = [
    ["Entre grupos", fmt(ssBetween), fmt(dfBetween, 0), fmt(msBetween), fmt(f), fmt(p, 5)],
    ["Dentro dos grupos", fmt(ssWithin), fmt(dfWithin, 0), fmt(msWithin), "", ""],
    ["Total", fmt(ssTotal), fmt(nTotal - 1, 0), "", "", ""]
  ];
  const comparisonRows = comparisons.map((item) => [item.pair, fmt(item.diff), fmt(item.t), fmt(item.p, 5), fmt(item.pHolm, 5)]);
  const md = `## ANOVA de um fator\n\n- Grupos: **${k}**.\n- n total: **${nTotal}**.\n- Estatística: **F(${dfBetween}, ${dfWithin}) = ${fmt(f)}**.\n- p-valor: **${fmt(p, 5)}** (${significance}).\n- η²: **${fmt(eta2)}** (${effectMagnitude}).\n- ω²: **${fmt(omega2)}**.\n\n### Descritivas por grupo\n\n${namedTableMarkdown(["Grupo", "n", "Média", "DP", "IC95%"], descRows)}\n\n### Tabela ANOVA\n\n${namedTableMarkdown(["Fonte", "SQ", "gl", "MQ", "F", "p"], anovaRows)}\n\n### Comparações pareadas exploratórias\n\n${namedTableMarkdown(["Comparação", "Diferença", "t", "p", "p Holm"], comparisonRows)}\n\n> Relato sugerido: a ANOVA de um fator ${p < 0.05 ? "indicou diferença entre as médias dos grupos" : "não indicou diferença estatisticamente significativa entre as médias dos grupos"}, F(${dfBetween}, ${dfWithin}) = ${fmt(f)}, p = ${fmt(p, 5)}, η² = ${fmt(eta2)}.`;
  const alerts = [
    "A ANOVA testa se ao menos uma média difere; as comparações pareadas indicam onde podem estar as diferenças.",
    "As comparações pareadas usam erro dentro dos grupos e ajuste de Holm; trate-as como apoio exploratório.",
    "Verifique independência, outliers, normalidade aproximada dos resíduos e variâncias muito discrepantes."
  ];
  const minN = Math.min(...summaries.map((group) => group.n));
  const maxSd = Math.max(...summaries.map((group) => group.sd));
  const minSd = Math.min(...summaries.map((group) => group.sd));
  if (minN < 5) alerts.push("Há grupo com menos de 5 observações; a ANOVA pode ser instável.");
  if (maxSd / minSd > 2) alerts.push("Os desvios-padrão dos grupos diferem bastante; considere Welch ANOVA ou análise robusta em validação posterior.");
  if (groups.some((group) => hasExtremePoint(group.values))) alerts.push("Há indício de ponto extremo em pelo menos um grupo; revise os dados antes de interpretar.");

  const extra = `<div class="diagnostics">
    ${meanPlotSvg(summaries)}
    <div class="anova-tables">
      ${namedTableHtml("Descritivas", ["Grupo", "n", "Média", "DP", "IC95%"], descRows, { compact: true })}
      ${namedTableHtml("ANOVA", ["Fonte", "SQ", "gl", "MQ", "F", "p"], anovaRows, { compact: true })}
      ${namedTableHtml("Comparações pareadas", ["Comparação", "Dif.", "t", "p", "p Holm"], comparisonRows, { compact: true })}
    </div>
  </div>`;
  renderResult("anova-result", [["F", fmt(f)], ["η²", fmt(eta2)], ["p", fmt(p, 5)]], md, alerts, extra);
}

function runRegression() {
  const xName = $("reg-x-name").value.trim() || "X";
  const yName = $("reg-y-name").value.trim() || "Y";
  const pairs = parseMatrix($("reg-pairs").value);
  if (pairs.length < 3 || pairs.some((row) => row.length !== 2 || row.some((v) => !Number.isFinite(v)))) {
    throw new Error("Informe pelo menos 3 pares numéricos x,y.");
  }
  const x = pairs.map((p) => p[0]);
  const y = pairs.map((p) => p[1]);
  validateVector(x, "Valores de X", 3);
  validateVector(y, "Valores de Y", 3);

  const n = x.length;
  const xMean = mean(x);
  const yMean = mean(y);
  const sxx = x.reduce((sum, value) => sum + (value - xMean) ** 2, 0);
  const sxy = x.reduce((sum, value, i) => sum + (value - xMean) * (y[i] - yMean), 0);
  const syy = y.reduce((sum, value) => sum + (value - yMean) ** 2, 0);
  if (sxx === 0) throw new Error("X tem variância zero; não é possível ajustar regressão.");
  if (syy === 0) throw new Error("Y tem variância zero; não há variação a explicar.");

  const slope = sxy / sxx;
  const intercept = yMean - slope * xMean;
  const rows = x.map((value, i) => {
    const fitted = intercept + slope * value;
    return { x: value, y: y[i], fitted, residual: y[i] - fitted };
  });
  const sse = rows.reduce((sum, row) => sum + row.residual ** 2, 0);
  const ssr = syy - sse;
  const df = n - 2;
  const mse = sse / df;
  const rmse = Math.sqrt(mse);
  const seSlope = Math.sqrt(mse / sxx);
  const seIntercept = Math.sqrt(mse * (1 / n + xMean ** 2 / sxx));
  const tSlope = slope / seSlope;
  const pSlope = tPValue(tSlope, df, "two");
  const tcrit = invTCdf(0.975, df);
  const slopeCi = [slope - tcrit * seSlope, slope + tcrit * seSlope];
  const interceptCi = [intercept - tcrit * seIntercept, intercept + tcrit * seIntercept];
  const r2 = Math.max(0, Math.min(1, ssr / syy));
  const adjR2 = 1 - (1 - r2) * (n - 1) / df;
  const significance = pSlope < 0.05 ? "estatisticamente significativo ao nível de 5%" : "não estatisticamente significativo ao nível de 5%";

  const alerts = [
    "O modelo assume relação aproximadamente linear, resíduos independentes e variabilidade residual relativamente constante.",
    "Regressão linear simples mede associação ajustada por uma reta; não demonstra causalidade por si só."
  ];
  if (n < 10) alerts.push("A amostra é pequena; IC e p-valor podem ser instáveis.");
  if (hasExtremePoint(x) || hasExtremePoint(y)) alerts.push("Há indício de ponto extremo em X ou Y; confira gráfico e resíduos antes de interpretar.");
  alerts.push(`Evite extrapolar previsões para fora da faixa observada de ${xName}: ${fmt(Math.min(...x))} a ${fmt(Math.max(...x))}.`);

  const md = `## Regressão linear simples\n\n- Variável explicativa: **${xName}**.\n- Variável resposta: **${yName}**.\n- n: **${n}**.\n- Equação: **${yName} = ${fmt(intercept)} + ${fmt(slope)} × ${xName}**.\n- Intercepto β0: **${fmt(intercept)}**, IC95% **[${fmt(interceptCi[0])}, ${fmt(interceptCi[1])}]**.\n- Coeficiente β1: **${fmt(slope)}**, IC95% **[${fmt(slopeCi[0])}, ${fmt(slopeCi[1])}]**.\n- Erro padrão de β1: **${fmt(seSlope)}**.\n- Estatística: **t(${df}) = ${fmt(tSlope)}**.\n- p-valor de β1: **${fmt(pSlope, 5)}** (${significance}).\n- R²: **${fmt(r2)}**; R² ajustado: **${fmt(adjR2)}**.\n- Erro padrão residual: **${fmt(rmse)}**.\n\n### Resíduos\n\n${residualTableMarkdown(rows)}\n\n> Relato sugerido: ${xName} apresentou associação ${slope >= 0 ? "positiva" : "negativa"} com ${yName}, β = ${fmt(slope)}, IC95% [${fmt(slopeCi[0])}, ${fmt(slopeCi[1])}], p = ${fmt(pSlope, 5)}, R² = ${fmt(r2)}.`;
  const extra = `<div class="diagnostics">
    ${scatterPlotSvg(x, y, { slope, intercept, title: "Dispersão com reta ajustada", xName, yName })}
    ${residualTableHtml(rows)}
  </div>`;

  renderResult("regression-result", [["β1", fmt(slope)], ["R²", fmt(r2)], ["p", fmt(pSlope, 5)]], md, alerts, extra);
}

function runEpi() {
  let a = readNumber("epi-a", "Exposto com evento", 0);
  let b = readNumber("epi-b", "Exposto sem evento", 0);
  let c = readNumber("epi-c", "Não exposto com evento", 0);
  let d = readNumber("epi-d", "Não exposto sem evento", 0);
  if (a + b === 0 || c + d === 0 || a + c === 0 || b + d === 0) throw new Error("Linhas e colunas da tabela 2x2 precisam ter totais maiores que zero.");
  const corrected = [a, b, c, d].some((v) => v === 0);
  if (corrected) { a += 0.5; b += 0.5; c += 0.5; d += 0.5; }
  const riskExp = a / (a + b);
  const riskUnexp = c / (c + d);
  const rr = riskExp / riskUnexp;
  const or = (a * d) / (b * c);
  const rd = riskExp - riskUnexp;
  const nnt = rd === 0 ? Infinity : 1 / Math.abs(rd);
  const rrSe = Math.sqrt(1 / a - 1 / (a + b) + 1 / c - 1 / (c + d));
  const orSe = Math.sqrt(1 / a + 1 / b + 1 / c + 1 / d);
  const rrCi = [Math.exp(Math.log(rr) - 1.959963984540054 * rrSe), Math.exp(Math.log(rr) + 1.959963984540054 * rrSe)];
  const orCi = [Math.exp(Math.log(or) - 1.959963984540054 * orSe), Math.exp(Math.log(or) + 1.959963984540054 * orSe)];
  const n = a + b + c + d;
  const chi = n * (a * d - b * c) ** 2 / ((a + b) * (c + d) * (a + c) * (b + d));
  const p = chiSquarePValue(chi, 1);
  const md = `## Tabela 2x2\n\n- Risco no grupo exposto: **${pct(riskExp)}**.\n- Risco no grupo não exposto: **${pct(riskUnexp)}**.\n- Risco relativo: **RR = ${fmt(rr)}**, IC95% **[${fmt(rrCi[0])}, ${fmt(rrCi[1])}]**.\n- Odds ratio: **OR = ${fmt(or)}**, IC95% **[${fmt(orCi[0])}, ${fmt(orCi[1])}]**.\n- Diferença absoluta de riscos: **${pct(rd)}**.\n- ${rd > 0 ? "NNH" : "NNT"} aproximado: **${Number.isFinite(nnt) ? fmt(nnt, 1) : "infinito"}**.\n- Qui-quadrado: **χ²(1) = ${fmt(chi)}**, p = **${fmt(p, 5)}**.${corrected ? "\n\n> Foi aplicada correção de Haldane-Anscombe (+0,5) por haver célula com zero." : ""}`;
  renderResult("epi-result", [["RR", fmt(rr)], ["OR", fmt(or)], ["p", fmt(p, 5)]], md, [
    "Interprete RR quando o desenho permite estimar incidência/risco; em caso-controle, OR costuma ser mais apropriado.",
    "Células pequenas exigem cautela e podem demandar teste exato de Fisher.",
    "NNT indica benefício quando a diferença de riscos reduz evento desfavorável; NNH indica aumento de evento desfavorável."
  ]);
}

function logisticProbability(x, beta0, beta1) {
  const exponent = beta0 + beta1 * x;
  if (exponent > 100) return 1;
  if (exponent < -100) return 0;
  return 1 / (1 + Math.exp(-exponent));
}

function runLogistic() {
  const xName = $("log-x-name").value.trim() || "X";
  const yName = $("log-y-name").value.trim() || "Evento";
  const pairs = parseMatrix($("log-pairs").value);
  if (pairs.length < 3 || pairs.some((row) => row.length !== 2 || row.some((v) => !Number.isFinite(v)))) {
    throw new Error("Informe pelo menos 3 pares numéricos x,y.");
  }
  const x = pairs.map((p) => p[0]);
  const y = pairs.map((p) => p[1]);
  validateVector(x, "Valores de X", 3);
  
  if (y.some((v) => v !== 0 && v !== 1)) throw new Error("A variável Y deve conter apenas 0 (ausência) ou 1 (presença do evento).");
  if (y.every((v) => v === 0) || y.every((v) => v === 1)) throw new Error("A variável Y precisa ter variabilidade (tanto 0 quanto 1).");

  const n = x.length;
  const xMean = mean(x);
  const yMean = mean(y);
  
  let beta0 = Math.log(yMean / (1 - yMean));
  let beta1 = 0;
  const maxIter = 50;
  const tol = 1e-8;

  for (let iter = 0; iter < maxIter; iter++) {
    const probs = x.map((xi) => logisticProbability(xi, beta0, beta1));
    const weights = probs.map((p) => p * (1 - p));
    const sumW = weights.reduce((a, b) => a + b, 0);
    const sumWx = weights.reduce((sum, w, i) => sum + w * x[i], 0);
    const sumWxx = weights.reduce((sum, w, i) => sum + w * x[i] * x[i], 0);
    
    const resid = y.map((yi, i) => yi - probs[i]);
    const sumWResid = weights.reduce((sum, w, i) => sum + w * resid[i], 0);
    const sumWxResid = weights.reduce((sum, w, i) => sum + w * x[i] * resid[i], 0);

    const denom = sumW * sumWxx - sumWx * sumWx;
    if (Math.abs(denom) < 1e-12) break;

    const newBeta0 = beta0 + (sumWxx * sumWResid - sumWx * sumWxResid) / denom;
    const newBeta1 = beta1 + (sumW * sumWxResid - sumWx * sumWResid) / denom;
    
    if (Math.abs(newBeta0 - beta0) < tol && Math.abs(newBeta1 - beta1) < tol) break;
    beta0 = newBeta0;
    beta1 = newBeta1;
  }

  const probs = x.map((xi) => logisticProbability(xi, beta0, beta1));
  const ll = y.reduce((sum, yi, i) => sum + (yi * Math.log(Math.max(probs[i], 1e-10)) + (1 - yi) * Math.log(Math.max(1 - probs[i], 1e-10))), 0);
  const weights = probs.map((p) => p * (1 - p));
  const sumWxx = weights.reduce((sum, w, i) => sum + w * x[i] * x[i], 0);
  const sumWx = weights.reduce((sum, w, i) => sum + w * x[i], 0);
  const sumW = weights.reduce((a, b) => a + b, 0);
  const varBeta1 = sumW / (sumW * sumWxx - sumWx * sumWx);
  const seBeta1 = Math.sqrt(Math.max(0, varBeta1));
  
  const z = beta1 / (seBeta1 + 1e-10);
  const pValue = 2 * (1 - normalCdf(Math.abs(z)));
  
  const or = Math.exp(beta1);
  const orCiLow = Math.exp(beta1 - 1.959963984540054 * seBeta1);
  const orCiHigh = Math.exp(beta1 + 1.959963984540054 * seBeta1);
  const betaCiLow = beta1 - 1.959963984540054 * seBeta1;
  const betaCiHigh = beta1 + 1.959963984540054 * seBeta1;

  const predictions = x.map((xi, i) => ({
    x: xi,
    y: y[i],
    pred: logisticProbability(xi, beta0, beta1),
    residual: y[i] - logisticProbability(xi, beta0, beta1)
  }));

  const significance = pValue < 0.05 ? "estatisticamente significativo ao nível de 5%" : "não estatisticamente significativo ao nível de 5%";
  const md = `## Regressão Logística\n\n- Variável explicativa: **${xName}**.\n- Variável resposta (evento): **${yName}**.\n- n: **${n}**.\n- Casos com evento: **${y.filter((v) => v === 1).length}**.\n- Intercepto β₀: **${fmt(beta0)}**.\n- Coeficiente β₁: **${fmt(beta1)}**, IC95% **[${fmt(betaCiLow)}, ${fmt(betaCiHigh)}]**.\n- Erro padrão β₁: **${fmt(seBeta1)}**.\n- Estatística z: **${fmt(z)}**.\n- p-valor: **${fmt(pValue, 5)}** (${significance}).\n- **Odds Ratio: ${fmt(or)}**, IC95% **[${fmt(orCiLow)}, ${fmt(orCiHigh)}]**.\n- Log-verossimilhança: **${fmt(ll)}**.\n\n### Interpretação do OR\n- Cada aumento de 1 unidade em **${xName}** multiplica a odds de **${yName}** por **${fmt(or)}**.\n- Aumento na odds: **${fmt((or - 1) * 100)}%** por unidade de **${xName}**.\n\n### Predições\n\n| # | ${xName} | ${yName} (obs.) | P(${yName}=1) | Resíduo |\n| --- | --- | --- | --- | --- |\n${predictions.map((p, i) => `| ${i + 1} | ${fmt(p.x)} | ${p.y} | ${fmt(p.pred)} | ${fmt(p.residual)} |`).join("\\n")}\n\n> Relato sugerido: a regressão logística indicou que cada unidade de aumento em **${xName}** está associada a um OR de **${fmt(or)}** (IC95% [${fmt(orCiLow)}, ${fmt(orCiHigh)}]), z = ${fmt(z)}, p = ${fmt(pValue, 5)}.`;
  
  renderResult("logistic-result", [["β₁", fmt(beta1)], ["OR", fmt(or)], ["p", fmt(pValue, 5)]], md, [
    "Regressão logística assume relação linear no logit; a reta não passa pelos pontos observados, mas modela a probabilidade.",
    "Odds ratio interpreta-se como multiplicação da odds a cada unidade de X.",
    "Com n pequeno ou separação completa, o modelo pode ser instável; revise dados e diagnósticos."
  ]);
}

function syncVisibility() {
  const sampleSelect = $("sample-type");
  if (sampleSelect) {
    const sampleType = sampleSelect.value;
    document.querySelectorAll(".sample-field").forEach((el) => {
      el.classList.toggle("is-hidden", !el.classList.contains(sampleType));
    });
  }

  const ttestSelect = $("ttest-type");
  if (ttestSelect) {
    const ttype = ttestSelect.value;
    const inputMode = $("ttest-input-mode")?.value ?? "summary";
    const rawPanel = document.querySelector(".ttest-raw");
    const summaryPanel = document.querySelector(".ttest-summary");
    if (rawPanel) rawPanel.classList.toggle("is-hidden", inputMode !== "raw");
    if (summaryPanel) summaryPanel.classList.toggle("is-hidden", inputMode !== "summary");
    document.querySelectorAll(".ttest-field, .ttest-raw-field").forEach((el) => {
      el.classList.toggle("is-hidden", !el.classList.contains(ttype));
    });
  }

  const chiSelect = $("chi-type");
  if (chiSelect) {
    const chiType = chiSelect.value;
    const expected = document.querySelector(".chi-expected");
    const yates = $("chi-yates");
    if (expected) expected.classList.toggle("is-hidden", chiType !== "goodness");
    if (yates) yates.closest("label").classList.toggle("is-hidden", chiType !== "independence");
  }

  const npSelect = $("np-type");
  if (npSelect) {
    const second = document.querySelector(".np-second");
    if (second) second.classList.toggle("is-hidden", npSelect.value !== "mann");
  }
}

const handlers = {
  descriptive: runDescriptive,
  sample: sampleSize,
  ttest: runTTest,
  nonparametric: runNonparametric,
  chi: runChi,
  correlation: runCorrelation,
  regression: runRegression,
  logistic: runLogistic,
  anova: runAnova,
  cronbach: runCronbach,
  epi: runEpi
};

const chiPresets = {
  "2x2": "18, 12\n7, 23",
  "2x3": "22, 18, 10\n14, 21, 25",
  "3x2": "18, 12\n10, 20\n24, 16",
  "3x3": "12, 18, 10\n9, 21, 20\n19, 14, 17",
  "4x2": "24, 16\n18, 22\n30, 10\n15, 25"
};

document.querySelectorAll("select").forEach((select) => select.addEventListener("change", syncVisibility));
document.querySelectorAll("[data-chi-preset]").forEach((button) => {
  button.addEventListener("click", () => {
    const observed = $("chi-observed");
    if (!observed) return;
    observed.value = chiPresets[button.dataset.chiPreset] ?? observed.value;
    const type = $("chi-type");
    if (type) type.value = "independence";
    syncVisibility();
    runChi();
  });
});
document.querySelectorAll("[data-run]").forEach((button) => {
  button.addEventListener("click", () => {
    const tool = button.dataset.run;
    try {
      handlers[tool]();
    } catch (error) {
      const resultIds = { descriptive: "descriptive-result", nonparametric: "nonparametric-result", correlation: "cor-result", regression: "regression-result", logistic: "logistic-result", anova: "anova-result", cronbach: "cronbach-result" };
      renderError(resultIds[tool] ?? `${tool}-result`, error);
    }
  });
});

syncVisibility();
