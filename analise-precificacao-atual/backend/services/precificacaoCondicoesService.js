/**
 * precificacaoCondicoesService.js
 * CRUD de condições de pagamento isoladas para testes na nova Precificação.
 * Não altera payment_plan_items nem o fluxo de propostas.
 */

const { query } = require('../db/pool');

async function findAll({ ativo } = {}) {
  const conditions = [];
  const params = [];

  if (ativo !== undefined) {
    params.push(ativo === 'true' || ativo === true);
    conditions.push(`ativo = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT * FROM public.precificacao_condicoes ${where} ORDER BY entrada_percent ASC, parcelas ASC`,
    params
  );
  return rows;
}

async function findById(id) {
  const { rows } = await query(
    `SELECT * FROM public.precificacao_condicoes WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function create(data) {
  const descricao = (data.descricao || '').trim();
  const entradaPercent = data.entrada_percent === '' ? 0 : Number(data.entrada_percent) || 0;
  const parcelas = Number(data.parcelas) || 1;
  const taxaMensal = data.taxa_mensal === '' ? 0 : Number(data.taxa_mensal) || 0;
  const ativo = data.ativo === undefined ? true : !!data.ativo;

  const { rows } = await query(
    `INSERT INTO public.precificacao_condicoes
       (descricao, entrada_percent, parcelas, taxa_mensal, ativo)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [descricao, entradaPercent, parcelas, taxaMensal, ativo]
  );
  return rows[0];
}

async function update(id, data) {
  const existing = await findById(id);
  if (!existing) return null;

  const sets = [];
  const params = [];

  if (data.descricao !== undefined) {
    params.push((data.descricao || '').trim());
    sets.push(`descricao = $${params.length}`);
  }
  if (data.entrada_percent !== undefined) {
    params.push(data.entrada_percent === '' ? 0 : Number(data.entrada_percent) || 0);
    sets.push(`entrada_percent = $${params.length}`);
  }
  if (data.parcelas !== undefined) {
    params.push(Number(data.parcelas) || 1);
    sets.push(`parcelas = $${params.length}`);
  }
  if (data.taxa_mensal !== undefined) {
    params.push(data.taxa_mensal === '' ? 0 : Number(data.taxa_mensal) || 0);
    sets.push(`taxa_mensal = $${params.length}`);
  }
  if (data.ativo !== undefined) {
    params.push(!!data.ativo);
    sets.push(`ativo = $${params.length}`);
  }

  if (sets.length === 0) return existing;
  params.push(id);

  const { rows } = await query(
    `UPDATE public.precificacao_condicoes
     SET ${sets.join(', ')}, updated_at = NOW()
     WHERE id = $${params.length}
     RETURNING *`,
    params
  );
  return rows[0];
}

async function remove(id) {
  const { rowCount } = await query(
    `DELETE FROM public.precificacao_condicoes WHERE id = $1`,
    [id]
  );
  return rowCount > 0;
}

module.exports = {
  findAll,
  findById,
  create,
  update,
  remove,
};
