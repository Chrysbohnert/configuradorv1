/**
 * precificacaoSimuladorService.js
 * Orquestra o motor de precificação com dados reais do banco.
 * Apenas leitura das tabelas de precificação/tributação e escrita no histórico.
 */

const { query } = require('../db/pool');
const engine = require('./precificacaoEngine');
const parametrosService = require('./precificacaoParametrosService');
const { NCM_PADRAO } = require('./tributacaoService');
const { normalizeNcm } = require('../utils/ncm');

async function buscarEquipamento(guindasteId) {
  const { rows } = await query(
    `SELECT
       g.id,
       g.codigo_referencia,
       g.subgrupo,
       g.modelo,
       g.ncm,
       g.custo_mp,
       g.custo_mo,
       g.valor_instalacao_cliente,
       g.valor_instalacao_incluso,
       p.id AS precificacao_id,
       p.custo_fixo_percent,
       p.comissao_percent,
       p.assistencia_percent,
       p.margem_lucro_percent,
       p.ipi_percent
     FROM public.guindastes g
     LEFT JOIN public.precificacao p ON p.guindaste_id = g.id
     WHERE g.id = $1`,
    [guindasteId]
  );
  return rows[0] || null;
}

const UF_EXPORT = 'EXPORT';

async function buscarTributacao(uf, ncm) {
  const ufLimpo = String(uf || '').trim().toUpperCase();
  if (ufLimpo === UF_EXPORT) {
    return {
      uf: UF_EXPORT,
      ncm: (ncm || '').trim() || NCM_PADRAO,
      icms_contribuinte_percent: 0,
      icms_nao_contribuinte_percent: 0,
      pis_cofins_percent: 0,
    };
  }

  const ncmBusca = normalizeNcm(ncm) || NCM_PADRAO;
  const { rows } = await query(
    `SELECT
       uf,
       ncm,
       icms_contribuinte_percent,
       icms_nao_contribuinte_percent,
       pis_cofins_percent
     FROM public.tributacao
     WHERE uf = UPPER(TRIM($1))
     ORDER BY
       CASE
         WHEN REGEXP_REPLACE(UPPER(TRIM(ncm)), '[^0-9A-Z]', '', 'g') = $2 THEN 0
         WHEN UPPER(TRIM(ncm)) = $3 THEN 1
         ELSE 2
       END,
       ncm
     LIMIT 1`,
    [uf, ncmBusca, NCM_PADRAO]
  );
  return rows[0] || null;
}

async function buscarCondicao(id) {
  const { rows } = await query(
    `SELECT * FROM public.precificacao_condicoes WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function buscarFatorPiorCenario() {
  const { rows } = await query(
    `SELECT entrada_percent, taxa_anual_percent
     FROM public.precificacao_condicoes
     WHERE ativo = TRUE`
  );
  return Math.max(
    1,
    ...rows.map((item) => engine.fatoresCondicao(
      item.entrada_percent,
      item.taxa_anual_percent
    )[11])
  );
}

function normalizarTributacao(tributacao, contribuinte) {
  if (!tributacao) {
    return { icms_percent: 0, pis_cofins_percent: 0 };
  }
  return {
    icms_percent: contribuinte
      ? tributacao.icms_contribuinte_percent
      : tributacao.icms_nao_contribuinte_percent,
    pis_cofins_percent: tributacao.pis_cofins_percent,
  };
}

async function simular(input, usuario) {
  const equipamento = await buscarEquipamento(input.guindaste_id);
  if (!equipamento) throw new Error('Equipamento não encontrado');

  const tributacaoRaw = await buscarTributacao(
    input.uf,
    input.ncm || equipamento.ncm || ''
  );
  const tributacao = normalizarTributacao(tributacaoRaw, input.contribuinte);

  const condicao = input.condicao_id
    ? await buscarCondicao(input.condicao_id)
    : {
        entrada_percent: input.entrada_percent || 0,
        parcelas: input.parcelas || 1,
        taxa_anual_percent: input.taxa_anual_percent || 0,
      };
  if (!condicao) {
    const error = new Error('Condição de pagamento não encontrada');
    error.status = 404;
    throw error;
  }

  const [parametros, fatorPiorCenario] = await Promise.all([
    parametrosService.buscarParametros(),
    buscarFatorPiorCenario(),
  ]);

  const engineInput = {
    custo_mp: equipamento.custo_mp,
    custo_mo: equipamento.custo_mo,
    equipamento: {
      custo_fixo_percent: equipamento.custo_fixo_percent,
      comissao_percent: equipamento.comissao_percent,
      assistencia_percent: equipamento.assistencia_percent,
      margem_lucro_percent: equipamento.margem_lucro_percent,
      ipi_percent: equipamento.ipi_percent,
    },
    tributacao,
    condicao: {
      entrada_percent: condicao.entrada_percent,
      parcelas: input.parcelas === undefined ? condicao.parcelas : input.parcelas,
      taxa_anual_percent: condicao.taxa_anual_percent,
    },
    parametros,
    fator_pior_cenario: fatorPiorCenario,
    contribuinte: input.contribuinte,
    desconto_comercial_percent: input.desconto_comercial_percent || 0,
    desconto_da_comissao_percent: input.desconto_da_comissao_percent || 0,
    frete: input.frete,
    instalacao: input.instalacao,
  };

  const resultado = engine.calcularPreco(engineInput);

  const snapshot = {
    usuario_id: usuario?.id || null,
    usuario_nome: usuario?.nome || null,
    guindaste_id: equipamento.id,
    equipamento: {
      id: equipamento.id,
      codigo_referencia: equipamento.codigo_referencia,
      subgrupo: equipamento.subgrupo,
      modelo: equipamento.modelo,
      ncm: equipamento.ncm,
      custo_mp: equipamento.custo_mp,
      custo_mo: equipamento.custo_mo,
      custo_fixo_percent: equipamento.custo_fixo_percent,
      comissao_percent: equipamento.comissao_percent,
      assistencia_percent: equipamento.assistencia_percent,
      margem_lucro_percent: equipamento.margem_lucro_percent,
      ipi_percent: equipamento.ipi_percent,
    },
    tributacao: tributacaoRaw
      ? {
          uf: tributacaoRaw.uf,
          ncm: tributacaoRaw.ncm,
          contribuinte: input.contribuinte,
          icms_percent: tributacao.icms_percent,
          pis_cofins_percent: tributacao.pis_cofins_percent,
        }
      : { uf: input.uf, ncm: input.ncm || equipamento.ncm, contribuinte: input.contribuinte },
    condicao_id: input.condicao_id || null,
    condicao: engineInput.condicao,
    parametros,
    entrada: {
      contribuinte: input.contribuinte,
      desconto_comercial_percent: input.desconto_comercial_percent || 0,
      desconto_da_comissao_percent: input.desconto_da_comissao_percent || 0,
      frete: input.frete || 0,
      instalacao: input.instalacao || 0,
    },
    resultado,
    observacao: input.observacao || null,
  };

  return { resultado, snapshot };
}

module.exports = { simular };
