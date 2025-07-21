import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { db } from '../config/supabase';
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

  // Carregar pedidos do Supabase ao autenticar
  useEffect(() => {
    if (user) {
      loadOrders();
    }
    // eslint-disable-next-line
  }, [user]);

  // Função para carregar pedidos do Supabase
  const loadOrders = async () => {
    dispatch({ type: ORDER_ACTIONS.SET_LOADING, payload: true });
    try {
      const pedidos = await db.getPedidos();
      // Filtrar pedidos do usuário, se necessário
      const userPedidos = user && user.tipo === 'vendedor'
        ? pedidos.filter(p => p.vendedor_id === user.id)
        : pedidos;
      dispatch({ type: ORDER_ACTIONS.SET_ORDERS, payload: userPedidos });
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
      dispatch({ type: ORDER_ACTIONS.SET_ERROR, payload: 'Erro ao carregar pedidos' });
    }
  };

  // Função para criar novo pedido no Supabase
  const createOrder = async (orderData) => {
    dispatch({ type: ORDER_ACTIONS.SET_LOADING, payload: true });
    try {
      const newOrder = await db.createPedido(orderData);
      dispatch({ type: ORDER_ACTIONS.ADD_ORDER, payload: newOrder });
      await loadOrders(); // Atualiza lista
      return { success: true, order: newOrder };
    } catch (error) {
      dispatch({ type: ORDER_ACTIONS.SET_ERROR, payload: 'Erro ao criar pedido' });
      throw error;
    }
  };

  // Função para atualizar pedido no Supabase
  const updateOrder = async (orderId, updates) => {
    dispatch({ type: ORDER_ACTIONS.SET_LOADING, payload: true });
    try {
      const updatedOrder = await db.updatePedido(orderId, updates);
      dispatch({ type: ORDER_ACTIONS.UPDATE_ORDER, payload: updatedOrder });
      await loadOrders();
      return { success: true, order: updatedOrder };
    } catch (error) {
      dispatch({ type: ORDER_ACTIONS.SET_ERROR, payload: 'Erro ao atualizar pedido' });
      throw error;
    }
  };

  // Função para deletar pedido no Supabase
  const deleteOrder = async (orderId) => {
    dispatch({ type: ORDER_ACTIONS.SET_LOADING, payload: true });
    try {
      await db.deletePedido(orderId);
      dispatch({ type: ORDER_ACTIONS.DELETE_ORDER, payload: orderId });
      await loadOrders();
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
        (order.cliente?.nome || '').toLowerCase().includes(searchTerm) ||
        (order.modelo || '').toLowerCase().includes(searchTerm) ||
        (order.id || '').toLowerCase().includes(searchTerm)
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
    const valorTotal = state.orders.reduce((sum, order) => sum + (order.valor_total || 0), 0);
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