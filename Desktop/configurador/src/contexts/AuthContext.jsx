import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Tipos de ações
const AUTH_ACTIONS = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  UPDATE_USER: 'UPDATE_USER',
  SET_LOADING: 'SET_LOADING'
};

// Estado inicial
const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null
};

// Reducer para gerenciar estado
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN:
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null
      };
    
    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      };
    
    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      };
    
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };
    
    default:
      return state;
  }
};

// Contexto de autenticação
const AuthContext = createContext();

// Hook personalizado para usar o contexto
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

// Provider do contexto
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Verificar autenticação ao carregar
  useEffect(() => {
    const checkAuth = () => {
      try {
        const userData = localStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          dispatch({ type: AUTH_ACTIONS.LOGIN, payload: user });
        } else {
          dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        localStorage.removeItem('user');
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      }
    };

    checkAuth();
  }, []);

  // Função de login
  const login = async (credentials) => {
    dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
    
    try {
      // Simular chamada de API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock de usuários (substituir por API real)
      const mockUsers = [
        {
          id: 1,
          nome: 'João Silva',
          email: 'joao@empresa.com',
          tipo: 'vendedor',
          avatar: 'JS'
        },
        {
          id: 2,
          nome: 'Maria Santos',
          email: 'maria@empresa.com',
          tipo: 'vendedor',
          avatar: 'MS'
        },
        {
          id: 3,
          nome: 'Admin',
          email: 'admin@empresa.com',
          tipo: 'admin',
          avatar: 'A'
        }
      ];

      const user = mockUsers.find(u => 
        u.email === credentials.email && 
        credentials.password === '123456'
      );

      if (!user) {
        throw new Error('Credenciais inválidas');
      }

      // Salvar no localStorage
      localStorage.setItem('user', JSON.stringify(user));
      
      dispatch({ type: AUTH_ACTIONS.LOGIN, payload: user });
      
      return { success: true, user };
    } catch (error) {
      dispatch({ 
        type: AUTH_ACTIONS.SET_LOADING, 
        payload: false 
      });
      throw error;
    }
  };

  // Função de logout
  const logout = () => {
    localStorage.removeItem('user');
    dispatch({ type: AUTH_ACTIONS.LOGOUT });
  };

  // Função para atualizar dados do usuário
  const updateUser = (updates) => {
    const updatedUser = { ...state.user, ...updates };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    dispatch({ type: AUTH_ACTIONS.UPDATE_USER, payload: updates });
  };

  // Verificar se usuário tem permissão
  const hasPermission = (requiredTypes) => {
    if (!state.isAuthenticated || !state.user) return false;
    return requiredTypes.includes(state.user.tipo);
  };

  const value = {
    ...state,
    login,
    logout,
    updateUser,
    hasPermission
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 