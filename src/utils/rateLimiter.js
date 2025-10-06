/**
 * Sistema de Rate Limiting para proteção contra ataques de força bruta
 * @module utils/rateLimiter
 */

class RateLimiter {
  constructor() {
    // Map para armazenar tentativas por chave (IP, email, etc.)
    this.attempts = new Map();
    
    // Configurações padrão
    this.defaultConfig = {
      maxAttempts: 5,        // Máximo de tentativas
      windowMs: 15 * 60 * 1000,  // Janela de tempo: 15 minutos
      blockDurationMs: 15 * 60 * 1000  // Duração do bloqueio: 15 minutos
    };
  }

  /**
   * Verifica se uma chave está dentro do limite
   * @param {string} key - Chave única (IP, email, etc.)
   * @param {Object} config - Configurações opcionais
   * @returns {Object} - { allowed: boolean, remaining: number, resetTime: number }
   */
  checkLimit(key, config = {}) {
    const settings = { ...this.defaultConfig, ...config };
    const now = Date.now();
    
    // Buscar tentativas existentes para esta chave
    const keyData = this.attempts.get(key) || {
      attempts: [],
      blockedUntil: null
    };

    // Verificar se está bloqueado
    if (keyData.blockedUntil && now < keyData.blockedUntil) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: keyData.blockedUntil,
        reason: 'blocked'
      };
    }

    // Limpar tentativas antigas (fora da janela de tempo)
    const recentAttempts = keyData.attempts.filter(
      time => now - time < settings.windowMs
    );

    // Verificar se excedeu o limite
    if (recentAttempts.length >= settings.maxAttempts) {
      // Bloquear por um período
      keyData.blockedUntil = now + settings.blockDurationMs;
      keyData.attempts = recentAttempts;
      this.attempts.set(key, keyData);

      return {
        allowed: false,
        remaining: 0,
        resetTime: keyData.blockedUntil,
        reason: 'limit_exceeded'
      };
    }

    // Atualizar dados da chave
    keyData.attempts = recentAttempts;
    this.attempts.set(key, keyData);

    return {
      allowed: true,
      remaining: settings.maxAttempts - recentAttempts.length,
      resetTime: null,
      reason: 'allowed'
    };
  }

  /**
   * Registra uma tentativa (sucesso ou falha)
   * @param {string} key - Chave única
   * @param {boolean} success - Se a tentativa foi bem-sucedida
   * @param {Object} config - Configurações opcionais
   */
  recordAttempt(key, success, config = {}) {
    const settings = { ...this.defaultConfig, ...config };
    const now = Date.now();
    
    const keyData = this.attempts.get(key) || {
      attempts: [],
      blockedUntil: null
    };

    if (success) {
      // Se foi bem-sucedido, limpar todas as tentativas
      keyData.attempts = [];
      keyData.blockedUntil = null;
    } else {
      // Se falhou, adicionar tentativa
      keyData.attempts.push(now);
      
      // Limpar tentativas antigas
      keyData.attempts = keyData.attempts.filter(
        time => now - time < settings.windowMs
      );
    }

    this.attempts.set(key, keyData);
  }

  /**
   * Limpa tentativas de uma chave específica
   * @param {string} key - Chave única
   */
  clearAttempts(key) {
    this.attempts.delete(key);
  }

  /**
   * Limpa todas as tentativas (útil para testes)
   */
  clearAllAttempts() {
    this.attempts.clear();
  }

  /**
   * Obtém estatísticas de uma chave
   * @param {string} key - Chave única
   * @returns {Object} - Estatísticas da chave
   */
  getStats(key) {
    const keyData = this.attempts.get(key);
    if (!keyData) {
      return { attempts: 0, blocked: false, blockedUntil: null };
    }

    const now = Date.now();
    const recentAttempts = keyData.attempts.filter(
      time => now - time < this.defaultConfig.windowMs
    );

    return {
      attempts: recentAttempts.length,
      blocked: keyData.blockedUntil && now < keyData.blockedUntil,
      blockedUntil: keyData.blockedUntil,
      remaining: this.defaultConfig.maxAttempts - recentAttempts.length
    };
  }

  /**
   * Gera uma chave única baseada no IP e email
   * @param {string} ip - Endereço IP
   * @param {string} email - Email do usuário
   * @returns {string} - Chave única
   */
  generateKey(ip, email) {
    // Usar IP + email para identificar tentativas
    return `${ip}:${email}`.toLowerCase();
  }
}

// Instância única do rate limiter
export const rateLimiter = new RateLimiter();

// Função de conveniência para verificar limite
export const checkLoginLimit = (ip, email, config) => {
  const key = rateLimiter.generateKey(ip, email);
  return rateLimiter.checkLimit(key, config);
};

// Função de conveniência para registrar tentativa
export const recordLoginAttempt = (ip, email, success, config) => {
  const key = rateLimiter.generateKey(ip, email);
  rateLimiter.recordAttempt(key, success, config);
};

// Função para obter IP do cliente (simulada para desenvolvimento)
export const getClientIP = () => {
  // Em produção, isso viria do servidor
  // Para desenvolvimento, usar um IP fixo
  return '127.0.0.1';
};

// Função para debug (apenas em desenvolvimento)
if (import.meta.env.DEV) {
  window.rateLimiter = rateLimiter;
  window.checkLoginLimit = checkLoginLimit;
  window.recordLoginAttempt = recordLoginAttempt;
}
