/**
 * Normalização de região para tabela de preços (espelha src/utils/regiaoHelper.js).
 */

function normalizarRegiao(regiao, temIE = true) {
  if (!regiao) return 'sul-sudeste';

  const regiaoLower = regiao.toLowerCase().trim();

  if (
    regiaoLower === 'rio grande do sul' ||
    regiaoLower === 'rs' ||
    regiaoLower === 'rs com inscrição estadual' ||
    regiaoLower === 'rs com inscricao estadual'
  ) {
    return 'rs-com-ie';
  }

  if (regiaoLower === 'rs sem inscrição estadual' || regiaoLower === 'rs sem inscricao estadual') {
    return 'rs-sem-ie';
  }

  if (regiaoLower === 'rs-com-ie') return 'rs-com-ie';
  if (regiaoLower === 'rs-sem-ie') return 'rs-sem-ie';

  if (regiaoLower === 'norte' || regiaoLower === 'nordeste' || regiaoLower === 'norte-nordeste') {
    return 'norte-nordeste';
  }

  if (regiaoLower === 'sul' || regiaoLower === 'sudeste' || regiaoLower === 'sul-sudeste') {
    return 'sul-sudeste';
  }

  if (regiaoLower === 'centro-oeste' || regiaoLower === 'centro oeste') {
    return 'centro-oeste';
  }

  if (
    regiaoLower === 'comércio exterior' ||
    regiaoLower === 'comercio exterior' ||
    regiaoLower === 'comercio-exterior' ||
    regiaoLower === 'comércio-exterior'
  ) {
    return 'comercio-exterior';
  }

  return 'sul-sudeste';
}

module.exports = { normalizarRegiao };
