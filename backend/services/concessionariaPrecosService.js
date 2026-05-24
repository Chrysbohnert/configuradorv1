/**
 * concessionariaPrecosService.js
 * Queries SQL para preços de venda das concessionárias (tabela concessionaria_precos).
 */

const { query } = require('../db/pool');

async function findByConcessionaria(concessionariaId) {
  const { rows } = await query(
    `SELECT * FROM concessionaria_precos WHERE concessionaria_id = $1`,
    [concessionariaId]
  );
  return rows;
}

async function findOne(concessionariaId, guindasteId) {
  const { rows } = await query(
    `SELECT preco_override FROM concessionaria_precos
     WHERE concessionaria_id = $1 AND guindaste_id = $2
     LIMIT 1`,
    [concessionariaId, guindasteId]
  );
  return rows[0]?.preco_override ?? null;
}

async function upsert({ concessionaria_id, guindaste_id, preco_override, updated_by }) {
  const { rows } = await query(
    `INSERT INTO concessionaria_precos (concessionaria_id, guindaste_id, preco_override, updated_by, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (concessionaria_id, guindaste_id)
     DO UPDATE SET preco_override = EXCLUDED.preco_override,
                   updated_by    = EXCLUDED.updated_by,
                   updated_at    = NOW()
     RETURNING *`,
    [concessionaria_id, guindaste_id, preco_override, updated_by || null]
  );
  return rows[0];
}

module.exports = { findByConcessionaria, findOne, upsert };
