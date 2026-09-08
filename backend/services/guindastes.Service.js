/**
 * guindastesService.js
 * Queries SQL para a tabela `guindastes`.
 */

const { query, getClient } = require('../db/pool');
const { normalizarRegiao } = require('../utils/regiaoHelper');

/** Campos leves para listagem inicial (Nova Proposta) — sem imagem/descrição/base64 */
const LITE_COLUMNS = [
  'id',
  'subgrupo',
  'modelo',
  'codigo_referencia',
  'peso_kg',
  'grupo',
  'is_prototipo',
  'is_comercio_exterior',
].join(', ');

const KNOWN_FIELDS = [
  'subgrupo',
  'modelo',
  'grupo',
  'peso_kg',
  'configuracao',
  'tem_contr',
  'imagem_url', 'descricao', 'nao_incluido', 'imagens_adicionais', 'finame', 'ncm',
  'codigo_referencia', 'quantidade_disponivel', 'is_prototipo', 'prototipo_label',
  'prototipo_observacoes_pdf', 'is_comercio_exterior', 'valor_instalacao_cliente',
  'valor_instalacao_incluso', 'bloquear_desconto',
  'custo_mp', 'custo_mo',
  'status_preco', 'preco_pendente_desde',
];

async function findAllEstoque() {
  const { rows } = await query(
    `SELECT id, codigo_referencia, subgrupo, modelo, quantidade_disponivel FROM guindastes ORDER BY subgrupo ASC`
  );
  return rows;
}

async function updateEstoque(id, quantidade) {
  const { rows } = await query(
    `UPDATE guindastes SET quantidade_disponivel = $1 WHERE id = $2 RETURNING id, codigo_referencia, subgrupo, modelo, quantidade_disponivel`,
    [quantidade, id]
  );
  return rows[0] || null;
}

async function findAll({ limit, offset, lite = false } = {}) {
  const select = lite ? LITE_COLUMNS : '*';
  let sql = `SELECT ${select} FROM guindastes ORDER BY subgrupo ASC`;
  const params = [];
  if (limit !== undefined) { params.push(limit); sql += ` LIMIT $${params.length}`; }
  if (offset !== undefined) { params.push(offset); sql += ` OFFSET $${params.length}`; }
  const { rows } = await query(sql, params);
  return rows;
}

async function count() {
  const { rows } = await query('SELECT COUNT(*)::int AS total FROM guindastes');
  return rows[0]?.total || 0;
}

