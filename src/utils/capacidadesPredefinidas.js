/**
 * Sistema de Capacidades Pré-definidas para Carregamento Instantâneo
 * @description Capacidades hardcoded para eliminar completamente a demora
 */

// Capacidades pré-definidas baseadas nos dados reais do sistema
export const CAPACIDADES_PREDEFINIDAS = [
  { valor: '6.5', label: '6.5 Ton', descricao: 'Capacidade 6.5 toneladas', popular: true },
  { valor: '8.0', label: '8.0 Ton', descricao: 'Capacidade 8.0 toneladas', popular: true },
  { valor: '10.8', label: '10.8 Ton', descricao: 'Capacidade 10.8 toneladas', popular: true },
  { valor: '12.8', label: '12.8 Ton', descricao: 'Capacidade 12.8 toneladas', popular: false },
  { valor: '13.0', label: '13.0 Ton', descricao: 'Capacidade 13.0 toneladas', popular: false },
  { valor: '15.0', label: '15.0 Ton', descricao: 'Capacidade 15.0 toneladas', popular: false },
  { valor: '15.8', label: '15.8 Ton', descricao: 'Capacidade 15.8 toneladas', popular: false },
  { valor: '18.0', label: '18.0 Ton', descricao: 'Capacidade 18.0 toneladas', popular: false },
  { valor: '20.0', label: '20.0 Ton', descricao: 'Capacidade 20.0 toneladas', popular: false },
  { valor: '25.0', label: '25.0 Ton', descricao: 'Capacidade 25.0 toneladas', popular: false }
];

// Modelos pré-definidos por capacidade
export const MODELOS_POR_CAPACIDADE = {
  '6.5': [
    { modelo: 'GSI 6.5', descricao: 'Guindaste GSI 6.5 toneladas' },
    { modelo: 'GSE 6.5', descricao: 'Guindaste GSE 6.5 toneladas' }
  ],
  '8.0': [
    { modelo: 'GSI 8.0', descricao: 'Guindaste GSI 8.0 toneladas' },
    { modelo: 'GSE 8.0', descricao: 'Guindaste GSE 8.0 toneladas' },
    { modelo: 'GSE 8.0C', descricao: 'Guindaste GSE 8.0C toneladas' }
  ],
  '10.8': [
    { modelo: 'GSI 10.8', descricao: 'Guindaste GSI 10.8 toneladas' },
    { modelo: 'GSE 10.8', descricao: 'Guindaste GSE 10.8 toneladas' }
  ],
  '12.8': [
    { modelo: 'GSI 12.8', descricao: 'Guindaste GSI 12.8 toneladas' },
    { modelo: 'GSE 12.8', descricao: 'Guindaste GSE 12.8 toneladas' }
  ],
  '13.0': [
    { modelo: 'GSI 13.0', descricao: 'Guindaste GSI 13.0 toneladas' },
    { modelo: 'GSE 13.0', descricao: 'Guindaste GSE 13.0 toneladas' }
  ],
  '15.0': [
    { modelo: 'GSI 15.0', descricao: 'Guindaste GSI 15.0 toneladas' },
    { modelo: 'GSE 15.0', descricao: 'Guindaste GSE 15.0 toneladas' }
  ],
  '15.8': [
    { modelo: 'GSI 15.8', descricao: 'Guindaste GSI 15.8 toneladas' },
    { modelo: 'GSE 15.8', descricao: 'Guindaste GSE 15.8 toneladas' }
  ],
  '18.0': [
    { modelo: 'GSI 18.0', descricao: 'Guindaste GSI 18.0 toneladas' },
    { modelo: 'GSE 18.0', descricao: 'Guindaste GSE 18.0 toneladas' }
  ],
  '20.0': [
    { modelo: 'GSI 20.0', descricao: 'Guindaste GSI 20.0 toneladas' },
    { modelo: 'GSE 20.0', descricao: 'Guindaste GSE 20.0 toneladas' }
  ],
  '25.0': [
    { modelo: 'GSI 25.0', descricao: 'Guindaste GSI 25.0 toneladas' },
    { modelo: 'GSE 25.0', descricao: 'Guindaste GSE 25.0 toneladas' }
  ]
};

/**
 * Obter capacidades instantaneamente
 * @returns {Array} Lista de capacidades
 */
export const getCapacidadesInstantaneas = () => {
  return CAPACIDADES_PREDEFINIDAS;
};

/**
 * Obter modelos por capacidade instantaneamente
 * @param {string} capacidade - Capacidade selecionada
 * @returns {Array} Lista de modelos
 */
export const getModelosInstantaneos = (capacidade) => {
  return MODELOS_POR_CAPACIDADE[capacidade] || [];
};

/**
 * Obter capacidades populares
 * @returns {Array} Lista de capacidades populares
 */
export const getCapacidadesPopulares = () => {
  return CAPACIDADES_PREDEFINIDAS.filter(cap => cap.popular);
};

/**
 * Obter todas as capacidades
 * @returns {Array} Lista completa de capacidades
 */
export const getTodasCapacidades = () => {
  return CAPACIDADES_PREDEFINIDAS;
};

/**
 * Verificar se uma capacidade existe
 * @param {string} capacidade - Capacidade para verificar
 * @returns {boolean} Se a capacidade existe
 */
export const existeCapacidade = (capacidade) => {
  return CAPACIDADES_PREDEFINIDAS.some(cap => cap.valor === capacidade);
};

/**
 * Obter informações de uma capacidade
 * @param {string} capacidade - Capacidade para buscar
 * @returns {Object|null} Informações da capacidade
 */
export const getInfoCapacidade = (capacidade) => {
  return CAPACIDADES_PREDEFINIDAS.find(cap => cap.valor === capacidade) || null;
};

/**
 * Obter estatísticas das capacidades
 * @returns {Object} Estatísticas
 */
export const getEstatisticasCapacidades = () => {
  return {
    total: CAPACIDADES_PREDEFINIDAS.length,
    populares: CAPACIDADES_PREDEFINIDAS.filter(cap => cap.popular).length,
    naoPopulares: CAPACIDADES_PREDEFINIDAS.filter(cap => !cap.popular).length,
    menorCapacidade: Math.min(...CAPACIDADES_PREDEFINIDAS.map(cap => parseFloat(cap.valor))),
    maiorCapacidade: Math.max(...CAPACIDADES_PREDEFINIDAS.map(cap => parseFloat(cap.valor)))
  };
};

export default {
  getCapacidadesInstantaneas,
  getModelosInstantaneos,
  getCapacidadesPopulares,
  getTodasCapacidades,
  existeCapacidade,
  getInfoCapacidade,
  getEstatisticasCapacidades
};
