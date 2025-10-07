/**
 * Otimizador de Guindastes para Performance
 * @description Sistema de cache e otimização para carregamento rápido de guindastes
 */

import { db } from '../config/supabase';

// Cache em memória
const cache = {
  guindastes: null,
  capacidades: null,
  modelos: null,
  lastUpdate: null,
  cacheTimeout: 5 * 60 * 1000, // 5 minutos
};

// Configurações de performance
const PERFORMANCE_CONFIG = {
  MAX_CAPACIDADES: 20,
  MAX_MODELOS: 50,
  CACHE_TIMEOUT: 5 * 60 * 1000, // 5 minutos
  DEBOUNCE_DELAY: 300, // 300ms
};

/**
 * Verificar se o cache é válido
 */
const isCacheValid = () => {
  if (!cache.lastUpdate) return false;
  return Date.now() - cache.lastUpdate < cache.cacheTimeout;
};

/**
 * Carregar guindastes com cache otimizado
 */
export const loadGuindastesOptimized = async (forceRefresh = false) => {
  try {
    // Verificar cache se não for refresh forçado
    if (!forceRefresh && isCacheValid() && cache.guindastes) {
      console.log('📦 Usando cache de guindastes');
      return {
        guindastes: cache.guindastes,
        capacidades: cache.capacidades,
        modelos: cache.modelos,
        fromCache: true
      };
    }

    console.log('🔄 Carregando guindastes do banco...');
    const startTime = Date.now();

    // Carregar apenas campos essenciais
    const { data: guindastesData } = await db.getGuindastesLite({ 
      page: 1, 
      pageSize: 200 // Aumentar limite para ter todos os guindastes
    });

    if (!guindastesData || guindastesData.length === 0) {
      throw new Error('Nenhum guindaste encontrado');
    }

    // Processar dados para otimizar consultas
    const processedData = processGuindastesData(guindastesData);
    
    // Atualizar cache
    cache.guindastes = processedData.guindastes;
    cache.capacidades = processedData.capacidades;
    cache.modelos = processedData.modelos;
    cache.lastUpdate = Date.now();

    const loadTime = Date.now() - startTime;
    console.log(`✅ Guindastes carregados em ${loadTime}ms`);

    return {
      guindastes: processedData.guindastes,
      capacidades: processedData.capacidades,
      modelos: processedData.modelos,
      fromCache: false,
      loadTime
    };

  } catch (error) {
    console.error('❌ Erro ao carregar guindastes:', error);
    
    // Retornar cache mesmo se expirado em caso de erro
    if (cache.guindastes) {
      console.log('⚠️ Usando cache expirado devido a erro');
      return {
        guindastes: cache.guindastes,
        capacidades: cache.capacidades,
        modelos: cache.modelos,
        fromCache: true,
        error: error.message
      };
    }
    
    throw error;
  }
};

/**
 * Processar dados dos guindastes para otimização
 */
const processGuindastesData = (guindastesData) => {
  const guindastes = [];
  const capacidadesSet = new Set();
  const modelosMap = new Map();

  guindastesData.forEach(guindaste => {
    // Processar guindaste
    const processedGuindaste = {
      id: guindaste.id,
      subgrupo: guindaste.subgrupo,
      modelo: guindaste.modelo,
      imagem_url: guindaste.imagem_url,
      grafico_carga_url: guindaste.grafico_carga_url,
      peso_kg: guindaste.peso_kg,
      codigo_referencia: guindaste.codigo_referencia,
      configuração: guindaste.configuração,
      tem_contr: guindaste.tem_contr,
      descricao: guindaste.descricao,
      nao_incluido: guindaste.nao_incluido,
      imagens_adicionais: guindaste.imagens_adicionais,
      updated_at: guindaste.updated_at
    };

    guindastes.push(processedGuindaste);

    // Extrair capacidade
    const capacidade = extractCapacidade(guindaste.subgrupo);
    if (capacidade) {
      capacidadesSet.add(capacidade);
    }

    // Extrair modelo
    const modelo = extractModelo(guindaste.subgrupo);
    if (modelo) {
      if (!modelosMap.has(modelo)) {
        modelosMap.set(modelo, []);
      }
      modelosMap.get(modelo).push(processedGuindaste);
    }
  });

  // Converter sets e maps para arrays
  const capacidades = Array.from(capacidadesSet)
    .sort((a, b) => parseFloat(a) - parseFloat(b))
    .slice(0, PERFORMANCE_CONFIG.MAX_CAPACIDADES);

  const modelos = Array.from(modelosMap.entries())
    .map(([modelo, guindastes]) => ({
      modelo,
      guindastes: guindastes.slice(0, PERFORMANCE_CONFIG.MAX_MODELOS),
      count: guindastes.length
    }))
    .sort((a, b) => a.modelo.localeCompare(b.modelo));

  return {
    guindastes,
    capacidades,
    modelos
  };
};

