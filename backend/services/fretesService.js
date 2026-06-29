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

// Admin Stark: retorna todos os fretes sem filtro de UF
async function getTodosFretesAdmin() {
  const { rows } = await query(
    `SELECT * FROM fretes ORDER BY cidade, uf`
  );
  return rows;
}

async function createFrete(freteData) {
  const { rows } = await query(
    `INSERT INTO fretes (oficina, cidade, uf, valor_prioridade, valor_reaproveitamento)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      freteData.oficina,
      freteData.cidade,
      freteData.uf,
      freteData.valor_prioridade || 0,
      freteData.valor_reaproveitamento || 0
    ]
  );
  return rows[0];
}

async function updateFrete(id, freteData) {
  const { rows } = await query(
    `UPDATE fretes
     SET oficina = $1, cidade = $2, uf = $3, valor_prioridade = $4, valor_reaproveitamento = $5
     WHERE id = $6
     RETURNING *`,
    [
      freteData.oficina,
      freteData.cidade,
      freteData.uf,
      freteData.valor_prioridade || 0,
      freteData.valor_reaproveitamento || 0,
      id
    ]
  );
  return rows[0];
}

async function deleteFrete(id) {
  const { rows } = await query(
    `DELETE FROM fretes WHERE id = $1 RETURNING *`,
    [id]
  );
  return rows[0];
}

module.exports = { 
  getFretes, 
  getFretesPorVendedor, 
  getFretePorOficinaCidadeUF,
  getTodosFretesAdmin,
  createFrete,
  updateFrete,
  deleteFrete
};
