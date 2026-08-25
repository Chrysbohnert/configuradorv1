/**
 * pricingEngine.js
 * Motor de precificação no frontend (espelho do backend).
 * Puro e isolado: pode ser usado para cálculos instantâneos no simulador.
 */

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
 */
export function calcularPreco(input) {
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

  const taxaImpostosNoPreco = (icmsPct + pisCofinsPct) / 100;
  const taxaMargem = margemPct / 100;
  const divisor = 1 - taxaImpostosNoPreco - taxaMargem;
  const precoTabela = divisor > 0 ? round2(custoComVariaveis / divisor) : round2(custoComVariaveis);

  const icmsNoPreco = round2(precoTabela * (icmsPct / 100));
  const pisCofinsNoPreco = round2(precoTabela * (pisCofinsPct / 100));
  const comissaoNoPreco = round2(custoVariavel * (comissaoPct / 100));
  const margemBrutaNoPreco = round2(precoTabela - custoComVariaveis - icmsNoPreco - pisCofinsNoPreco);

  const descontoComercialValor = round2(precoTabela * (descontoComercialPct / 100));
  const precoComDescontoComercial = round2(precoTabela - descontoComercialValor);

  const baseComissaoVendedor = round2(precoComDescontoComercial * (comissaoBaseVendedorPct / 100));
  const descontoCedidoValor = round2(baseComissaoVendedor * (descontoDaComissaoPct / 100));
  const precoFinalSemLogistica = round2(precoComDescontoComercial - descontoCedidoValor);

  const comissaoFinal = round2(comissaoNoPreco - descontoCedidoValor);
  const comissaoCedidaPercentualSobreBase = comissaoBaseVendedorPct > 0
    ? round4((descontoDaComissaoPct / 100) * comissaoBaseVendedorPct)
    : 0;

  const irpjCsllValor = irpjCsllPct > 0 ? round2(margemBrutaNoPreco * (irpjCsllPct / 100)) : 0;
  const margemLiquida = round2(margemBrutaNoPreco - irpjCsllValor);

  const condicao = input.condicao || {};
  const entradaPct = Math.min(100, Math.max(0, toNum(condicao.entrada_percent)));
  const parcelas = calcularParcelas(
    precoFinalSemLogistica * (1 - entradaPct / 100),
    condicao.parcelas,
    condicao.taxa_mensal
  );
  const entradaValor = round2(precoFinalSemLogistica * (entradaPct / 100));
  const saldoValor = round2(parcelas.reduce((acc, p) => acc + p.valor, 0));

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

export { toNum, round2, round4 };
