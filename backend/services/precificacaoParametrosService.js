/**
 * precificacaoParametrosService.js
 * Gerencia os parâmetros globais da nova Precificação usando a tabela
 * configuracoes_globais já existente, com chaves prefixadas para isolamento.
 */

const { getConfiguracao, setConfiguracaoNumero } = require('./configuracoesService');
const { PARAM_CHAVES } = require('./precificacaoEngine');

function numeroValido(value, field) {
  const numero = Number(value);
  if (value === '' || value === null || value === undefined || !Number.isFinite(numero)) {
    const error = new Error(`${field} deve ser um número válido`);
    error.status = 400;
    throw error;
  }
  return numero;
}

async function buscarParametros() {
  const entries = await Promise.all(
    Object.values(PARAM_CHAVES).map(async (chave) => {
      const cfg = await getConfiguracao(chave);
      return { chave, valor: cfg?.valor_numero ?? null };
    })
  );

  const map = {};
  entries.forEach((e) => {
    map[e.chave] = e.valor === null || e.valor === undefined ? 0 : Number(e.valor);
  });

  return {
    comissao_base_vendedor_percent: map[PARAM_CHAVES.COMISSAO_BASE_VENDEDOR],
    desconto_comercial_max_percent: map[PARAM_CHAVES.DESCONTO_COMERCIAL_MAX],
    comissao_cedivel_max_percent: map[PARAM_CHAVES.COMISSAO_CEDIVEL_MAX],
    passo_desconto_parcela_percent: map[PARAM_CHAVES.PASSO_DESCONTO_PARCELA],
    irpj_percent: map[PARAM_CHAVES.IRPJ],
    csll_percent: map[PARAM_CHAVES.CSLL],
    ipi_padrao_percent: map[PARAM_CHAVES.IPI_PADRAO],
  };
}

async function salvarParametros({
  comissao_base_vendedor_percent,
  desconto_comercial_max_percent,
  comissao_cedivel_max_percent,
  passo_desconto_parcela_percent,
  irpj_percent,
  csll_percent,
  ipi_padrao_percent,
}) {
  const valores = {
    comissao_base_vendedor_percent: numeroValido(comissao_base_vendedor_percent, 'comissao_base_vendedor_percent'),
    desconto_comercial_max_percent: numeroValido(desconto_comercial_max_percent, 'desconto_comercial_max_percent'),
    comissao_cedivel_max_percent: numeroValido(comissao_cedivel_max_percent, 'comissao_cedivel_max_percent'),
    passo_desconto_parcela_percent: numeroValido(passo_desconto_parcela_percent, 'passo_desconto_parcela_percent'),
    irpj_percent: numeroValido(irpj_percent, 'irpj_percent'),
    csll_percent: numeroValido(csll_percent, 'csll_percent'),
    ipi_padrao_percent: numeroValido(ipi_padrao_percent, 'ipi_padrao_percent'),
  };
  await setConfiguracaoNumero(
    PARAM_CHAVES.COMISSAO_BASE_VENDEDOR,
    valores.comissao_base_vendedor_percent
  );
  await setConfiguracaoNumero(
    PARAM_CHAVES.DESCONTO_COMERCIAL_MAX,
    valores.desconto_comercial_max_percent
  );
  await setConfiguracaoNumero(
    PARAM_CHAVES.COMISSAO_CEDIVEL_MAX,
    valores.comissao_cedivel_max_percent
  );
  await setConfiguracaoNumero(
    PARAM_CHAVES.PASSO_DESCONTO_PARCELA,
    valores.passo_desconto_parcela_percent
  );
  await setConfiguracaoNumero(PARAM_CHAVES.IRPJ, valores.irpj_percent);
  await setConfiguracaoNumero(PARAM_CHAVES.CSLL, valores.csll_percent);
  await setConfiguracaoNumero(PARAM_CHAVES.IPI_PADRAO, valores.ipi_padrao_percent);
  return buscarParametros();
}

module.exports = {
  buscarParametros,
  salvarParametros,
  PARAM_CHAVES,
};
