/**
 * services/graficosCargaService.js
 * Leitura da tabela graficos_carga (PostgreSQL).
 */

const { query } = require('../db/pool');

function mapRow(row) {
  if (!row) return row;
  return {
    ...row,
    arquivo_url: row.arquivo_url || row.imagem_url || null,
  };
}

async function findAll() {
  const { rows } = await query(
    'SELECT * FROM graficos_carga ORDER BY id DESC'
  );
  return rows.map(mapRow);
}

async function findById(id) {
  const { rows } = await query(
    'SELECT * FROM graficos_carga WHERE id = $1',
    [id]
  );
  return mapRow(rows[0]) || null;
}

module.exports = { findAll, findById };
