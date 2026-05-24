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

async function create(data) {
  const { nome, arquivo_url = null } = data;
  const { rows } = await query(
    `INSERT INTO graficos_carga (nome, arquivo_url)
     VALUES ($1, $2)
     RETURNING *`,
    [nome, arquivo_url]
  );
  return mapRow(rows[0]);
}

async function update(id, data) {
  const allowed = ['nome', 'arquivo_url'];
  const sets = [];
  const params = [];

  allowed.forEach((col) => {
    if (data[col] !== undefined) {
      params.push(data[col]);
      sets.push(`${col} = $${params.length}`);
    }
  });

  if (sets.length === 0) throw new Error('Nenhum campo para atualizar');

  params.push(id);
  const { rows } = await query(
    `UPDATE graficos_carga SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );
  return mapRow(rows[0]) || null;
}

async function remove(id) {
  const { rowCount } = await query(
    `DELETE FROM graficos_carga WHERE id = $1`,
    [id]
  );
  return rowCount > 0;
}

module.exports = { findAll, findById, create, update, remove };
