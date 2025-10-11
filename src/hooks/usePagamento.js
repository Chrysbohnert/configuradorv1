/**
 * Hook customizado para gerenciar cálculos de pagamento
 * Centraliza toda a lógica de política de pagamento
 */

import { useState, useEffect, useCallback } from 'react';
import { calcularPoliticaPagamento } from '../utils/precoCalculations';

export function usePagamento(valorBase = 0, quantidadeGuindastes = 0) {
  const [pagamento, setPagamento] = useState({
    tipoPagamento: '',
    prazoPagamento: '',
    desconto: 0,
    acrescimo: 0,
    valorFinal: 0,
    localInstalacao: '',
    tipoInstalacao: '',
    tipoFrete: '',
    participacaoRevenda: '',
    revendaTemIE: '',
    detalhes: []
  });

  /**
   * Atualiza um campo do pagamento
   */
  const updateField = useCallback((field, value) => {
    setPagamento(prev => ({ ...prev, [field]: value }));
  }, []);

  /**
   * Atualiza tipo de pagamento e recalcula
   */
  const setTipoPagamento = useCallback((tipo) => {
    setPagamento(prev => ({ ...prev, tipoPagamento: tipo }));
  }, []);

  /**
   * Atualiza prazo de pagamento e recalcula
   */
  const setPrazoPagamento = useCallback((prazo) => {
    setPagamento(prev => ({ ...prev, prazoPagamento: prazo }));
  }, []);

  /**
   * Recalcula valores quando mudam os parâmetros
   */
  useEffect(() => {
    if (!valorBase || valorBase <= 0) {
      setPagamento(prev => ({
        ...prev,
        desconto: 0,
        acrescimo: 0,
        valorFinal: 0,
        detalhes: []
      }));
      return;
    }

    // Converter prazo para dias
    let prazoDias = 0;
    if (pagamento.prazoPagamento) {
      const match = pagamento.prazoPagamento.match(/(\d+)/);
      if (match) {
        prazoDias = parseInt(match[1]);
      }
    }

    // Calcular política de pagamento
    const resultado = calcularPoliticaPagamento({
      valorBase,
      tipoPagamento: pagamento.tipoPagamento,
      quantidadeGuindastes,
      prazoDias,
      parcelamentoDias: prazoDias // Usar o mesmo prazo
    });

    setPagamento(prev => ({
      ...prev,
      desconto: resultado.desconto,
      acrescimo: resultado.acrescimo,
      valorFinal: resultado.valorFinal,
      detalhes: resultado.detalhes
    }));
  }, [valorBase, quantidadeGuindastes, pagamento.tipoPagamento, pagamento.prazoPagamento]);

  /**
   * Reseta todos os campos
   */
  const reset = useCallback(() => {
    setPagamento({
      tipoPagamento: '',
      prazoPagamento: '',
      desconto: 0,
      acrescimo: 0,
      valorFinal: 0,
      localInstalacao: '',
      tipoInstalacao: '',
      tipoFrete: '',
      participacaoRevenda: '',
      revendaTemIE: '',
      detalhes: []
    });
  }, []);

  /**
   * Valida se todos os campos obrigatórios estão preenchidos
   */
  const isValid = useCallback(() => {
    return !!(
      pagamento.tipoPagamento &&
      pagamento.localInstalacao &&
      pagamento.tipoInstalacao
    );
  }, [pagamento]);

  /**
   * Obtém resumo do pagamento para exibição
   */
  const getResumo = useCallback(() => {
    return {
      tipoPagamento: pagamento.tipoPagamento,
      prazo: pagamento.prazoPagamento,
      desconto: pagamento.desconto,
      acrescimo: pagamento.acrescimo,
      valorBase,
      valorFinal: pagamento.valorFinal || valorBase,
      economia: valorBase - (pagamento.valorFinal || valorBase),
      detalhes: pagamento.detalhes
    };
  }, [pagamento, valorBase]);

  return {
    // Estado
    pagamento,
    setPagamento,
    
    // Ações
    updateField,
    setTipoPagamento,
    setPrazoPagamento,
    reset,
    
    // Validação
    isValid,
    
    // Utilidades
    getResumo,
    
    // Valores calculados
    valorFinal: pagamento.valorFinal || valorBase,
    desconto: pagamento.desconto,
    acrescimo: pagamento.acrescimo,
    economia: valorBase - (pagamento.valorFinal || valorBase),
  };
}

