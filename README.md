# Calculadoras para Pesquisadores

Site estático de **42 funções estatísticas** (41 páginas) que rodam **100% no navegador**, sem login e sem envio dos dados. Interface em português (pt-BR), com separador decimal configurável (vírgula por padrão), saída em **Markdown** pronta para colar em relatórios, e, em cada página, fórmula, exemplo, quando usar e referências.

## Como usar / hospedar

É um site estático: basta abrir `index.html` no navegador, ou publicar a pasta inteira (ex.: GitHub Pages). Não há build nem dependências de rede em tempo de execução.

## Estrutura

```
index.html                 página inicial (lista de grupos)
<slug>.html                uma página por calculadora (41)
css/estilo.css             estilo (bege + verde-escuro, barra lateral)
js/utils.js                entrada/saída: separador decimal, parsing, formatação
js/stats.js                núcleo estatístico em JavaScript puro (sem dependências)
js/stats_extra.js          regressão logística, alfa de Cronbach, epidemiologia 2x2
js/calculators.js          registro das 41 calculadoras (campos + lógica)
js/app.js                  engine de UI: barra lateral, campos, resultados, Markdown
js/vendor/jstat.min.js     jStat (opcional; usado para validação cruzada offline)
js/_tests/                 suítes de teste (Node)
tools/content.js           conteúdo didático e referências
tools/generate.js          gerador das páginas HTML (dev)
```

Para regenerar as páginas após editar conteúdo: `node tools/generate.js` (a partir da raiz).

## Cobertura (grupos)

- **Descritiva (12):** média, mediana, moda, desvio padrão, variância, quartis, amplitude, CV, assimetria/curtose, tabela de frequências, histograma, boxplot.
- **Probabilidade (6):** Normal, Binomial, Poisson, t, Qui-quadrado, F.
- **Inferência (10):** IC da média, tamanho de amostra, teste t (1 amostra, 2 amostras, pareado), qui-quadrado, ANOVA, correlação de Pearson, regressão linear, regressão logística.
- **Não paramétricos (5):** Wilcoxon, Mann-Whitney, Kruskal-Wallis, Friedman, Spearman.
- **Multivariada (3):** matriz de correlação, PCA, regressão múltipla.
- **Outras (5):** epidemiologia 2x2, alfa de Cronbach, gerador de aleatórios, tabela normal, conversor de dados.

> O teste qui-quadrado de **aderência** e de **independência** está unificado em uma única página (seletor "Tipo de teste"), seguindo o layout de referência. São, portanto, 41 páginas cobrindo as 42 funções.

## Validação (executada com Node)

| Suíte | Resultado | O que cobre |
|---|---|---|
| `_tests/stats.test.js` | 40/40 | distribuições e testes vs. tabelas, R/SciPy |
| `_tests/cross_jstat.test.js` | 100/100 | `stats.js` × jStat (Normal, t, χ², F, Binomial, Poisson) |
| `_tests/extra.test.js` | 10/10 | logística (intercepto −4,0777; coef 1,5046), Cronbach, epi 2x2 |
| `_tests/smoke.test.js` | 41/41 | todas as calculadoras executam e produzem saída + Markdown |
| `_tests/ui_headless.test.js` | 8/8 | caminho de UI (campos → cálculo → resultado → Markdown) |

Rodar tudo: `cd js && for t in _tests/*.test.js; do node "$t"; done`

## Ressalvas (transparência)

- **Núcleo `stats.js` e `utils.js`** já existiam no diretório de trabalho ao início desta etapa; **não foram escritos do zero nesta sessão**, mas foram **revisados e testados** (evidências acima). As demais camadas (estilo, engine de UI, registro das calculadoras, extras, conteúdo, gerador, testes) foram construídas nesta etapa.
- **jStat** é mantido apenas como ferramenta de validação cruzada e fallback opcional; os cálculos do site usam o núcleo puro.
- **Alfa de Cronbach**: a página exibe um alerta de que o α pressupõe tau-equivalência e tende a subestimar a confiabilidade; alternativas recomendadas incluem o ômega de McDonald (ω). Refs.: Sijtsma (2009); McDonald (1999).
- **Conteúdo didático**: as referências citadas são reais (Guimarães 2008 por capítulo/página; fontes clássicas para os métodos específicos). Nenhuma referência foi inventada.
- Ferramenta **educacional**: para decisões críticas, confira resultados em fonte oficial.
