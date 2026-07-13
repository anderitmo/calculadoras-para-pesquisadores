/*
 * utils.js — Utilitários de entrada/saída.
 *
 * Tratamento correto do separador decimal:
 *  - Quando o decimal é ".", os valores podem ser separados por "," ";" espaço, tab ou nova linha.
 *  - Quando o decimal é ",", a vírgula NÃO pode separar valores (ela é o decimal);
 *    os separadores passam a ser ";" espaço, tab ou nova linha.
 *  Isto corrige uma ambiguidade que corromperia a entrada se a vírgula fosse usada
 *  simultaneamente como decimal e como separador.
 */
(function (global) {
  "use strict";
  var U = {};

  // Preferências persistidas
  U.getDecimalSep = function () {
    try { return localStorage.getItem("decimalSep") || ","; }
    catch (e) { return ","; }   // padrão Brasil; tolera localStorage indisponível
  };
  U.setDecimalSep = function (sep) {
    try { localStorage.setItem("decimalSep", sep); } catch (e) {}
  };

  // Converte um token textual em número respeitando o separador decimal.
  function tokenToNumber(tok, sep) {
    tok = tok.trim();
    if (tok === "") return NaN;
    if (sep === ",") {
      // remove separadores de milhar "." e troca vírgula decimal por ponto
      tok = tok.replace(/\./g, "").replace(",", ".");
    }
    return Number(tok);
  }
  U.tokenToNumber = tokenToNumber;

  // Divide um texto em tokens respeitando o separador decimal escolhido.
  function splitTokens(text, sep) {
    var re = sep === "," ? /[;\s\t\n]+/ : /[,;\s\t\n]+/;
    return text.trim().split(re).filter(function (t) { return t !== ""; });
  }

  // Vetor de números a partir de texto livre.
  U.parseVector = function (text, sep) {
    sep = sep || U.getDecimalSep();
    var toks = splitTokens(text, sep);
    return toks.map(function (t) { return tokenToNumber(t, sep); });
  };

  // Verdadeiro se todos os elementos são números válidos e há pelo menos `min`.
  U.validVector = function (v, min) {
    min = min || 1;
    return v.length >= min && v.every(function (x) { return !isNaN(x) && isFinite(x); });
  };

  // Grupos: uma linha por grupo.
  U.parseGroups = function (text, sep) {
    sep = sep || U.getDecimalSep();
    return text
      .split(/\n/)
      .map(function (line) { return line.trim(); })
      .filter(function (line) { return line !== ""; })
      .map(function (line) { return U.parseVector(line, sep); });
  };

  // Matriz: uma linha por observação; ";" também separa linhas. Células por espaço/tab/vírgula.
  U.parseMatrix = function (text, sep) {
    sep = sep || U.getDecimalSep();
    var rowSep = sep === "," ? /[;\n]+/ : /[;\n]+/; // ";" e nova linha separam linhas
    var cellRe = sep === "," ? /[\s\t]+/ : /[,\s\t]+/;
    return text
      .split(rowSep)
      .map(function (r) { return r.trim(); })
      .filter(function (r) { return r !== ""; })
      .map(function (r) {
        return r
          .split(cellRe)
          .filter(function (c) { return c !== ""; })
          .map(function (c) { return tokenToNumber(c, sep); });
      });
  };

  // Formata número para exibição com o separador decimal escolhido.
  U.fmt = function (x, decimals) {
    if (x === Infinity) return "∞";
    if (x === -Infinity) return "−∞";
    if (isNaN(x)) return "—";
    decimals = decimals == null ? 4 : decimals;
    var s = Number(x).toFixed(decimals);
    // remove zeros finais desnecessários, mas mantém ao menos 2 casas em valores não inteiros
    if (decimals > 0) {
      s = s.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
    }
    if (U.getDecimalSep() === ",") s = s.replace(".", ",");
    return s;
  };

  // p-valor formatado (notação científica para valores muito pequenos).
  U.fmtP = function (p) {
    if (isNaN(p)) return "—";
    if (p < 0.0001) {
      var s = p.toExponential(2);
      return U.getDecimalSep() === "," ? s.replace(".", ",") : s;
    }
    if (p < 0.01) {
      var s3 = p.toPrecision(3); // ex.: 0,00397
      return U.getDecimalSep() === "," ? s3.replace(".", ",") : s3;
    }
    return U.fmt(p, 4);
  };

  // Histórico de cálculos (localStorage)
  U.pushHistory = function (entry) {
    var hist = U.getHistory();
    hist.unshift(Object.assign({ ts: Date.now() }, entry));
    hist = hist.slice(0, 20);
    localStorage.setItem("history", JSON.stringify(hist));
  };
  U.getHistory = function () {
    try {
      return JSON.parse(localStorage.getItem("history") || "[]");
    } catch (e) {
      return [];
    }
  };
  U.clearHistory = function () {
    localStorage.removeItem("history");
  };

  // Escapa HTML para inserção segura
  U.esc = function (s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  };

  if (typeof module !== "undefined" && module.exports) module.exports = U;
  global.U = U;
})(typeof window !== "undefined" ? window : globalThis);
