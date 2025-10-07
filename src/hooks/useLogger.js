import { useCallback, useEffect, useRef } from 'react';
import logger, { LOG_CATEGORIES, LOG_LEVELS } from '../utils/logger';

/**
 * Hook personalizado para logging
 * @param {string} componentName - Nome do componente
 * @param {string} category - Categoria do log
 * @returns {Object} Funções de logging
 */
export const useLogger = (componentName, category = LOG_CATEGORIES.UI) => {
  const componentRef = useRef(componentName);
  const startTimeRef = useRef(null);

  // Atualizar referência do componente
  useEffect(() => {
    componentRef.current = componentName;
  }, [componentName]);

  // Log de erro
  const logError = useCallback((message, data = null, error = null) => {
    logger.error(category, `[${componentRef.current}] ${message}`, data, error);
  }, [category]);

  // Log de aviso
  const logWarn = useCallback((message, data = null) => {
    logger.warn(category, `[${componentRef.current}] ${message}`, data);
  }, [category]);

  // Log de informação
  const logInfo = useCallback((message, data = null) => {
    logger.info(category, `[${componentRef.current}] ${message}`, data);
  }, [category]);

  // Log de debug
  const logDebug = useCallback((message, data = null) => {
    logger.debug(category, `[${componentRef.current}] ${message}`, data);
  }, [category]);

  // Log de performance
  const logPerformance = useCallback((operation, duration, data = null) => {
    logger.performance(`${componentRef.current}: ${operation}`, duration, data);
  }, []);

  // Log de ação do usuário
  const logUserAction = useCallback((action, data = null) => {
    logger.userAction(`${componentRef.current}: ${action}`, data);
  }, []);

  // Medir tempo de execução
  const startTimer = useCallback((operation) => {
    startTimeRef.current = { operation, startTime: Date.now() };
    logDebug(`Timer started for: ${operation}`);
  }, [logDebug]);

  const endTimer = useCallback((operation, data = null) => {
    if (startTimeRef.current && startTimeRef.current.operation === operation) {
      const duration = Date.now() - startTimeRef.current.startTime;
      logPerformance(operation, duration, data);
      startTimeRef.current = null;
      return duration;
    }
    return null;
  }, [logPerformance]);

  // Log de ciclo de vida do componente
  const logLifecycle = useCallback((lifecycle, data = null) => {
    logDebug(`Component ${lifecycle}`, data);
  }, [logDebug]);

  // Log de estado
  const logState = useCallback((stateName, oldValue, newValue) => {
    logDebug(`State changed: ${stateName}`, { oldValue, newValue });
  }, [logDebug]);

  // Log de props
  const logProps = useCallback((props) => {
    logDebug('Props received', props);
  }, [logDebug]);

  // Log de render
  const logRender = useCallback((reason = 'unknown') => {
    logDebug(`Component rendered (reason: ${reason})`);
  }, [logDebug]);

  // Log de erro de render
  const logRenderError = useCallback((error, errorInfo) => {
    logError('Render error', { errorInfo }, error);
  }, [logError]);

  // Log de API call
  const logApiCall = useCallback((method, url, status, duration, data = null) => {
    logger.api(method, url, status, duration, data);
  }, []);

  // Log de segurança
  const logSecurity = useCallback((event, data = null) => {
    logger.security(`${componentRef.current}: ${event}`, data);
  }, []);

  // Log de validação
  const logValidation = useCallback((field, isValid, message = null) => {
    const level = isValid ? 'info' : 'warn';
    const logMessage = `Validation: ${field} - ${isValid ? 'valid' : 'invalid'}`;
    const logData = { field, isValid, message };
    
    if (level === 'info') {
      logInfo(logMessage, logData);
    } else {
      logWarn(logMessage, logData);
    }
  }, [logInfo, logWarn]);

  // Log de formulário
  const logFormAction = useCallback((action, data = null) => {
    logUserAction(`Form ${action}`, data);
  }, [logUserAction]);

  // Log de navegação
  const logNavigation = useCallback((from, to, data = null) => {
    logUserAction(`Navigation: ${from} → ${to}`, data);
  }, [logUserAction]);

  // Log de interação
  const logInteraction = useCallback((element, action, data = null) => {
    logUserAction(`Interaction: ${element} ${action}`, data);
  }, [logUserAction]);

  // Log de erro de validação
  const logValidationError = useCallback((field, error, data = null) => {
    logError(`Validation error: ${field}`, data, error);
  }, [logError]);

  // Log de sucesso
  const logSuccess = useCallback((action, data = null) => {
    logInfo(`Success: ${action}`, data);
  }, [logInfo]);

  // Log de falha
  const logFailure = useCallback((action, error, data = null) => {
    logError(`Failure: ${action}`, data, error);
  }, [logError]);

  // Log de loading
  const logLoading = useCallback((action, isLoading) => {
    logDebug(`Loading: ${action} - ${isLoading ? 'started' : 'finished'}`);
  }, [logDebug]);

  // Log de cache
  const logCache = useCallback((action, key, data = null) => {
    logDebug(`Cache: ${action} - ${key}`, data);
  }, [logDebug]);

  // Log de storage
  const logStorage = useCallback((action, key, data = null) => {
    logDebug(`Storage: ${action} - ${key}`, data);
  }, [logDebug]);

  // Log de network
  const logNetwork = useCallback((action, url, data = null) => {
    logDebug(`Network: ${action} - ${url}`, data);
  }, [logDebug]);

  // Log de auth
  const logAuth = useCallback((action, data = null) => {
    logger.info(LOG_CATEGORIES.AUTH, `[${componentRef.current}] Auth: ${action}`, data);
  }, []);

  // Log de UI
  const logUI = useCallback((action, data = null) => {
    logger.info(LOG_CATEGORIES.UI, `[${componentRef.current}] UI: ${action}`, data);
  }, []);

  // Log de sistema
  const logSystem = useCallback((action, data = null) => {
    logger.info(LOG_CATEGORIES.SYSTEM, `[${componentRef.current}] System: ${action}`, data);
  }, []);

  // Log de performance
  const logPerf = useCallback((action, duration, data = null) => {
    logger.info(LOG_CATEGORIES.PERFORMANCE, `[${componentRef.current}] Performance: ${action}`, { duration, ...data });
  }, []);

  // Log de usuário
  const logUser = useCallback((action, data = null) => {
    logger.info(LOG_CATEGORIES.USER, `[${componentRef.current}] User: ${action}`, data);
  }, []);

  // Log de API
  const logApi = useCallback((action, data = null) => {
    logger.info(LOG_CATEGORIES.API, `[${componentRef.current}] API: ${action}`, data);
  }, []);

  // Log de segurança
  const logSec = useCallback((action, data = null) => {
    logger.warn(LOG_CATEGORIES.SECURITY, `[${componentRef.current}] Security: ${action}`, data);
  }, []);

  // Retornar todas as funções de logging
  return {
    // Funções básicas
    logError,
    logWarn,
    logInfo,
    logDebug,
    logPerformance,
    logUserAction,
    logSecurity,
    
    // Funções de ciclo de vida
    logLifecycle,
    logState,
    logProps,
    logRender,
    logRenderError,
    
    // Funções de timer
    startTimer,
    endTimer,
    
    // Funções de API
    logApiCall,
    
    // Funções de validação
    logValidation,
    logValidationError,
    
    // Funções de formulário
    logFormAction,
    
    // Funções de navegação
    logNavigation,
    
    // Funções de interação
    logInteraction,
    
    // Funções de resultado
    logSuccess,
    logFailure,
    
    // Funções de loading
    logLoading,
    
    // Funções de cache
    logCache,
    
    // Funções de storage
    logStorage,
    
    // Funções de network
    logNetwork,
    
    // Funções por categoria
    logAuth,
    logUI,
    logSystem,
    logPerf,
    logUser,
    logApi,
    logSec
  };
};

export default useLogger;
