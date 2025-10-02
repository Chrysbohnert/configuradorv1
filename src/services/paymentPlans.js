/**
 * Serviço para gerenciar planos de pagamento
 * @module services/paymentPlans
 */

import plans from '../data/payment_plans.json';

/**
 * Retorna todos os planos de pagamento ativos, opcionalmente filtrados por audiência
 * @param {('revenda'|'cliente')} [audience] - Tipo de cliente para filtrar
 * @returns {import('../types/payment').PaymentPlan[]}
 */
export function getPaymentPlans(audience) {
  const all = plans.filter(p => p.active);
  return audience ? all.filter(p => p.audience === audience) : all;
}

/**
 * Busca um plano específico por ordem e audiência
 * @param {number} order - Número da ordem do plano
 * @param {('revenda'|'cliente')} [audience] - Tipo de cliente
 * @returns {import('../types/payment').PaymentPlan|undefined}
 */
export function getPlanByOrder(order, audience) {
  return getPaymentPlans(audience).find(p => p.order === order);
}

/**
 * Busca um plano pela descrição
 * @param {string} description - Descrição do plano
 * @param {('revenda'|'cliente')} [audience] - Tipo de cliente
 * @returns {import('../types/payment').PaymentPlan|undefined}
 */
export function getPlanByDescription(description, audience) {
  return getPaymentPlans(audience).find(p => p.description === description);
}

/**
 * Gera um label descritivo para o plano mostrando hints de desconto/acréscimo/entrada
 * @param {import('../types/payment').PaymentPlan} plan - Plano de pagamento
 * @returns {string}
 */
export function getPlanLabel(plan) {
  let label = plan.description;
  const hints = [];

  if (plan.discount_percent) {
    hints.push(`desc. ${(plan.discount_percent * 100).toFixed(0)}%`);
  }

  if (plan.surcharge_percent) {
    hints.push(`acr. ${(plan.surcharge_percent * 100).toFixed(0)}%`);
  }

  if (plan.entry_percent) {
    hints.push(`entrada ${(plan.entry_percent * 100).toFixed(0)}%`);
  }

  if (plan.entry_min) {
    hints.push(`entrada mín. R$ ${plan.entry_min.toLocaleString('pt-BR')}`);
  }

  if (plan.min_order_value) {
    hints.push(`pedido mín. R$ ${plan.min_order_value.toLocaleString('pt-BR')}`);
  }

  if (hints.length > 0) {
    label += ` (${hints.join(', ')})`;
  }

  return label;
}

