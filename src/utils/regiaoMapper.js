/**
 * Mapeia a região do vendedor para o grupo de regiões de frete
 * 
 * Grupos de regiões:
 * - norte-nordeste: Estados do Norte e Nordeste
 * - centro-oeste: MS, MT, GO
 * - sul-sudeste: SC, PR, SP, MG
 * - rs-com-ie: Rio Grande do Sul com Inscrição Estadual
 * - rs-sem-ie: Rio Grande do Sul sem Inscrição Estadual
 * 
 * @param {string} regiaoVendedor - Região do vendedor (ex: "rio grande do sul", "paraná", etc)
 * @param {boolean} clienteTemIE - Se o cliente tem Inscrição Estadual (apenas para RS)
 * @returns {string} - Grupo de região para filtrar pontos de instalação
 */
export const mapRegiaoToGrupo = (regiaoVendedor, clienteTemIE = true) => {
  if (!regiaoVendedor) {
    console.warn('⚠️ Região do vendedor não informada, retornando sul-sudeste como padrão');
    return 'sul-sudeste';
  }

  const regiao = regiaoVendedor.toLowerCase().trim();

  // Rio Grande do Sul - depende se cliente tem IE
  if (regiao === 'rio grande do sul' || regiao === 'rs') {
    return clienteTemIE ? 'rs-com-ie' : 'rs-sem-ie';
  }

  // Sul-Sudeste
  if (
    regiao === 'santa catarina' || regiao === 'sc' ||
    regiao === 'paraná' || regiao === 'pr' ||
    regiao === 'são paulo' || regiao === 'sp' ||
    regiao === 'minas gerais' || regiao === 'mg'
  ) {
    return 'sul-sudeste';
  }

  // Centro-Oeste
  if (
    regiao === 'mato grosso do sul' || regiao === 'ms' ||
    regiao === 'mato grosso' || regiao === 'mt' ||
    regiao === 'goiás' || regiao === 'go' ||
    regiao === 'distrito federal' || regiao === 'df'
  ) {
    return 'centro-oeste';
  }

  // Norte
  if (
    regiao === 'acre' || regiao === 'ac' ||
    regiao === 'amazonas' || regiao === 'am' ||
    regiao === 'amapá' || regiao === 'ap' ||
    regiao === 'pará' || regiao === 'pa' ||
    regiao === 'rondônia' || regiao === 'ro' ||
    regiao === 'roraima' || regiao === 'rr' ||
    regiao === 'tocantins' || regiao === 'to'
  ) {
    return 'norte-nordeste';
  }

  // Nordeste
  if (
    regiao === 'alagoas' || regiao === 'al' ||
    regiao === 'bahia' || regiao === 'ba' ||
    regiao === 'ceará' || regiao === 'ce' ||
    regiao === 'maranhão' || regiao === 'ma' ||
    regiao === 'paraíba' || regiao === 'pb' ||
    regiao === 'pernambuco' || regiao === 'pe' ||
    regiao === 'piauí' || regiao === 'pi' ||
    regiao === 'rio grande do norte' || regiao === 'rn' ||
    regiao === 'sergipe' || regiao === 'se'
  ) {
    return 'norte-nordeste';
  }

  console.warn(`⚠️ Região "${regiaoVendedor}" não mapeada, retornando sul-sudeste como padrão`);
  return 'sul-sudeste';
};

/**
 * Retorna o nome amigável do grupo de região
 * @param {string} grupoRegiao - Código do grupo (ex: "rs-com-ie")
 * @returns {string} - Nome amigável
 */
export const getGrupoRegiaoLabel = (grupoRegiao) => {
  const labels = {
    'rs-com-ie': 'Rio Grande do Sul (Com IE)',
    'rs-sem-ie': 'Rio Grande do Sul (Sem IE)',
    'sul-sudeste': 'Sul e Sudeste',
    'centro-oeste': 'Centro-Oeste',
    'norte-nordeste': 'Norte e Nordeste'
  };

  return labels[grupoRegiao] || grupoRegiao;
};

/**
 * Retorna os estados pertencentes a um grupo de região
 * @param {string} grupoRegiao - Código do grupo
 * @returns {string[]} - Array de UFs
 */
export const getEstadosPorGrupo = (grupoRegiao) => {
  const grupos = {
    'rs-com-ie': ['RS'],
    'rs-sem-ie': ['RS'],
    'sul-sudeste': ['SC', 'PR', 'SP', 'MG'],
    'centro-oeste': ['MS', 'MT', 'GO', 'DF'],
    'norte-nordeste': ['AC', 'AM', 'AP', 'PA', 'RO', 'RR', 'TO', 'AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE']
  };

  return grupos[grupoRegiao] || [];
};