/**
 * Extrair capacidade do subgrupo
 */
const extractCapacidade = (subgrupo) => {
  if (!subgrupo) return null;
  
  const match = subgrupo.match(/(\d+\.?\d*)/);
  return match ? match[1] : null;
};

/**
 * Extrair modelo do subgrupo
 */
const extractModelo = (subgrupo) => {
  if (!subgrupo) return null;
  
  // Remover "Guindaste" do início e pegar os primeiros 2 termos
  const modeloBase = subgrupo.replace(/^(Guindaste\s+)+/, '').split(' ').slice(0, 2).join(' ');
  return modeloBase || null;
};

/**
 * Obter capacidades únicas (otimizado)
 */
export const getCapacidadesUnicas = () => {
  if (!cache.capacidades) {
    console.warn('⚠️ Cache de capacidades não disponível');
    return [];
  }
  
  return [...cache.capacidades];
};

/**
 * Obter modelos por capacidade (otimizado)
 */
export const getModelosPorCapacidade = (capacidade) => {
  if (!cache.modelos) {
    console.warn('⚠️ Cache de modelos não disponível');
    return [];
  }
  
  return cache.modelos
    .filter(item => {
      const match = item.modelo.match(/(\d+\.?\d*)/);
      return match && match[1] === capacidade;
    })
    .map(item => item.guindastes[0]); // Pegar o primeiro guindaste do modelo
};

/**
 * Obter guindastes por modelo (otimizado)
 */
export const getGuindastesPorModelo = (modelo) => {
  if (!cache.guindastes) {
    console.warn('⚠️ Cache de guindastes não disponível');
    return [];
  }
  
  return cache.guindastes.filter(guindaste => {
    const modeloBase = extractModelo(guindaste.subgrupo);
    return modeloBase === modelo;
  });
};

/**
 * Buscar guindaste por ID (otimizado)
 */
export const getGuindasteById = (id) => {
  if (!cache.guindastes) {
    console.warn('⚠️ Cache de guindastes não disponível');
    return null;
  }
  
  return cache.guindastes.find(guindaste => guindaste.id === id);
};

/**
 * Buscar guindastes por termo (otimizado)
 */
export const searchGuindastes = (termo) => {
  if (!cache.guindastes) {
    console.warn('⚠️ Cache de guindastes não disponível');
    return [];
  }
  
  if (!termo || termo.trim() === '') {
    return cache.guindastes;
  }
  
  const searchTerm = termo.toLowerCase().trim();
  
  return cache.guindastes.filter(guindaste => {
    return (
      guindaste.subgrupo?.toLowerCase().includes(searchTerm) ||
      guindaste.modelo?.toLowerCase().includes(searchTerm) ||
      guindaste.codigo_referencia?.toLowerCase().includes(searchTerm)
    );
  });
};

/**
 * Limpar cache
 */
export const clearCache = () => {
  cache.guindastes = null;
  cache.capacidades = null;
  cache.modelos = null;
  cache.lastUpdate = null;
  console.log('🗑️ Cache de guindastes limpo');
};

/**
 * Obter estatísticas do cache
 */
export const getCacheStats = () => {
  return {
    hasGuindastes: !!cache.guindastes,
    hasCapacidades: !!cache.capacidades,
    hasModelos: !!cache.modelos,
    lastUpdate: cache.lastUpdate,
    isValid: isCacheValid(),
    guindastesCount: cache.guindastes?.length || 0,
    capacidadesCount: cache.capacidades?.length || 0,
    modelosCount: cache.modelos?.length || 0
  };
};

/**
 * Pré-carregar dados essenciais
 */
export const preloadEssentialData = async () => {
  try {
    console.log('🚀 Pré-carregando dados essenciais...');
    const startTime = Date.now();
    
    const result = await loadGuindastesOptimized();
    
    const loadTime = Date.now() - startTime;
    console.log(`✅ Dados essenciais carregados em ${loadTime}ms`);
    
    return result;
  } catch (error) {
    console.error('❌ Erro ao pré-carregar dados:', error);
    throw error;
  }
};

/**
 * Hook para debounce
 */
export const useDebounce = (value, delay = PERFORMANCE_CONFIG.DEBOUNCE_DELAY) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export default {
  loadGuindastesOptimized,
  getCapacidadesUnicas,
  getModelosPorCapacidade,
  getGuindastesPorModelo,
  getGuindasteById,
  searchGuindastes,
  clearCache,
  getCacheStats,
  preloadEssentialData,
  useDebounce
};
