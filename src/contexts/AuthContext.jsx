import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { checkLoginLimit, recordLoginAttempt, getClientIP } from '../utils/rateLimiter';

const BASE_URL = 'https://api-pedidos.starkindustrial.ind.br/api/users';

function _clearStorage() {
  localStorage.removeItem('user');
  localStorage.removeItem('authToken');
  localStorage.removeItem('carrinho');
  localStorage.removeItem('rememberMe');
}

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Restaurar sessão: valida token via GET /api/users/me
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${BASE_URL}/me`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setUser(json.data);
            localStorage.setItem('user', JSON.stringify(json.data));
          } else {
            _clearStorage();
          }
        } else {
          _clearStorage();
        }
      } catch (err) {
        console.error('Erro ao restaurar sessão:', err);
        const cached = localStorage.getItem('user');
        if (cached) {
          try { setUser(JSON.parse(cached)); } catch (_) { _clearStorage(); }
        }
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  // Login via REST — POST /api/users/login
  const login = useCallback(async (email, senha) => {
    setLoading(true);
    setError(null);

    try {
      if (!email || !senha) {
        throw new Error('Por favor, preencha todos os campos');
      }

      const clientIP = getClientIP();
      const rateLimitCheck = checkLoginLimit(clientIP, email);
      if (!rateLimitCheck.allowed) {
        const timeRemaining = Math.ceil((rateLimitCheck.resetTime - Date.now()) / 60000);
        throw new Error(`Muitas tentativas de login. Tente novamente em ${timeRemaining} minutos.`);
      }

      const res = await fetch(`${BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        recordLoginAttempt(clientIP, email, false);
        throw new Error(json.error || 'Email ou senha inválidos');
      }

      const { token, user: userData } = json.data;

      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(userData));

      setUser(userData);
      recordLoginAttempt(clientIP, email, true);

      return { success: true, user: userData };

    } catch (err) {
      console.error('Erro no login:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout: limpa localStorage e reseta estado (sem chamada de rede)
  const logout = useCallback(() => {
    _clearStorage();
    setUser(null);
    setError(null);
  }, []);

  // Verificar se é admin
  const isAdmin = useCallback(() => {
    return user?.tipo === 'admin' || user?.tipo === 'admin_concessionaria';
  }, [user]);

  // Verificar se é vendedor
  const isVendedor = useCallback(() => {
    return user?.tipo === 'vendedor' || user?.tipo === 'vendedor_concessionaria' || user?.tipo === 'vendedor_exterior';
  }, [user]);

  // Verificar se está autenticado
  const isAuthenticated = useCallback(() => {
    return !!user;
  }, [user]);

  // Atualizar dados do usuário
  const updateUser = useCallback((userData) => {
    const updatedUser = { ...user, ...userData };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  }, [user]);

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    isAdmin,
    isVendedor,
    isAuthenticated,
    updateUser,
    setError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
