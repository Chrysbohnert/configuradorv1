/**
 * precificacaoParametrosService.js
 * Gerencia os parâmetros globais da nova Precificação usando a tabela
 * configuracoes_globais já existente, com chaves prefixadas para isolamento.
 */

const { getConfiguracao, setConfiguracaoNumero } = require('./configuracoesService');
const { PARAM_CHAVES } = require('./precificacaoEngine');

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
    irpj_csll_percent: map[PARAM_CHAVES.IRPJ_CSLL],
  };
}

async function salvarParametros({
  comissao_base_vendedor_percent,
  desconto_comercial_max_percent,
  comissao_cedivel_max_percent,
  irpj_csll_percent,
}) {
  await setConfiguracaoNumero(
    PARAM_CHAVES.COMISSAO_BASE_VENDEDOR,
    comissao_base_vendedor_percent
  );
  await setConfiguracaoNumero(
    PARAM_CHAVES.DESCONTO_COMERCIAL_MAX,
    desconto_comercial_max_percent
  );
  await setConfiguracaoNumero(
    PARAM_CHAVES.COMISSAO_CEDIVEL_MAX,
    comissao_cedivel_max_percent
  );
  await setConfiguracaoNumero(PARAM_CHAVES.IRPJ_CSLL, irpj_csll_percent);
  return buscarParametros();
}

module.exports = {
  buscarParametros,
  salvarParametros,
  PARAM_CHAVES,
};
