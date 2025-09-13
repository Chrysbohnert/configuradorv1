import { useState, useEffect, useCallback } from 'react';
import { getCurrentUser, validateSession } from '../utils/auth';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const checkAuth = useCallback(() => {
    try {
      const currentUser = getCurrentUser();
      const isValid = validateSession();
      
      if (currentUser && isValid) {
        setUser(currentUser);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Erro na verificação de autenticação:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const logout = useCallback(() => {
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    localStorage.removeItem('carrinho');
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated,
    isAdmin: user?.tipo === 'admin',
    isVendedor: user?.tipo === 'vendedor',
    logout,
    refreshAuth: checkAuth
  };
};
