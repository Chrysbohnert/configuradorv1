/**
 * precificacaoService.js
 * Queries SQL para precificação simplificada por equipamento/referência.
 * Lista sempre todos os guindastes cadastrados, independentemente de já
 * terem regra de precificação preenchida.
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

function calcularPrecoBaseLocal(mp, mo, regra) {
  const vMp = Number(mp) || 0;
  const vMo = Number(mo) || 0;
  const subtotal = vMp + vMo;
  const custoFixo = Number(regra?.custo_fixo_percent) || 0;
  const comissao = Number(regra?.comissao_percent) || 0;
  const assistencia = Number(regra?.assistencia_percent) || 0;
  const margem = Number(regra?.margem_lucro_percent) || 0;

  const variaveis = subtotal * (custoFixo + comissao + assistencia) / 100;
  const preco = (subtotal + variaveis) * (1 + margem / 100);

  return Number(preco.toFixed(4));
}

async function listarEquipamentosComCusto() {
  // Sempre retorna todos os guindastes, mesmo sem precificação ou sem SQL executado.
  const { rows: guindastes } = await query(
    `SELECT
       id,
       codigo_referencia,
       subgrupo,
       modelo,
       custo_mp,
       custo_mo,
       valor_instalacao_cliente,
       valor_instalacao_incluso
     FROM public.guindastes
     ORDER BY subgrupo ASC, modelo ASC`
  );

  let precificacoes = [];
  try {
    const { rows } = await query(
      `SELECT
         id AS precificacao_id,
         guindaste_id,
         custo_fixo_percent,
         comissao_percent,
         assistencia_percent,
         margem_lucro_percent
       FROM public.precificacao`
    );
    precificacoes = rows || [];
  } catch (err) {
    // Tabela ainda não existe (SQL não executado): continua com array vazio.
    console.warn('[precificacaoService] Tabela precificacao não encontrada:', err.message);
  }

  const mapaPrecificacao = new Map();
  precificacoes.forEach((p) => {
    mapaPrecificacao.set(String(p.guindaste_id), p);
  });

  // Resumo de frete das fontes atuais (global, apenas para exibição)
  let freteMin = null;
  let freteMax = null;
  try {
    const { rows: freteRows } = await query(
      `SELECT
         MIN(LEAST(COALESCE(valor_prioridade, 0), COALESCE(valor_reaproveitamento, 0))) AS frete_min,
         MAX(GREATEST(COALESCE(valor_prioridade, 0), COALESCE(valor_reaproveitamento, 0))) AS frete_max
       FROM public.fretes`
    );
    freteMin = Number(freteRows[0]?.frete_min) || null;
    freteMax = Number(freteRows[0]?.frete_max) || null;
  } catch (err) {
    console.warn('[precificacaoService] Tabela fretes não encontrada:', err.message);
  }

  return (guindastes || []).map((g) => {
    const regra = mapaPrecificacao.get(String(g.id));
    return {
      ...g,
      custo_mp: g.custo_mp ?? null,
      custo_mo: g.custo_mo ?? null,
      valor_instalacao_cliente: g.valor_instalacao_cliente ?? null,
      valor_instalacao_incluso: g.valor_instalacao_incluso ?? null,
      precificacao_id: regra?.precificacao_id ?? null,
      custo_fixo_percent: regra?.custo_fixo_percent ?? 0,
      comissao_percent: regra?.comissao_percent ?? 0,
      assistencia_percent: regra?.assistencia_percent ?? 0,
      margem_lucro_percent: regra?.margem_lucro_percent ?? 0,
      preco_base_calculado: calcularPrecoBaseLocal(g.custo_mp, g.custo_mo, regra),
      frete_min: freteMin,
      frete_max: freteMax,
    };
  });
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
  const { rows: guindasteRows } = await query(
    `SELECT custo_mp, custo_mo FROM public.guindastes WHERE id = $1`,
    [guindasteId]
  );
  const guindaste = guindasteRows[0];
  if (!guindaste) return 0;

  const regra = await findByGuindasteId(guindasteId);
  return calcularPrecoBaseLocal(guindaste.custo_mp, guindaste.custo_mo, regra);
}

async function findAll() {
  const equipamentos = await listarEquipamentosComCusto();
  return equipamentos.filter((e) => e.precificacao_id != null);
}

module.exports = {
  findAll,
  findByGuindasteId,
  upsert,
  remove,
  calcularPrecoBase,
  listarEquipamentosComCusto,
};
