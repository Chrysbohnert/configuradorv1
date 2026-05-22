/**
 * propostasService.js
 * Queries SQL para a tabela `propostas`.
 */

const { randomUUID } = require('crypto');
const { query } = require('../db/pool');

const PROPOSTA_FIELDS = [
  'numero_proposta', 'data', 'vendedor_id', 'vendedor_nome', 'cliente_nome', 'cliente_documento',
  'valor_total', 'tipo', 'status', 'concessionaria_id', 'canal_venda', 'segmento_cliente',
  'cliente_uf', 'cliente_cidade', 'produto_principal', 'linha_produto', 'resultado_venda',
  'motivo_perda', 'data_resultado_venda', 'dados_serializados',
];

const COLS_RESUMO = [
  'id', 'numero_proposta', 'data', 'vendedor_id', 'vendedor_nome', 'cliente_nome',
  'cliente_documento', 'valor_total', 'tipo', 'status', 'concessionaria_id', 'canal_venda',
  'segmento_cliente', 'cliente_uf', 'cliente_cidade', 'produto_principal', 'linha_produto',
  'resultado_venda', 'motivo_perda', 'data_resultado_venda', 'created_at', 'updated_at',
];

function buildConditions(filters) {
  const conditions = [];
  const params = [];

  const { vendedor_id, status, tipo } = filters;

  if (Array.isArray(vendedor_id) && vendedor_id.length) {
    params.push(vendedor_id);
    conditions.push(`vendedor_id = ANY($${params.length})`);
  } else if (vendedor_id) {
    params.push(vendedor_id);
    conditions.push(`vendedor_id = $${params.length}`);
  }
  if (status) { params.push(status); conditions.push(`status = $${params.length}`); }
  if (tipo)   { params.push(tipo);   conditions.push(`tipo = $${params.length}`); }

  return { conditions, params };
}

async function findAll({ vendedor_id, status, tipo, limit = 100, offset = 0, includeDadosSerializados = false } = {}) {
  const { conditions, params } = buildConditions({ vendedor_id, status, tipo });
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const selectCols = includeDadosSerializados ? '*' : COLS_RESUMO.join(', ');

  params.push(limit, offset);
  const { rows } = await query(
    `SELECT ${selectCols} FROM propostas ${where} ORDER BY data DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return rows;
}

async function count({ vendedor_id, status, tipo } = {}) {
  const { conditions, params } = buildConditions({ vendedor_id, status, tipo });
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await query(`SELECT COUNT(*)::int AS total FROM propostas ${where}`, params);
  return rows[0]?.total || 0;
}

async function findById(id) {
  const { rows } = await query(`SELECT * FROM propostas WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function create(data) {
  const { id_guindaste, id: _ignoredId, ...propostaData } = data;

  const nextId = randomUUID();

  const cols = ['id'];
  const vals = ['$1'];
  const params = [nextId];

  PROPOSTA_FIELDS.forEach(f => {
    if (propostaData[f] !== undefined) {
      cols.push(`"${f}"`);
      const v = propostaData[f];
      params.push(
        f === 'dados_serializados' && v !== null && typeof v === 'object'
          ? JSON.stringify(v)
          : (v === '' ? null : v)
      );
      vals.push(`$${params.length}`);
    }
  });

  if (cols.length <= 1) throw new Error('Nenhum campo fornecido para criar proposta');

  const { rows } = await query(
    `INSERT INTO propostas (${cols.join(', ')}) VALUES (${vals.join(', ')}) RETURNING *`,
    params
  );
  const proposta = rows[0];

  if (id_guindaste) {
    try {
      await query(
        `UPDATE guindastes SET quantidade_disponivel = GREATEST(0, quantidade_disponivel - 1) WHERE id = $1`,
        [id_guindaste]
      );
      console.log(`✅ [propostasService.create] Estoque decrementado: guindaste ${id_guindaste}`);
    } catch (e) {
      console.warn(`⚠️ [propostasService.create] Erro ao decrementar estoque:`, e.message);
    }
  }

  return proposta;
}

async function update(id, data) {
  const sets = [], params = [];

  PROPOSTA_FIELDS.forEach(f => {
    if (data[f] !== undefined) {
      const v = data[f];
      params.push(f === 'dados_serializados' && v !== null && typeof v === 'object' ? JSON.stringify(v) : (v === '' ? null : v));
      sets.push(`"${f}" = $${params.length}`);
    }
  });

  if (sets.length === 0) throw new Error('Nenhum campo para atualizar');
  params.push(id);

  const { rows } = await query(
    `UPDATE propostas SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );
  return rows[0] || null;
}

async function softDelete(id) {
  const { rows } = await query(
    `UPDATE propostas SET status = 'excluido' WHERE id = $1 RETURNING *`,
    [id]
  );
  return rows[0] || null;
}

async function hardDelete(id) {
  const { rowCount } = await query(`DELETE FROM propostas WHERE id = $1`, [id]);
  return rowCount > 0;
}

module.exports = { findAll, count, findById, create, update, softDelete, hardDelete };
