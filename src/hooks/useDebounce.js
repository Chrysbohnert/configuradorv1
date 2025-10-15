/**
 * Hook de Debounce Otimizado
 * Reduz re-renders e requisições desnecessárias
 */

import { useState, useEffect, useRef } from 'react';

/**
 * Debounce de valor
 * @param {any} value - Valor a ser debounced
 * @param {number} delay - Delay em ms (padrão: 500ms)
 * @returns {any} Valor debounced
 */
export const useDebounce = (value, delay = 500) => {
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

/**
 * Debounce de callback
 * @param {Function} callback - Função a ser debounced
 * @param {number} delay - Delay em ms (padrão: 500ms)
 * @returns {Function} Função debounced
 */
export const useDebouncedCallback = (callback, delay = 500) => {
  const timeoutRef = useRef(null);
  const callbackRef = useRef(callback);

  // Atualiza callback ref
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  };
};

/**
 * Throttle de callback
 * @param {Function} callback - Função a ser throttled
 * @param {number} limit - Limite em ms (padrão: 500ms)
 * @returns {Function} Função throttled
 */
export const useThrottle = (callback, limit = 500) => {
  const inThrottle = useRef(false);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return (...args) => {
    if (!inThrottle.current) {
      callbackRef.current(...args);
      inThrottle.current = true;

      setTimeout(() => {
        inThrottle.current = false;
      }, limit);
    }
  };
};

export default useDebounce;
