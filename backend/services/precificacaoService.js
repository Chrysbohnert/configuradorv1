/**
 * precificacaoService.js
 * Queries SQL para precificação simplificada por equipamento/referência.
 * Lista sempre todos os guindastes cadastrados, independentemente de já
 * terem regra de precificação preenchida.
 * Os campos de frete e instalação são lidos das fontes já existentes.
 */

const { query, getClient } = require('../db/pool');
const engine = require('./precificacaoEngine');

const PRECIFICACAO_FIELDS = [
  'guindaste_id',
  'custo_fixo_percent',
  'comissao_percent',
  'assistencia_percent',
  'margem_lucro_percent',
  'ipi_percent',
];

function numeroValido(value, field, { nullable = false, padrao = 0 } = {}) {
  if (value === null || value === '') {
    if (nullable) return null;
    return padrao;
  }
  if (value === undefined) return padrao;
  const numero = Number(value);
  if (!Number.isFinite(numero)) {
    const error = new Error(`${field} deve ser um número válido`);
    error.status = 400;
    throw error;
  }
  return numero;
}

function normalizarPrecificacao(data, { parcial = false } = {}) {
  const resultado = {};
  PRECIFICACAO_FIELDS.forEach((field) => {
    if (parcial && data[field] === undefined) return;
    resultado[field] = numeroValido(data[field], field, {
      nullable: field === 'ipi_percent',
      padrao: field === 'guindaste_id' ? null : 0,
    });
  });
  if (!resultado.guindaste_id && !parcial) {
    const error = new Error('guindaste_id é obrigatório');
    error.status = 400;
    throw error;
  }
  return resultado;
}


