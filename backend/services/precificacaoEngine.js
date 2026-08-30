/**
 * precificacaoEngine.js
 * Motor único e isolado de precificação.
 * Não possui dependências de UI, banco ou fluxo de propostas.
 * Recebe custos, regras comerciais, tributação, condição de pagamento e descontos,
 * e retorna a composição completa do preço.
 */

const PARAM_CHAVES = {
  COMISSAO_BASE_VENDEDOR: 'precificacao_comissao_base_vendedor',
  DESCONTO_COMERCIAL_MAX: 'precificacao_desconto_comercial_max',
  COMISSAO_CEDIVEL_MAX: 'precificacao_comissao_cedivel_max',
  PASSO_DESCONTO_PARCELA: 'precificacao_passo_desconto_parcela',
  IRPJ: 'precificacao_irpj',
  CSLL: 'precificacao_csll',
  IPI_PADRAO: 'precificacao_ipi_padrao',
};

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function round4(v) {
  return Math.round(v * 10000) / 10000;
}

function round2(v) {
  return Math.round(v * 100) / 100;
}

function fatoresCondicao(entradaPercent, taxaAnualPercent) {
  const entrada = Math.min(Math.max(toNum(entradaPercent) / 100, 0), 1);
  const taxaAnual = Math.max(0, toNum(taxaAnualPercent) / 100);
  const taxaMensal = Math.pow(1 + taxaAnual, 1 / 12) - 1;
  return Array.from({ length: 12 }, (_, index) => {
    const parcelas = index + 1;
    if (taxaMensal <= 0) return 1;
    const fatorAnuidade = (1 - Math.pow(1 + taxaMensal, -parcelas)) / taxaMensal;
    const divisor = entrada + (1 - entrada) * (fatorAnuidade / parcelas);
    return divisor > 0 ? round4(1 / divisor) : 1;
  });
}

function irpjCsllGrossUp(margem, irpj, csll) {
  const tributos = irpj + csll;
  if (tributos <= 0 || tributos >= 1) return 0;
  return margem / (1 - tributos) - margem;
}

function limiteDescontoComercial(maximo, parcelas, passo) {
  return Math.max(0, maximo - Math.max(0, parcelas) * passo);
}

/**
 * Calcula a composição de preço.
 * @param {Object} input
 * @param {number} input.custo_mp
 * @param {number} input.custo_mo
 * @param {Object} input.equipamento
 * @param {number} input.equipamento.custo_fixo_percent
 * @param {number} input.equipamento.comissao_percent
 * @param {number} input.equipamento.assistencia_percent
 * @param {number} input.equipamento.margem_lucro_percent
 * @param {Object} input.tributacao
 * @param {number} input.tributacao.icms_percent
 * @param {number} input.tributacao.pis_cofins_percent
 * @param {Object} input.condicao
 * @param {number} input.condicao.entrada_percent
 * @param {number} input.condicao.parcelas
 * @param {number} input.condicao.taxa_anual_percent
 * @param {Object} input.parametros
 * @param {number} input.parametros.comissao_base_vendedor_percent
 * @param {number} input.parametros.desconto_comercial_max_percent
 * @param {number} input.parametros.comissao_cedivel_max_percent
 * @param {number} input.parametros.passo_desconto_parcela_percent
 * @param {number} input.parametros.irpj_percent
 * @param {number} input.parametros.csll_percent
 * @param {number} input.parametros.ipi_padrao_percent
 * @param {boolean} input.contribuinte
 * @param {number} [input.desconto_comercial_percent]
 * @param {number} [input.desconto_da_comissao_percent]
 * @param {number} [input.frete]
 * @param {number} [input.instalacao]
 */
