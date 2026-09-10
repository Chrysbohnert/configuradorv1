const test = require('node:test');
const assert = require('node:assert/strict');
const engine = require('./precificacaoEngine');
const { validarFrete, validarLimitesDesconto } = require('./precificacaoSimuladorService');

test('rejeita FOB parcelado e aceita FOB à vista ou CIF parcelado', () => {
  assert.equal(validarFrete({ tipo_frete: 'FOB' }, 0), 'FOB');
  assert.equal(validarFrete({ tipo_frete: 'CIF' }, 10), 'CIF');
  assert.equal(validarFrete({}, 10), null);
  assert.throws(() => validarFrete({ tipo_frete: 'FOB' }, 1), (error) => (
    error.status === 400 && error.message === 'FOB para cliente final disponível somente para pagamento à vista.'
  ));
});

test('rejeita descontos acima dos limites da precificação', () => {
  const parametros = {
    desconto_comercial_max_percent: 6,
    comissao_cedivel_max_percent: 1,
    passo_desconto_parcela_percent: 1,
  };

  assert.doesNotThrow(() => validarLimitesDesconto({
    desconto_comercial_percent: 3,
    desconto_da_comissao_percent: 1,
  }, parametros, 3));
  assert.throws(() => validarLimitesDesconto({
    desconto_comercial_percent: 3.01,
    desconto_da_comissao_percent: 1,
  }, parametros, 3), (error) => error.status === 400 && error.message === 'Limite de desconto excedido');
  assert.throws(() => validarLimitesDesconto({
    desconto_comercial_percent: 0,
    desconto_da_comissao_percent: 1.01,
  }, parametros, 0), (error) => error.status === 400 && error.message === 'Limite de desconto excedido');
});

test('aplica a cadeia Lovable completa sem incluir logística na margem', () => {
  const input = {
    custo_mp: 80000,
    custo_mo: 20000,
    equipamento: {
      custo_fixo_percent: 8,
      comissao_percent: 5,
      assistencia_percent: 1,
      margem_lucro_percent: 12,
      ipi_percent: 4,
    },
    tributacao: { icms_percent: 8.8, pis_cofins_percent: 9.25 },
    condicao: { entrada_percent: 30, parcelas: 3, taxa_anual_percent: 16.4 },
    parametros: {
      comissao_base_vendedor_percent: 5,
      desconto_comercial_max_percent: 6,
      comissao_cedivel_max_percent: 1,
      passo_desconto_parcela_percent: 1,
      irpj_percent: 25,
      csll_percent: 9,
      ipi_padrao_percent: 2,
    },
    fator_pior_cenario: engine.fatoresCondicao(30, 16.4)[11],
    desconto_comercial_percent: 5,
    desconto_da_comissao_percent: 2,
    frete: 1000,
    instalacao: 2000,
  };

  const resultado = engine.calcularPreco(input);
  const limite = engine.limiteDescontoComercial(0.06, 3, 0.01);
  const grossUp = engine.irpjCsllGrossUp(0.12, 0.25, 0.09);

  assert.equal(resultado.desconto_comercial.percentual, limite * 100);
  assert.equal(resultado.comissao.cedida_percent_sobre_base, 1);
  assert.equal(resultado.comissao.vendedor_percent, 4);
  assert.equal(resultado.tributacao.ipi_percent, 4);
  assert.equal(resultado.formacao.irpj_csll_gross_up_percent, Number((grossUp * 100).toFixed(4)));
  assert.equal(resultado.preco_final, Number((resultado.preco_final_sem_logistica + resultado.logistica.frete + resultado.logistica.instalacao).toFixed(2)));
  assert.equal(Number((resultado.pagamento.entrada_valor + resultado.pagamento.saldo_valor).toFixed(2)), resultado.preco_final);
});

