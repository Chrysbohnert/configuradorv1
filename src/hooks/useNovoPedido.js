import { useReducer, useCallback } from 'react';
import { novoPedidoReducer, initialState, actionCreators } from '../reducers/novoPedidoReducer';

/**
 * Hook personalizado para gerenciar estados do NovoPedido
 * @returns {Object} Estado e funções de controle
 */
export const useNovoPedido = () => {
  const [state, dispatch] = useReducer(novoPedidoReducer, initialState);

  // Funções de navegação
  const setCurrentStep = useCallback((step) => {
    dispatch(actionCreators.setCurrentStep(step));
  }, []);

  const nextStep = useCallback(() => {
    dispatch(actionCreators.nextStep());
  }, []);

  const previousStep = useCallback(() => {
    dispatch(actionCreators.previousStep());
  }, []);

  // Funções do usuário
  const setUser = useCallback((user) => {
    dispatch(actionCreators.setUser(user));
  }, []);

  const setLoading = useCallback((loading) => {
    dispatch(actionCreators.setLoading(loading));
  }, []);

  // Funções do cliente
  const setClienteData = useCallback((data) => {
    dispatch(actionCreators.setClienteData(data));
  }, []);

  const updateClienteField = useCallback((field, value) => {
    dispatch(actionCreators.updateClienteField(field, value));
  }, []);

  const setClienteIE = useCallback((temIE) => {
    dispatch(actionCreators.setClienteIE(temIE));
  }, []);

  // Funções do caminhão
  const setCaminhaoData = useCallback((data) => {
    dispatch(actionCreators.setCaminhaoData(data));
  }, []);

  const updateCaminhaoField = useCallback((field, value) => {
    dispatch(actionCreators.updateCaminhaoField(field, value));
  }, []);

  // Funções do carrinho
  const setCarrinho = useCallback((carrinho) => {
    dispatch(actionCreators.setCarrinho(carrinho));
  }, []);

  const addToCarrinho = useCallback((item) => {
    dispatch(actionCreators.addToCarrinho(item));
  }, []);

  const removeFromCarrinho = useCallback((index) => {
    dispatch(actionCreators.removeFromCarrinho(index));
  }, []);

  const updateCarrinhoItem = useCallback((index, updates) => {
    dispatch(actionCreators.updateCarrinhoItem(index, updates));
  }, []);

  const clearCarrinho = useCallback(() => {
    dispatch(actionCreators.clearCarrinho());
  }, []);

  // Funções de pagamento
  const setPagamentoData = useCallback((data) => {
    dispatch(actionCreators.setPagamentoData(data));
  }, []);

  const updatePagamentoField = useCallback((field, value) => {
    dispatch(actionCreators.updatePagamentoField(field, value));
  }, []);

  // Funções de guindastes
  const setGuindastes = useCallback((guindastes) => {
    dispatch(actionCreators.setGuindastes(guindastes));
  }, []);

  const setGuindastesSelecionados = useCallback((guindastes) => {
    dispatch(actionCreators.setGuindastesSelecionados(guindastes));
  }, []);

  const setSelectedCapacidade = useCallback((capacidade) => {
    dispatch(actionCreators.setSelectedCapacidade(capacidade));
  }, []);

  const setSelectedModelo = useCallback((modelo) => {
    dispatch(actionCreators.setSelectedModelo(modelo));
  }, []);

  // Funções de validação
  const setValidationErrors = useCallback((errors) => {
    dispatch(actionCreators.setValidationErrors(errors));
  }, []);

  const clearValidationErrors = useCallback(() => {
    dispatch(actionCreators.clearValidationErrors());
  }, []);

  const updateValidationError = useCallback((field, value) => {
    dispatch(actionCreators.updateValidationError(field, value));
  }, []);

  // Funções de reset
  const resetForm = useCallback(() => {
    dispatch(actionCreators.resetForm());
  }, []);

  const resetStep = useCallback(() => {
    dispatch(actionCreators.resetStep());
  }, []);

  // Funções auxiliares
  const getTotalCarrinho = useCallback(() => {
    return state.carrinho.reduce((total, item) => {
      return total + (item.preco * (item.quantidade || 1));
    }, 0);
  }, [state.carrinho]);

  const canGoNext = useCallback(() => {
    switch (state.currentStep) {
      case 1: // Dados do Cliente
        return state.clienteData.nome && 
               state.clienteData.documento && 
               state.clienteData.telefone;
      case 2: // Dados do Caminhão
        return state.caminhaoData.tipo && 
               state.caminhaoData.marca && 
               state.caminhaoData.modelo;
      case 3: // Carrinho
        return state.carrinho.length > 0;
      case 4: // Pagamento
        return state.pagamentoData.tipoPagamento && 
               state.pagamentoData.prazoPagamento;
      case 5: // Resumo
        return true;
      default:
        return false;
    }
  }, [state.currentStep, state.clienteData, state.caminhaoData, state.carrinho, state.pagamentoData]);

  return {
    // Estado
    state,
    
    // Navegação
    setCurrentStep,
    nextStep,
    previousStep,
    
    // Usuário
    setUser,
    setLoading,
    
    // Cliente
    setClienteData,
    updateClienteField,
    setClienteIE,
    
    // Caminhão
    setCaminhaoData,
    updateCaminhaoField,
    
    // Carrinho
    setCarrinho,
    addToCarrinho,
    removeFromCarrinho,
    updateCarrinhoItem,
    clearCarrinho,
    
    // Pagamento
    setPagamentoData,
    updatePagamentoField,
    
    // Guindastes
    setGuindastes,
    setGuindastesSelecionados,
    setSelectedCapacidade,
    setSelectedModelo,
    
    // Validação
    setValidationErrors,
    clearValidationErrors,
    updateValidationError,
    
    // Reset
    resetForm,
    resetStep,
    
    // Auxiliares
    getTotalCarrinho,
    canGoNext
  };
};
