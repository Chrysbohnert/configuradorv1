/**
 * precificacaoService.js
 * Queries SQL para precificação de guindastes.
 * Centraliza as regras percentuais e os preços de venda calculados por UF.
 */

const { query } = require('../db/pool');

const REGRA_FIELDS = [
  'uf',
  'descricao',
  'custo_fixo_percent',
  'comissao_percent',
  'assistencia_percent',
  'margem_lucro_percent',
  'icms_percent',
  'ipi_percent',
  'pis_percent',
  'cofins_percent',
  'outros_impostos_percent',
  'ativo',
];

function normalizarUf(uf) {
  const v = String(uf || '').trim().toUpperCase();
  return v === '' || v === 'NULL' || v === 'DEFAULT' ? null : v;
}

async function findAllRegras() {
  const { rows } = await query(
    `SELECT * FROM regras_precificacao ORDER BY uf NULLS FIRST, created_at DESC`
  );
  return rows;
}

async function findRegraById(id) {
  const { rows } = await query(
    `SELECT * FROM regras_precificacao WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function findRegraByUf(uf) {
  const normalized = normalizarUf(uf);
  const { rows } = await query(
    `SELECT * FROM regras_precificacao WHERE (uf IS NOT DISTINCT FROM $1) AND ativo = TRUE`,
    [normalized]
  );
  return rows[0] || null;
}

async function upsertRegra(data) {
  const uf = normalizarUf(data.uf);
  const existing = await findRegraByUf(uf);

  const payload = {};
  REGRA_FIELDS.forEach((f) => {
    if (data[f] !== undefined) {
      payload[f] = data[f];
    }
  });
  payload.uf = uf;

  if (existing) {
    const sets = [];
    const params = [];
    Object.keys(payload).forEach((key) => {
      if (key === 'id' || key === 'created_at') return;
      params.push(payload[key] === '' ? null : payload[key]);
      sets.push(`"${key}" = $${params.length}`);
    });
    if (sets.length === 0) throw new Error('Nenhum campo para atualizar');
    params.push(existing.id);
    const { rows } = await query(
      `UPDATE regras_precificacao SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    return rows[0];
  }

  const cols = [];
  const vals = [];
  const params = [];
  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) return;
    cols.push(`"${key}"`);
    params.push(payload[key] === '' ? null : payload[key]);
    vals.push(`$${params.length}`);
  });
  if (cols.length === 0) throw new Error('Nenhum campo fornecido');

  const { rows } = await query(
    `INSERT INTO regras_precificacao (${cols.join(', ')}) VALUES (${vals.join(', ')}) RETURNING *`,
    params
  );
  return rows[0];
}

async function removeRegra(id) {
  const { rowCount } = await query(
    `DELETE FROM regras_precificacao WHERE id = $1`,
    [id]
  );
  return rowCount > 0;
}

async function calcularPreco(guindasteId, uf) {
  const { rows } = await query(
    `SELECT public.calcular_preco_venda($1, $2) AS preco`,
    [guindasteId, normalizarUf(uf)]
  );
  return Number(rows[0]?.preco) || 0;
}

async function findAllGuindastesComCusto() {
  const { rows } = await query(
    `SELECT
      id, subgrupo, modelo, codigo_referencia, peso_kg,
      custo_mp, custo_mo
     FROM guindastes
     ORDER BY subgrupo ASC`
  );
  return rows;
}

async function findPrecosCalculados({ guindaste_id, uf } = {}) {
  const conditions = [];
  const params = [];

  if (guindaste_id) {
    params.push(guindaste_id);
    conditions.push(`guindaste_id = $${params.length}`);
  }
  if (uf !== undefined && uf !== null) {
    params.push(normalizarUf(uf));
    conditions.push(`uf = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT * FROM precos_venda_guindaste_uf ${where} ORDER BY updated_at DESC`,
    params
  );
  return rows;
}

async function upsertPrecoCalculado({ guindaste_id, uf, preco_calculado, formula_snapshot }) {
  const normalizedUf = normalizarUf(uf);
  const { rows } = await query(
    `INSERT INTO precos_venda_guindaste_uf (guindaste_id, uf, preco_calculado, formula_snapshot)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (guindaste_id, uf)
     DO UPDATE SET
       preco_calculado = EXCLUDED.preco_calculado,
       formula_snapshot = EXCLUDED.formula_snapshot,
       updated_at = NOW()
     RETURNING *`,
    [guindaste_id, normalizedUf, preco_calculado, formula_snapshot || null]
  );
  return rows[0];
}

async function recalcularTodosPorUf(uf) {
  const normalizedUf = normalizarUf(uf);
  const { rows: guindastes } = await query(
    `SELECT id FROM guindastes`
  );

  const resultados = [];
  for (const g of guindastes) {
    const preco = await calcularPreco(g.id, normalizedUf);
    if (preco > 0) {
      const row = await upsertPrecoCalculado({
        guindaste_id: g.id,
        uf: normalizedUf,
        preco_calculado: preco,
        formula_snapshot: null,
      });
      resultados.push(row);
    }
  }
  return resultados;
}

module.exports = {
  findAllRegras,
  findRegraById,
  findRegraByUf,
  upsertRegra,
  removeRegra,
  calcularPreco,
  findAllGuindastesComCusto,
  findPrecosCalculados,
  upsertPrecoCalculado,
  recalcularTodosPorUf,
};
