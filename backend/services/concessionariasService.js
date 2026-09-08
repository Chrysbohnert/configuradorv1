/**
 * concessionariasService.js
 * Toda query SQL relacionada a concessionárias fica aqui.
 * Controllers chamam funções deste service — nunca escrevem SQL diretamente.
 */

const { query } = require('../db/pool');
const crypto = require('crypto');

async function findAll(includeInactive = false, includeVinculos = false) {
  const where = includeInactive ? '' : 'WHERE ativo = true';

  const { rows } = await query(
    `SELECT * FROM concessionarias ${where} ORDER BY nome ASC`
  );

  if (!includeVinculos || rows.length === 0) return rows;

  const { rows: usuarios } = await query(
    `SELECT id, nome, email, tipo, concessionaria_id
     FROM app_users
     WHERE concessionaria_id IS NOT NULL
       AND tipo IN ('admin_concessionaria', 'vendedor_concessionaria')
     ORDER BY nome ASC`
  );

  const vinculos = usuarios.reduce((map, usuario) => {
    const key = String(usuario.concessionaria_id);
    const grupo = map.get(key) || { admins: [], vendedores: [] };
    if (usuario.tipo === 'admin_concessionaria') grupo.admins.push(usuario);
    if (usuario.tipo === 'vendedor_concessionaria') grupo.vendedores.push(usuario);
    map.set(key, grupo);
    return map;
  }, new Map());

  return rows.map((concessionaria) => ({
    ...concessionaria,
    ...(vinculos.get(String(concessionaria.id)) || { admins: [], vendedores: [] }),
  }));
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

  const id = crypto.randomUUID();

  const insertFields = [
    'id',
    'nome',
    'regiao_preco',
    'cnpj',
    'telefone',
    'email',
    'endereco',
    'desconto_base',
    'desconto_compra',
    'ativo',
  ];

  const insertValues = [
    id,
    nome,
    regiao_preco,
    cnpj,
    telefone,
    email,
    endereco,
    desconto_base,
    desconto_compra,
    ativo,
  ];

  console.log('[concessionariasService.create] Criando concessionária:', {
    id,
    nome,
    regiao_preco,
  });

  const placeholders = insertValues
    .map((_, i) => `$${i + 1}`)
    .join(',');

  const { rows } = await query(
    `INSERT INTO concessionarias (${insertFields.join(', ')})
     VALUES (${placeholders})
     RETURNING *`,
    insertValues
  );

  return rows[0];
}

async function update(id, fields) {
  const allowed = [
    'nome',
    'regiao_preco',
    'cnpj',
    'telefone',
    'email',
    'endereco',
    'desconto_base',
    'desconto_compra',
    'ativo',
  ];

  const sets = [];
  const params = [];

  allowed.forEach((col) => {
    if (fields[col] !== undefined) {
      params.push(fields[col]);
      sets.push(`${col} = $${params.length}`);
    }
  });

  if (sets.length === 0) {
    throw new Error('Nenhum campo para atualizar');
  }

  params.push(id);

  const { rows } = await query(
    `UPDATE concessionarias
     SET ${sets.join(', ')}
     WHERE id = $${params.length}
     RETURNING *`,
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

module.exports = {
  findAll,
  findById,
  create,
  update,
  remove,
};