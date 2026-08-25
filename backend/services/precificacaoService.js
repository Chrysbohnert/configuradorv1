/**
 * precificacaoService.js
 * Queries SQL para precificação simplificada por equipamento/referência.
 * Os campos de frete e instalação são lidos das fontes já existentes.
 */

const { query } = require('../db/pool');

const PRECIFICACAO_FIELDS = [
  'guindaste_id',
  'custo_fixo_percent',
  'comissao_percent',
  'assistencia_percent',
  'margem_lucro_percent',
];

async function findAll() {
  const { rows } = await query(
    `SELECT
       p.*,
       g.codigo_referencia,
       g.subgrupo,
       g.modelo,
       g.custo_mp,
       g.custo_mo
     FROM public.precificacao p
     JOIN public.guindastes g ON g.id = p.guindaste_id
     ORDER BY g.subgrupo ASC, g.modelo ASC`
  );
  return rows;
}

async function findByGuindasteId(guindasteId) {
  const { rows } = await query(
    `SELECT *
     FROM public.precificacao
     WHERE guindaste_id = $1`,
    [guindasteId]
  );
  return rows[0] || null;
}

async function upsert(data) {
  const existing = await findByGuindasteId(data.guindaste_id);

  if (existing) {
    const sets = [];
    const params = [];
    PRECIFICACAO_FIELDS.forEach((f) => {
      if (f === 'guindaste_id') return;
      if (data[f] !== undefined) {
        params.push(data[f] === '' ? 0 : Number(data[f]));
        sets.push(`"${f}" = $${params.length}`);
      }
    });
    if (sets.length === 0) throw new Error('Nenhum campo para atualizar');
    params.push(existing.id);
    const { rows } = await query(
      `UPDATE public.precificacao SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    return rows[0];
  }

  const cols = [];
  const vals = [];
  const params = [];
  PRECIFICACAO_FIELDS.forEach((f) => {
    const value = data[f] === '' ? 0 : Number(data[f]);
    cols.push(`"${f}"`);
    params.push(value);
    vals.push(`$${params.length}`);
  });

  const { rows } = await query(
    `INSERT INTO public.precificacao (${cols.join(', ')}) VALUES (${vals.join(', ')}) RETURNING *`,
    params
  );
  return rows[0];
}

async function remove(id) {
  const { rowCount } = await query(
    `DELETE FROM public.precificacao WHERE id = $1`,
    [id]
  );
  return rowCount > 0;
}

async function calcularPrecoBase(guindasteId) {
  const { rows } = await query(
    `SELECT public.calcular_preco_base($1) AS preco`,
    [guindasteId]
  );
  return Number(rows[0]?.preco) || 0;
}

async function listarEquipamentosComCusto() {
  const { rows } = await query(
    `SELECT
       g.id,
       g.codigo_referencia,
       g.subgrupo,
       g.modelo,
       g.custo_mp,
       g.custo_mo,
       p.id AS precificacao_id,
       p.custo_fixo_percent,
       p.comissao_percent,
       p.assistencia_percent,
       p.margem_lucro_percent,
       public.calcular_preco_base(g.id) AS preco_base_calculado
     FROM public.guindastes g
     LEFT JOIN public.precificacao p ON p.guindaste_id = g.id
     ORDER BY g.subgrupo ASC, g.modelo ASC`
  );
  return rows;
}

module.exports = {
  findAll,
  findByGuindasteId,
  upsert,
  remove,
  calcularPrecoBase,
  listarEquipamentosComCusto,
};
