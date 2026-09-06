const { query, getClient } = require('../db/pool');
const { listarEntidades } = require('./territorioService');

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
  if (!id) throw new Error('entidade_id inválido');
  return id;
}

function normalizeAreas(areas) {
  const unique = new Map();
  (areas || []).forEach((a) => {
    const item = {
      codigo_ibge: String(a.codigo_ibge || a.codigoIbge || ''),
      nome: String(a.nome || ''),
      uf: String(a.uf || '').toUpperCase(),
      cor: a.cor ? String(a.cor) : null,
    };
    if (item.codigo_ibge && item.nome && item.uf) unique.set(item.codigo_ibge, item);
  });
  return [...unique.values()];
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

async function getOccupiedAreas(tipo, excludeEntidadeId = null) {
  const type = validateType(tipo);
  const excluded = excludeEntidadeId == null ? null : String(excludeEntidadeId);
  const { rows } = await query(
    `SELECT entidade_id, codigo_ibge, nome, uf, cor
     FROM public.areas_atuacao
     WHERE tipo_entidade = $1 AND ($2::text IS NULL OR entidade_id <> $2)
     ORDER BY entidade_id, nome`,
    [type, excluded]
  );
  let entities = [];
  try {
    entities = await listarEntidades(type);
  } catch (error) {
    console.error('[areasAtuacaoService] Metadados de proprietários indisponíveis:', error.message);
  }
  const owners = new Map(entities.map((entity) => [String(entity.id), entity]));
  return rows.map((area) => ({
    ...area,
    owner: owners.get(String(area.entidade_id)) || {
      id: area.entidade_id,
      nome: `Entidade ${area.entidade_id}`,
      tipo: type,
    },
  }));
}

async function replaceAreas(tipo, entidadeId, areas, { transfer = false, scopeEntityIds = null } = {}) {
  const type = validateType(tipo);
  const id = validateId(entidadeId);
  const items = normalizeAreas(areas);
  const codes = items.map((item) => item.codigo_ibge);
  const scopedIds = Array.isArray(scopeEntityIds) ? scopeEntityIds.map(String) : null;
  const client = await getClient();

  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`areas_atuacao:${type}`]);

    const { rows: conflicts } = codes.length ? await client.query(
      `SELECT entidade_id, codigo_ibge, nome, uf
       FROM public.areas_atuacao
       WHERE tipo_entidade = $1
         AND entidade_id <> $2
         AND codigo_ibge = ANY($3::text[])
         AND ($4::text[] IS NULL OR entidade_id = ANY($4::text[]))
       ORDER BY entidade_id, nome`,
      [type, id, codes, scopedIds]
    ) : { rows: [] };

    if (conflicts.length && !transfer) {
      let entities = [];
      try {
        entities = await listarEntidades(type);
      } catch (metadataError) {
        console.error('[areasAtuacaoService] Metadados de conflitos indisponíveis:', metadataError.message);
      }
      const ownerNames = new Map(entities.map((entity) => [String(entity.id), entity.nome]));
      const error = new Error(`${conflicts.length} município(s) já pertencem a outra entidade do mesmo tipo.`);
      error.status = 409;
      error.conflicts = conflicts.map((conflict) => ({
        ...conflict,
        owner: {
          id: conflict.entidade_id,
          nome: ownerNames.get(String(conflict.entidade_id)) || `Entidade ${conflict.entidade_id}`,
        },
      }));
      throw error;
    }

    if (conflicts.length) {
      const conflictingOwners = [...new Set(conflicts.map((conflict) => String(conflict.entidade_id)))];
      await client.query(
        `DELETE FROM public.areas_atuacao
         WHERE tipo_entidade = $1
           AND entidade_id = ANY($2::text[])
           AND codigo_ibge = ANY($3::text[])`,
        [type, conflictingOwners, codes]
      );
    }

    await client.query(
      `DELETE FROM public.areas_atuacao WHERE tipo_entidade = $1 AND entidade_id = $2`,
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

module.exports = { getAreas, getOccupiedAreas, replaceAreas };
