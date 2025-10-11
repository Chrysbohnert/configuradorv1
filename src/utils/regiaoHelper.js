/**
 * Utilitários para normalização de regiões
 */

/**
 * Normaliza nome de região para formato usado no sistema de preços
 * @param {string} regiao - Região do vendedor
 * @param {boolean} temIE - Se cliente tem Inscrição Estadual (apenas para RS)
 * @returns {string} Região normalizada
 * 
 * @example
 * normalizarRegiao('Rio Grande do Sul', true) // 'rs-com-ie'
 * normalizarRegiao('Rio Grande do Sul', false) // 'rs-sem-ie'
 * normalizarRegiao('Norte', true) // 'norte-nordeste'
 */
export const normalizarRegiao = (regiao, temIE = true) => {
  if (!regiao) return 'sul-sudeste';
  
  const regiaoLower = regiao.toLowerCase().trim();
  
  // Rio Grande do Sul tem tratamento especial (diferencia por IE)
  if (regiaoLower === 'rio grande do sul' || regiaoLower === 'rs') {
    return temIE ? 'rs-com-ie' : 'rs-sem-ie';
  }
  
  // Norte e Nordeste são agrupados
  if (regiaoLower === 'norte' || regiaoLower === 'nordeste') {
    return 'norte-nordeste';
  }
  
  // Sul e Sudeste são agrupados
  if (regiaoLower === 'sul' || regiaoLower === 'sudeste') {
    return 'sul-sudeste';
  }
  
  // Centro-Oeste
  if (regiaoLower === 'centro-oeste' || regiaoLower === 'centro oeste') {
    return 'centro-oeste';
  }
  
  // Default para casos não mapeados
  return 'sul-sudeste';
};

/**
 * Lista de todas as regiões válidas no sistema
 */
export const REGIOES_VALIDAS = [
  'norte-nordeste',
  'sul-sudeste',
  'centro-oeste',
  'rs-com-ie',
  'rs-sem-ie'
];

/**
 * Verifica se uma região é válida
 * @param {string} regiao - Região a verificar
 * @returns {boolean} True se a região é válida
 */
export const isRegiaoValida = (regiao) => {
  return REGIOES_VALIDAS.includes(regiao);
};

/**
 * Obtém nome amigável da região normalizada
 * @param {string} regiao - Região normalizada
 * @returns {string} Nome amigável
 */
export const getNomeAmigavelRegiao = (regiao) => {
  const mapa = {
    'norte-nordeste': 'Norte/Nordeste',
    'sul-sudeste': 'Sul/Sudeste',
    'centro-oeste': 'Centro-Oeste',
    'rs-com-ie': 'Rio Grande do Sul (Com IE)',
    'rs-sem-ie': 'Rio Grande do Sul (Sem IE)'
  };
  
  return mapa[regiao] || regiao;
};

