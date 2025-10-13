/**
 * Hook otimizado para carregar guindastes com lazy loading de detalhes
 * Carrega lista rápida primeiro, depois busca detalhes sob demanda
 */

import { useState, useEffect, useCallback } from 'react';
import { db } from '../config/supabase';

export function useGuindastesOptimized() {
  const [guindastes, setGuindastes] = useState([]);
  const [guindastesCompletos, setGuindastesCompletos] = useState(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  /**
   * Carrega lista leve de guindastes (rápido)
   */
  const loadGuindastesLite = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data } = await db.getGuindastesLite({ 
        page: 1, 
        pageSize: 200 
      });
      
      console.log('✅ Lista de guindastes carregada:', data.length);
      setGuindastes(data || []);
      
      return data;
    } catch (error) {
      console.error('❌ Erro ao carregar lista de guindastes:', error);
      setGuindastes([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Busca detalhes completos de um guindaste específico
   */
  const loadGuindasteDetalhes = useCallback(async (guindasteId) => {
    // Se já temos os detalhes em cache, retornar
    if (guindastesCompletos.has(guindasteId)) {
      return guindastesCompletos.get(guindasteId);
    }

    try {
      const detalhes = await db.getGuindasteCompleto(guindasteId);
      
      // Armazenar em cache local
      setGuindastesCompletos(prev => {
        const newMap = new Map(prev);
        newMap.set(guindasteId, detalhes);
        return newMap;
      });
      
      return detalhes;
    } catch (error) {
      console.error(`❌ Erro ao carregar detalhes do guindaste ${guindasteId}:`, error);
      return null;
    }
  }, [guindastesCompletos]);

  /**
   * Pré-carrega detalhes dos guindastes visíveis (lazy loading inteligente)
   */
  const preloadVisibleDetails = useCallback(async (visibleIds) => {
    if (!visibleIds || visibleIds.length === 0) return;

    // Filtrar apenas IDs que ainda não temos
    const idsToLoad = visibleIds.filter(id => !guindastesCompletos.has(id));
    
    if (idsToLoad.length === 0) return;

    try {
      setIsLoadingDetails(true);
      console.log(`🔄 Pré-carregando ${idsToLoad.length} guindastes...`);
      
      const detalhes = await db.getGuindastesCompletos(idsToLoad);
      
      // Armazenar todos em cache
      setGuindastesCompletos(prev => {
        const newMap = new Map(prev);
        detalhes.forEach(item => {
          newMap.set(item.id, item);
        });
        return newMap;
      });
      
      console.log(`✅ ${detalhes.length} guindastes pré-carregados`);
    } catch (error) {
      console.error('❌ Erro ao pré-carregar detalhes:', error);
    } finally {
      setIsLoadingDetails(false);
    }
  }, [guindastesCompletos]);

  /**
   * Retorna guindaste com detalhes se disponível, senão retorna versão lite
   */
  const getGuindasteWithDetails = useCallback((guindasteId) => {
    const guindasteCompleto = guindastesCompletos.get(guindasteId);
    
    if (guindasteCompleto) {
      return guindasteCompleto;
    }
    
    // Retornar versão lite se detalhes não estão disponíveis ainda
    return guindastes.find(g => g.id === guindasteId);
  }, [guindastes, guindastesCompletos]);

  /**
   * Carrega lista inicial ao montar e depois pre-carrega detalhes em background
   */
  useEffect(() => {
    const loadData = async () => {
      // 1. Carregar lista leve primeiro (rápido)
      const lista = await loadGuindastesLite();
      
      // 2. Após 500ms, começar a carregar detalhes em background
      if (lista && lista.length > 0) {
        setTimeout(() => {
          const ids = lista.map(g => g.id);
          preloadVisibleDetails(ids);
        }, 500);
      }
    };
    
    loadData();
  }, [loadGuindastesLite, preloadVisibleDetails]);

  return {
    guindastes,
    guindastesCompletos: Array.from(guindastesCompletos.values()),
    isLoading,
    isLoadingDetails,
    loadGuindastesLite,
    loadGuindasteDetalhes,
    preloadVisibleDetails,
    getGuindasteWithDetails
  };
}

