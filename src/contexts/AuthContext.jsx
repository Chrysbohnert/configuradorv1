import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, db } from '../config/supabase';
import { verifyPassword } from '../utils/passwordHash';
import { debugLogin } from '../utils/debugAuth';
import { checkLoginLimit, recordLoginAttempt, getClientIP } from '../utils/rateLimiter';

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

  // Carregar usuário do localStorage na inicialização
  useEffect(() => {
    const loadUser = () => {
      try {
        const userData = localStorage.getItem('user');
        const authToken = localStorage.getItem('authToken');
        
        if (userData && authToken) {
          // Validar se o token não expirou (24 horas)
          const tokenParts = authToken.split('_');
          if (tokenParts.length === 3) {
            const tokenTime = parseInt(tokenParts[1]);
            const currentTime = Date.now();
            const tokenAge = currentTime - tokenTime;
            const maxAge = 24 * 60 * 60 * 1000; // 24 horas
            
            if (tokenAge <= maxAge) {
              setUser(JSON.parse(userData));
            } else {
              // Token expirado, limpar
              localStorage.removeItem('user');
              localStorage.removeItem('authToken');
            }
          }
        }
      } catch (err) {
        console.error('Erro ao carregar usuário:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  // Função de login
  const login = useCallback(async (email, senha) => {
    setLoading(true);
    setError(null);

    try {
      // Validação simples
      if (!email || !senha) {
        throw new Error('Por favor, preencha todos os campos');
      }

      // Verificar rate limiting
      const clientIP = getClientIP();
      const rateLimitCheck = checkLoginLimit(clientIP, email);
      
      if (!rateLimitCheck.allowed) {
        const timeRemaining = Math.ceil((rateLimitCheck.resetTime - Date.now()) / 60000);
        throw new Error(`Muitas tentativas de login. Tente novamente em ${timeRemaining} minutos.`);
      }

      // Primeiro, tentar login no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: senha
      });

      if (authError) {
        console.log('🔄 Tentando fallback para banco local...');
        
        // Debug detalhado do login
        const debugResult = await debugLogin(email, senha);
        
        if (debugResult.user && debugResult.isValidPassword) {
          console.log('✅ Login via fallback bem-sucedido!');
          
          // Login direto no banco (fallback) - senha verificada com hash
          const { senha: _, ...userWithoutPassword } = debugResult.user;
          
          // Salvar no localStorage
          localStorage.setItem('user', JSON.stringify(userWithoutPassword));
          localStorage.setItem('authToken', `auth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
          
          // Atualizar estado
          setUser(userWithoutPassword);
          
          // Registrar tentativa bem-sucedida
          recordLoginAttempt(clientIP, email, true);
          
          return { success: true, user: userWithoutPassword };
        } else {
          // Registrar tentativa falhada
          recordLoginAttempt(clientIP, email, false);
          
          if (!debugResult.user) {
            throw new Error('Email não encontrado no sistema');
          } else if (!debugResult.isValidPassword) {
            if (!debugResult.isHashed) {
              throw new Error('Senha em formato antigo. Execute a migração de senhas.');
            } else {
              throw new Error('Senha incorreta');
            }
          } else {
            throw new Error('Erro ao fazer login');
          }
        }
      }

      // Login via Supabase Auth bem-sucedido
      console.log('✅ Login via Supabase Auth bem-sucedido!');
      
      // Buscar dados completos do usuário no banco
      const { data: users, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (dbError || !users) {
        throw new Error('Usuário não encontrado no banco de dados');
      }

      const { senha: _, ...userWithoutPassword } = users;
      
      // Salvar no localStorage
      localStorage.setItem('user', JSON.stringify(userWithoutPassword));
      localStorage.setItem('authToken', authData.session.access_token);
      localStorage.setItem('supabaseSession', 'active');
      
      // Atualizar estado
      setUser(userWithoutPassword);
      
      // Registrar tentativa bem-sucedida
      recordLoginAttempt(clientIP, email, true);
      
      return { success: true, user: userWithoutPassword };

    } catch (err) {
      console.error('Erro no login:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Função de logout
  const logout = useCallback(async () => {
    try {
      // Fazer logout no Supabase
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Erro ao fazer logout no Supabase:', err);
    } finally {
      // Limpar localStorage
      localStorage.removeItem('user');
      localStorage.removeItem('authToken');
      localStorage.removeItem('carrinho');
      localStorage.removeItem('supabaseSession');
      
      // Limpar estado
      setUser(null);
      setError(null);
    }
  }, []);

  // Verificar se é admin
  const isAdmin = useCallback(() => {
    return user?.tipo === 'admin';
  }, [user]);

  // Verificar se é vendedor
  const isVendedor = useCallback(() => {
    return user?.tipo === 'vendedor';
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
