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
  
  
  // Tentativa 1: Match exato
  let url = indexMap.get(key);
  if (url) {
    return url;
  }

  // Tentativa 2: Remover sufixos trave/canivete
  const keySemSufixo = key.replace(/\s+(trave|canivete)\b/, '').trim();
  if (keySemSufixo !== key) {
    url = indexMap.get(keySemSufixo);
    if (url) {
      return url;
    }
  }

  // Tentativa 3: Parse do modelo GSI/GSE com número
  const match = key.match(/(gsi|gse)\s*(\d+\.?\d*)([ct])?/i);
  if (match) {
    const tipo = match[1].toLowerCase(); // gsi ou gse
    const numero = match[2]; // ex: 10.8
    const letra = match[3] ? match[3].toLowerCase() : null; // c ou t
    
    
    // Tentativa 3a: Buscar com letra específica (C=Canivete, T=Trave)
    if (letra) {
      for (const [idxKey, idxUrl] of indexMap.entries()) {
        const idxLower = idxKey.toLowerCase();
        // Verificar se contém o tipo, número e a característica (canivete/trave)
        if (idxLower.includes(tipo) && idxLower.includes(numero)) {
          if (letra === 'c' && idxKey.includes('canivete')) {
            return idxUrl;
          }
          if (letra === 't' && idxKey.includes('trave')) {
            return idxUrl;
          }
        }
      }
      
      // Se não encontrou com a característica específica, tentar apenas com tipo+numero+letra
      const keyComLetra = `${tipo} ${numero}${letra}`;
      url = indexMap.get(keyComLetra);
      if (url) {
        return url;
      }
    }
    
    // Tentativa 3b: Buscar apenas com tipo e número (sem letra)
    const baseKey = `${tipo} ${numero}`;
    url = indexMap.get(baseKey);
    if (url) {
      return url;
    }
    
    // Tentativa 3c: Buscar qualquer chave que contenha tipo e número
    for (const [idxKey, idxUrl] of indexMap.entries()) {
      const idxLower = idxKey.toLowerCase();
      if (idxLower.includes(tipo) && idxLower.includes(numero)) {
        url = idxUrl;
        // Não retorna ainda, continua procurando uma correspondência melhor
      }
    }
    
    if (url) return url;
  }
  
  // Tentativa 4: Busca parcial - qualquer chave que contenha a chave de busca
  for (const [idxKey, idxUrl] of indexMap.entries()) {
    if (idxKey.includes(key) || key.includes(idxKey)) {
      return idxUrl;
    }
  }
  
  return undefined;
}


