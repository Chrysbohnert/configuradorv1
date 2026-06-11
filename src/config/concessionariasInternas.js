/**
 * Configuração de Concessionárias com Acesso Interno Stark
 * 
 * WORKAROUND: Como não conseguimos adicionar a coluna uso_interno_stark no banco,
 * vamos controlar via configuração no frontend.
 * 
 * Para habilitar uma concessionária:
 * 1. Adicione o ID dela no array concessionariasInternasIds
 * 2. OU adicione palavras-chave no array palavrasChave
 */

// IDs de concessionárias que podem fazer pedidos para outras
export const concessionariasInternasIds = [
  1, // Substitua pelo ID correto da sua concessionária interna
  // Adicione mais IDs conforme necessário
];

// Palavras-chave no nome da concessionária que indicam uso interno
export const palavrasChaveInternas = [
  'stark interno',
  'stark',
  'uso interno',
  'interno',
  // Adicione mais palavras-chave conforme necessário
];

/**
 * Verifica se uma concessionária tem permissão de uso interno
 * @param {Object} concessionaria - Objeto da concessionária
 * @returns {boolean}
 */
export function isConcessionariaInterna(concessionaria) {
  if (!concessionaria) return false;

  // Verifica se tem a coluna uso_interno_stark (caso seja adicionada no futuro)
  if (concessionaria.uso_interno_stark === true) {
    return true;
  }

  // Verifica por ID
  if (concessionariasInternasIds.includes(concessionaria.id)) {
    return true;
  }

  // Verifica por palavras-chave no nome
  const nomeNormalizado = (concessionaria.nome || '').toLowerCase().trim();
  const temPalavraChave = palavrasChaveInternas.some(palavra => 
    nomeNormalizado.includes(palavra.toLowerCase())
  );

  return temPalavraChave;
}
