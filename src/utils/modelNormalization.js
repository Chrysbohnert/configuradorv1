// Utilidades para normalizar nomes de modelos (GSI/GSE) e casar com gráficos de carga

export function normalizeString(input) {
  if (!input || typeof input !== 'string') return '';
  return input
    .normalize('NFD').replace(/\p{Diacritic}+/gu, '')
    .toLowerCase()
    .replace(/^guindaste\s+/g, '')
    .replace(/[^a-z0-9.+\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Constrói chave canônica preservando TRAVE/CANIVETE e ignorando variações CR/EH
export function buildGraficoKey(raw) {
  const s = normalizeString(raw);
  if (!s) return '';

  const tokens = s.split(' ');
  const keep = [];
  let hasTrave = false;
  let hasCanivete = false;

  for (const t of tokens) {
    if (!t) continue;
    if (['cr', 'eh', 'controle', 'remoto', 'extensiva', 'hidraulica', 'hidráulica', 'com', 'sem'].includes(t)) continue;
    if (t === 'trave') { hasTrave = true; continue; }
    if (t === 'canivete') { hasCanivete = true; continue; }
    keep.push(t);
  }

  let base = keep.join(' ');
  base = base.replace(/(\d+\.\d+)\s*([a-z])/g, '$1$2');

  if (hasTrave) base += ' trave';
  if (hasCanivete) base += ' canivete';
  return base.trim();
}

// Dado um mapa indexado e uma chave, tenta encontrar melhor correspondência com fallbacks
export function resolveGraficoUrl(indexMap, key) {
  if (!indexMap || !key) return undefined;
  let url = indexMap.get(key);
  if (url) return url;

  const keySemSufixo = key.replace(/\s+(trave|canivete)\b/, '').trim();
  url = indexMap.get(keySemSufixo);
  if (url) return url;

  const match = key.match(/(gsi|gse)\s*(\d+\.\d+)([ct])?/);
  if (match) {
    const baseNum = `${match[1]} ${match[2]}`;
    const letter = match[3];
    for (const [idxKey, idxUrl] of indexMap.entries()) {
      if (letter === 'c' && /canivete\b/.test(idxKey)) return idxUrl;
      if (letter === 't' && /trave\b/.test(idxKey)) return idxUrl;
      if (idxKey.includes(baseNum)) url = idxUrl;
    }
    if (!url) {
      const somenteNum = match[2].replace(/[a-z]$/, '');
      for (const [idxKey, idxUrl] of indexMap.entries()) {
        if (letter === 'c' && /canivete\b/.test(idxKey) && idxKey.includes(somenteNum)) return idxUrl;
        if (letter === 't' && /trave\b/.test(idxKey) && idxKey.includes(somenteNum)) return idxUrl;
        if (idxKey.includes(somenteNum)) url = idxUrl;
      }
    }
  }
  return url;
}