async function listarEquipamentosComCusto() {
  // Sempre retorna todos os guindastes, mesmo sem precificação ou sem SQL executado.
  const { rows: guindastes } = await query(
    `SELECT
       id,
       codigo_referencia,
       ncm,
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
         margem_lucro_percent,
         ipi_percent
       FROM public.precificacao`
    );
    precificacoes = rows || [];
  } catch (err) {
    if (err.code === '42P01' || err.code === '42703') {
      const schemaError = new Error('Schema da Precificação incompleto. Execute as migrations create_precificacao_v2.sql e extend_precificacao_lovable_rules.sql.');
      schemaError.status = 500;
      throw schemaError;
    }
    throw err;
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
      ipi_percent: regra?.ipi_percent ?? null,
      preco_base_calculado: engine.calcularPrecoBase(g.custo_mp, g.custo_mo, regra),
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
  const guindasteId = numeroValido(data.guindaste_id, 'guindaste_id', { padrao: null });
  if (!guindasteId) {
    const error = new Error('guindaste_id é obrigatório');
    error.status = 400;
    throw error;
  }
  const existing = await findByGuindasteId(guindasteId);

  if (existing) {
    const sets = [];
    const params = [];
    const valores = normalizarPrecificacao(data, { parcial: true });
    PRECIFICACAO_FIELDS.forEach((f) => {
      if (f === 'guindaste_id' || valores[f] === undefined) return;
      params.push(valores[f]);
      sets.push(`"${f}" = $${params.length}`);
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
  const valores = normalizarPrecificacao({ ...data, guindaste_id: guindasteId });
  PRECIFICACAO_FIELDS.forEach((f) => {
    cols.push(`"${f}"`);
    params.push(valores[f]);
    vals.push(`$${params.length}`);
  });

  const { rows } = await query(
    `INSERT INTO public.precificacao (${cols.join(', ')}) VALUES (${vals.join(', ')}) RETURNING *`,
    params
  );
  return rows[0];
}


async function importarAtomico(payload) {
  const equipamentos = Array.isArray(payload.equipamentos) ? payload.equipamentos : [];
  const condicoes = Array.isArray(payload.condicoes) ? payload.condicoes : [];
  const tributacoes = Array.isArray(payload.tributacoes) ? payload.tributacoes : [];
  const parametros = payload.parametros || null;
  const client = await getClient();
  const relatorio = { equipamentos: 0, condicoes: 0, tributacoes: 0, parametros: 0 };

  try {
    await client.query('BEGIN');
    for (const item of equipamentos) {
      const guindasteId = numeroValido(item.guindaste_id, 'guindaste_id', { padrao: null });
      const atual = await client.query('SELECT * FROM public.precificacao WHERE guindaste_id = $1', [guindasteId]);
      const valores = normalizarPrecificacao({ ...atual.rows[0], ...item, guindaste_id: guindasteId });
      const existe = await client.query('SELECT 1 FROM public.guindastes WHERE id = $1', [valores.guindaste_id]);
      if (!existe.rowCount) {
        const error = new Error(`Equipamento ${valores.guindaste_id} não encontrado`);
        error.status = 400;
        throw error;
      }
      await client.query(
        `INSERT INTO public.precificacao
           (guindaste_id, custo_fixo_percent, comissao_percent, assistencia_percent, margem_lucro_percent, ipi_percent)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (guindaste_id) DO UPDATE SET
           custo_fixo_percent = EXCLUDED.custo_fixo_percent,
           comissao_percent = EXCLUDED.comissao_percent,
           assistencia_percent = EXCLUDED.assistencia_percent,
           margem_lucro_percent = EXCLUDED.margem_lucro_percent,
           ipi_percent = EXCLUDED.ipi_percent,
           updated_at = NOW()`,
        PRECIFICACAO_FIELDS.map((field) => valores[field])
      );
      relatorio.equipamentos += 1;
    }

    for (const item of condicoes) {
      const id = numeroValido(item.id, 'id da condição', { padrao: null });
      if (!id) {
        const error = new Error('Toda condição importada deve possuir ID válido');
        error.status = 400;
        throw error;
      }
      const entrada = numeroValido(item.entrada_percent, 'entrada_percent');
      const taxa = numeroValido(item.taxa_anual_percent, 'taxa_anual_percent');
      const result = await client.query(
        `UPDATE public.precificacao_condicoes
         SET entrada_percent = $1, taxa_anual_percent = $2, updated_at = NOW()
         WHERE id = $3`,
        [entrada, taxa, id]
      );
      if (!result.rowCount) {
        const error = new Error(`Condição ${id} não encontrada`);
        error.status = 400;
        throw error;
      }
      relatorio.condicoes += 1;
    }

    for (const item of tributacoes) {
      const contribuinte = numeroValido(item.icms_contribuinte_percent, 'icms_contribuinte_percent');
      const naoContribuinte = numeroValido(item.icms_nao_contribuinte_percent, 'icms_nao_contribuinte_percent');
      const pisCofins = numeroValido(item.pis_cofins_percent, 'pis_cofins_percent');
      const uf = String(item.uf || '').trim().toUpperCase();
      const ncm = String(item.ncm || '').trim() || 'PADRAO';
      if (!uf) {
        const error = new Error('UF é obrigatória na tributação');
        error.status = 400;
        throw error;
      }
      await client.query(
        `INSERT INTO public.tributacao
           (uf, ncm, icms_contribuinte_percent, icms_nao_contribuinte_percent, pis_cofins_percent)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (uf, ncm) DO UPDATE SET
           icms_contribuinte_percent = EXCLUDED.icms_contribuinte_percent,
           icms_nao_contribuinte_percent = EXCLUDED.icms_nao_contribuinte_percent,
           pis_cofins_percent = EXCLUDED.pis_cofins_percent,
           updated_at = NOW()`,
        [uf, ncm, contribuinte, naoContribuinte, pisCofins]
      );
      relatorio.tributacoes += 1;
    }

    if (parametros) {
      const chaves = {
        comissao_base_vendedor_percent: 'precificacao_comissao_base_vendedor',
        desconto_comercial_max_percent: 'precificacao_desconto_comercial_max',
        comissao_cedivel_max_percent: 'precificacao_comissao_cedivel_max',
        passo_desconto_parcela_percent: 'precificacao_passo_desconto_parcela',
        irpj_percent: 'precificacao_irpj',
        csll_percent: 'precificacao_csll',
        ipi_padrao_percent: 'precificacao_ipi_padrao',
      };
      for (const [field, chave] of Object.entries(chaves)) {
        const valor = numeroValido(parametros[field], field);
        await client.query(
          `INSERT INTO public.configuracoes_globais (chave, valor_numero)
           VALUES ($1, $2)
           ON CONFLICT (chave) DO UPDATE SET valor_numero = EXCLUDED.valor_numero, updated_at = NOW()`,
          [chave, valor]
        );
      }
      relatorio.parametros = 1;
    }

    await client.query('COMMIT');
    return relatorio;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  findByGuindasteId,
  upsert,
  importarAtomico,
  listarEquipamentosComCusto,
};
