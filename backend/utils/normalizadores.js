/**
 * Helpers para normalizar campos que podem vir como string JSON, jsonb, null ou objeto/array
 * do PostgreSQL. Devem ser aplicados nos services antes de retornar dados ao controller.
 */

/**
 * Garante que o valor retornado seja um array.
 */
function normalizarArray(valor) {
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
        return parsed !== null ? [parsed] : [];
      } catch {
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
 */
function normalizarObjeto(valor) {
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

/**
 * Normaliza campos de um objeto de usuário vindos do PostgreSQL.
 * Aplica normalização segura em jsonb/json arrays.
 */
function normalizarUsuario(row) {
  if (!row) return row;
  const user = { ...row };
  if (user.regioes_operacao !== undefined) {
    user.regioes_operacao = normalizarArray(user.regioes_operacao);
  }
  // Garante que tipo sempre exista (fallback para compatibilidade)
  if (!user.tipo) {
    user.tipo = user.role || 'vendedor';
  }
  return user;
}

module.exports = {
  normalizarArray,
  normalizarObjeto,
  normalizarUsuario,
};
