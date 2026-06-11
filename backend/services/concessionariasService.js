/**
 * concessionariasService.js
 * Toda query SQL relacionada a concessionárias fica aqui.
 * Controllers chamam funções deste service — nunca escrevem SQL diretamente.
 */

const { query } = require('../db/pool');

async function findAll(includeInactive = false) {
  const where = includeInactive ? '' : 'WHERE ativo = true';
  const { rows } = await query(
    `SELECT * FROM concessionarias ${where} ORDER BY nome ASC`
  );
  return rows;
}

async function findById(id) {
  const { rows } = await query(
    `SELECT * FROM concessionarias WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function create(data) {
  const {
    nome,
    regiao_preco,
    cnpj = null,
    telefone = null,
    email = null,
    endereco = null,
    desconto_base = null,
    desconto_compra = null,
    ativo = true,
  } = data;

  const { rows } = await query(
    `INSERT INTO concessionarias
       (nome, regiao_preco, cnpj, telefone, email, endereco, desconto_base, desconto_compra, ativo)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [nome, regiao_preco, cnpj, telefone, email, endereco, desconto_base, desconto_compra, ativo]
  );
  return rows[0];
}

async function update(id, fields) {
  // Construir SET dinâmico apenas com campos informados
  const allowed = [
    'nome', 'regiao_preco', 'cnpj', 'telefone', 'email', 'endereco',
    'desconto_base', 'desconto_compra', 'ativo',
  ];

  const sets = [];
  const params = [];

  allowed.forEach((col) => {
    if (fields[col] !== undefined) {
      params.push(fields[col]);
      sets.push(`${col} = $${params.length}`);
    }
  });

  if (sets.length === 0) throw new Error('Nenhum campo para atualizar');

  params.push(id);
  const { rows } = await query(
    `UPDATE concessionarias SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );
  return rows[0] || null;
}

async function remove(id) {
  const { rowCount } = await query(
    `DELETE FROM concessionarias WHERE id = $1`,
    [id]
  );
  return rowCount > 0;
}

module.exports = { findAll, findById, create, update, remove };
