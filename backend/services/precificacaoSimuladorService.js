/**
 * precificacaoSimuladorService.js
 * Orquestra o motor de precificação com dados reais do banco.
 * Apenas leitura das tabelas de precificação/tributação e escrita no histórico.
 */

const { query } = require('../db/pool');
const engine = require('./precificacaoEngine');
const parametrosService = require('./precificacaoParametrosService');
const { getCotacaoUSD } = require('./configuracoesService');
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

async function buscarFrete(id) {
  const { rows } = await query(
    `SELECT id, valor_reaproveitamento FROM public.fretes WHERE id = $1`,
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

function validarFrete(input, parcelas) {
  const tipoFrete = String(input.tipo_frete || '').trim().toUpperCase();
  if (!tipoFrete) return null;
  if (!['CIF', 'FOB'].includes(tipoFrete)) {
    const error = new Error('Frete deve ser CIF ou FOB');
    error.status = 400;
    throw error;
  }
  if (tipoFrete === 'FOB' && Number(parcelas) !== 0) {
    const error = new Error('FOB para cliente final disponível somente para pagamento à vista.');
    error.status = 400;
    throw error;
  }
  return tipoFrete;
}

function validarLimitesDesconto(input, parametros, parcelas) {
  const descontoComercial = Number(input.desconto_comercial_percent || 0);
  const descontoComissao = Number(input.desconto_da_comissao_percent || 0);
  const limiteComercial = engine.limiteDescontoComercial(
    Math.max(0, Number(parametros.desconto_comercial_max_percent) || 0),
    Math.max(0, Number(parcelas) || 0),
    Math.max(0, Number(parametros.passo_desconto_parcela_percent) || 0)
  );
  const limiteComissao = Math.max(0, Number(parametros.comissao_cedivel_max_percent) || 0);

  if (!Number.isFinite(descontoComercial) || !Number.isFinite(descontoComissao)
    || descontoComercial < 0 || descontoComissao < 0
    || descontoComercial > limiteComercial || descontoComissao > limiteComissao) {
    const error = new Error('Limite de desconto excedido');
    error.status = 400;
    throw error;
  }
}

async function simular(input, usuario) {
  const identificadorExportacao = String(input.uf || input.regiao || '').trim().toUpperCase().replace(/[- ]/g, '_');
  const isExportacao = identificadorExportacao === UF_EXPORT || identificadorExportacao === 'COMERCIO_EXTERIOR';
  const equipamento = await buscarEquipamento(input.guindaste_id);
  if (!equipamento) throw new Error('Equipamento não encontrado');

  const tributacaoRaw = await buscarTributacao(
    isExportacao ? UF_EXPORT : input.uf,
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

  const [parametros, fatorPiorCenario, cotacaoOriginal] = await Promise.all([
    parametrosService.buscarParametros(),
    buscarFatorPiorCenario(),
    isExportacao ? getCotacaoUSD() : Promise.resolve(0),
  ]);

  const parcelasSelecionadas = input.parcelas === undefined ? condicao.parcelas : input.parcelas;
  const tipoFrete = validarFrete(input, parcelasSelecionadas);
  validarLimitesDesconto(input, parametros, parcelasSelecionadas);
  const freteCadastrado = tipoFrete ? await buscarFrete(input.instaladora_id) : null;
  if (tipoFrete && !freteCadastrado) {
    const error = new Error('Instaladora não encontrada');
    error.status = 400;
    throw error;
  }

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
      parcelas: parcelasSelecionadas,
      taxa_anual_percent: condicao.taxa_anual_percent,
    },
    parametros,
    fator_pior_cenario: fatorPiorCenario,
    contribuinte: input.contribuinte,
    desconto_comercial_percent: input.desconto_comercial_percent || 0,
    desconto_da_comissao_percent: input.desconto_da_comissao_percent || 0,
    frete: tipoFrete ? (tipoFrete === 'CIF' ? freteCadastrado.valor_reaproveitamento : 0) : input.frete,
    instalacao: tipoFrete ? equipamento.valor_instalacao_incluso : input.instalacao,
    exportacao: {
      ativo: isExportacao,
      cotacao_original: cotacaoOriginal,
      reducao_dolar_percent: parametros.exportacao_reducao_dolar_percent,
      acrescimo_margem_percent: parametros.exportacao_acrescimo_margem_percent,
    },
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
      tipo_frete: tipoFrete,
      instaladora_id: freteCadastrado?.id || null,
      frete: engineInput.frete,
      instalacao: engineInput.instalacao,
    },
    resultado,
    observacao: input.observacao || null,
  };

  return { resultado, snapshot };
}

module.exports = { simular, validarFrete, validarLimitesDesconto };
