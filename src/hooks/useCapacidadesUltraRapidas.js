import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLogger } from './useLogger';
import { LOG_CATEGORIES } from '../utils/logger';
import { 
  getCapacidadesInstantaneas, 
  getModelosInstantaneos,
  getCapacidadesPopulares,
  getInfoCapacidade
} from '../utils/capacidadesPredefinidas';

/**
 * Hook ultra-rápido para gerenciamento de capacidades
 * Carrega capacidades instantaneamente (0ms)
 * @param {Object} options - Opções de configuração
 * @returns {Object} Estado e funções do hook
 */
export const useCapacidadesUltraRapidas = (options = {}) => {
  const {
    autoLoad = true,
    showPopular = true
  } = options;

  const logger = useLogger('useCapacidadesUltraRapidas', LOG_CATEGORIES.PERFORMANCE);
  
  // Estados
  const [capacidades, setCapacidades] = useState([]);
  const [selectedCapacidade, setSelectedCapacidade] = useState(null);
  const [selectedModelo, setSelectedModelo] = useState(null);
  const [modelos, setModelos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Carregar capacidades instantaneamente
  useEffect(() => {
    if (autoLoad) {
      logger.startTimer('load-capacidades-instantaneas');
      
      // Carregar capacidades instantaneamente (0ms)
      const capacidadesData = showPopular 
        ? getCapacidadesPopulares()
        : getCapacidadesInstantaneas();
      
      setCapacidades(capacidadesData);
      
      logger.endTimer('load-capacidades-instantaneas');
      logger.logSuccess('Capacidades carregadas instantaneamente', { 
        count: capacidadesData.length,
        showPopular 
      });
    }
  }, [autoLoad, showPopular, logger]);

  // Função para selecionar capacidade
  const selectCapacidade = useCallback((capacidade) => {
    logger.logUserAction('capacidade-selected', { capacidade });
    setSelectedCapacidade(capacidade);
    setSelectedModelo(null);
    
    // Carregar modelos instantaneamente
    const modelosData = getModelosInstantaneos(capacidade);
    setModelos(modelosData);
    
    logger.logInfo('Modelos carregados instantaneamente', { 
      capacidade, 
      modelos: modelosData.length 
    });
  }, [logger]);

  // Função para selecionar modelo
  const selectModelo = useCallback((modelo) => {
    logger.logUserAction('modelo-selected', { modelo });
    setSelectedModelo(modelo);
    
    logger.logInfo('Modelo selecionado', { modelo });
  }, [logger]);

  // Função para limpar seleções
  const clearSelection = useCallback(() => {
    logger.logUserAction('selection-cleared');
    setSelectedCapacidade(null);
    setSelectedModelo(null);
    setModelos([]);
  }, [logger]);

  // Função para obter informações da capacidade
  const getCapacidadeInfo = useCallback((capacidade) => {
    return getInfoCapacidade(capacidade);
  }, []);

  // Função para verificar se uma capacidade é popular
  const isCapacidadePopular = useCallback((capacidade) => {
    const info = getInfoCapacidade(capacidade);
    return info ? info.popular : false;
  }, []);

  // Função para obter capacidades por categoria
  const getCapacidadesPorCategoria = useCallback(() => {
    const populares = capacidades.filter(cap => cap.popular);
    const naoPopulares = capacidades.filter(cap => !cap.popular);
    
    return {
      populares,
      naoPopulares,
      todas: capacidades
    };
  }, [capacidades]);

  // Função para buscar capacidades
  const searchCapacidades = useCallback((termo) => {
    if (!termo || termo.trim() === '') {
      return capacidades;
    }
    
    const searchTerm = termo.toLowerCase().trim();
    
    return capacidades.filter(capacidade => {
      return (
        capacidade.valor.includes(searchTerm) ||
        capacidade.label.toLowerCase().includes(searchTerm) ||
        capacidade.descricao.toLowerCase().includes(searchTerm)
      );
    });
  }, [capacidades]);

  // Função para obter estatísticas
  const getStats = useCallback(() => {
    const categorias = getCapacidadesPorCategoria();
    
    return {
      total: capacidades.length,
      populares: categorias.populares.length,
      naoPopulares: categorias.naoPopulares.length,
      selectedCapacidade,
      selectedModelo,
      modelos: modelos.length,
      hasSelection: !!selectedCapacidade,
      hasModelo: !!selectedModelo
    };
  }, [capacidades.length, selectedCapacidade, selectedModelo, modelos.length, getCapacidadesPorCategoria]);

  // Memoizar dados computados
  const computedData = useMemo(() => {
    return {
      capacidades,
      selectedCapacidade,
      selectedModelo,
      modelos,
      hasSelection: !!selectedCapacidade,
      hasModelo: !!selectedModelo,
      isLoading
    };
  }, [capacidades, selectedCapacidade, selectedModelo, modelos, isLoading]);

  // Memoizar capacidades por categoria
  const capacidadesPorCategoria = useMemo(() => {
    return getCapacidadesPorCategoria();
  }, [getCapacidadesPorCategoria]);

  // Memoizar capacidades populares
  const capacidadesPopulares = useMemo(() => {
    return capacidades.filter(cap => cap.popular);
  }, [capacidades]);

  // Memoizar capacidades não populares
  const capacidadesNaoPopulares = useMemo(() => {
    return capacidades.filter(cap => !cap.popular);
  }, [capacidades]);

  // Retornar estado e funções
  return {
    // Estados
    ...computedData,
    
    // Funções
    selectCapacidade,
    selectModelo,
    clearSelection,
    getCapacidadeInfo,
    isCapacidadePopular,
    getCapacidadesPorCategoria,
    searchCapacidades,
    getStats,
    
    // Dados computados
    capacidadesPorCategoria,
    capacidadesPopulares,
    capacidadesNaoPopulares,
    
    // Dados brutos
    capacidades,
    modelos
  };
};

export default useCapacidadesUltraRapidas;
