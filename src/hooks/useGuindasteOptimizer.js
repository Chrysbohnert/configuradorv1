import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLogger } from './useLogger';
import { LOG_CATEGORIES } from '../utils/logger';
import { 
  loadGuindastesOptimized, 
  getCapacidadesUnicas, 
  getModelosPorCapacidade, 
  getGuindastesPorModelo,
  getCacheStats
} from '../utils/guindasteOptimizer';

/**
 * Hook personalizado para otimização de guindastes
 * @param {Object} options - Opções de configuração
 * @param {boolean} options.autoLoad - Carregar automaticamente
 * @param {boolean} options.enableCache - Habilitar cache
 * @param {number} options.cacheTimeout - Timeout do cache em ms
 * @returns {Object} Estado e funções do hook
 */
export const useGuindasteOptimizer = (options = {}) => {
  const {
    autoLoad = true,
    enableCache = true,
    cacheTimeout = 5 * 60 * 1000 // 5 minutos
  } = options;

  const logger = useLogger('useGuindasteOptimizer', LOG_CATEGORIES.PERFORMANCE);
  
  // Estados
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [guindastesData, setGuindastesData] = useState(null);
  const [capacidades, setCapacidades] = useState([]);
  const [selectedCapacidade, setSelectedCapacidade] = useState(null);
  const [selectedModelo, setSelectedModelo] = useState(null);
  const [guindastesDisponiveis, setGuindastesDisponiveis] = useState([]);

  // Carregar dados automaticamente
  useEffect(() => {
    if (autoLoad) {
      loadData();
    }
  }, [autoLoad]);

  // Função para carregar dados
  const loadData = useCallback(async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      setError(null);
      
      logger.startTimer('load-guindastes');
      logger.logInfo('Iniciando carregamento de guindastes', { forceRefresh });
      
      const result = await loadGuindastesOptimized(forceRefresh);
      
      if (result.fromCache) {
        logger.logInfo('Dados carregados do cache', { 
          guindastes: result.guindastes.length,
          capacidades: result.capacidades.length 
        });
      } else {
        logger.logInfo('Dados carregados do banco', { 
          loadTime: result.loadTime,
          guindastes: result.guindastes.length,
          capacidades: result.capacidades.length 
        });
      }
      
      setGuindastesData(result);
      setCapacidades(result.capacidades);
      
      logger.endTimer('load-guindastes');
      logger.logSuccess('Dados carregados com sucesso');
      
    } catch (err) {
      logger.logError('Erro ao carregar dados', { error: err.message }, err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [logger]);

  // Função para selecionar capacidade
  const selectCapacidade = useCallback((capacidade) => {
    logger.logUserAction('capacidade-selected', { capacidade });
    setSelectedCapacidade(capacidade);
    setSelectedModelo(null);
    setGuindastesDisponiveis([]);
    
    // Carregar modelos para a capacidade selecionada
    const modelos = getModelosPorCapacidade(capacidade);
    setGuindastesDisponiveis(modelos);
    
    logger.logInfo('Modelos carregados', { 
      capacidade, 
      modelos: modelos.length 
    });
  }, [logger]);

  // Função para selecionar modelo
  const selectModelo = useCallback((modelo) => {
    logger.logUserAction('modelo-selected', { modelo });
    setSelectedModelo(modelo);
    
    // Carregar guindastes para o modelo selecionado
    const guindastes = getGuindastesPorModelo(modelo);
    setGuindastesDisponiveis(guindastes);
    
    logger.logInfo('Guindastes carregados', { 
      modelo, 
      guindastes: guindastes.length 
    });
  }, [logger]);

  // Função para limpar seleções
  const clearSelection = useCallback(() => {
    logger.logUserAction('selection-cleared');
    setSelectedCapacidade(null);
    setSelectedModelo(null);
    setGuindastesDisponiveis([]);
  }, [logger]);

  // Função para recarregar dados
  const refreshData = useCallback(() => {
    logger.logUserAction('data-refresh');
    loadData(true);
  }, [loadData, logger]);

  // Função para obter estatísticas
  const getStats = useCallback(() => {
    const cacheStats = getCacheStats();
    return {
      ...cacheStats,
      selectedCapacidade,
      selectedModelo,
      guindastesDisponiveis: guindastesDisponiveis.length,
      capacidades: capacidades.length
    };
  }, [selectedCapacidade, selectedModelo, guindastesDisponiveis.length, capacidades.length]);

  // Memoizar dados computados
  const computedData = useMemo(() => {
    return {
      capacidades,
      selectedCapacidade,
      selectedModelo,
      guindastesDisponiveis,
      hasSelection: !!selectedCapacidade,
      hasModelo: !!selectedModelo,
      hasGuindastes: guindastesDisponiveis.length > 0
    };
  }, [capacidades, selectedCapacidade, selectedModelo, guindastesDisponiveis]);

  // Memoizar estado de loading
  const loadingState = useMemo(() => {
    return {
      isLoading,
      error,
      hasData: !!guindastesData,
      fromCache: guindastesData?.fromCache || false
    };
  }, [isLoading, error, guindastesData]);

  // Retornar estado e funções
  return {
    // Estados
    ...computedData,
    ...loadingState,
    
    // Funções
    loadData,
    selectCapacidade,
    selectModelo,
    clearSelection,
    refreshData,
    getStats,
    
    // Dados brutos
    guindastesData,
    capacidades,
    guindastesDisponiveis
  };
};

export default useGuindasteOptimizer;
