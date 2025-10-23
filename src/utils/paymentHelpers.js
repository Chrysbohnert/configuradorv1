/**
 * Funções auxiliares para cálculos de pagamento
 */

/**
 * Calcula o limite de desconto baseado no tipo de cliente e condições
 */
export const calcularLimiteDesconto = ({
  tipoCliente,
  participacaoRevenda,
  temGuindasteGSI,
  quantidadeGSI,
  aplicarRegraGSISemParticipacao
}) => {
  // Para revenda
  if (tipoCliente === 'revenda') {
    if (temGuindasteGSI) {
      // Revenda com GSI: até 15% para múltiplas unidades
      if (quantidadeGSI >= 2) {
        return 15;
      }
      // Revenda com GSI: até 12% para 1 unidade
      return 12;
    }
    // Revenda sem GSI: até 12%
    return 12;
  }

  // Para cliente
  if (tipoCliente === 'cliente') {
    // Cliente SEM participação de revenda
    if (participacaoRevenda === 'nao') {
      // Se houver GSI e for produtor rural: até 12%
      if (aplicarRegraGSISemParticipacao) {
        return 12;
      }
      // Cliente sem participação: até 3%
      return 3;
    }
    // Cliente COM participação: desconto é gerenciado por descontoRevendaIE (1-5%)
    return 0;
  }

  return 0;
};

/**
 * Valida se o desconto está dentro do limite permitido
 */
export const validarDesconto = (desconto, limite) => {
  const descontoNum = parseFloat(desconto) || 0;
  return descontoNum >= 0 && descontoNum <= limite;
};

/**
 * Formata o valor de desconto para exibição
 */
export const formatarDesconto = (desconto) => {
  const descontoNum = parseFloat(desconto) || 0;
  return descontoNum.toFixed(2);
};

/**
 * Calcula o valor do desconto em reais
 */
export const calcularValorDesconto = (precoBase, percentualDesconto) => {
  const preco = parseFloat(precoBase) || 0;
  const percentual = parseFloat(percentualDesconto) || 0;
  return preco * (percentual / 100);
};

/**
 * Calcula o preço com desconto aplicado
 */
export const calcularPrecoComDesconto = (precoBase, percentualDesconto) => {
  const preco = parseFloat(precoBase) || 0;
  const valorDesconto = calcularValorDesconto(preco, percentualDesconto);
  return preco - valorDesconto;
};

/**
 * Determina se deve mostrar campo de desconto adicional
 */
export const deveMostrarDescontoAdicional = ({
  tipoCliente,
  participacaoRevenda,
  revendaTemIE,
  temGuindasteGSE
}) => {
  // Revenda: sempre mostra
  if (tipoCliente === 'revenda') {
    return true;
  }

  // Cliente COM participação de revenda
  if (tipoCliente === 'cliente' && participacaoRevenda === 'sim') {
    // Se for produtor rural (com IE) e NÃO houver GSE: mostra como "Desconto do Vendedor"
    if (revendaTemIE === 'sim' && !temGuindasteGSE) {
      return true;
    }
    // Se houver GSE: não mostra (desconto zerado automaticamente)
    return false;
  }

  // Cliente SEM participação de revenda: mostra
  if (tipoCliente === 'cliente' && participacaoRevenda === 'nao') {
    return true;
  }

  return false;
};

/**
 * Obtém o label correto para o campo de desconto
 */
export const getLabelDesconto = ({
  tipoCliente,
  participacaoRevenda,
  revendaTemIE
}) => {
  if (tipoCliente === 'revenda') {
    return 'Desconto Adicional do Vendedor';
  }

  if (tipoCliente === 'cliente' && participacaoRevenda === 'sim' && revendaTemIE === 'sim') {
    return 'Desconto do Vendedor (1-5%)';
  }

  if (tipoCliente === 'cliente' && participacaoRevenda === 'nao') {
    return 'Desconto Adicional do Vendedor';
  }

  return 'Desconto Adicional';
};

/**
 * Valida se todos os campos obrigatórios de pagamento estão preenchidos
 */
