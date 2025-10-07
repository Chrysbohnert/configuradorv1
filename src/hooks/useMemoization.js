import { useMemo, useCallback, useRef } from 'react';

/**
 * Hook personalizado para memoização avançada
 * @param {Function} factory - Função que cria o valor
 * @param {Array} deps - Dependências para memoização
 * @returns {any} Valor memoizado
 */
export const useStableMemo = (factory, deps) => {
  const ref = useRef();
  const prevDeps = useRef(deps);

  if (!ref.current || !areEqual(prevDeps.current, deps)) {
    ref.current = factory();
    prevDeps.current = deps;
  }

  return ref.current;
};

/**
 * Hook para memoizar callbacks com dependências estáveis
 * @param {Function} callback - Callback para memoizar
 * @param {Array} deps - Dependências
 * @returns {Function} Callback memoizado
 */
export const useStableCallback = (callback, deps) => {
  const ref = useRef();
  const prevDeps = useRef(deps);

  if (!ref.current || !areEqual(prevDeps.current, deps)) {
    ref.current = callback;
    prevDeps.current = deps;
  }

  return ref.current;
};

/**
 * Hook para memoizar objetos complexos
 * @param {Function} factory - Função que cria o objeto
 * @param {Array} deps - Dependências
 * @returns {Object} Objeto memoizado
 */
export const useStableObject = (factory, deps) => {
  return useStableMemo(() => {
    const result = factory();
    return result;
  }, deps);
};

/**
 * Hook para memoizar arrays
 * @param {Function} factory - Função que cria o array
 * @param {Array} deps - Dependências
 * @returns {Array} Array memoizado
 */
export const useStableArray = (factory, deps) => {
  return useStableMemo(() => {
    const result = factory();
    return result;
  }, deps);
};

/**
 * Hook para memoizar funções de comparação
 * @param {Function} compareFn - Função de comparação
 * @param {Array} deps - Dependências
 * @returns {Function} Função de comparação memoizada
 */
export const useStableCompare = (compareFn, deps) => {
  return useStableCallback(compareFn, deps);
};

/**
 * Hook para memoizar valores computados pesados
 * @param {Function} computeFn - Função de computação
 * @param {Array} deps - Dependências
 * @returns {any} Valor computado memoizado
 */
export const useHeavyComputation = (computeFn, deps) => {
  return useStableMemo(() => {
    console.log('Computando valor pesado...');
    return computeFn();
  }, deps);
};

/**
 * Hook para memoizar filtros de lista
 * @param {Array} items - Lista de itens
 * @param {Function} filterFn - Função de filtro
 * @param {Array} deps - Dependências
 * @returns {Array} Lista filtrada memoizada
 */
export const useFilteredList = (items, filterFn, deps) => {
  return useStableMemo(() => {
    if (!items || !Array.isArray(items)) return [];
    return items.filter(filterFn);
  }, [items, filterFn, ...deps]);
};

/**
 * Hook para memoizar ordenação de lista
 * @param {Array} items - Lista de itens
 * @param {Function} sortFn - Função de ordenação
 * @param {Array} deps - Dependências
 * @returns {Array} Lista ordenada memoizada
 */
export const useSortedList = (items, sortFn, deps) => {
  return useStableMemo(() => {
    if (!items || !Array.isArray(items)) return [];
    return [...items].sort(sortFn);
  }, [items, sortFn, ...deps]);
};

/**
 * Hook para memoizar agrupamento de lista
 * @param {Array} items - Lista de itens
 * @param {Function} groupFn - Função de agrupamento
 * @param {Array} deps - Dependências
 * @returns {Object} Lista agrupada memoizada
 */
export const useGroupedList = (items, groupFn, deps) => {
  return useStableMemo(() => {
    if (!items || !Array.isArray(items)) return {};
    return items.reduce((groups, item) => {
      const key = groupFn(item);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {});
  }, [items, groupFn, ...deps]);
};

/**
 * Função auxiliar para comparar arrays
 * @param {Array} a - Primeiro array
 * @param {Array} b - Segundo array
 * @returns {boolean} Se os arrays são iguais
 */
const areEqual = (a, b) => {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  
  return true;
};

/**
 * Hook para memoizar valores com timeout
 * @param {Function} factory - Função que cria o valor
 * @param {Array} deps - Dependências
 * @param {number} timeout - Timeout em ms
 * @returns {any} Valor memoizado com timeout
 */
export const useTimeoutMemo = (factory, deps, timeout = 1000) => {
  const ref = useRef();
  const timeoutRef = useRef();

  return useStableMemo(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      ref.current = factory();
    }, timeout);

    return ref.current;
  }, deps);
};

/**
 * Hook para memoizar valores com debounce
 * @param {Function} factory - Função que cria o valor
 * @param {Array} deps - Dependências
 * @param {number} delay - Delay em ms
 * @returns {any} Valor memoizado com debounce
 */
export const useDebounceMemo = (factory, deps, delay = 300) => {
  const ref = useRef();
  const timeoutRef = useRef();

  return useStableMemo(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      ref.current = factory();
    }, delay);

    return ref.current;
  }, deps);
};
