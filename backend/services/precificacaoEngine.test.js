const test = require('node:test');
const assert = require('node:assert/strict');
const engine = require('./precificacaoEngine');

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
