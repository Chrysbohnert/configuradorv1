const { query, getClient } = require('../db/pool');

const ALLOWED_TYPES = new Set(['instaladora', 'concessionaria', 'representante']);

function validateType(tipo) {
  const normalized = String(tipo || '').toLowerCase();
  if (!ALLOWED_TYPES.has(normalized)) {
    throw new Error(`Tipo de entidade inválido: ${tipo}. Permitidos: ${[...ALLOWED_TYPES].join(', ')}`);
  }
  return normalized;
}

function validateId(entidadeId) {
  const id = String(entidadeId || '').trim();
  if (!id) {
    throw new Error('entidade_id inválido');
  }
  return id;
}

async function getAreas(tipo, entidadeId) {
  const type = validateType(tipo);
  const id = validateId(entidadeId);

  const { rows } = await query(
    `SELECT id, codigo_ibge, nome, uf, cor
     FROM public.areas_atuacao
     WHERE tipo_entidade = $1 AND entidade_id = $2
     ORDER BY nome ASC`,
    [type, id]
  );
  return rows;
}

async function replaceAreas(tipo, entidadeId, areas) {
  const type = validateType(tipo);
  const id = validateId(entidadeId);

  const items = (areas || []).map((a) => ({
    codigo_ibge: String(a.codigo_ibge || a.codigoIbge || ''),
    nome: String(a.nome || ''),
    uf: String(a.uf || '').toUpperCase(),
    cor: a.cor ? String(a.cor) : null,
  })).filter((a) => a.codigo_ibge && a.nome && a.uf);

  const client = await getClient();
  try {
    await client.query('BEGIN');

    await client.query(
      `DELETE FROM public.areas_atuacao
       WHERE tipo_entidade = $1 AND entidade_id = $2`,
      [type, id]
    );

    for (const item of items) {
      await client.query(
        `INSERT INTO public.areas_atuacao
         (tipo_entidade, entidade_id, codigo_ibge, nome, uf, cor)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [type, id, item.codigo_ibge, item.nome, item.uf, item.cor]
      );
    }

    await client.query('COMMIT');
    return items;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  getAreas,
  replaceAreas,
};
