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
  IRPJ_CSLL: 'precificacao_irpj_csll',
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

function calcularParcelas(saldo, parcelas, taxaMensal) {
  const qtd = Math.max(1, Math.min(12, Math.floor(toNum(parcelas) || 1)));
  const taxa = Math.max(0, toNum(taxaMensal) / 100);

  let saldoFinanciado = round2(saldo);
  if (taxa > 0 && qtd > 1) {
    // Fator Price mensal
    const f = Math.pow(1 + taxa, qtd);
    const pmt = (saldo * (taxa * f)) / (f - 1);
    saldoFinanciado = round2(pmt * qtd);
  }

  const valorBaseParcela = qtd === 1 ? saldoFinanciado : round2(saldoFinanciado / qtd);
  const resultado = [];
  let soma = 0;
  for (let i = 1; i <= qtd; i += 1) {
    const ultima = i === qtd;
    const valor = ultima ? round2(saldoFinanciado - soma) : valorBaseParcela;
    soma += valor;
    resultado.push({ numero: i, valor: round2(valor) });
  }
  return resultado;
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
 * @param {number} input.condicao.taxa_mensal
 * @param {Object} input.parametros
 * @param {number} input.parametros.comissao_base_vendedor_percent
 * @param {number} input.parametros.desconto_comercial_max_percent
 * @param {number} input.parametros.comissao_cedivel_max_percent
 * @param {number} input.parametros.irpj_csll_percent
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
  const custoFixoPct = toNum(eq.custo_fixo_percent);
  const comissaoPct = toNum(eq.comissao_percent);
  const assistenciaPct = toNum(eq.assistencia_percent);
  const margemPct = toNum(eq.margem_lucro_percent);

  const variaveis = round2(custoVariavel * ((custoFixoPct + comissaoPct + assistenciaPct) / 100));
  const custoComVariaveis = round2(custoVariavel + variaveis);

  const trib = input.tributacao || {};
  const icmsPct = toNum(trib.icms_percent);
  const pisCofinsPct = toNum(trib.pis_cofins_percent);

  const param = input.parametros || {};
  const comissaoBaseVendedorPct = toNum(param.comissao_base_vendedor_percent);
  const descontoComercialMaxPct = toNum(param.desconto_comercial_max_percent);
  const comissaoCedivelMaxPct = toNum(param.comissao_cedivel_max_percent);
  const irpjCsllPct = toNum(param.irpj_csll_percent);

  const descontoComercialPct = Math.min(
    toNum(input.desconto_comercial_percent),
    descontoComercialMaxPct > 0 ? descontoComercialMaxPct : Infinity
  );
  const descontoDaComissaoPct = Math.min(
    toNum(input.desconto_da_comissao_percent),
    comissaoCedivelMaxPct > 0 ? comissaoCedivelMaxPct : Infinity
  );

  // Formação do preço por divisor: impostos e margem são embutidos no preço.
  const taxaImpostosNoPreco = (icmsPct + pisCofinsPct) / 100;
  const taxaMargem = margemPct / 100;
  const divisor = 1 - taxaImpostosNoPreco - taxaMargem;
  const precoTabela = divisor > 0 ? round2(custoComVariaveis / divisor) : round2(custoComVariaveis);

  // Componentes no preço tabela
  const icmsNoPreco = round2(precoTabela * (icmsPct / 100));
  const pisCofinsNoPreco = round2(precoTabela * (pisCofinsPct / 100));
  const comissaoNoPreco = round2(custoVariavel * (comissaoPct / 100));
  const margemBrutaNoPreco = round2(precoTabela - custoComVariaveis - icmsNoPreco - pisCofinsNoPreco);

  // Desconto comercial
  const descontoComercialValor = round2(precoTabela * (descontoComercialPct / 100));
  const precoComDescontoComercial = round2(precoTabela - descontoComercialValor);

  // Desconto cedido da comissão do vendedor
  const baseComissaoVendedor = round2(precoComDescontoComercial * (comissaoBaseVendedorPct / 100));
  const descontoCedidoValor = round2(baseComissaoVendedor * (descontoDaComissaoPct / 100));
  const precoFinalSemLogistica = round2(precoComDescontoComercial - descontoCedidoValor);

  // Comissões
  const comissaoFinal = round2(comissaoNoPreco - descontoCedidoValor);
  const comissaoCedidaPercentualSobreBase = comissaoBaseVendedorPct > 0
    ? round4((descontoDaComissaoPct / 100) * comissaoBaseVendedorPct)
    : 0;

  // Margem e resultado
  const irpjCsllValor = irpjCsllPct > 0 ? round2(margemBrutaNoPreco * (irpjCsllPct / 100)) : 0;
  const margemLiquida = round2(margemBrutaNoPreco - irpjCsllValor);

  // Condição de pagamento
  const condicao = input.condicao || {};
  const entradaPct = Math.min(100, Math.max(0, toNum(condicao.entrada_percent)));
  const parcelas = calcularParcelas(
    precoFinalSemLogistica * (1 - entradaPct / 100),
    condicao.parcelas,
    condicao.taxa_mensal
  );
  const entradaValor = round2(precoFinalSemLogistica * (entradaPct / 100));
  const saldoValor = round2(parcelas.reduce((acc, p) => acc + p.valor, 0));

  // Logística fora da margem/comissão
  const frete = round2(toNum(input.frete));
  const instalacao = round2(toNum(input.instalacao));
  const precoFinalComLogistica = round2(precoFinalSemLogistica + frete + instalacao);

  return {
    custos: {
      mp,
      mo,
      custoVariavel,
      variaveis,
      custoComVariaveis,
    },
    tributacao: {
      icms_percent: icmsPct,
      pis_cofins_percent: pisCofinsPct,
      icms_valor: icmsNoPreco,
      pis_cofins_valor: pisCofinsNoPreco,
    },
    preco_tabela: precoTabela,
    desconto_comercial: {
      percentual: round4(descontoComercialPct),
      valor: descontoComercialValor,
      maximo_permitido: descontoComercialMaxPct,
    },
    comissao: {
      equipamento_percent: comissaoPct,
      equipamento_valor: comissaoNoPreco,
      base_vendedor_percent: comissaoBaseVendedorPct,
      cedida_percent_sobre_base: comissaoCedidaPercentualSobreBase,
      cedida_valor: descontoCedidoValor,
      final_valor: comissaoFinal,
    },
    margem: {
      percentual: margemPct,
      bruta_valor: margemBrutaNoPreco,
      irpj_csll_percent: irpjCsllPct,
      irpj_csll_valor: irpjCsllValor,
      liquida_valor: margemLiquida,
    },
    pagamento: {
      entrada_percent: entradaPct,
      entrada_valor: entradaValor,
      saldo_valor: saldoValor,
      parcelas,
      taxa_mensal: condicao.taxa_mensal,
    },
    logistica: {
      frete,
      instalacao,
    },
    preco_final_sem_logistica: precoFinalSemLogistica,
    preco_final: precoFinalComLogistica,
  };
}

module.exports = {
  calcularPreco,
  PARAM_CHAVES,
  round2,
  round4,
  toNum,
};
