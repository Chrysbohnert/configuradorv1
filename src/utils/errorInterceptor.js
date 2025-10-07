import logger, { LOG_CATEGORIES, LOG_LEVELS } from './logger';

/**
 * Interceptador de erros para logging automático
 */
class ErrorInterceptor {
  constructor() {
    this.originalConsoleError = console.error;
    this.originalConsoleWarn = console.warn;
    this.originalConsoleInfo = console.info;
    this.originalConsoleDebug = console.debug;
    this.setupGlobalErrorHandlers();
    this.setupConsoleInterceptors();
    this.setupUnhandledRejectionHandler();
  }

  /**
   * Configurar handlers globais de erro
   */
  setupGlobalErrorHandlers() {
    // Handler para erros não capturados
    window.addEventListener('error', (event) => {
      this.handleError('Uncaught Error', event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        message: event.message
      });
    });

    // Handler para erros de Promise rejeitadas
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError('Unhandled Promise Rejection', event.reason, {
        promise: event.promise
      });
    });

    // Handler para erros de recursos
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.handleError('Resource Error', new Error(`Failed to load ${event.target.src || event.target.href}`), {
          tagName: event.target.tagName,
          src: event.target.src || event.target.href
        });
      }
    }, true);
  }

  /**
   * Configurar interceptadores do console
   */
  setupConsoleInterceptors() {
    // Interceptar console.error
    console.error = (...args) => {
      this.originalConsoleError.apply(console, args);
      this.handleConsoleLog(LOG_LEVELS.ERROR, args);
    };

    // Interceptar console.warn
    console.warn = (...args) => {
      this.originalConsoleWarn.apply(console, args);
      this.handleConsoleLog(LOG_LEVELS.WARN, args);
    };

    // Interceptar console.info
    console.info = (...args) => {
      this.originalConsoleInfo.apply(console, args);
      this.handleConsoleLog(LOG_LEVELS.INFO, args);
    };

    // Interceptar console.debug
    console.debug = (...args) => {
      this.originalConsoleDebug.apply(console, args);
      this.handleConsoleLog(LOG_LEVELS.DEBUG, args);
    };
  }

  /**
   * Configurar handler para Promise rejeitadas
   */
  setupUnhandledRejectionHandler() {
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError('Unhandled Promise Rejection', event.reason, {
        promise: event.promise
      });
    });
  }

  /**
   * Manipular erros
   */
  handleError(message, error, context = {}) {
    try {
      // Determinar categoria baseada no contexto
      let category = LOG_CATEGORIES.SYSTEM;
      
      if (context.filename && context.filename.includes('auth')) {
        category = LOG_CATEGORIES.AUTH;
      } else if (context.filename && context.filename.includes('api')) {
        category = LOG_CATEGORIES.API;
      } else if (context.filename && context.filename.includes('ui')) {
        category = LOG_CATEGORIES.UI;
      } else if (context.filename && context.filename.includes('performance')) {
        category = LOG_CATEGORIES.PERFORMANCE;
      }

      // Log do erro
      logger.error(category, message, context, error);

      // Log adicional para erros críticos
      if (error && error.name === 'ChunkLoadError') {
        logger.warn(LOG_CATEGORIES.SYSTEM, 'Chunk load error - possible network issue', {
          error: error.message,
          context
        });
      }

    } catch (logError) {
      // Fallback para evitar loops infinitos
      this.originalConsoleError('Erro ao fazer log:', logError);
    }
  }

  /**
   * Manipular logs do console
   */
  handleConsoleLog(level, args) {
    try {
      // Extrair mensagem e dados dos argumentos
      const message = args[0] || '';
      const data = args.slice(1);

      // Determinar categoria baseada na mensagem
      let category = LOG_CATEGORIES.SYSTEM;
      
      if (message.includes('auth') || message.includes('login') || message.includes('logout')) {
        category = LOG_CATEGORIES.AUTH;
      } else if (message.includes('api') || message.includes('fetch') || message.includes('request')) {
        category = LOG_CATEGORIES.API;
      } else if (message.includes('ui') || message.includes('component') || message.includes('render')) {
        category = LOG_CATEGORIES.UI;
      } else if (message.includes('performance') || message.includes('slow') || message.includes('timeout')) {
        category = LOG_CATEGORIES.PERFORMANCE;
      } else if (message.includes('user') || message.includes('action') || message.includes('click')) {
        category = LOG_CATEGORIES.USER;
      } else if (message.includes('security') || message.includes('permission') || message.includes('access')) {
        category = LOG_CATEGORIES.SECURITY;
      }

      // Log baseado no nível
      if (level === LOG_LEVELS.ERROR) {
        logger.error(category, message, data);
      } else if (level === LOG_LEVELS.WARN) {
        logger.warn(category, message, data);
      } else if (level === LOG_LEVELS.INFO) {
        logger.info(category, message, data);
      } else if (level === LOG_LEVELS.DEBUG) {
        logger.debug(category, message, data);
      }

    } catch (logError) {
      // Fallback para evitar loops infinitos
      this.originalConsoleError('Erro ao fazer log do console:', logError);
    }
  }

  /**
   * Interceptar erros de fetch/API
   */
  interceptFetch() {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const startTime = Date.now();
      const url = args[0];
      const options = args[1] || {};
      
      try {
        const response = await originalFetch(...args);
        const duration = Date.now() - startTime;
        
        // Log da requisição
        logger.api(
          options.method || 'GET',
          url,
          response.status,
          duration,
          {
            headers: options.headers,
            body: options.body
          }
        );
        
        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        // Log do erro
        logger.error(LOG_CATEGORIES.API, `Fetch error: ${url}`, {
          method: options.method || 'GET',
          url,
          duration,
          error: error.message
        }, error);
        
        throw error;
      }
    };
  }

  /**
   * Interceptar erros de XMLHttpRequest
   */
  interceptXHR() {
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
      this._method = method;
      this._url = url;
      this._startTime = Date.now();
      return originalXHROpen.apply(this, [method, url, ...args]);
    };
    
    XMLHttpRequest.prototype.send = function(data) {
      this.addEventListener('load', () => {
        const duration = Date.now() - this._startTime;
        logger.api(this._method, this._url, this.status, duration, {
          data: data
        });
      });
      
      this.addEventListener('error', (event) => {
        const duration = Date.now() - this._startTime;
        logger.error(LOG_CATEGORIES.API, `XHR error: ${this._url}`, {
          method: this._method,
          url: this._url,
          duration,
          error: event.type
        });
      });
      
      return originalXHRSend.apply(this, [data]);
    };
  }

  /**
   * Interceptar erros de React
   */
  interceptReactErrors() {
    // Interceptar erros de render do React
    const originalGetDerivedStateFromError = React.Component.getDerivedStateFromError;
    
    if (originalGetDerivedStateFromError) {
      React.Component.getDerivedStateFromError = function(error) {
        logger.error(LOG_CATEGORIES.UI, 'React render error', {
          component: this.constructor.name,
          error: error.message
        }, error);
        
        return originalGetDerivedStateFromError.call(this, error);
      };
    }
  }

  /**
   * Interceptar erros de performance
   */
  interceptPerformanceErrors() {
    // Interceptar erros de performance
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'navigation') {
            logger.performance('Page Load', entry.loadEventEnd - entry.loadEventStart, {
              domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
              firstPaint: entry.firstPaint,
              firstContentfulPaint: entry.firstContentfulPaint
            });
          }
        });
      });
      
      observer.observe({ entryTypes: ['navigation', 'paint'] });
    }
  }

  /**
   * Inicializar todos os interceptadores
   */
  initialize() {
    this.interceptFetch();
    this.interceptXHR();
    this.interceptPerformanceErrors();
    
    // Log de inicialização
    logger.info(LOG_CATEGORIES.SYSTEM, 'Error interceptor initialized', {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });
  }

  /**
   * Restaurar console original
   */
  restore() {
    console.error = this.originalConsoleError;
    console.warn = this.originalConsoleWarn;
    console.info = this.originalConsoleInfo;
    console.debug = this.originalConsoleDebug;
  }
}

// Instância singleton
const errorInterceptor = new ErrorInterceptor();

// Inicializar automaticamente
errorInterceptor.initialize();

export default errorInterceptor;
