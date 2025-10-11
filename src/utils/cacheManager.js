/**
 * Sistema de Cache In-Memory Simples
 * 
 * Cache com TTL (Time To Live) para otimizar requisições repetidas
 * Ideal para dados que não mudam frequentemente (guindastes, clientes, etc)
 * 
 * Princípios aplicados:
 * - KISS: Implementação simples sem dependências externas
 * - YAGNI: Apenas funcionalidades necessárias
 * - DRY: Centraliza lógica de cache
 * 
 * @author SpecEngineer
 */

class CacheManager {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutos em millisegundos
  }

  /**
   * Gera chave única baseada nos parâmetros
   * @param {string} key - Identificador base
   * @param {Object} params - Parâmetros da consulta
   * @returns {string} Chave única
   */
  generateKey(key, params = {}) {
    const paramsString = JSON.stringify(params);
    return `${key}:${paramsString}`;
  }

  /**
   * Armazena valor no cache
   * @param {string} key - Chave do cache
   * @param {any} value - Valor a ser armazenado
   * @param {number} ttl - Tempo de vida em ms (opcional)
   */
  set(key, value, ttl = this.defaultTTL) {
    const expiresAt = Date.now() + ttl;
    this.cache.set(key, {
      value,
      expiresAt,
      createdAt: Date.now()
    });
  }

  /**
   * Recupera valor do cache
   * @param {string} key - Chave do cache
   * @returns {any|null} Valor armazenado ou null se expirado/inexistente
   */
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Verifica se expirou
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * Verifica se existe no cache e está válido
   * @param {string} key - Chave do cache
   * @returns {boolean}
   */
  has(key) {
    return this.get(key) !== null;
  }

  /**
   * Invalida entrada específica do cache
   * @param {string} key - Chave do cache
   */
  invalidate(key) {
    this.cache.delete(key);
  }

  /**
   * Invalida múltiplas entradas por padrão
   * @param {string} pattern - Padrão da chave (ex: "guindastes:")
   */
  invalidatePattern(pattern) {
    const keysToDelete = [];
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Limpa todo o cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Retorna estatísticas do cache
   * @returns {Object} Estatísticas
   */
  getStats() {
    let validEntries = 0;
    let expiredEntries = 0;
    const now = Date.now();

    for (const item of this.cache.values()) {
      if (now > item.expiresAt) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    }

    return {
      total: this.cache.size,
      valid: validEntries,
      expired: expiredEntries
    };
  }

  /**
   * Remove entradas expiradas (garbage collection)
   */
  cleanup() {
    const now = Date.now();
    const keysToDelete = [];

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    
    return keysToDelete.length;
  }
}

// Instância singleton
const cacheManager = new CacheManager();

// Cleanup automático a cada 2 minutos
if (typeof window !== 'undefined') {
  setInterval(() => {
    const removed = cacheManager.cleanup();
    if (removed > 0) {
      console.log(`🧹 Cache cleanup: ${removed} entradas expiradas removidas`);
    }
  }, 2 * 60 * 1000);
}

// Função de debug global para limpar cache manualmente
if (typeof window !== 'undefined') {
  window.clearGuindastesCache = () => {
    cacheManager.invalidatePattern('guindastes:');
    console.log('✅ Cache de guindastes limpo! Recarregue a página.');
  };
}

export default cacheManager;

/**
 * Hook personalizado para usar cache com async functions
 * @param {Function} asyncFn - Função assíncrona a ser executada
 * @param {string} cacheKey - Chave base do cache
 * @param {Object} params - Parâmetros da função
 * @param {number} ttl - TTL customizado (opcional)
 * @returns {Promise<any>} Resultado (do cache ou da função)
 */
export async function withCache(asyncFn, cacheKey, params = {}, ttl = undefined) {
  const fullKey = cacheManager.generateKey(cacheKey, params);
  
  // Tenta recuperar do cache
  const cached = cacheManager.get(fullKey);
  if (cached !== null) {
    console.log(`✅ Cache HIT: ${cacheKey}`, params);
    return cached;
  }

  // Se não está no cache, executa a função
  console.log(`❌ Cache MISS: ${cacheKey}`, params);
  const result = await asyncFn();
  
  // Armazena no cache
  cacheManager.set(fullKey, result, ttl);
  
  return result;
}

