/**
 * services/fretesService.js
 * Leitura da tabela fretes (pontos de instalação + valores CIF).
 * Espelha a lógica de supabase.js: getFretes, getPontosInstalacaoPorRegiao,
 * getPontosInstalacaoPorVendedor e getFretePorOficinaCidadeUF.
 */

const { query } = require('../db/pool');

const MAPEAMENTO_ESTADOS = {
  'RIO GRANDE DO SUL': 'RS',
  'SANTA CATARINA': 'SC',
  'PARANÁ': 'PR',
  'SÃO PAULO': 'SP',
  'RIO DE JANEIRO': 'RJ',
  'MINAS GERAIS': 'MG',
  'ESPÍRITO SANTO': 'ES',
  'MATO GROSSO': 'MT',
  'MATO GROSSO DO SUL': 'MS',
  'GOIÁS': 'GO',
  'DISTRITO FEDERAL': 'DF',
};

async function getFretes(uf = null) {
  if (uf) {
    const { rows } = await query(
      `SELECT id, oficina, cidade, uf, valor_prioridade, valor_reaproveitamento
       FROM fretes
       WHERE UPPER(uf) = $1
       ORDER BY cidade`,
      [uf.toUpperCase().trim()]
    );
    return rows;
  }

  const { rows } = await query(
    `SELECT id, oficina, cidade, uf, valor_prioridade, valor_reaproveitamento
     FROM fretes
     ORDER BY cidade`
  );
  return rows;
}

async function getFretesPorVendedor(vendedorId) {
  const { rows: userRows } = await query(
    `SELECT id, estado, regiao_grupo FROM app_users WHERE id = $1`,
    [vendedorId]
  );

  const vendedor = userRows[0];
  if (!vendedor) return getFretes();

  const grupoRaw = vendedor.regiao_grupo || vendedor.estado;
  if (!grupoRaw) return getFretes();

  const ufNorm = grupoRaw.toUpperCase().trim();
  const uf = MAPEAMENTO_ESTADOS[ufNorm] || ufNorm;

  return getFretes(uf);
}

async function getFretePorOficinaCidadeUF(oficina, cidade, uf) {
  const { rows } = await query(
    `SELECT *
     FROM fretes
     WHERE oficina = $1 AND cidade = $2 AND UPPER(uf) = $3
     LIMIT 1`,
    [oficina, cidade, (uf || '').toUpperCase()]
  );
  return rows[0] || null;
}

module.exports = { getFretes, getFretesPorVendedor, getFretePorOficinaCidadeUF };
