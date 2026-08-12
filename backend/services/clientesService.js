/**
 * clientesService.js
 * Queries SQL para a tabela `clientes`.
 * Reaproveita a tabela já existente (id, nome, email, telefone, documento,
 * endereco, observacoes, inscricao_estadual, created_at, updated_at) e as
 * colunas novas (vendedor_id, regiao, tipo_venda, participacao_revenda,
 * tipo_cliente) adicionadas via ALTER TABLE manual.
 */

const { query } = require('../db/pool');

const CLIENTE_FIELDS = [
  'nome', 'email', 'telefone', 'documento', 'endereco', 'observacoes',
  'inscricao_estadual', 'vendedor_id', 'regiao', 'tipo_venda',
  'participacao_revenda', 'tipo_cliente',
];

const COLS_BASE = `
  c.id, c.nome, c.email, c.telefone, c.documento, c.endereco, c.observacoes,
  c.inscricao_estadual, c.vendedor_id, c.regiao, c.tipo_venda,
  c.participacao_revenda, c.tipo_cliente, c.created_at, c.updated_at
`;

function buildConditions({ vendedor_id, search } = {}) {
  const conditions = [];
  const params = [];

  if (vendedor_id) {
    params.push(vendedor_id);
    conditions.push(`c.vendedor_id = $${params.length}`);
  }

  if (search && search.trim()) {
    params.push(`%${search.trim()}%`);
    conditions.push(`(c.nome ILIKE $${params.length} OR c.documento ILIKE $${params.length})`);
  }

  return { conditions, params };
}

async function findAll({ vendedor_id, search } = {}) {
  const { conditions, params } = buildConditions({ vendedor_id, search });
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await query(
    `SELECT ${COLS_BASE},
            v.nome AS vendedor_nome,
            COALESCE(p.total_propostas, 0)::int AS total_propostas
     FROM clientes c
     LEFT JOIN app_users v ON v.id = c.vendedor_id
     LEFT JOIN (
       SELECT cliente_id, COUNT(*) AS total_propostas
       FROM propostas
       WHERE cliente_id IS NOT NULL AND status <> 'excluido'
       GROUP BY cliente_id
     ) p ON p.cliente_id = c.id
     ${where}
     ORDER BY c.nome ASC`,
    params
  );
  return rows;
}

async function findById(id) {
  const { rows } = await query(
    `SELECT ${COLS_BASE}, v.nome AS vendedor_nome
     FROM clientes c
     LEFT JOIN app_users v ON v.id = c.vendedor_id
     WHERE c.id = $1`,
    [id]
  );
  return rows[0] || null;
}

/** Busca proposta(s) vinculadas a um cliente (histórico). */
async function findPropostasByClienteId(clienteId) {
  const { rows } = await query(
    `SELECT id, numero_proposta, data, status, tipo, valor_total, vendedor_nome, created_at
     FROM propostas
     WHERE cliente_id = $1
     ORDER BY COALESCE(created_at, data) DESC`,
    [clienteId]
  );
  return rows;
}

/** Tenta localizar cliente já cadastrado pelo documento (evita duplicidade). */
async function findByDocumento(documento) {
  if (!documento) return null;
  const { rows } = await query(
    `SELECT ${COLS_BASE} FROM clientes c WHERE c.documento = $1 LIMIT 1`,
    [documento]
  );
  return rows[0] || null;
}

async function create(data) {
  const cols = [];
  const vals = [];
  const params = [];

  CLIENTE_FIELDS.forEach((f) => {
    if (data[f] !== undefined) {
      cols.push(`"${f}"`);
      params.push(data[f] === '' ? null : data[f]);
      vals.push(`$${params.length}`);
    }
  });

  if (cols.length === 0) throw new Error('Nenhum campo fornecido para criar cliente');

  const { rows } = await query(
    `INSERT INTO clientes (${cols.join(', ')}) VALUES (${vals.join(', ')}) RETURNING *`,
    params
  );
  return rows[0];
}

async function update(id, data) {
  const sets = [];
  const params = [];

  CLIENTE_FIELDS.forEach((f) => {
    if (data[f] !== undefined) {
      params.push(data[f] === '' ? null : data[f]);
      sets.push(`"${f}" = $${params.length}`);
    }
  });

  if (sets.length === 0) throw new Error('Nenhum campo para atualizar');
  params.push(id);

  const { rows } = await query(
    `UPDATE clientes SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );
  return rows[0] || null;
}

module.exports = {
  findAll,
  findById,
  findByDocumento,
  findPropostasByClienteId,
  create,
  update,
};
