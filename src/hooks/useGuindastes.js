/**
 * Hook customizado para gerenciar lógica de guindastes
 * Centraliza filtros, seleção e carregamento de guindastes
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../config/supabase';

export function useGuindastes(user) {
  const [guindastes, setGuindastes] = useState([]);
  const [guindastesSelecionados, setGuindastesSelecionados] = useState([]);
  const [selectedCapacidade, setSelectedCapacidade] = useState(null);
  const [selectedModelo, setSelectedModelo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Carrega guindastes do banco de dados
   */
  const loadGuindastes = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const data = await db.getGuindastes();
      setGuindastes(data || []);
    } catch (error) {
      console.error('Erro ao carregar guindastes:', error);
      setGuindastes([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Carrega guindastes quando o usuário muda
   */
  useEffect(() => {
    loadGuindastes();
  }, [loadGuindastes]);

  /**
   * Obtém capacidades únicas disponíveis
   * Hardcoded para performance
   */
  const getCapacidadesUnicas = useCallback(() => {
    return ['6.5', '8.0', '10.8', '12.8', '13.0', '15.0', '15.8'];
  }, []);

  /**
   * Obtém modelos disponíveis para uma capacidade
   */
  const getModelosPorCapacidade = useCallback((capacidade) => {
    const modelos = new Map();
    
    guindastes.forEach(guindaste => {
      const subgrupo = guindaste.subgrupo || '';
      const modeloBase = subgrupo.replace(/^(Guindaste\s+)+/, '').split(' ').slice(0, 2).join(' ');
      
      const match = modeloBase.match(/(\d+\.?\d*)/);
      if (match && match[1] === capacidade) {
        if (!modelos.has(modeloBase)) {
          modelos.set(modeloBase, guindaste);
        }
      }
    });
    
    return Array.from(modelos.values());
  }, [guindastes]);

  /**
   * Obtém guindastes para um modelo específico
   */
  const getGuindastesPorModelo = useCallback((modelo) => {
    return guindastes.filter(guindaste => {
      const subgrupo = guindaste.subgrupo || '';
      const modeloBase = subgrupo.replace(/^(Guindaste\s+)+/, '').split(' ').slice(0, 2).join(' ');
      return modeloBase === modelo;
    });
  }, [guindastes]);

  /**
   * Seleciona uma capacidade
   */
  const handleSelecionarCapacidade = useCallback((capacidade) => {
    setSelectedCapacidade(capacidade);
    setSelectedModelo(null); // Reset modelo quando muda capacidade
    setGuindastesSelecionados([]);
  }, []);

  /**
   * Seleciona um modelo
   */
  const handleSelecionarModelo = useCallback((modelo) => {
    setSelectedModelo(modelo);
    setGuindastesSelecionados([]);
  }, []);

  /**
   * Seleciona um guindaste
   */
  const handleSelecionarGuindaste = useCallback((guindaste) => {
    setGuindastesSelecionados([guindaste]);
  }, []);

  /**
   * Limpa seleção
   */
  const clearSelection = useCallback(() => {
    setSelectedCapacidade(null);
    setSelectedModelo(null);
    setGuindastesSelecionados([]);
  }, []);

  /**
   * Capacidades disponíveis (memoizado)
   */
  const capacidades = useMemo(() => getCapacidadesUnicas(), [getCapacidadesUnicas]);

  /**
   * Modelos disponíveis para capacidade selecionada (memoizado)
   */
  const modelosDisponiveis = useMemo(() => {
    return selectedCapacidade ? getModelosPorCapacidade(selectedCapacidade) : [];
  }, [selectedCapacidade, getModelosPorCapacidade]);

  /**
   * Guindastes disponíveis para modelo selecionado (memoizado)
   */
  const guindastesDisponiveis = useMemo(() => {
    return selectedModelo ? getGuindastesPorModelo(selectedModelo) : [];
  }, [selectedModelo, getGuindastesPorModelo]);

  return {
    // Estado
    guindastes,
    guindastesSelecionados,
    selectedCapacidade,
    selectedModelo,
    isLoading,
    
    // Ações
    loadGuindastes,
    handleSelecionarCapacidade,
    handleSelecionarModelo,
    handleSelecionarGuindaste,
    clearSelection,
    setGuindastesSelecionados,
    
    // Dados computados
    capacidades,
    modelosDisponiveis,
    guindastesDisponiveis,
    
    // Funções auxiliares
    getCapacidadesUnicas,
    getModelosPorCapacidade,
    getGuindastesPorModelo,
  };
}

