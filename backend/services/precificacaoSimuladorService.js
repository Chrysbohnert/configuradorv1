/**
 * precificacaoSimuladorService.js
 * Orquestra o motor de precificação com dados reais do banco.
 * Apenas leitura das tabelas de precificação/tributação e escrita no histórico.
 */

const { query } = require('../db/pool');
const engine = require('./precificacaoEngine');
const parametrosService = require('./precificacaoParametrosService');

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
       p.margem_lucro_percent
     FROM public.guindastes g
     LEFT JOIN public.precificacao p ON p.guindaste_id = g.id
     WHERE g.id = $1`,
    [guindasteId]
  );
  return rows[0] || null;
}

async function buscarTributacao(uf, ncm) {
  const { rows } = await query(
    `SELECT
       uf,
       ncm,
       icms_contribuinte_percent,
       icms_nao_contribuinte_percent,
       pis_cofins_percent
     FROM public.tributacao
     WHERE uf = UPPER(TRIM($1)) AND ncm = TRIM($2)
     LIMIT 1`,
    [uf, ncm]
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
        taxa_mensal: input.taxa_mensal || 0,
      };

  const parametros = await parametrosService.buscarParametros();

  const engineInput = {
    custo_mp: equipamento.custo_mp,
    custo_mo: equipamento.custo_mo,
    equipamento: {
      custo_fixo_percent: equipamento.custo_fixo_percent,
      comissao_percent: equipamento.comissao_percent,
      assistencia_percent: equipamento.assistencia_percent,
      margem_lucro_percent: equipamento.margem_lucro_percent,
    },
    tributacao,
    condicao: {
      entrada_percent: condicao.entrada_percent,
      parcelas: condicao.parcelas,
      taxa_mensal: condicao.taxa_mensal,
    },
    parametros,
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
