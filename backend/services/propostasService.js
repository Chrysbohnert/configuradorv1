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
  'motivo_perda', 'data_resultado_venda', 'dados_serializados', 'cliente_id',
  'id_guindaste', 'estoque_descontado',
];

const COLS_RESUMO = [
  'id', 'numero_proposta', 'data', 'vendedor_id', 'vendedor_nome', 'cliente_nome',
  'cliente_documento', 'valor_total', 'tipo', 'status', 'concessionaria_id', 'canal_venda',
  'segmento_cliente', 'cliente_uf', 'cliente_cidade', 'produto_principal', 'linha_produto',
  'resultado_venda', 'motivo_perda', 'data_resultado_venda', 'created_at', 'updated_at',
  'cliente_id', 'id_guindaste', 'estoque_descontado',
];

function buildConditions(filters) {
  const conditions = [];
  const params = [];

  const { vendedor_id, status, tipo, concessionaria_id, cliente_id } = filters;

  if (Array.isArray(vendedor_id) && vendedor_id.length) {
    params.push(vendedor_id);
    conditions.push(`vendedor_id = ANY($${params.length})`);
  } else if (vendedor_id) {
    params.push(vendedor_id);
    conditions.push(`vendedor_id = $${params.length}`);
  }
  if (status) { params.push(status); conditions.push(`status = $${params.length}`); }
  if (tipo)   { params.push(tipo);   conditions.push(`tipo = $${params.length}`); }
  if (concessionaria_id) {
    params.push(concessionaria_id);
    conditions.push(`concessionaria_id = $${params.length}`);
  }
  if (cliente_id) {
    params.push(cliente_id);
    conditions.push(`cliente_id = $${params.length}`);
  }

  return { conditions, params };
}

async function findAll({ vendedor_id, status, tipo, concessionaria_id, cliente_id, limit = 0, offset = 0, includeDadosSerializados = false } = {}) {
  const { conditions, params } = buildConditions({ vendedor_id, status, tipo, concessionaria_id, cliente_id });
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const selectCols = includeDadosSerializados ? '*' : COLS_RESUMO.join(', ');

  let queryStr;
  if (limit && limit > 0) {
    params.push(limit, offset);
    queryStr = `SELECT ${selectCols} FROM propostas ${where} ORDER BY COALESCE(created_at, data) DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;
  } else {
    queryStr = `SELECT ${selectCols} FROM propostas ${where} ORDER BY COALESCE(created_at, data) DESC`;
  }

  const { rows } = await query(queryStr, params);
  return rows;
}

async function count({ vendedor_id, status, tipo, concessionaria_id, cliente_id } = {}) {
  const { conditions, params } = buildConditions({ vendedor_id, status, tipo, concessionaria_id, cliente_id });
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await query(`SELECT COUNT(*)::int AS total FROM propostas ${where}`, params);
  return rows[0]?.total || 0;
}

async function findById(id) {
  const { rows } = await query(`SELECT * FROM propostas WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function create(data) {
  const { id: _ignoredId, ...propostaData } = data;

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
  return rows[0];
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
  const proposta = rows[0] || null;

  // Baixa de estoque: somente ao marcar resultado_venda = 'efetivada' e se ainda não descontou
  if (proposta && data.resultado_venda === 'efetivada' && !proposta.estoque_descontado) {
    const guindasteId = proposta.id_guindaste;
    if (guindasteId) {
      try {
        // Verificar estoque antes de descontar
        const { rows: gRows } = await query(
          `SELECT quantidade_disponivel FROM guindastes WHERE id = $1`, [guindasteId]
        );
        const qtdAtual = gRows[0]?.quantidade_disponivel || 0;

        if (qtdAtual > 0) {
          await query(
            `UPDATE guindastes SET quantidade_disponivel = quantidade_disponivel - 1 WHERE id = $1 AND quantidade_disponivel > 0`,
            [guindasteId]
          );
        }
        // Marcar estoque_descontado = true para não descontar novamente
        await query(
          `UPDATE propostas SET estoque_descontado = true WHERE id = $1`, [id]
        );
        proposta.estoque_descontado = true;
        console.log(`✅ [propostasService.update] Estoque descontado: guindaste ${guindasteId} (proposta ${id})`);
      } catch (e) {
        console.warn(`⚠️ [propostasService.update] Erro ao descontar estoque:`, e.message);
      }
    }
  }

  return proposta;
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
