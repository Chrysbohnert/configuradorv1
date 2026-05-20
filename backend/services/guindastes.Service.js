/**
 * guindastesService.js
 * Queries SQL para a tabela `guindastes`.
 */

const { query } = require('../db/pool');

const KNOWN_FIELDS = [
  'subgrupo',
  'modelo',
  'grupo',
  'peso_kg',
  'configuracao',
  'tem_contr',
  'imagem_url', 'descricao', 'nao_incluido', 'imagens_adicionais', 'finame', 'ncm',
  'codigo_referencia', 'quantidade_disponivel', 'is_prototipo', 'prototipo_label',
  'prototipo_observacoes_pdf', 'is_comercio_exterior', 'valor_instalacao_cliente',
  'valor_instalacao_incluso', 'bloquear_desconto',
];

async function findAll({ limit, offset } = {}) {
  let sql = `SELECT * FROM guindastes ORDER BY subgrupo ASC`;
  const params = [];
  if (limit !== undefined) { params.push(limit); sql += ` LIMIT $${params.length}`; }
  if (offset !== undefined) { params.push(offset); sql += ` OFFSET $${params.length}`; }
  const { rows } = await query(sql, params);
  return rows;
}

async function count() {
  const { rows } = await query('SELECT COUNT(*)::int AS total FROM guindastes');
  return rows[0]?.total || 0;
}

async function findById(id) {
  const { rows } = await query(`SELECT * FROM guindastes WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function create(data) {
  const cols = [], vals = [], params = [];
  KNOWN_FIELDS.forEach(f => {
    if (data[f] !== undefined) {
      cols.push(`"${f}"`);
      params.push(data[f] === '' ? null : data[f]);
      vals.push(`$${params.length}`);
    }
  });
  if (cols.length === 0) throw new Error('Nenhum campo fornecido');
  const { rows } = await query(
    `INSERT INTO guindastes (${cols.join(', ')}) VALUES (${vals.join(', ')}) RETURNING *`,
    params
  );
  return rows[0];
}

async function update(id, data) {
  const sets = [], params = [];
  KNOWN_FIELDS.forEach(f => {
    if (data[f] !== undefined) {
      params.push(data[f] === '' ? null : data[f]);
      sets.push(`"${f}" = $${params.length}`);
    }
  });
  if (sets.length === 0) throw new Error('Nenhum campo para atualizar');
  params.push(id);
  const { rows } = await query(
    `UPDATE guindastes SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );
  return rows[0] || null;
}

async function remove(id) {
  const { rowCount } = await query(`DELETE FROM guindastes WHERE id = $1`, [id]);
  return rowCount > 0;
}

module.exports = { findAll, count, findById, create, update, remove };
