/**
 * @typedef {'revenda' | 'cliente'} Audience
 * Tipo de audiência do plano de pagamento
 */

/**
 * @typedef {Object} PaymentPlan
 * @property {Audience} audience - Tipo de cliente (revenda ou cliente)
 * @property {number} [order] - Número da ordem/linha do plano
 * @property {string} description - Descrição do plano (ex: "30/60/90 DD")
 * @property {number} installments - Número de parcelas
 * @property {boolean} active - Se o plano está ativo
 * @property {string} [nature] - Natureza da operação (ex: "Venda")
 * @property {number} [discount_percent] - Percentual de desconto (0.03 = 3%)
 * @property {number} [surcharge_percent] - Percentual de acréscimo (0.01 = 1%)
 * @property {number} [min_order_value] - Valor mínimo do pedido em R$
 * @property {number} [entry_percent] - Percentual de entrada (0.5 = 50%)
 * @property {number} [entry_min] - Valor mínimo de entrada em R$
 * @property {number} [juros_mensal] - Juros mensal para futuro (0.01 = 1%/mês)
 */

/**
 * @typedef {Object} PaymentCalculation
 * @property {number} precoBase - Preço base antes de ajustes
 * @property {number} descontoValor - Valor do desconto em R$
 * @property {number} acrescimoValor - Valor do acréscimo em R$
 * @property {number} valorAjustado - Valor após desconto e acréscimo
 * @property {number} entrada - Valor da entrada (se houver)
 * @property {number} saldo - Saldo a parcelar após entrada
 * @property {Parcela[]} parcelas - Array com as parcelas
 * @property {number} total - Valor total final
 */

/**
 * @typedef {Object} Parcela
 * @property {number} numero - Número da parcela (1, 2, 3...)
 * @property {number} valor - Valor da parcela em R$
 * @property {Date} vencimento - Data de vencimento
 * @property {string} vencimentoStr - Data formatada (DD/MM/YYYY)
 */

export {};

