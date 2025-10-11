/**
 * Utilitários para cálculos de preços, descontos e acréscimos
 * Todas as regras de negócio de precificação estão aqui
 */

/**
 * Normaliza região do vendedor para região de preço
 * @param {string} regiaoVendedor - Região do vendedor
 * @param {boolean} clienteTemIE - Se cliente tem Inscrição Estadual
 * @returns {string} - Região normalizada para busca de preço
 */
export function normalizarRegiao(regiaoVendedor, clienteTemIE = true) {
  if (!regiaoVendedor) return 'sul-sudeste'; // Padrão

  const regiao = regiaoVendedor.toLowerCase().trim();

  // Rio Grande do Sul tem tratamento especial (IE)
  if (regiao === 'rio grande do sul') {
    return clienteTemIE ? 'rs-com-ie' : 'rs-sem-ie';
  }

  // Norte e Nordeste agrupados
  if (regiao === 'norte' || regiao === 'nordeste') {
    return 'norte-nordeste';
  }

  // Sul e Sudeste agrupados
  if (regiao === 'sul' || regiao === 'sudeste') {
    return 'sul-sudeste';
  }

  // Centro-Oeste mantém
  if (regiao === 'centro-oeste') {
    return 'centro-oeste';
  }

  // Se não encontrou, retorna padrão
  return 'sul-sudeste';
}

/**
 * Calcula desconto por quantidade (Revenda GSI)
 * @param {number} quantidade - Quantidade de guindastes
 * @returns {number} - Percentual de desconto
 */
export function calcularDescontoRevenda(quantidade) {
  if (quantidade >= 3) return 15; // 15% para 3+
  if (quantidade >= 2) return 14; // 14% para 2
  if (quantidade >= 1) return 12; // 12% para 1
  return 0;
}

/**
 * Calcula desconto CNPJ/CPF GSE
 * @returns {number} - Percentual de desconto (3%)
 */
export function calcularDescontoCNPJ() {
  return 3;
}

/**
 * Calcula acréscimo por prazo de pagamento
 * @param {number} dias - Dias de prazo
 * @returns {number} - Percentual de acréscimo
 */
export function calcularAcrescimoPrazo(dias) {
  if (dias <= 30) return 3;  // +3% até 30 dias
  if (dias <= 60) return 1;  // +1% até 60 dias
  return 0; // Sem acréscimo acima de 60 dias
}

/**
 * Calcula acréscimo por parcelamento interno
 * @param {number} dias - Dias de parcelamento
 * @returns {number} - Percentual de acréscimo por mês
 */
export function calcularAcrescimoParcelamentoInterno(dias) {
  if (dias <= 120) return 0; // Sem acréscimo até 120 dias (4 meses)
  
  // Após 120 dias: 2% ao mês
  const meses = Math.ceil((dias - 120) / 30);
  return meses * 2;
}

/**
 * Calcula acréscimo por parcelamento CNPJ
 * @param {number} dias - Dias de parcelamento
 * @returns {number} - Percentual de acréscimo por mês
 */
export function calcularAcrescimoParcelamentoCNPJ(dias) {
  if (dias <= 90) return 0; // Sem acréscimo até 90 dias (3 meses)
  
  // Após 90 dias: 2% ao mês
  const meses = Math.ceil((dias - 90) / 30);
  return meses * 2;
}

/**
 * Aplica desconto em um valor
 * @param {number} valor - Valor original
 * @param {number} percentualDesconto - Percentual de desconto (0-100)
 * @returns {number} - Valor com desconto aplicado
 */
export function aplicarDesconto(valor, percentualDesconto) {
  if (percentualDesconto <= 0) return valor;
  return valor * (1 - percentualDesconto / 100);
}

/**
 * Aplica acréscimo em um valor
 * @param {number} valor - Valor original
 * @param {number} percentualAcrescimo - Percentual de acréscimo (0-100)
 * @returns {number} - Valor com acréscimo aplicado
 */
export function aplicarAcrescimo(valor, percentualAcrescimo) {
  if (percentualAcrescimo <= 0) return valor;
  return valor * (1 + percentualAcrescimo / 100);
}

/**
 * Calcula valor final com desconto e acréscimo
 * @param {number} valorBase - Valor base
 * @param {number} desconto - Percentual de desconto
 * @param {number} acrescimo - Percentual de acréscimo
 * @returns {number} - Valor final calculado
 */
