/**
 * Hook de Cache Otimizado com TTL e Invalidação Inteligente
 * Reduz requisições desnecessárias ao banco
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Cache global com TTL
 */
class CacheStore {
  constructor() {
    this.cache = new Map();
    this.timestamps = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutos
  }

  /**
   * Define um valor no cache com TTL
   */
  set(key, value, ttl = this.defaultTTL) {
    this.cache.set(key, value);
    this.timestamps.set(key, Date.now() + ttl);
  }

  /**
   * Obtém um valor do cache se ainda válido
   */
  get(key) {
    const timestamp = this.timestamps.get(key);
    
    if (!timestamp || Date.now() > timestamp) {
      // Cache expirado
      this.delete(key);
      return null;
    }
    
    return this.cache.get(key);
  }

  /**
   * Verifica se uma chave existe e é válida
   */
  has(key) {
    return this.get(key) !== null;
  }

  /**
   * Remove uma chave do cache
   */
  delete(key) {
    this.cache.delete(key);
    this.timestamps.delete(key);
  }

  /**
   * Limpa todo o cache
   */
  clear() {
    this.cache.clear();
    this.timestamps.clear();
  }

  /**
   * Limpa cache expirado
   */
  cleanup() {
    const now = Date.now();
    for (const [key, timestamp] of this.timestamps.entries()) {
      if (now > timestamp) {
        this.delete(key);
      }
    }
  }

  /**
   * Invalida cache por padrão (ex: todos os guindastes)
   */
  invalidatePattern(pattern) {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.delete(key);
      }
    }
  }
}

// Instância global do cache
const globalCache = new CacheStore();

// Cleanup automático a cada 10 minutos
setInterval(() => globalCache.cleanup(), 10 * 60 * 1000);

/**
 * Hook para usar cache otimizado
 */
export const useOptimizedCache = (key, fetcher, options = {}) => {
  const {
    ttl = 5 * 60 * 1000, // 5 minutos padrão
    enabled = true,
    onSuccess,
    onError,
    refetchOnMount = false,
  } = options;

  const [data, setData] = useState(() => globalCache.get(key));
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState(null);
  const isMountedRef = useRef(true);
  const fetcherRef = useRef(fetcher);

  // Atualiza fetcher ref
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  /**
   * Função para buscar dados
   */
  const fetchData = useCallback(async (force = false) => {
    if (!enabled) return;

    // Verifica cache primeiro
    if (!force) {
      const cached = globalCache.get(key);
      if (cached) {
        setData(cached);
        setLoading(false);
        return cached;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetcherRef.current();
      
      if (isMountedRef.current) {
        setData(result);
        setLoading(false);
        globalCache.set(key, result, ttl);
        
        if (onSuccess) {
          onSuccess(result);
        }
      }
      
      return result;
    } catch (err) {
      if (isMountedRef.current) {
        setError(err);
        setLoading(false);
        
        if (onError) {
          onError(err);
        }
      }
      throw err;
    }
  }, [key, enabled, ttl, onSuccess, onError]);

  /**
   * Invalida cache e recarrega
   */
  const refetch = useCallback(() => {
    globalCache.delete(key);
    return fetchData(true);
  }, [key, fetchData]);

  /**
   * Atualiza dados manualmente
   */
  const mutate = useCallback((newData) => {
    setData(newData);
    globalCache.set(key, newData, ttl);
  }, [key, ttl]);

  // Fetch inicial
  useEffect(() => {
    if (enabled && (refetchOnMount || !data)) {
      fetchData();
    }
  }, [enabled, refetchOnMount]); // Não incluir fetchData para evitar loops

  // Cleanup
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    data,
    loading,
    error,
    refetch,
    mutate,
    isStale: !globalCache.has(key),
  };
};

/**
 * Hook para invalidar cache
 */
export const useInvalidateCache = () => {
  return useCallback((keyOrPattern) => {
    if (typeof keyOrPattern === 'string' && keyOrPattern.includes('*')) {
      globalCache.invalidatePattern(keyOrPattern.replace('*', '.*'));
    } else {
      globalCache.delete(keyOrPattern);
    }
  }, []);
};

/**
 * Hook para limpar todo o cache
 */
export const useClearCache = () => {
  return useCallback(() => {
    globalCache.clear();
  }, []);
};

/**
 * Exporta instância do cache para uso direto
 */
export { globalCache };

export default useOptimizedCache;
