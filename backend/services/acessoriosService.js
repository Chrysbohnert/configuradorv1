/**
 * services/acessoriosService.js
 * CRUD simples de acessórios comerciais, independente de guindastes.
 */

const { query } = require('../db/pool');

async function findAll() {
  const { rows } = await query(
    `SELECT id, codigo, nome, descricao, foto_url, preco, max_parcelas, ativo, created_at, updated_at
     FROM public.acessorios
     ORDER BY nome, codigo`
  );
  return rows;
}

async function findById(id) {
  const { rows } = await query(
    `SELECT id, codigo, nome, descricao, foto_url, preco, max_parcelas, ativo, created_at, updated_at
     FROM public.acessorios
     WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function create(data) {
  const { rows } = await query(
    `INSERT INTO public.acessorios
       (codigo, nome, descricao, foto_url, preco, max_parcelas, ativo)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, codigo, nome, descricao, foto_url, preco, max_parcelas, ativo, created_at, updated_at`,
    [
      data.codigo,
      data.nome,
      data.descricao || null,
      data.foto_url || null,
      data.preco || 0,
      data.max_parcelas || 1,
      data.ativo !== false,
    ]
  );
  return rows[0];
}

async function update(id, data) {
  const { rows } = await query(
    `UPDATE public.acessorios
     SET codigo = $1,
         nome = $2,
         descricao = $3,
         foto_url = $4,
         preco = $5,
         max_parcelas = $6,
         ativo = $7,
         updated_at = NOW()
     WHERE id = $8
     RETURNING id, codigo, nome, descricao, foto_url, preco, max_parcelas, ativo, created_at, updated_at`,
    [
      data.codigo,
      data.nome,
      data.descricao || null,
      data.foto_url || null,
      data.preco || 0,
      data.max_parcelas || 1,
      data.ativo !== false,
      id,
    ]
  );
  return rows[0] || null;
}

async function remove(id) {
  const { rowCount } = await query(
    `DELETE FROM public.acessorios WHERE id = $1`,
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
