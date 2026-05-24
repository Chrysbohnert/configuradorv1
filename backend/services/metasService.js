/**
 * metasService.js
 * Queries SQL para metas de vendedores.
 */

const { query } = require('../db/pool');

async function findByVendedorAno(vendedorId, ano) {
  const { rows } = await query(
    `SELECT * FROM metas_vendedores
     WHERE vendedor_id = $1 AND ano = $2
     ORDER BY mes ASC`,
    [vendedorId, parseInt(ano, 10)]
  );
  return rows;
}

async function upsertAno(vendedorId, ano, metas) {
  // metas = [{ mes, meta_propostas, meta_valor }, ...]
  const results = [];

  for (const m of metas) {
    const { rows } = await query(
      `INSERT INTO metas_vendedores (vendedor_id, ano, mes, meta_propostas, meta_valor)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (vendedor_id, ano, mes)
       DO UPDATE SET meta_propostas = EXCLUDED.meta_propostas,
                     meta_valor = EXCLUDED.meta_valor
       RETURNING *`,
      [
        vendedorId,
        parseInt(ano, 10),
        parseInt(m.mes, 10),
        parseInt(m.meta_propostas, 10) || 0,
        parseFloat(m.meta_valor) || 0,
      ]
    );
    if (rows[0]) results.push(rows[0]);
  }

  return results;
}

module.exports = { findByVendedorAno, upsertAno };