async function findById(id) {
  const { rows } = await query(`SELECT * FROM guindastes WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function findImagemById(id) {
  const { rows } = await query(
    `SELECT id, imagem_url FROM guindastes WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function create(data) {
  const cols = [], vals = [], params = [];
  KNOWN_FIELDS.forEach(f => {
    if (data[f] !== undefined) {
      cols.push(`"${f}"`);
      params.push(data[f] === '' ? null : data[f]);
      vals.push(`$${params.length}`);
    }
  });
  if (cols.length === 0) throw new Error('Nenhum campo fornecido');
  const { rows } = await query(
    `INSERT INTO guindastes (${cols.join(', ')}) VALUES (${vals.join(', ')}) RETURNING *`,
    params
  );
  return rows[0];
}

async function createFromErp(data, erpItemId) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const { rows: erpRows } = await client.query(
      `SELECT i.id, i.referencia, i.descricao, i.ncm, i.custo_mp, i.custo_mo
       FROM public.erp_import_itens i
       INNER JOIN public.erp_import_lotes l ON l.id = i.lote_id
       WHERE i.id = $1 AND l.atual = TRUE AND l.status = 'concluido'
       LIMIT 1`,
      [erpItemId]
    );
    const erpItem = erpRows[0];
    if (!erpItem) {
      const error = new Error('Item ERP inválido ou não pertencente ao lote atual');
      error.status = 400;
      throw error;
    }

    const authoritativeData = {
      ...data,
      codigo_referencia: erpItem.referencia,
      descricao: erpItem.descricao,
      ncm: erpItem.ncm,
      custo_mp: erpItem.custo_mp,
      custo_mo: erpItem.custo_mo,
    };
    const cols = [], vals = [], params = [];
    KNOWN_FIELDS.forEach((field) => {
      if (authoritativeData[field] !== undefined) {
        cols.push(`"${field}"`);
        params.push(authoritativeData[field] === '' ? null : authoritativeData[field]);
        vals.push(`$${params.length}`);
      }
    });
    if (cols.length === 0) throw new Error('Nenhum campo fornecido');
    const { rows } = await client.query(
      `INSERT INTO guindastes (${cols.join(', ')}) VALUES (${vals.join(', ')}) RETURNING *`,
      params
    );
    await client.query('COMMIT');
    return rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function update(id, data) {
  const sets = [], params = [];
  KNOWN_FIELDS.forEach(f => {
    if (data[f] !== undefined) {
      params.push(data[f] === '' ? null : data[f]);
      sets.push(`"${f}" = $${params.length}`);
    }
  });
  if (sets.length === 0) throw new Error('Nenhum campo para atualizar');
  params.push(id);
  const { rows } = await query(
    `UPDATE guindastes SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );
  return rows[0] || null;
}

async function remove(id) {
  const { rowCount } = await query(`DELETE FROM guindastes WHERE id = $1`, [id]);
  return rowCount > 0;
}

async function verificarStatusPreco(guindasteId) {
  const { rows } = await query(
    `SELECT status_preco FROM guindastes WHERE id = $1`,
    [Number(guindasteId)]
  );
  if (rows[0]?.status_preco === 'pendente') {
    const error = new Error('Equipamento com preço pendente de validação. Aprovação ou edição necessária antes de uso em propostas.');
    error.status = 403;
    throw error;
  }
}

function casarRegiaoPreco(regiaoNorm, regiaoOriginal, regiaoDb) {
  const r = (regiaoDb || '').toLowerCase().trim();
  return (
    r === regiaoNorm ||
    normalizarRegiao(regiaoDb) === regiaoNorm ||
    r === (regiaoOriginal || '').toLowerCase().trim()
  );
}

async function findPrecoPorRegiao(guindasteId, regiao) {
  if (guindasteId == null || guindasteId === '' || !regiao) return 0;

  await verificarStatusPreco(guindasteId);

  const regiaoNorm = normalizarRegiao(regiao);
  const id = Number(guindasteId);
  if (Number.isNaN(id)) return 0;

  const { rows: exact } = await query(
    `SELECT preco FROM precos_guindaste_regiao
     WHERE guindaste_id = $1 AND regiao = $2
     LIMIT 1`,
    [id, regiaoNorm]
  );
  if (exact[0]?.preco != null) return Number(exact[0].preco) || 0;

  const { rows: all } = await query(
    `SELECT preco, regiao FROM precos_guindaste_regiao WHERE guindaste_id = $1`,
    [id]
  );
  const row = (all || []).find((p) => casarRegiaoPreco(regiaoNorm, regiao, p.regiao));
  if (row?.preco != null) return Number(row.preco) || 0;

  return 0;
}

async function findPrecoCompraPorRegiao(guindasteId, regiao) {
  if (guindasteId == null || guindasteId === '' || !regiao) return 0;

  await verificarStatusPreco(guindasteId);

  const regiaoNorm = normalizarRegiao(regiao);
  const id = Number(guindasteId);
  if (Number.isNaN(id)) return 0;

  const { rows: exact } = await query(
    `SELECT preco FROM precos_compra_concessionaria_por_regiao
     WHERE guindaste_id = $1 AND regiao = $2
     LIMIT 1`,
    [id, regiaoNorm]
  );
  if (exact[0]?.preco != null) return Number(exact[0].preco) || 0;

  const { rows: all } = await query(
    `SELECT preco, regiao FROM precos_compra_concessionaria_por_regiao WHERE guindaste_id = $1`,
    [id]
  );
  const row = (all || []).find((p) => casarRegiaoPreco(regiaoNorm, regiao, p.regiao));
  if (row?.preco != null) return Number(row.preco) || 0;

  return 0;
}

async function findAllPrecosPorRegiao(guindasteId) {
  const id = Number(guindasteId);
  console.log('[findAllPrecosPorRegiao] guindasteId:', guindasteId, '-> id:', id);
  if (Number.isNaN(id)) return [];
  const { rows } = await query(
    `SELECT regiao, preco FROM precos_guindaste_regiao WHERE guindaste_id = $1`,
    [id]
  );
  console.log('[findAllPrecosPorRegiao] rows:', rows);
  return rows || [];
}

async function findAllPrecosCompraPorRegiao(guindasteId) {
  const id = Number(guindasteId);
  console.log('[findAllPrecosCompraPorRegiao] guindasteId:', guindasteId, '-> id:', id);
  if (Number.isNaN(id)) return [];
  const { rows } = await query(
    `SELECT regiao, preco FROM precos_compra_concessionaria_por_regiao WHERE guindaste_id = $1`,
    [id]
  );
  console.log('[findAllPrecosCompraPorRegiao] rows:', rows);
  return rows || [];
}

async function savePrecosPorRegiao(guindasteId, precos) {
  const id = Number(guindasteId);
  console.log('[savePrecosPorRegiao] guindasteId:', guindasteId, '-> id:', id, 'precos:', precos);
  if (Number.isNaN(id)) throw new Error('guindaste_id inválido');

  const client = await require('../db/pool').getClient();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM precos_guindaste_regiao WHERE guindaste_id = $1', [id]);
    for (const p of (precos || [])) {
      if (p.preco != null && p.regiao) {
        await client.query(
          'INSERT INTO precos_guindaste_regiao (guindaste_id, regiao, preco) VALUES ($1, $2, $3)',
          [id, p.regiao, p.preco]
        );
      }
    }
    await client.query('COMMIT');
    console.log('[savePrecosPorRegiao] sucesso');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('[savePrecosPorRegiao] erro:', e);
    throw e;
  } finally {
    client.release();
  }
}

async function aprovarPreco(guindasteId, usuario) {
  const id = Number(guindasteId);
  if (Number.isNaN(id)) throw Object.assign(new Error('guindaste_id inválido'), { status: 400 });

  const client = await require('../db/pool').getClient();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `UPDATE guindastes
       SET status_preco = 'aprovado', preco_pendente_desde = NULL, updated_at = NOW()
       WHERE id = $1
       RETURNING id, codigo_referencia, status_preco`,
      [id]
    );
    if (!rows.length) throw Object.assign(new Error('Guindaste não encontrado'), { status: 404 });

    await client.query(
      `INSERT INTO public.preco_auditoria
         (guindaste_id, usuario_id, usuario_nome, acao, valor_anterior, valor_novo, motivo)
       VALUES ($1, $2, $3, 'aprovar', NULL, NULL, 'Aprovação manual do preço/custo pendente')`,
      [id, usuario?.id || null, usuario?.nome || usuario?.email || null]
    );

    await client.query('COMMIT');
    return rows[0];
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function editarPrecoPendente(guindasteId, data, usuario) {
  const id = Number(guindasteId);
  if (Number.isNaN(id)) throw Object.assign(new Error('guindaste_id inválido'), { status: 400 });

  const camposPermitidos = ['custo_mp', 'custo_mo'];
  const sets = [];
  const params = [];
  const valores = {};

  camposPermitidos.forEach((f) => {
    if (data[f] !== undefined && data[f] !== null && data[f] !== '') {
      const v = Number(data[f]);
      if (Number.isFinite(v)) {
        params.push(v);
        sets.push(`"${f}" = $${params.length}`);
        valores[f] = v;
      }
    }
  });

  if (sets.length === 0) throw Object.assign(new Error('Nenhum campo de preço válido fornecido'), { status: 400 });

  const client = await require('../db/pool').getClient();
  try {
    await client.query('BEGIN');
    const { rows: current } = await client.query(
      `SELECT custo_mp, custo_mo FROM guindastes WHERE id = $1`,
      [id]
    );
    if (!current.length) throw Object.assign(new Error('Guindaste não encontrado'), { status: 404 });

    params.push(id);
    const { rows } = await client.query(
      `UPDATE guindastes
       SET ${sets.join(', ')}, status_preco = 'aprovado', preco_pendente_desde = NULL, updated_at = NOW()
       WHERE id = $${params.length}
       RETURNING id, codigo_referencia, custo_mp, custo_mo, status_preco`,
      params
    );

    await client.query(
      `INSERT INTO public.preco_auditoria
         (guindaste_id, usuario_id, usuario_nome, acao, valor_anterior, valor_novo, motivo)
       VALUES ($1, $2, $3, 'editar', $4, $5, 'Edição manual do preço/custo pendente')`,
      [
        id,
        usuario?.id || null,
        usuario?.nome || usuario?.email || null,
        JSON.stringify({ custo_mp: current[0].custo_mp, custo_mo: current[0].custo_mo }),
        JSON.stringify(valores),
      ]
    );

    await client.query('COMMIT');
    return rows[0];
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function listarAuditoriaPreco(guindasteId, limit = 50) {
  const id = Number(guindasteId);
  if (Number.isNaN(id)) return [];
  const { rows } = await query(
    `SELECT id, guindaste_id, usuario_id, usuario_nome, acao, valor_anterior, valor_novo, motivo, created_at
     FROM public.preco_auditoria
     WHERE guindaste_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [id, limit]
  );
  return rows;
}

async function savePrecosCompraPorRegiao(guindasteId, precos) {
  const id = Number(guindasteId);
  console.log('[savePrecosCompraPorRegiao] guindasteId:', guindasteId, '-> id:', id, 'precos:', precos);
  if (Number.isNaN(id)) throw new Error('guindaste_id inválido');

  const client = await require('../db/pool').getClient();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM precos_compra_concessionaria_por_regiao WHERE guindaste_id = $1', [id]);
    for (const p of (precos || [])) {
      if (p.preco != null && p.regiao) {
        await client.query(
          'INSERT INTO precos_compra_concessionaria_por_regiao (guindaste_id, regiao, preco) VALUES ($1, $2, $3)',
          [id, p.regiao, p.preco]
        );
      }
    }
    await client.query('COMMIT');
    console.log('[savePrecosCompraPorRegiao] sucesso');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('[savePrecosCompraPorRegiao] erro:', e);
    throw e;
  } finally {
    client.release();
  }
}

module.exports = {
  findAll,
  findAllEstoque,
  updateEstoque,
  count,
  findById,
  findImagemById,
  create,
  createFromErp,
  update,
  remove,
  findPrecoPorRegiao,
  findPrecoCompraPorRegiao,
  findAllPrecosPorRegiao,
  findAllPrecosCompraPorRegiao,
  savePrecosPorRegiao,
  savePrecosCompraPorRegiao,
  aprovarPreco,
  editarPrecoPendente,
  listarAuditoriaPreco,
};
