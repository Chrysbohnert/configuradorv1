/**
 * tributacaoService.js
 * CRUD de regras tributárias por UF + NCM.
 */

const { query } = require('../db/pool');

const UF_LIST = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

async function findAll({ uf, ncm } = {}) {
  let sql = `SELECT * FROM public.tributacao`;
  const where = [];
  const params = [];

  if (uf) {
    params.push(uf.toUpperCase().trim());
    where.push(`uf = $${params.length}`);
  }
  if (ncm) {
    params.push(ncm.trim());
    where.push(`ncm = $${params.length}`);
  }

  if (where.length > 0) sql += ` WHERE ${where.join(' AND ')}`;
  sql += ` ORDER BY ncm ASC, uf ASC`;

  const { rows } = await query(sql, params);
  return rows;
}

async function findById(id) {
  const { rows } = await query(
    `SELECT * FROM public.tributacao WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function create(data) {
  const { uf, ncm, icms_contribuinte_percent, icms_nao_contribuinte_percent, pis_cofins_percent } = data;

  const { rows } = await query(
    `INSERT INTO public.tributacao
       (uf, ncm, icms_contribuinte_percent, icms_nao_contribuinte_percent, pis_cofins_percent)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      (uf || '').toUpperCase().trim(),
      (ncm || '').trim(),
      data.icms_contribuinte_percent === '' ? 0 : Number(icms_contribuinte_percent) || 0,
      data.icms_nao_contribuinte_percent === '' ? 0 : Number(icms_nao_contribuinte_percent) || 0,
      data.pis_cofins_percent === '' ? 0 : Number(pis_cofins_percent) || 0,
    ]
  );
  return rows[0];
}

async function createAllUFsForNCM(data) {
  const { ncm, icms_contribuinte_percent, icms_nao_contribuinte_percent, pis_cofins_percent } = data;
  const ncmLimpo = (ncm || '').trim();
  if (!ncmLimpo) throw new Error('NCM é obrigatório');

  const vContribuinte = data.icms_contribuinte_percent === '' ? 0 : Number(icms_contribuinte_percent) || 0;
  const vNaoContribuinte = data.icms_nao_contribuinte_percent === '' ? 0 : Number(icms_nao_contribuinte_percent) || 0;
  const vPisCofins = data.pis_cofins_percent === '' ? 0 : Number(pis_cofins_percent) || 0;

  const values = [];
  const params = [];
  UF_LIST.forEach((u, i) => {
    const base = i * 5;
    values.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`);
    params.push(u, ncmLimpo, vContribuinte, vNaoContribuinte, vPisCofins);
  });

  const { rows } = await query(
    `INSERT INTO public.tributacao
       (uf, ncm, icms_contribuinte_percent, icms_nao_contribuinte_percent, pis_cofins_percent)
     VALUES ${values.join(', ')}
     ON CONFLICT (uf, ncm) DO UPDATE SET
       icms_contribuinte_percent = EXCLUDED.icms_contribuinte_percent,
       icms_nao_contribuinte_percent = EXCLUDED.icms_nao_contribuinte_percent,
       pis_cofins_percent = EXCLUDED.pis_cofins_percent,
       updated_at = NOW()
     RETURNING *`,
    params
  );
  return rows;
}

async function update(id, data) {
  const existing = await findById(id);
  if (!existing) return null;

  const sets = [];
  const params = [];

  if (data.uf !== undefined) {
    params.push((data.uf || '').toUpperCase().trim());
    sets.push(`uf = $${params.length}`);
  }
  if (data.ncm !== undefined) {
    params.push((data.ncm || '').trim());
    sets.push(`ncm = $${params.length}`);
  }
  if (data.icms_contribuinte_percent !== undefined) {
    params.push(data.icms_contribuinte_percent === '' ? 0 : Number(data.icms_contribuinte_percent) || 0);
    sets.push(`icms_contribuinte_percent = $${params.length}`);
  }
  if (data.icms_nao_contribuinte_percent !== undefined) {
    params.push(data.icms_nao_contribuinte_percent === '' ? 0 : Number(data.icms_nao_contribuinte_percent) || 0);
    sets.push(`icms_nao_contribuinte_percent = $${params.length}`);
  }
  if (data.pis_cofins_percent !== undefined) {
    params.push(data.pis_cofins_percent === '' ? 0 : Number(data.pis_cofins_percent) || 0);
    sets.push(`pis_cofins_percent = $${params.length}`);
  }

  if (sets.length === 0) return existing;
  params.push(id);

  const { rows } = await query(
    `UPDATE public.tributacao SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`,
    params
  );
  return rows[0];
}

async function remove(id) {
  const { rowCount } = await query(
    `DELETE FROM public.tributacao WHERE id = $1`,
    [id]
  );
  return rowCount > 0;
}

module.exports = {
  UF_LIST,
  findAll,
  findById,
  create,
  createAllUFsForNCM,
  update,
  remove,
};