test('usa IPI padrão somente quando o equipamento não possui IPI', () => {
  const base = {
    custo_mp: 100,
    custo_mo: 0,
    equipamento: { margem_lucro_percent: 10 },
    tributacao: {},
    condicao: { parcelas: 1 },
    parametros: { ipi_padrao_percent: 7 },
  };

  assert.equal(engine.calcularPreco(base).tributacao.ipi_percent, 7);
  assert.equal(engine.calcularPreco({
    ...base,
    equipamento: { ...base.equipamento, ipi_percent: 0 },
  }).tributacao.ipi_percent, 0);
});

test('EXPORT zera ICMS e PIS/COFINS na simulação', () => {
  const resultado = engine.calcularPreco({
    custo_mp: 100000,
    custo_mo: 20000,
    equipamento: { custo_fixo_percent: 8, comissao_percent: 5, assistencia_percent: 1, margem_lucro_percent: 12 },
    tributacao: { icms_percent: 0, pis_cofins_percent: 0 },
    condicao: { parcelas: 1 },
    parametros: {
      comissao_base_vendedor_percent: 5,
      desconto_comercial_max_percent: 6,
      comissao_cedivel_max_percent: 1,
      passo_desconto_parcela_percent: 1,
      irpj_percent: 25,
      csll_percent: 9,
      ipi_padrao_percent: 0,
    },
  });

  assert.equal(resultado.tributacao.icms_percent, 0);
  assert.equal(resultado.tributacao.pis_cofins_percent, 0);
  assert.equal(resultado.tributacao.icms_valor, 0);
  assert.equal(resultado.tributacao.pis_cofins_valor, 0);
});

test('limita desconto comercial e da comissão aos máximos parametrizados', () => {
  const resultado = engine.calcularPreco({
    custo_mp: 100000,
    custo_mo: 20000,
    equipamento: { custo_fixo_percent: 8, comissao_percent: 5, assistencia_percent: 1, margem_lucro_percent: 12 },
    tributacao: { icms_percent: 8.8, pis_cofins_percent: 9.25 },
    condicao: { parcelas: 3 },
    parametros: {
      comissao_base_vendedor_percent: 5,
      desconto_comercial_max_percent: 6,
      comissao_cedivel_max_percent: 1,
      passo_desconto_parcela_percent: 1,
      irpj_percent: 25,
      csll_percent: 9,
      ipi_padrao_percent: 0,
    },
    desconto_comercial_percent: 10,
    desconto_da_comissao_percent: 5,
  });

  const limiteDesconto = engine.limiteDescontoComercial(0.06, 3, 0.01);
  assert.equal(resultado.desconto_comercial.percentual, Number((limiteDesconto * 100).toFixed(4)));
  assert.equal(resultado.comissao.cedida_percent_sobre_base, 1);
});

test('aplica proteção cambial e acréscimo de margem somente na exportação', () => {
  const base = {
    custo_mp: 100000,
    custo_mo: 20000,
    equipamento: { custo_fixo_percent: 8, comissao_percent: 5, assistencia_percent: 1, margem_lucro_percent: 6, ipi_percent: 0 },
    tributacao: { icms_percent: 0, pis_cofins_percent: 0 },
    condicao: { parcelas: 1 },
    parametros: { irpj_percent: 25, csll_percent: 9 },
  };
  const nacional = engine.calcularPreco(base);
  const exportado = engine.calcularPreco({
    ...base,
    exportacao: { ativo: true, cotacao_original: 5.2, reducao_dolar_percent: 3, acrescimo_margem_percent: 3 },
  });

  assert.equal(exportado.exportacao.cotacao_original, 5.2);
  assert.equal(exportado.exportacao.cotacao_utilizada, 5.044);
  assert.equal(exportado.exportacao.margem_original_percent, 6);
  assert.equal(exportado.exportacao.margem_aplicada_percent, 9);
  assert.equal(nacional.exportacao, null);
  assert.equal(nacional.margem.percentual, 6);
  assert.equal(exportado.margem.percentual, 9);
});
