/**
 * Reducer para gerenciar estados complexos do NovoPedido
 * @module reducers/novoPedidoReducer
 */

// Tipos de ações
export const NOVO_PEDIDO_ACTIONS = {
  // Navegação
  SET_CURRENT_STEP: 'SET_CURRENT_STEP',
  NEXT_STEP: 'NEXT_STEP',
  PREVIOUS_STEP: 'PREVIOUS_STEP',
  
  // Dados do usuário
  SET_USER: 'SET_USER',
  SET_LOADING: 'SET_LOADING',
  
  // Dados do cliente
  SET_CLIENTE_DATA: 'SET_CLIENTE_DATA',
  UPDATE_CLIENTE_FIELD: 'UPDATE_CLIENTE_FIELD',
  SET_CLIENTE_IE: 'SET_CLIENTE_IE',
  
  // Dados do caminhão
  SET_CAMINHAO_DATA: 'SET_CAMINHAO_DATA',
  UPDATE_CAMINHAO_FIELD: 'UPDATE_CAMINHAO_FIELD',
  
  // Carrinho
  SET_CARRINHO: 'SET_CARRINHO',
  ADD_TO_CARRINHO: 'ADD_TO_CARRINHO',
  REMOVE_FROM_CARRINHO: 'REMOVE_FROM_CARRINHO',
  UPDATE_CARRINHO_ITEM: 'UPDATE_CARRINHO_ITEM',
  CLEAR_CARRINHO: 'CLEAR_CARRINHO',
  
  // Dados de pagamento
  SET_PAGAMENTO_DATA: 'SET_PAGAMENTO_DATA',
  UPDATE_PAGAMENTO_FIELD: 'UPDATE_PAGAMENTO_FIELD',
  
  // Guindastes
  SET_GUINDASTES: 'SET_GUINDASTES',
  SET_GUINDASTES_SELECIONADOS: 'SET_GUINDASTES_SELECIONADOS',
  SET_SELECTED_CAPACIDADE: 'SET_SELECTED_CAPACIDADE',
  SET_SELECTED_MODELO: 'SET_SELECTED_MODELO',
  
  // Validação
  SET_VALIDATION_ERRORS: 'SET_VALIDATION_ERRORS',
  CLEAR_VALIDATION_ERRORS: 'CLEAR_VALIDATION_ERRORS',
  UPDATE_VALIDATION_ERROR: 'UPDATE_VALIDATION_ERROR',
  
  // Reset
  RESET_FORM: 'RESET_FORM',
  RESET_STEP: 'RESET_STEP'
};

// Estado inicial
export const initialState = {
  // Navegação
  currentStep: 1,
  
  // Dados do usuário
  user: null,
  isLoading: false,
  
  // Dados do cliente
  clienteData: {},
  clienteTemIE: true,
  
  // Dados do caminhão
  caminhaoData: {},
  
  // Carrinho
  carrinho: (() => {
    try {
      const savedCart = localStorage.getItem('carrinho');
      return savedCart ? JSON.parse(savedCart) : [];
    } catch (error) {
      console.error('Erro ao carregar carrinho do localStorage:', error);
      return [];
    }
  })(),
  
  // Dados de pagamento
  pagamentoData: {
    tipoPagamento: '',
    prazoPagamento: '',
    desconto: 0,
    acrescimo: 0,
    valorFinal: 0,
    localInstalacao: '',
    tipoInstalacao: ''
  },
  
  // Guindastes
  guindastes: [],
  guindastesSelecionados: [],
  selectedCapacidade: null,
  selectedModelo: null,
  
  // Validação
  validationErrors: {}
};

