/**
 * Sistema de Logging Centralizado
 * @description Sistema completo de logging para monitoramento e debugging
 */

// Níveis de log
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
};

// Categorias de log
export const LOG_CATEGORIES = {
  AUTH: 'auth',
  API: 'api',
  UI: 'ui',
  PERFORMANCE: 'performance',
  USER: 'user',
  SYSTEM: 'system',
  SECURITY: 'security'
};

// Configuração do logger
const LOG_CONFIG = {
  level: import.meta.env.DEV ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO,
  enableConsole: true,
  enableStorage: true,
  enableAnalytics: true,
  maxLogs: 1000,
  storageKey: 'app_logs'
};

// Armazenamento de logs
let logs = [];
let logId = 0;

/**
 * Classe principal do Logger
 */
class Logger {
  constructor() {
    this.config = LOG_CONFIG;
    this.logs = logs;
    this.logId = logId;
    this.initializeStorage();
  }

  /**
   * Inicializar armazenamento
   */
  initializeStorage() {
    if (this.config.enableStorage) {
      try {
        const storedLogs = localStorage.getItem(this.config.storageKey);
        if (storedLogs) {
          this.logs = JSON.parse(storedLogs);
          this.logId = this.logs.length;
        }
      } catch (error) {
        console.error('Erro ao carregar logs do storage:', error);
      }
    }
  }

  /**
   * Salvar logs no storage
   */
  saveToStorage() {
    if (this.config.enableStorage) {
      try {
        // Manter apenas os últimos logs
        const recentLogs = this.logs.slice(-this.config.maxLogs);
        localStorage.setItem(this.config.storageKey, JSON.stringify(recentLogs));
      } catch (error) {
        console.error('Erro ao salvar logs no storage:', error);
      }
    }
  }

  /**
   * Verificar se deve logar baseado no nível
   */
  shouldLog(level) {
    const levelPriority = {
      [LOG_LEVELS.ERROR]: 4,
      [LOG_LEVELS.WARN]: 3,
      [LOG_LEVELS.INFO]: 2,
      [LOG_LEVELS.DEBUG]: 1
    };

    const currentPriority = levelPriority[this.config.level];
    const logPriority = levelPriority[level];

    return logPriority >= currentPriority;
  }

  /**
   * Criar entrada de log
   */
  createLogEntry(level, category, message, data = null, error = null) {
    const logEntry = {
      id: ++this.logId,
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data: data ? JSON.stringify(data) : null,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : null,
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.getCurrentUserId()
    };

    return logEntry;
  }

