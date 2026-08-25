/**
 * precificacaoHistoricoService.js
 * Armazena snapshots imutáveis de simulações/precificações para auditoria.
 * Cada registro guarda os valores de entrada e o resultado completo do motor.
 */

const { query } = require('../db/pool');

async function findAll({ guindaste_id, limit = 100 } = {}) {
  const params = [];
  const conditions = [];

  if (guindaste_id) {
    params.push(guindaste_id);
    conditions.push(`guindaste_id = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit);

  const { rows } = await query(
    `SELECT *
     FROM public.precificacao_historico
     ${where}
     ORDER BY created_at DESC
     LIMIT $${params.length}`,
    params
  );
  return rows;
}

async function findById(id) {
  const { rows } = await query(
    `SELECT * FROM public.precificacao_historico WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function create({
  usuario_id,
  usuario_nome,
  guindaste_id,
  equipamento,
  tributacao,
  condicao_id,
  condicao,
  parametros,
  entrada,
  resultado,
  observacao,
}) {
  const { rows } = await query(
    `INSERT INTO public.precificacao_historico
       (usuario_id, usuario_nome, guindaste_id, equipamento, tributacao,
        condicao_id, condicao, parametros, entrada, resultado, observacao)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      usuario_id || null,
      usuario_nome || null,
      guindaste_id || null,
      JSON.stringify(equipamento || {}),
      JSON.stringify(tributacao || {}),
      condicao_id || null,
      JSON.stringify(condicao || {}),
      JSON.stringify(parametros || {}),
      JSON.stringify(entrada || {}),
      JSON.stringify(resultado || {}),
      observacao || null,
    ]
  );
  return rows[0];
}

async function remove(id) {
  const { rowCount } = await query(
    `DELETE FROM public.precificacao_historico WHERE id = $1`,
    [id]
  );
  return rowCount > 0;
}

module.exports = {
  findAll,
  findById,
  create,
  remove,
};
