/**
 * Helpers para normalizar campos que podem vir como string JSON, jsonb, null ou objeto/array
 * do PostgreSQL. Devem ser aplicados nos services antes de retornar dados ao controller.
 */

/**
 * Garante que o valor retornado seja um array.
 * Aceita: array, string JSON, string JSON escapada, {}, null, undefined
 */
function normalizarArray(valor) {
  // Já é array válido
  if (Array.isArray(valor)) return valor;
  
  // Null, undefined ou objeto vazio
  if (valor === null || valor === undefined) return [];
  if (typeof valor === 'object' && Object.keys(valor).length === 0) return [];
  
  // String
  if (typeof valor === 'string') {
    const trimmed = valor.trim();
    
    // Strings vazias ou literais null/undefined
    if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined' || trimmed === '{}') return [];
    
    // Tentar parsear JSON (incluindo JSON escapado)
    if (trimmed.startsWith('[') || trimmed.startsWith('{') || trimmed.startsWith('"')) {
      try {
        // Primeiro, tentar parsear diretamente
        let parsed = JSON.parse(trimmed);
        
        // Se parseou para string, tentar parsear novamente (JSON escapado)
        if (typeof parsed === 'string') {
          try {
            parsed = JSON.parse(parsed);
          } catch {
            // Se falhar, usar a string parseada
          }
        }
        
        // Se é array, retornar
        if (Array.isArray(parsed)) return parsed;
        
        // Se é objeto vazio, retornar array vazio
        if (parsed !== null && typeof parsed === 'object' && Object.keys(parsed).length === 0) return [];
        
        // Qualquer outro valor, colocar em array
        return parsed !== null ? [parsed] : [];
      } catch {
        // Se falhar o parse, retornar string como único elemento
        return [valor];
      }
    }
    
    // String simples que não é JSON
    return [valor];
  }
  
  // Objeto não-vazio
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
 * Serializa array para salvar no PostgreSQL como JSON.
 * Sempre retorna JSON válido ou null.
 */
function serializarArray(valor) {
  if (valor === null || valor === undefined) return null;
  if (Array.isArray(valor)) {
    return valor.length > 0 ? JSON.stringify(valor) : null;
  }
  // Se não é array, normalizar primeiro e depois serializar
  const normalizado = normalizarArray(valor);
  return normalizado.length > 0 ? JSON.stringify(normalizado) : null;
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
  serializarArray,
};
