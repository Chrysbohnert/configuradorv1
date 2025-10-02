/**
 * Biblioteca de cálculos de pagamento
 * @module lib/payments
 */

/**
 * Arredonda um número para 2 casas decimais
 * @param {number} num - Número a arredondar
 * @returns {number}
 */
export function round2(num) {
  return Math.round(num * 100) / 100;
}

/**
 * Parseia uma string de prazo DD (ex: "30/60/90 DD") e retorna array de dias
 * @param {string} prazoDD - String com o prazo (ex: "30/60/90 DD")
 * @returns {number[]} Array com os dias (ex: [30, 60, 90])
 */
export function parsePrazoDD(prazoDD) {
  if (!prazoDD) return [];
  
  // Remove "DD" e espaços extras, depois separa por "/"
  const cleaned = prazoDD.replace(/DD/gi, '').trim();
  const parts = cleaned.split('/').map(s => s.trim()).filter(s => s);
  
  return parts.map(p => parseInt(p, 10)).filter(n => !isNaN(n));
}

/**
 * Calcula o valor de uma parcela usando a fórmula Price (para uso futuro com juros)
 * @param {number} principal - Valor principal
 * @param {number} taxa - Taxa de juros (ex: 0.01 para 1%)
 * @param {number} numParcelas - Número de parcelas
 * @returns {number} Valor da parcela
 */
export function pmt(principal, taxa, numParcelas) {
  if (taxa === 0) {
    return principal / numParcelas;
  }
  
  const fator = Math.pow(1 + taxa, numParcelas);
  return principal * (taxa * fator) / (fator - 1);
}

/**
 * Adiciona dias a uma data
 * @param {Date} data - Data base
 * @param {number} dias - Número de dias a adicionar
 * @returns {Date}
 */
export function addDays(data, dias) {
  const result = new Date(data);
  result.setDate(result.getDate() + dias);
  return result;
}

/**
 * Formata uma data para DD/MM/YYYY
 * @param {Date} data - Data a formatar
 * @returns {string}
 */
export function formatDate(data) {
  const day = String(data.getDate()).padStart(2, '0');
  const month = String(data.getMonth() + 1).padStart(2, '0');
  const year = data.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Calcula os detalhes do pagamento baseado no plano selecionado
 * @param {Object} params - Parâmetros do cálculo
 * @param {number} params.precoBase - Preço base do pedido
 * @param {import('../types/payment').PaymentPlan} params.plan - Plano de pagamento selecionado
 * @param {Date} [params.dataEmissaoNF] - Data de emissão da NF (padrão: hoje)
 * @returns {import('../types/payment').PaymentCalculation}
 * @throws {Error} Se o valor do pedido for menor que o mínimo exigido pelo plano
 */
export function calcularPagamento({ precoBase, plan, dataEmissaoNF = new Date() }) {
  // Validar valor mínimo do pedido
  if (plan.min_order_value && precoBase < plan.min_order_value) {
    throw new Error(
      `Valor do pedido (R$ ${precoBase.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) ` +
      `é menor que o mínimo exigido (R$ ${plan.min_order_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) ` +
      `para o plano "${plan.description}"`
    );
  }

  // 1. Aplicar desconto e acréscimo
  const descontoPercent = plan.discount_percent || 0;
  const acrescimoPercent = plan.surcharge_percent || 0;
  
  const descontoValor = round2(precoBase * descontoPercent);
  const acrescimoValor = round2(precoBase * acrescimoPercent);
  
  const valorAjustado = round2(precoBase - descontoValor + acrescimoValor);

  // 2. Calcular entrada (se houver)
  let entrada = 0;
  if (plan.entry_percent || plan.entry_min) {
    const entradaPercent = plan.entry_percent ? valorAjustado * plan.entry_percent : 0;
    const entradaMin = plan.entry_min || 0;
    entrada = round2(Math.max(entradaPercent, entradaMin));
  }

  // 3. Calcular saldo a parcelar
  const saldo = round2(valorAjustado - entrada);

  // 4. Gerar parcelas
  const parcelas = [];
  const numParcelas = plan.installments;
  
  // Parsear os dias de vencimento da descrição
  const diasVencimento = parsePrazoDD(plan.description);
  
  // Determinar os dias de vencimento
  let dias;
  if (plan.description.toLowerCase().includes('vista')) {
    // À Vista: vencimento no mesmo dia (0 dias)
    dias = [0];
  } else if (diasVencimento.length === numParcelas) {
    // Usar os dias parseados da descrição
    dias = diasVencimento;
  } else {
    // Se não houver dias específicos, gerar de 30 em 30
    dias = Array.from({ length: numParcelas }, (_, i) => 30 * (i + 1));
  }

  // Calcular valor base de cada parcela
  const valorParcela = saldo / numParcelas;
  
  // Distribuir o saldo, ajustando centavos na última parcela
  let somaAcumulada = 0;
  for (let i = 0; i < numParcelas; i++) {
    const isUltima = i === numParcelas - 1;
    const valor = isUltima 
      ? round2(saldo - somaAcumulada) 
      : round2(valorParcela);
    
    somaAcumulada += valor;
    
    const vencimento = addDays(dataEmissaoNF, dias[i]);
    
    parcelas.push({
      numero: i + 1,
      valor,
      vencimento,
      vencimentoStr: formatDate(vencimento)
    });
  }

  // 5. Calcular total final
  const total = round2(entrada + saldo);

  return {
    precoBase: round2(precoBase),
    descontoValor,
    acrescimoValor,
    valorAjustado,
    entrada,
    saldo,
    parcelas,
    total
  };
}

