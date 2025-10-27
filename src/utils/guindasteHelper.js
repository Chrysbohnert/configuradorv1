/**
 * Utilitários para processamento de guindastes
 */

/**
 * Extrai configurações do título/subgrupo do guindaste
 * @param {string} subgrupo - Título do guindaste (ex: "Guindaste GSI 6.5 CR/EH")
 * @returns {Array<{icon: string, text: string}>} Array de configurações com ícone e texto
 * 
 * @example
 * extrairConfiguracoes('Guindaste GSI 6.5 CR/EH')
 * // [
 * //   { icon: '🕹️', text: 'CR - Controle Remoto' },
 * //   { icon: '⚙️', text: 'EH - Extensiva Hidráulica' }
 * // ]
 */
export const extrairConfiguracoes = (subgrupo) => {
  if (!subgrupo) return [];
  
  const configuracoes = [];
  
  // Extrair configurações do título (mais específico para evitar falsos positivos)
  if (subgrupo.includes(' CR') || subgrupo.includes('CR ') || subgrupo.includes('CR/')) {
    configuracoes.push({ icon: '🕹️', text: 'CR - Controle Remoto' });
  }
  if (subgrupo.includes(' EH') || subgrupo.includes('EH ') || subgrupo.includes('/EH')) {
    configuracoes.push({ icon: '⚙️', text: 'EH - Extensiva Hidráulica' });
  }
  if (subgrupo.includes(' ECS') || subgrupo.includes('ECS ') || subgrupo.includes('/ECS')) {
    configuracoes.push({ icon: '⊓', text: 'ECS - Extensiva Cilindro Superior' });
  }
  if (subgrupo.includes(' P') || subgrupo.includes('P ') || subgrupo.includes('/P')) {
    configuracoes.push({ icon: '🔨', text: 'P - Preparação p/ Perfuratriz' });
  }
  if (subgrupo.includes(' GR') || subgrupo.includes('GR ') || subgrupo.includes('/GR')) {
    configuracoes.push({ icon: '🦾', text: 'GR - Preparação p/ Garra e Rotator' });
  }
  if (subgrupo.includes('Caminhão 3/4')) {
    configuracoes.push({ icon: '🚛', text: 'Caminhão 3/4' });
  }
  
  return configuracoes;
};

/**
 * Extrai a capacidade (tonelagem) do nome do guindaste
 * @param {string} subgrupo - Nome do guindaste
 * @returns {string|null} Capacidade extraída (ex: "6.5") ou null
 * 
 * @example
 * extrairCapacidade('Guindaste GSI 6.5 CR') // '6.5'
 * extrairCapacidade('Guindaste GSE 10.8') // '10.8'
 */
export const extrairCapacidade = (subgrupo) => {
  if (!subgrupo) return null;
  
  const match = subgrupo.match(/(\d+\.?\d*)\s*(ton|t)?/i);
  return match ? match[1] : null;
};

/**
 * Extrai o modelo base do guindaste (ex: "GSI 6.5")
 * @param {string} subgrupo - Nome completo do guindaste
 * @returns {string} Modelo base
 * 
 * @example
 * extrairModeloBase('Guindaste GSI 6.5 CR/EH') // 'GSI 6.5'
 */
export const extrairModeloBase = (subgrupo) => {
  if (!subgrupo) return '';
  
  return subgrupo
    .replace(/^(Guindaste\s+)+/, '') // Remove "Guindaste" do início
    .split(' ')
    .slice(0, 2) // Pega apenas as 2 primeiras palavras (ex: GSI 6.5)
    .join(' ');
};

/**
 * Verifica se o guindaste tem controle remoto
 * @param {string} subgrupo - Nome do guindaste
 * @returns {boolean} True se tem CR
 */
export const temControleRemoto = (subgrupo) => {
  if (!subgrupo) return false;
  return subgrupo.includes(' CR') || subgrupo.includes('CR ') || subgrupo.includes('CR/');
};

/**
 * Verifica se o guindaste tem extensiva hidráulica
 * @param {string} subgrupo - Nome do guindaste
 * @returns {boolean} True se tem EH
 */
export const temExtensivaHidraulica = (subgrupo) => {
  if (!subgrupo) return false;
  return subgrupo.includes(' EH') || subgrupo.includes('EH ') || subgrupo.includes('/EH');
};