// Reducer principal
export const novoPedidoReducer = (state, action) => {
  switch (action.type) {
    // Navegação
    case NOVO_PEDIDO_ACTIONS.SET_CURRENT_STEP:
      return {
        ...state,
        currentStep: action.payload
      };
    
    case NOVO_PEDIDO_ACTIONS.NEXT_STEP:
      return {
        ...state,
        currentStep: Math.min(state.currentStep + 1, 5)
      };
    
    case NOVO_PEDIDO_ACTIONS.PREVIOUS_STEP:
      return {
        ...state,
        currentStep: Math.max(state.currentStep - 1, 1)
      };
    
    // Dados do usuário
    case NOVO_PEDIDO_ACTIONS.SET_USER:
      return {
        ...state,
        user: action.payload
      };
    
    case NOVO_PEDIDO_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };
    
    // Dados do cliente
    case NOVO_PEDIDO_ACTIONS.SET_CLIENTE_DATA:
      return {
        ...state,
        clienteData: action.payload
      };
    
    case NOVO_PEDIDO_ACTIONS.UPDATE_CLIENTE_FIELD:
      return {
        ...state,
        clienteData: {
          ...state.clienteData,
          [action.payload.field]: action.payload.value
        }
      };
    
    case NOVO_PEDIDO_ACTIONS.SET_CLIENTE_IE:
      return {
        ...state,
        clienteTemIE: action.payload
      };
    
    // Dados do caminhão
    case NOVO_PEDIDO_ACTIONS.SET_CAMINHAO_DATA:
      return {
        ...state,
        caminhaoData: action.payload
      };
    
    case NOVO_PEDIDO_ACTIONS.UPDATE_CAMINHAO_FIELD:
      return {
        ...state,
        caminhaoData: {
          ...state.caminhaoData,
          [action.payload.field]: action.payload.value
        }
      };
    
    // Carrinho
    case NOVO_PEDIDO_ACTIONS.SET_CARRINHO:
      // Salvar no localStorage
      try {
        localStorage.setItem('carrinho', JSON.stringify(action.payload));
      } catch (error) {
        console.error('Erro ao salvar carrinho no localStorage:', error);
      }
      return {
        ...state,
        carrinho: action.payload
      };
    
    case NOVO_PEDIDO_ACTIONS.ADD_TO_CARRINHO:
      const newCarrinho = [...state.carrinho, action.payload];
      try {
        localStorage.setItem('carrinho', JSON.stringify(newCarrinho));
      } catch (error) {
        console.error('Erro ao salvar carrinho no localStorage:', error);
      }
      return {
        ...state,
        carrinho: newCarrinho
      };
    
    case NOVO_PEDIDO_ACTIONS.REMOVE_FROM_CARRINHO:
      const filteredCarrinho = state.carrinho.filter((_, index) => index !== action.payload);
      try {
        localStorage.setItem('carrinho', JSON.stringify(filteredCarrinho));
      } catch (error) {
        console.error('Erro ao salvar carrinho no localStorage:', error);
      }
      return {
        ...state,
        carrinho: filteredCarrinho
      };
    
    case NOVO_PEDIDO_ACTIONS.UPDATE_CARRINHO_ITEM:
      const updatedCarrinho = state.carrinho.map((item, index) => 
        index === action.payload.index 
          ? { ...item, ...action.payload.updates }
          : item
      );
      try {
        localStorage.setItem('carrinho', JSON.stringify(updatedCarrinho));
      } catch (error) {
        console.error('Erro ao salvar carrinho no localStorage:', error);
      }
      return {
        ...state,
        carrinho: updatedCarrinho
      };
    
    case NOVO_PEDIDO_ACTIONS.CLEAR_CARRINHO:
      try {
        localStorage.removeItem('carrinho');
      } catch (error) {
        console.error('Erro ao limpar carrinho do localStorage:', error);
      }
      return {
        ...state,
        carrinho: []
      };
    
    // Dados de pagamento
    case NOVO_PEDIDO_ACTIONS.SET_PAGAMENTO_DATA:
      return {
        ...state,
        pagamentoData: action.payload
      };
    
    case NOVO_PEDIDO_ACTIONS.UPDATE_PAGAMENTO_FIELD:
      return {
        ...state,
        pagamentoData: {
          ...state.pagamentoData,
          [action.payload.field]: action.payload.value
        }
      };
    
    // Guindastes
    case NOVO_PEDIDO_ACTIONS.SET_GUINDASTES:
      return {
        ...state,
        guindastes: action.payload
      };
    
    case NOVO_PEDIDO_ACTIONS.SET_GUINDASTES_SELECIONADOS:
      return {
        ...state,
        guindastesSelecionados: action.payload
      };
    
    case NOVO_PEDIDO_ACTIONS.SET_SELECTED_CAPACIDADE:
      return {
        ...state,
        selectedCapacidade: action.payload,
        selectedModelo: null // Reset modelo quando capacidade muda
      };
    
    case NOVO_PEDIDO_ACTIONS.SET_SELECTED_MODELO:
      return {
        ...state,
        selectedModelo: action.payload
      };
    
    // Validação
    case NOVO_PEDIDO_ACTIONS.SET_VALIDATION_ERRORS:
      return {
        ...state,
        validationErrors: action.payload
      };
    
    case NOVO_PEDIDO_ACTIONS.CLEAR_VALIDATION_ERRORS:
      return {
        ...state,
        validationErrors: {}
      };
    
    case NOVO_PEDIDO_ACTIONS.UPDATE_VALIDATION_ERROR:
      const newErrors = { ...state.validationErrors };
      if (action.payload.value) {
        newErrors[action.payload.field] = action.payload.value;
      } else {
        delete newErrors[action.payload.field];
      }
      return {
        ...state,
        validationErrors: newErrors
      };
    
    // Reset
    case NOVO_PEDIDO_ACTIONS.RESET_FORM:
      return {
        ...initialState,
        user: state.user // Manter usuário logado
      };
    
    case NOVO_PEDIDO_ACTIONS.RESET_STEP:
      return {
        ...state,
        currentStep: 1
      };
    
    default:
      return state;
  }
};

