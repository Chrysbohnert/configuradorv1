/**
 * guindastesService.js
 * Queries SQL para a tabela `guindastes`.
 */

const { query } = require('../db/pool');
const { normalizarRegiao } = require('../utils/regiaoHelper');

/** Campos leves para listagem inicial (Nova Proposta) — sem imagem/descrição/base64 */
const LITE_COLUMNS = [
  'id',
  'subgrupo',
  'modelo',
  'codigo_referencia',
  'peso_kg',
  'grupo',
  'is_prototipo',
  'is_comercio_exterior',
].join(', ');

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

async function findAll({ limit, offset, lite = false } = {}) {
  const select = lite ? LITE_COLUMNS : '*';
  let sql = `SELECT ${select} FROM guindastes ORDER BY subgrupo ASC`;
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

async function findImagemById(id) {
  const { rows } = await query(
    `SELECT id, imagem_url FROM guindastes WHERE id = $1`,
    [id]
  );
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

function casarRegiaoPreco(regiaoNorm, regiaoOriginal, regiaoDb) {
  const r = (regiaoDb || '').toLowerCase().trim();
  return (
    r === regiaoNorm ||
    normalizarRegiao(regiaoDb) === regiaoNorm ||
    r === (regiaoOriginal || '').toLowerCase().trim()
  );
}

async function findPrecoPorRegiao(guindasteId, regiao) {
  if (guindasteId == null || guindasteId === '' || !regiao) return 0;

  const regiaoNorm = normalizarRegiao(regiao);
  const id = Number(guindasteId);
  if (Number.isNaN(id)) return 0;

  const { rows: exact } = await query(
    `SELECT preco FROM precos_guindaste_regiao
     WHERE guindaste_id = $1 AND regiao = $2
     LIMIT 1`,
    [id, regiaoNorm]
  );
  if (exact[0]?.preco != null) return Number(exact[0].preco) || 0;

  const { rows: all } = await query(
    `SELECT preco, regiao FROM precos_guindaste_regiao WHERE guindaste_id = $1`,
    [id]
  );
  const row = (all || []).find((p) => casarRegiaoPreco(regiaoNorm, regiao, p.regiao));
  if (row?.preco != null) return Number(row.preco) || 0;

  return 0;
}

async function findPrecoCompraPorRegiao(guindasteId, regiao) {
  if (guindasteId == null || guindasteId === '' || !regiao) return 0;

  const regiaoNorm = normalizarRegiao(regiao);
  const id = Number(guindasteId);
  if (Number.isNaN(id)) return 0;

  const { rows: exact } = await query(
    `SELECT preco FROM precos_compra_concessionaria_por_regiao
     WHERE guindaste_id = $1 AND regiao = $2
     LIMIT 1`,
    [id, regiaoNorm]
  );
  if (exact[0]?.preco != null) return Number(exact[0].preco) || 0;

  const { rows: all } = await query(
    `SELECT preco, regiao FROM precos_compra_concessionaria_por_regiao WHERE guindaste_id = $1`,
    [id]
  );
  const row = (all || []).find((p) => casarRegiaoPreco(regiaoNorm, regiao, p.regiao));
  if (row?.preco != null) return Number(row.preco) || 0;

  return 0;
}

module.exports = {
  findAll,
  count,
  findById,
  findImagemById,
  create,
  update,
  remove,
  findPrecoPorRegiao,
  findPrecoCompraPorRegiao,
};