export function calcularValorFinal(valorBase, desconto = 0, acrescimo = 0) {
  let valor = valorBase;
  
  // Aplica desconto primeiro
  if (desconto > 0) {
    valor = aplicarDesconto(valor, desconto);
  }
  
  // Depois aplica acréscimo
  if (acrescimo > 0) {
    valor = aplicarAcrescimo(valor, acrescimo);
  }
  
  return valor;
}

/**
 * Calcula política de pagamento completa
 * @param {Object} params - Parâmetros
 * @param {number} params.valorBase - Valor base total
 * @param {string} params.tipoPagamento - Tipo de pagamento
 * @param {number} params.quantidadeGuindastes - Quantidade de guindastes
 * @param {number} params.prazoDias - Prazo em dias
 * @param {number} params.parcelamentoDias - Parcelamento em dias
 * @returns {Object} - Objeto com cálculos detalhados
 */
export function calcularPoliticaPagamento({
  valorBase,
  tipoPagamento,
  quantidadeGuindastes = 1,
  prazoDias = 0,
  parcelamentoDias = 0
}) {
  let desconto = 0;
  let acrescimo = 0;
  const detalhes = [];

  // Calcular desconto baseado no tipo de pagamento
  switch (tipoPagamento) {
    case 'revenda_gsi':
      desconto = calcularDescontoRevenda(quantidadeGuindastes);
      detalhes.push(`Desconto Revenda GSI: ${desconto}% (${quantidadeGuindastes} unidades)`);
      break;
      
    case 'cnpj_gse':
    case 'cpf_gse':
      desconto = calcularDescontoCNPJ();
      detalhes.push(`Desconto CNPJ/CPF GSE: ${desconto}%`);
      break;
      
    default:
      // Sem desconto para outros tipos
      break;
  }

  // Calcular acréscimo por prazo
  if (prazoDias > 0) {
    const acrescimoPrazo = calcularAcrescimoPrazo(prazoDias);
    if (acrescimoPrazo > 0) {
      acrescimo += acrescimoPrazo;
      detalhes.push(`Acréscimo por prazo ${prazoDias} dias: +${acrescimoPrazo}%`);
    }
  }

  // Calcular acréscimo por parcelamento
  if (parcelamentoDias > 0) {
    let acrescimoParcelamento = 0;
    
    if (tipoPagamento === 'parcelamento_interno') {
      acrescimoParcelamento = calcularAcrescimoParcelamentoInterno(parcelamentoDias);
      if (acrescimoParcelamento > 0) {
        detalhes.push(`Acréscimo parcelamento interno: +${acrescimoParcelamento}%`);
      }
    } else if (tipoPagamento === 'parcelamento_cnpj') {
      acrescimoParcelamento = calcularAcrescimoParcelamentoCNPJ(parcelamentoDias);
      if (acrescimoParcelamento > 0) {
        detalhes.push(`Acréscimo parcelamento CNPJ: +${acrescimoParcelamento}%`);
      }
    }
    
    acrescimo += acrescimoParcelamento;
  }

  // Calcular valor final
  const valorFinal = calcularValorFinal(valorBase, desconto, acrescimo);
  const economia = valorBase - valorFinal;

  return {
    valorBase,
    desconto,
    acrescimo,
    valorFinal,
    economia,
    detalhes,
    // Valores intermediários
    valorComDesconto: aplicarDesconto(valorBase, desconto),
    valorAcrescimo: valorFinal - aplicarDesconto(valorBase, desconto),
  };
}

/**
 * Formata detalhes do cálculo para exibição
 * @param {Object} calculo - Resultado de calcularPoliticaPagamento
 * @returns {string} - String formatada com os detalhes
 */
export function formatarDetalhesCalculo(calculo) {
  const linhas = [
    `Valor Base: R$ ${calculo.valorBase.toFixed(2)}`,
    ...calculo.detalhes,
  ];

  if (calculo.economia > 0) {
    linhas.push(`Economia Total: R$ ${calculo.economia.toFixed(2)}`);
  } else if (calculo.valorAcrescimo > 0) {
    linhas.push(`Acréscimo Total: R$ ${calculo.valorAcrescimo.toFixed(2)}`);
  }

  linhas.push(`Valor Final: R$ ${calculo.valorFinal.toFixed(2)}`);

  return linhas.join('\n');
}