// Action creators (funções auxiliares)
export const actionCreators = {
  // Navegação
  setCurrentStep: (step) => ({
    type: NOVO_PEDIDO_ACTIONS.SET_CURRENT_STEP,
    payload: step
  }),
  
  nextStep: () => ({
    type: NOVO_PEDIDO_ACTIONS.NEXT_STEP
  }),
  
  previousStep: () => ({
    type: NOVO_PEDIDO_ACTIONS.PREVIOUS_STEP
  }),
  
  // Dados do usuário
  setUser: (user) => ({
    type: NOVO_PEDIDO_ACTIONS.SET_USER,
    payload: user
  }),
  
  setLoading: (loading) => ({
    type: NOVO_PEDIDO_ACTIONS.SET_LOADING,
    payload: loading
  }),
  
  // Dados do cliente
  setClienteData: (data) => ({
    type: NOVO_PEDIDO_ACTIONS.SET_CLIENTE_DATA,
    payload: data
  }),
  
  updateClienteField: (field, value) => ({
    type: NOVO_PEDIDO_ACTIONS.UPDATE_CLIENTE_FIELD,
    payload: { field, value }
  }),
  
  setClienteIE: (temIE) => ({
    type: NOVO_PEDIDO_ACTIONS.SET_CLIENTE_IE,
    payload: temIE
  }),
  
  // Dados do caminhão
  setCaminhaoData: (data) => ({
    type: NOVO_PEDIDO_ACTIONS.SET_CAMINHAO_DATA,
    payload: data
  }),
  
  updateCaminhaoField: (field, value) => ({
    type: NOVO_PEDIDO_ACTIONS.UPDATE_CAMINHAO_FIELD,
    payload: { field, value }
  }),
  
  // Carrinho
  setCarrinho: (carrinho) => ({
    type: NOVO_PEDIDO_ACTIONS.SET_CARRINHO,
    payload: carrinho
  }),
  
  addToCarrinho: (item) => ({
    type: NOVO_PEDIDO_ACTIONS.ADD_TO_CARRINHO,
    payload: item
  }),
  
  removeFromCarrinho: (index) => ({
    type: NOVO_PEDIDO_ACTIONS.REMOVE_FROM_CARRINHO,
    payload: index
  }),
  
  updateCarrinhoItem: (index, updates) => ({
    type: NOVO_PEDIDO_ACTIONS.UPDATE_CARRINHO_ITEM,
    payload: { index, updates }
  }),
  
  clearCarrinho: () => ({
    type: NOVO_PEDIDO_ACTIONS.CLEAR_CARRINHO
  }),
  
  // Dados de pagamento
  setPagamentoData: (data) => ({
    type: NOVO_PEDIDO_ACTIONS.SET_PAGAMENTO_DATA,
    payload: data
  }),
  
  updatePagamentoField: (field, value) => ({
    type: NOVO_PEDIDO_ACTIONS.UPDATE_PAGAMENTO_FIELD,
    payload: { field, value }
  }),
  
  // Guindastes
  setGuindastes: (guindastes) => ({
    type: NOVO_PEDIDO_ACTIONS.SET_GUINDASTES,
    payload: guindastes
  }),
  
  setGuindastesSelecionados: (guindastes) => ({
    type: NOVO_PEDIDO_ACTIONS.SET_GUINDASTES_SELECIONADOS,
    payload: guindastes
  }),
  
  setSelectedCapacidade: (capacidade) => ({
    type: NOVO_PEDIDO_ACTIONS.SET_SELECTED_CAPACIDADE,
    payload: capacidade
  }),
  
  setSelectedModelo: (modelo) => ({
    type: NOVO_PEDIDO_ACTIONS.SET_SELECTED_MODELO,
    payload: modelo
  }),
  
  // Validação
  setValidationErrors: (errors) => ({
    type: NOVO_PEDIDO_ACTIONS.SET_VALIDATION_ERRORS,
    payload: errors
  }),
  
  clearValidationErrors: () => ({
    type: NOVO_PEDIDO_ACTIONS.CLEAR_VALIDATION_ERRORS
  }),
  
  updateValidationError: (field, value) => ({
    type: NOVO_PEDIDO_ACTIONS.UPDATE_VALIDATION_ERROR,
    payload: { field, value }
  }),
  
  // Reset
  resetForm: () => ({
    type: NOVO_PEDIDO_ACTIONS.RESET_FORM
  }),
  
  resetStep: () => ({
    type: NOVO_PEDIDO_ACTIONS.RESET_STEP
  })
};