  /**
   * Obter ID do usuário atual
   */
  getCurrentUserId() {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user).id : null;
    } catch {
      return null;
    }
  }

  /**
   * Log de erro
   */
  error(category, message, data = null, error = null) {
    if (!this.shouldLog(LOG_LEVELS.ERROR)) return;

    const logEntry = this.createLogEntry(LOG_LEVELS.ERROR, category, message, data, error);
    this.logs.push(logEntry);

    if (this.config.enableConsole) {
      console.error(`[${category.toUpperCase()}] ${message}`, data, error);
    }

    this.saveToStorage();
    this.sendToAnalytics(logEntry);
  }

  /**
   * Log de aviso
   */
  warn(category, message, data = null) {
    if (!this.shouldLog(LOG_LEVELS.WARN)) return;

    const logEntry = this.createLogEntry(LOG_LEVELS.WARN, category, message, data);
    this.logs.push(logEntry);

    if (this.config.enableConsole) {
      console.warn(`[${category.toUpperCase()}] ${message}`, data);
    }

    this.saveToStorage();
    this.sendToAnalytics(logEntry);
  }

  /**
   * Log de informação
   */
  info(category, message, data = null) {
    if (!this.shouldLog(LOG_LEVELS.INFO)) return;

    const logEntry = this.createLogEntry(LOG_LEVELS.INFO, category, message, data);
    this.logs.push(logEntry);

    if (this.config.enableConsole) {
      console.info(`[${category.toUpperCase()}] ${message}`, data);
    }

    this.saveToStorage();
    this.sendToAnalytics(logEntry);
  }

  /**
   * Log de debug
   */
  debug(category, message, data = null) {
    if (!this.shouldLog(LOG_LEVELS.DEBUG)) return;

    const logEntry = this.createLogEntry(LOG_LEVELS.DEBUG, category, message, data);
    this.logs.push(logEntry);

    if (this.config.enableConsole) {
      console.debug(`[${category.toUpperCase()}] ${message}`, data);
    }

    this.saveToStorage();
    this.sendToAnalytics(logEntry);
  }

  /**
   * Log de performance
   */
  performance(operation, duration, data = null) {
    const message = `Performance: ${operation} took ${duration}ms`;
    this.info(LOG_CATEGORIES.PERFORMANCE, message, { operation, duration, ...data });
  }

  /**
   * Log de ação do usuário
   */
  userAction(action, data = null) {
    this.info(LOG_CATEGORIES.USER, `User action: ${action}`, data);
  }

  /**
   * Log de segurança
   */
  security(event, data = null) {
    this.warn(LOG_CATEGORIES.SECURITY, `Security event: ${event}`, data);
  }

  /**
   * Log de API
   */
  api(method, url, status, duration, data = null) {
    const message = `API ${method} ${url} - ${status} (${duration}ms)`;
    const level = status >= 400 ? LOG_LEVELS.ERROR : LOG_LEVELS.INFO;
    
    if (level === LOG_LEVELS.ERROR) {
      this.error(LOG_CATEGORIES.API, message, data);
    } else {
      this.info(LOG_CATEGORIES.API, message, data);
    }
  }

  /**
   * Enviar para analytics
   */
  sendToAnalytics(logEntry) {
    if (this.config.enableAnalytics && window.gtag) {
      try {
        window.gtag('event', 'log', {
          event_category: logEntry.category,
          event_label: logEntry.message,
          value: logEntry.level === LOG_LEVELS.ERROR ? 1 : 0
        });
      } catch (error) {
        console.error('Erro ao enviar log para analytics:', error);
      }
    }
  }

  /**
   * Obter logs
   */
  getLogs(filter = {}) {
    let filteredLogs = [...this.logs];

    if (filter.level) {
      filteredLogs = filteredLogs.filter(log => log.level === filter.level);
    }

    if (filter.category) {
      filteredLogs = filteredLogs.filter(log => log.category === filter.category);
    }

    if (filter.startDate) {
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= new Date(filter.startDate));
    }

    if (filter.endDate) {
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) <= new Date(filter.endDate));
    }

    return filteredLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * Limpar logs
   */
  clearLogs() {
    this.logs = [];
    this.logId = 0;
    if (this.config.enableStorage) {
      localStorage.removeItem(this.config.storageKey);
    }
  }

  /**
   * Exportar logs
   */
  exportLogs(format = 'json') {
    const logs = this.getLogs();
    
    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    } else if (format === 'csv') {
      const headers = ['timestamp', 'level', 'category', 'message', 'data', 'error'];
      const csv = [
        headers.join(','),
        ...logs.map(log => 
          headers.map(header => {
            const value = log[header] || '';
            return `"${value.toString().replace(/"/g, '""')}"`;
          }).join(',')
        )
      ].join('\n');
      return csv;
    }
    
    return logs;
  }

  /**
   * Obter estatísticas
   */
  getStats() {
    const stats = {
      total: this.logs.length,
      byLevel: {},
      byCategory: {},
      errors: 0,
      warnings: 0,
      last24h: 0
    };

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    this.logs.forEach(log => {
      // Por nível
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
      
      // Por categoria
      stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1;
      
      // Contadores
      if (log.level === LOG_LEVELS.ERROR) stats.errors++;
      if (log.level === LOG_LEVELS.WARN) stats.warnings++;
      
      // Últimas 24h
      if (new Date(log.timestamp) >= yesterday) stats.last24h++;
    });

    return stats;
  }
}

// Instância singleton do logger
const logger = new Logger();

// Exportar instância e utilitários
export default logger;

// Exportar funções de conveniência
export const logError = (category, message, data, error) => logger.error(category, message, data, error);
export const logWarn = (category, message, data) => logger.warn(category, message, data);
export const logInfo = (category, message, data) => logger.info(category, message, data);
export const logDebug = (category, message, data) => logger.debug(category, message, data);
export const logPerformance = (operation, duration, data) => logger.performance(operation, duration, data);
export const logUserAction = (action, data) => logger.userAction(action, data);
export const logSecurity = (event, data) => logger.security(event, data);
export const logApi = (method, url, status, duration, data) => logger.api(method, url, status, duration, data);

// Exportar funções de gerenciamento
export const getLogs = (filter) => logger.getLogs(filter);
export const clearLogs = () => logger.clearLogs();
export const exportLogs = (format) => logger.exportLogs(format);
export const getLogStats = () => logger.getStats();