export const validarCamposPagamento = ({
  tipoCliente,
  prazoSelecionado,
  localInstalacao,
  tipoInstalacao,
  participacaoRevenda,
  revendaTemIE,
  tipoFrete,
  financiamentoBancario
}) => {
  const erros = {};

  if (!tipoCliente) {
    erros.tipoCliente = 'Selecione o tipo de pagamento';
  }

  // Prazo não é obrigatório se houver financiamento bancário
  if (!prazoSelecionado && financiamentoBancario !== 'sim') {
    erros.prazoSelecionado = 'Selecione o prazo de pagamento';
  }

  if (!tipoFrete) {
    erros.tipoFrete = 'Selecione o tipo de frete';
  }

  // Validações específicas para cliente
  if (tipoCliente === 'cliente') {
    if (!localInstalacao) {
      erros.localInstalacao = 'Selecione o local de instalação';
    }

    if (!tipoInstalacao) {
      erros.tipoInstalacao = 'Selecione o tipo de instalação';
    }

    if (!participacaoRevenda) {
      erros.participacaoRevenda = 'Selecione se há participação de revenda';
    }

    if (participacaoRevenda && !revendaTemIE) {
      erros.revendaTemIE = 'Selecione o tipo de cliente/revenda';
    }
  }

  return {
    valido: Object.keys(erros).length === 0,
    erros
  };
};

/**
 * Calcula o valor total com frete e instalação
 */
export const calcularValorTotalComExtras = ({
  valorBase,
  valorFrete = 0,
  valorInstalacao = 0
}) => {
  const base = parseFloat(valorBase) || 0;
  const frete = parseFloat(valorFrete) || 0;
  const instalacao = parseFloat(valorInstalacao) || 0;

  return base + frete + instalacao;
};

/**
 * Determina o valor da instalação baseado nas condições e modelo do guindaste
 * @param {Object} params
 * @param {string} params.tipoCliente - Tipo de cliente ('cliente' ou 'revenda')
 * @param {string} params.pagamentoInstalacaoPorConta - Tipo de pagamento da instalação
 * @param {string} params.localInstalacao - Local de instalação selecionado
 * @param {boolean} params.temGuindasteGSI - Se há guindaste GSI no carrinho
 * @param {boolean} params.temGuindasteGSE - Se há guindaste GSE no carrinho
 * @returns {Object} { valor, valorInformativo, soma }
 */
export const calcularValorInstalacao = ({
  tipoCliente,
  pagamentoInstalacaoPorConta,
  localInstalacao,
  temGuindasteGSI = false,
  temGuindasteGSE = false
}) => {
  if (tipoCliente !== 'cliente' || !localInstalacao || !pagamentoInstalacaoPorConta) {
    return { valor: 0, valorInformativo: 0, soma: false };
  }

  const clientePagaDireto = pagamentoInstalacaoPorConta === 'cliente paga direto';
  const inclusoNoPedido = pagamentoInstalacaoPorConta === 'Incluso no pedido';

  // GSI
  if (temGuindasteGSI) {
    if (clientePagaDireto) {
      return { valor: 0, valorInformativo: 5500, soma: false }; // Apenas informativo
    }
    if (inclusoNoPedido) {
      return { valor: 6350, valorInformativo: 6350, soma: true }; // Soma na proposta
    }
  }

  // GSE
  if (temGuindasteGSE) {
    if (clientePagaDireto) {
      return { valor: 0, valorInformativo: 6500, soma: false }; // Apenas informativo
    }
    if (inclusoNoPedido) {
      return { valor: 7500, valorInformativo: 7500, soma: true }; // Soma na proposta
    }
  }

  return { valor: 0, valorInformativo: 0, soma: false };
};

/**
 * Determina o valor do frete baseado nas condições
 */
export const calcularValorFrete = ({
  tipoFrete,
  tipoFreteSelecionado,
  dadosFreteAtual
}) => {
  if (tipoFrete === 'cif' && dadosFreteAtual && tipoFreteSelecionado) {
    if (tipoFreteSelecionado === 'prioridade') {
      return parseFloat(dadosFreteAtual.valor_prioridade || 0);
    }
    if (tipoFreteSelecionado === 'reaproveitamento') {
      return parseFloat(dadosFreteAtual.valor_reaproveitamento || 0);
    }
  }
  return 0;
};