function calcularPreco(input) {
  const mp = toNum(input.custo_mp);
  const mo = toNum(input.custo_mo);
  const custoVariavel = round2(mp + mo);
  const eq = input.equipamento || {};
  const trib = input.tributacao || {};
  const param = input.parametros || {};
  const condicao = input.condicao || {};

  const custoFixo = toNum(eq.custo_fixo_percent) / 100;
  const comissao = toNum(eq.comissao_percent) / 100;
  const assistencia = toNum(eq.assistencia_percent) / 100;
  const margem = toNum(eq.margem_lucro_percent) / 100;
  const icms = toNum(trib.icms_percent) / 100;
  const pisCofins = toNum(trib.pis_cofins_percent) / 100;
  const ipiPct = eq.ipi_percent === null || eq.ipi_percent === undefined
    ? toNum(param.ipi_padrao_percent)
    : toNum(eq.ipi_percent);
  const ipi = ipiPct / 100;
  const irpjPct = toNum(param.irpj_percent);
  const csllPct = toNum(param.csll_percent);
  const irpj = irpjPct / 100;
  const csll = csllPct / 100;
  const irGrossUp = irpjCsllGrossUp(margem, irpj, csll);

  const parcelasSelecionadas = Math.max(0, Math.min(12, Math.floor(toNum(condicao.parcelas))));
  const quantidadeParcelas = Math.max(1, parcelasSelecionadas);
  const entradaPct = Math.min(100, Math.max(0, toNum(condicao.entrada_percent)));
  const taxaAnualPct = Math.max(0, toNum(condicao.taxa_anual_percent));
  const fatorCondicao = parcelasSelecionadas === 0
    ? 1
    : fatoresCondicao(entradaPct, taxaAnualPct)[parcelasSelecionadas - 1];
  const fatorPiorCenario = Math.max(1, toNum(input.fator_pior_cenario) || fatorCondicao);

  const descontoMax = Math.max(0, toNum(param.desconto_comercial_max_percent) / 100);
  const passoDesconto = Math.max(0, toNum(param.passo_desconto_parcela_percent) / 100);
  const limiteDesconto = limiteDescontoComercial(descontoMax, parcelasSelecionadas, passoDesconto);
  const descontoComercial = Math.min(Math.max(0, toNum(input.desconto_comercial_percent) / 100), limiteDesconto);
  const descontoComissaoMax = Math.max(0, toNum(param.comissao_cedivel_max_percent) / 100);
  const descontoComissao = Math.min(
    Math.max(0, toNum(input.desconto_da_comissao_percent) / 100),
    descontoComissaoMax
  );

  // Formação do preço por divisor: impostos e margem são embutidos no preço.
  const somaPercentuais = custoFixo + comissao + assistencia + margem + irGrossUp
    + ipi + icms + pisCofins;
  const base = somaPercentuais < 1 ? custoVariavel / (1 - somaPercentuais) : Infinity;
  const precoTabela = round2(base * fatorPiorCenario);
  const descontoFinanceiro = fatorPiorCenario > 0 ? 1 - fatorCondicao / fatorPiorCenario : 0;
  const precoCondicao = round2(precoTabela * (1 - descontoFinanceiro));

  // Desconto comercial
  const descontoComercialValor = round2(precoCondicao * descontoComercial);
  const precoAntesComissao = round2(precoCondicao - descontoComercialValor);

  // Desconto cedido da comissão do vendedor
  const descontoCedidoValor = round2(precoAntesComissao * descontoComissao);
  const precoFinalSemLogistica = round2(precoAntesComissao - descontoCedidoValor);

  // Comissões
  const comissaoNoPreco = round2(precoAntesComissao * comissao);
  const comissaoFinal = round2(Math.max(0, comissaoNoPreco - descontoCedidoValor));
  const comissaoBaseVendedor = Math.max(0, toNum(param.comissao_base_vendedor_percent) / 100);
  const comissaoVendedorPercent = Math.max(0, comissaoBaseVendedor - descontoComissao);
  const comissaoVendedorCheia = round2(precoFinalSemLogistica * comissaoBaseVendedor);
  const comissaoVendedorValor = round2(precoFinalSemLogistica * comissaoVendedorPercent);

  // Margem e resultado
  const outrosPercentuais = assistencia + icms + pisCofins + ipi + custoFixo;
  const lucroAntesIr = round2(precoFinalSemLogistica * (1 - outrosPercentuais) - comissaoFinal - custoVariavel);
  const margemAntesIr = precoAntesComissao > 0 ? lucroAntesIr / precoAntesComissao : 0;
  const irpjValor = round2(Math.max(0, lucroAntesIr) * irpj);
  const csllValor = round2(Math.max(0, lucroAntesIr) * csll);
  const margemLiquidaPercent = margemAntesIr * (1 - irpj - csll);
  const margemLiquida = round2(precoAntesComissao * margemLiquidaPercent);

  // Logística fora da margem/comissão
  const divisorLogistica = icms + pisCofins < 1 ? 1 - icms - pisCofins : 1;
  const freteBruto = Math.max(0, toNum(input.frete));
  const instalacaoBruta = Math.max(0, toNum(input.instalacao));
  const frete = round2((freteBruto / divisorLogistica) * (1 - descontoFinanceiro));
  const instalacao = round2((instalacaoBruta / divisorLogistica) * (1 - descontoFinanceiro));
  const precoFinalComLogistica = round2(precoFinalSemLogistica + frete + instalacao);

  // Condição de pagamento
  const entradaValor = round2(precoFinalComLogistica * (entradaPct / 100));
  const saldoValor = round2(precoFinalComLogistica - entradaValor);
  const valorParcela = round2(saldoValor / quantidadeParcelas);
  const parcelas = Array.from({ length: quantidadeParcelas }, (_, index) => ({
    numero: index + 1,
    valor: index === quantidadeParcelas - 1
      ? round2(saldoValor - valorParcela * (quantidadeParcelas - 1))
      : valorParcela,
  }));

  return {
    custos: { mp, mo, custoVariavel, custoComVariaveis: custoVariavel },
    tributacao: {
      icms_percent: round4(icms * 100),
      pis_cofins_percent: round4(pisCofins * 100),
      ipi_percent: round4(ipi * 100),
      irpj_percent: irpjPct,
      csll_percent: csllPct,
      icms_valor: round2(precoFinalSemLogistica * icms),
      pis_cofins_valor: round2(precoFinalSemLogistica * pisCofins),
      ipi_valor: round2(precoFinalSemLogistica * ipi),
      irpj_valor: irpjValor,
      csll_valor: csllValor,
    },
    formacao: {
      soma_percentuais: round4(somaPercentuais * 100),
      irpj_csll_gross_up_percent: round4(irGrossUp * 100),
      base: round2(base),
      fator_pior_cenario: fatorPiorCenario,
      fator_condicao: fatorCondicao,
      desconto_financeiro_percent: round4(descontoFinanceiro * 100),
      preco_condicao: precoCondicao,
    },
    preco_tabela: precoTabela,
    desconto_comercial: {
      percentual: round4(descontoComercial * 100),
      solicitado_percentual: round4(toNum(input.desconto_comercial_percent)),
      valor: descontoComercialValor,
      maximo_permitido: round4(limiteDesconto * 100),
    },
    comissao: {
      equipamento_percent: round4(comissao * 100),
      equipamento_valor: comissaoNoPreco,
      base_vendedor_percent: round4(comissaoBaseVendedor * 100),
      vendedor_percent: round4(comissaoVendedorPercent * 100),
      vendedor_cheia_valor: comissaoVendedorCheia,
      vendedor_valor: comissaoVendedorValor,
      cedida_percent_sobre_base: round4(descontoComissao * 100),
      cedida_valor: descontoCedidoValor,
      final_valor: comissaoFinal,
    },
    margem: {
      percentual: round4(margem * 100),
      antes_ir_percent: round4(margemAntesIr * 100),
      antes_ir_valor: lucroAntesIr,
      liquida_percent: round4(margemLiquidaPercent * 100),
      liquida_valor: margemLiquida,
    },
    pagamento: {
      entrada_percent: entradaPct,
      entrada_valor: entradaValor,
      saldo_valor: saldoValor,
      parcelas_selecionadas: parcelasSelecionadas,
      parcelas,
      taxa_anual_percent: taxaAnualPct,
      fator_condicao: fatorCondicao,
    },
    logistica: {
      frete_bruto: round2(freteBruto),
      instalacao_bruta: round2(instalacaoBruta),
      frete,
      instalacao,
      tributos_percent: round4((icms + pisCofins) * 100),
    },
    preco_final_sem_logistica: precoFinalSemLogistica,
    preco_final: precoFinalComLogistica,
  };
}

function calcularPrecoBase(mp, mo, regra) {
  const vMp = toNum(mp);
  const vMo = toNum(mo);
  const subtotal = vMp + vMo;
  const custoFixo = toNum(regra?.custo_fixo_percent);
  const comissao = toNum(regra?.comissao_percent);
  const assistencia = toNum(regra?.assistencia_percent);
  const margem = toNum(regra?.margem_lucro_percent);

  const variaveis = subtotal * (custoFixo + comissao + assistencia) / 100;
  const preco = (subtotal + variaveis) * (1 + margem / 100);

  return Number(preco.toFixed(4));
}

module.exports = {
  calcularPreco,
  calcularPrecoBase,
  fatoresCondicao,
  limiteDescontoComercial,
  irpjCsllGrossUp,
  PARAM_CHAVES,
  round2,
  round4,
  toNum,
};
