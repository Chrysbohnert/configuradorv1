import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useAuth } from './AuthContext';

// Tipos de ações
const ORDER_ACTIONS = {
  SET_ORDERS: 'SET_ORDERS',
  ADD_ORDER: 'ADD_ORDER',
  UPDATE_ORDER: 'UPDATE_ORDER',
  DELETE_ORDER: 'DELETE_ORDER',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR'
};

// Estado inicial
const initialState = {
  orders: [],
  isLoading: false,
  error: null,
  currentOrder: null
};

// Reducer para gerenciar estado
const orderReducer = (state, action) => {
  switch (action.type) {
    case ORDER_ACTIONS.SET_ORDERS:
      return {
        ...state,
        orders: action.payload,
        isLoading: false,
        error: null
      };
    
    case ORDER_ACTIONS.ADD_ORDER:
      return {
        ...state,
        orders: [...state.orders, action.payload],
        isLoading: false,
        error: null
      };
    
    case ORDER_ACTIONS.UPDATE_ORDER:
      return {
        ...state,
        orders: state.orders.map(order => 
          order.id === action.payload.id ? action.payload : order
        ),
        isLoading: false,
        error: null
      };
    
    case ORDER_ACTIONS.DELETE_ORDER:
      return {
        ...state,
        orders: state.orders.filter(order => order.id !== action.payload),
        isLoading: false,
        error: null
      };
    
    case ORDER_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };
    
    case ORDER_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };
    
    case ORDER_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };
    
    default:
      return state;
  }
};

// Contexto de pedidos
const OrderContext = createContext();

// Hook personalizado para usar o contexto
export const useOrders = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrders deve ser usado dentro de um OrderProvider');
  }
  return context;
};

// Provider do contexto
export const OrderProvider = ({ children }) => {
  const [state, dispatch] = useReducer(orderReducer, initialState);
  const { user } = useAuth();

  // Carregar pedidos do localStorage
  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user]);

  // Função para carregar pedidos
  const loadOrders = () => {
    try {
      const storedOrders = localStorage.getItem(`orders_${user.id}`);
      if (storedOrders) {
        const orders = JSON.parse(storedOrders);
        dispatch({ type: ORDER_ACTIONS.SET_ORDERS, payload: orders });
      }
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
      dispatch({ type: ORDER_ACTIONS.SET_ERROR, payload: 'Erro ao carregar pedidos' });
    }
  };

  // Função para salvar pedidos no localStorage
  const saveOrders = (orders) => {
    try {
      localStorage.setItem(`orders_${user.id}`, JSON.stringify(orders));
    } catch (error) {
      console.error('Erro ao salvar pedidos:', error);
    }
  };

  // Função para criar novo pedido
  const createOrder = async (orderData) => {
    dispatch({ type: ORDER_ACTIONS.SET_LOADING, payload: true });
    
    try {
      // Simular chamada de API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newOrder = {
        id: `#${Date.now().toString().slice(-6)}`,
        ...orderData,
        vendedor: user.nome,
        vendedorId: user.id,
        status: 'Pendente',
        dataCriacao: new Date().toISOString(),
        dataAtualizacao: new Date().toISOString()
      };

      dispatch({ type: ORDER_ACTIONS.ADD_ORDER, payload: newOrder });
      
      // Salvar no localStorage
      const updatedOrders = [...state.orders, newOrder];
      saveOrders(updatedOrders);
      
      return { success: true, order: newOrder };
    } catch (error) {
      dispatch({ type: ORDER_ACTIONS.SET_ERROR, payload: 'Erro ao criar pedido' });
      throw error;
    }
  };

  // Função para atualizar pedido
  const updateOrder = async (orderId, updates) => {
    dispatch({ type: ORDER_ACTIONS.SET_LOADING, payload: true });
    
    try {
      // Simular chamada de API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const updatedOrder = {
        ...state.orders.find(order => order.id === orderId),
        ...updates,
        dataAtualizacao: new Date().toISOString()
      };

      dispatch({ type: ORDER_ACTIONS.UPDATE_ORDER, payload: updatedOrder });
      
      // Salvar no localStorage
      const updatedOrders = state.orders.map(order => 
        order.id === orderId ? updatedOrder : order
      );
      saveOrders(updatedOrders);
      
      return { success: true, order: updatedOrder };
    } catch (error) {
      dispatch({ type: ORDER_ACTIONS.SET_ERROR, payload: 'Erro ao atualizar pedido' });
      throw error;
    }
  };

  // Função para deletar pedido
  const deleteOrder = async (orderId) => {
    dispatch({ type: ORDER_ACTIONS.SET_LOADING, payload: true });
    
    try {
      // Simular chamada de API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      dispatch({ type: ORDER_ACTIONS.DELETE_ORDER, payload: orderId });
      
      // Salvar no localStorage
      const updatedOrders = state.orders.filter(order => order.id !== orderId);
      saveOrders(updatedOrders);
      
      return { success: true };
    } catch (error) {
      dispatch({ type: ORDER_ACTIONS.SET_ERROR, payload: 'Erro ao deletar pedido' });
      throw error;
    }
  };

  // Função para buscar pedido por ID
  const getOrderById = (orderId) => {
    return state.orders.find(order => order.id === orderId);
  };

  // Função para filtrar pedidos
  const filterOrders = (filters = {}) => {
    let filteredOrders = [...state.orders];

    if (filters.status) {
      filteredOrders = filteredOrders.filter(order => order.status === filters.status);
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredOrders = filteredOrders.filter(order => 
        order.cliente.toLowerCase().includes(searchTerm) ||
        order.modelo.toLowerCase().includes(searchTerm) ||
        order.id.toLowerCase().includes(searchTerm)
      );
    }

    if (filters.dateFrom) {
      filteredOrders = filteredOrders.filter(order => 
        new Date(order.dataCriacao) >= new Date(filters.dateFrom)
      );
    }

    if (filters.dateTo) {
      filteredOrders = filteredOrders.filter(order => 
        new Date(order.dataCriacao) <= new Date(filters.dateTo)
      );
    }

    return filteredOrders;
  };

  // Função para obter estatísticas
  const getOrderStats = () => {
    const total = state.orders.length;
    const aprovados = state.orders.filter(order => order.status === 'Aprovado').length;
    const pendentes = state.orders.filter(order => order.status === 'Pendente').length;
    const cancelados = state.orders.filter(order => order.status === 'Cancelado').length;
    const valorTotal = state.orders.reduce((sum, order) => sum + (order.valor || 0), 0);

    return {
      total,
      aprovados,
      pendentes,
      cancelados,
      valorTotal
    };
  };

  // Função para limpar erro
  const clearError = () => {
    dispatch({ type: ORDER_ACTIONS.CLEAR_ERROR });
  };

  const value = {
    ...state,
    createOrder,
    updateOrder,
    deleteOrder,
    getOrderById,
    filterOrders,
    getOrderStats,
    clearError,
    loadOrders
  };

  return (
    <OrderContext.Provider value={value}>
      {children}
    </OrderContext.Provider>
  );
}; 