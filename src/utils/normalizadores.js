/**
 * Helpers para normalizar campos que podem vir como string JSON, jsonb, null ou objeto/array
 * do PostgreSQL. Protege chamadas como .some(), .map(), .filter(), .includes().
 */

/**
 * Garante que o valor retornado seja um array.
 * - Se for array, retorna o próprio array.
 * - Se for string JSON válida, faz parse.
 * - Se for null/undefined/string vazia, retorna array vazio.
 * - Se for objeto, retorna [valor] (envolve em array).
 * @param {*} valor
 * @returns {Array}
 */
export function normalizarArray(valor) {
  if (Array.isArray(valor)) return valor;
  if (valor === null || valor === undefined) return [];
  if (typeof valor === 'string') {
    const trimmed = valor.trim();
    if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') return [];
    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) ||
        (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed;
        // Se parsear como objeto, envolve em array
        return parsed !== null ? [parsed] : [];
      } catch {
        // Não é JSON válido, retorna como único item
        return [valor];
      }
    }
    return [valor];
  }
  if (typeof valor === 'object') return [valor];
  return [];
}

/**
 * Garante que o valor retornado seja um objeto plano ({}).
 * - Se for objeto, retorna o próprio objeto.
 * - Se for string JSON válida, faz parse.
 * - Se for null/undefined, retorna {}.
 * @param {*} valor
 * @returns {Object}
 */
export function normalizarObjeto(valor) {
  if (valor === null || valor === undefined) return {};
  if (typeof valor === 'string') {
    const trimmed = valor.trim();
    if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') return {};
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed;
        }
        // Se for array ou outro tipo, retorna objeto vazio
        return {};
      } catch {
        return {};
      }
    }
    return {};
  }
  if (typeof valor === 'object' && !Array.isArray(valor)) return valor;
  return {};
}
