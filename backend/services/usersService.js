/**
 * usersService.js
 * Toda query SQL relacionada a usuários fica aqui.
 * Controllers chamam funções deste service — nunca escrevem SQL diretamente.
 */

const { query } = require('../db/pool');

const COLS_PUBLIC = `id, nome, email, tipo, regiao, concessionaria_id, regioes_operacao`;

async function findAll() {
  const { rows } = await query(
    `SELECT ${COLS_PUBLIC} FROM app_users ORDER BY nome ASC`
  );
  return rows;
}

async function findById(id) {
  const { rows } = await query(
    `SELECT ${COLS_PUBLIC} FROM app_users WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function findByEmail(email) {
  const { rows } = await query(
    `SELECT id, nome, email, senha, tipo, regiao, concessionaria_id, regioes_operacao
     FROM app_users
     WHERE LOWER(email) = $1`,
    [email.toLowerCase().trim()]
  );
  return rows[0] || null;
}

async function create({ nome, email, senhaHash, tipo, regiao, concessionaria_id, regioes_operacao }) {
  const { rows } = await query(
    `INSERT INTO app_users (nome, email, senha, tipo, regiao, concessionaria_id, regioes_operacao)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${COLS_PUBLIC}`,
    [nome, email.toLowerCase().trim(), senhaHash, tipo || 'vendedor', regiao || null, concessionaria_id || null, regioes_operacao || null]
  );
  return rows[0];
}

async function update(id, fields) {
  const { nome, email, tipo, regiao, concessionaria_id, regioes_operacao } = fields;
  const { rows } = await query(
    `UPDATE app_users
     SET nome             = COALESCE($1, nome),
         email            = COALESCE($2, email),
         tipo             = COALESCE($3, tipo),
         regiao           = COALESCE($4, regiao),
         concessionaria_id = COALESCE($5, concessionaria_id),
         regioes_operacao = COALESCE($6, regioes_operacao)
     WHERE id = $7
     RETURNING ${COLS_PUBLIC}`,
    [nome, email, tipo, regiao, concessionaria_id, regioes_operacao, id]
  );
  return rows[0] || null;
}

async function updatePassword(id, senhaHash) {
  const { rowCount } = await query(
    `UPDATE app_users SET senha = $1 WHERE id = $2`,
    [senhaHash, id]
  );
  return rowCount > 0;
}

async function updateProfile(id, fields) {
  const allowed = ['nome', 'email', 'telefone', 'cpf', 'foto_perfil'];
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
    `UPDATE app_users SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING ${COLS_PUBLIC}`,
    params
  );
  return rows[0] || null;
}

async function remove(id) {
  const { rowCount } = await query(`DELETE FROM app_users WHERE id = $1`, [id]);
  return rowCount > 0;
}

module.exports = { findAll, findById, findByEmail, create, update, updatePassword, updateProfile, remove };
