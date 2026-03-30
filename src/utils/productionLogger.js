/**
 * Sistema de Logging Condicional
 * Desabilita logs em produção automaticamente
 * Mantém logs em desenvolvimento para debugging
 */

const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

/**
 * Logger otimizado que só executa em desenvolvimento
 */
class ProductionLogger {
  constructor(context = 'App') {
    this.context = context;
    this.enabled = isDevelopment;
  }

  /**
   * Log informativo
   */
  log(...args) {
    if (this.enabled) {
      console.log(`[${this.context}]`, ...args);
    }
  }

  /**
   * Log de erro (sempre ativo, mas sem stack trace em produção)
   */
  error(...args) {
    if (isDevelopment) {
      console.error(`[${this.context}] ❌`, ...args);
    } else {
      // Em produção, apenas log básico sem detalhes sensíveis
      console.error(`[${this.context}] Erro detectado`);
    }
  }

  /**
   * Log de aviso
   */
  warn(...args) {
    if (this.enabled) {
      console.warn(`[${this.context}] ⚠️`, ...args);
    }
  }

  /**
   * Log de informação
   */
  info(...args) {
    if (this.enabled) {
      console.info(`[${this.context}] ℹ️`, ...args);
    }
  }

  /**
   * Log de debug (mais verboso)
   */
  debug(...args) {
    if (this.enabled) {
      console.debug(`[${this.context}] 🔍`, ...args);
    }
  }

  /**
   * Log de sucesso
   */
  success(...args) {
    if (this.enabled) {
      console.log(`[${this.context}] ✅`, ...args);
    }
  }

  /**
   * Agrupa logs relacionados
   */
  group(label, callback) {
    if (this.enabled) {
      console.group(`[${this.context}] ${label}`);
      callback();
      console.groupEnd();
    } else {
      // Em produção, apenas executa sem agrupar
      callback();
    }
  }

  /**
   * Mede tempo de execução
   */
  time(label) {
    if (this.enabled) {
      console.time(`[${this.context}] ${label}`);
    }
  }

  timeEnd(label) {
    if (this.enabled) {
      console.timeEnd(`[${this.context}] ${label}`);
    }
  }

  /**
   * Tabela formatada
   */
  table(data) {
    if (this.enabled) {
      console.table(data);
    }
  }
}

/**
 * Cria uma instância do logger para um contexto específico
 */
export const createLogger = (context) => {
  return new ProductionLogger(context);
};

/**
 * Logger global padrão
 */
export const logger = new ProductionLogger('Global');

/**
 * Substitui console global em produção (opcional - use com cuidado)
 */
export const disableConsoleInProduction = () => {
  if (isProduction) {
    const noop = () => {};
    console.log = noop;
    console.debug = noop;
    console.info = noop;
    console.warn = noop;
    // Mantém console.error para erros críticos
  }
};

/**
 * Inicializa otimizações de logging em produção
 * Chame no início da aplicação (main.jsx ou App.jsx)
 */
export const initProductionOptimizations = () => {
  if (isProduction) {
    disableConsoleInProduction();
    console.log('%c🚀 Aplicação em modo produção - Logs desabilitados', 'color: #4CAF50; font-weight: bold;');
  }
};

export default logger;
