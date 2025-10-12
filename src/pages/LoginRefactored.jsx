/**
 * 🔐 Login Refatorado - Prioriza Supabase Auth
 * 
 * Sistema híbrido que:
 * 1. Tenta login via Supabase Auth (prioridade)
 * 2. Fallback para autenticação local (compatibilidade)
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UnifiedHeader from '../components/UnifiedHeader';
import { db, supabase } from '../config/supabase';
import { verifyPassword } from '../utils/passwordHash';
import { checkLoginLimit, recordLoginAttempt, getClientIP } from '../utils/rateLimiter';
import '../styles/Login.css';

const LoginRefactored = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    senha: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  /**
   * Login via Supabase Auth (Método Principal)
   */
  const loginWithSupabaseAuth = async (email, password) => {
    try {
      console.log('🔐 Tentando login via Supabase Auth...');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) {
        console.log('⚠️ Falha no Supabase Auth:', error.message);
        return { success: false, error };
      }

      if (data.user) {
        console.log('✅ Login Supabase Auth bem-sucedido!');
        
        // Extrair metadados do usuário
        const userMetadata = data.user.user_metadata || {};
        const userType = userMetadata.tipo || 'vendedor'; // Default
        
        // Salvar dados no localStorage (para compatibilidade)
        const userData = {
          id: data.user.id,
          email: data.user.email,
          nome: userMetadata.nome || data.user.email,
          tipo: userType
        };
        
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('authToken', `supabase_${Date.now()}`);
        localStorage.setItem('supabaseSession', 'active');
        
        return {
          success: true,
          user: userData,
          tipo: userType
        };
      }

      return { success: false, error: 'Usuário não encontrado' };
      
    } catch (error) {
      console.error('❌ Erro no Supabase Auth:', error);
      return { success: false, error };
    }
  };

  /**
   * Login via Banco Local (Fallback)
   */
  const loginWithLocalAuth = async (email, senha) => {
    try {
      console.log('🔄 Tentando fallback para autenticação local...');
      
      // Buscar usuário no banco
      const users = await db.getUsers();
      const user = users.find(u => u.email === email);

      if (!user) {
        console.log('❌ Usuário não encontrado no banco local');
        return { success: false, error: 'Email não encontrado' };
      }

      // Verificar senha
      const isValidPassword = verifyPassword(senha, user.senha);
      
      if (!isValidPassword) {
        console.log('❌ Senha incorreta');
        return { success: false, error: 'Senha incorreta' };
      }

      console.log('✅ Login local bem-sucedido!');
      console.log('⚠️ AVISO: Este usuário ainda não foi migrado para Supabase Auth');
      
      // Salvar dados (sem senha)
      const { senha: _, ...userWithoutPassword } = user;
      localStorage.setItem('user', JSON.stringify(userWithoutPassword));
      localStorage.setItem('authToken', `local_${Date.now()}`);
      
      return {
        success: true,
        user: userWithoutPassword,
        tipo: user.tipo,
        needsMigration: true
      };
      
    } catch (error) {
      console.error('❌ Erro na autenticação local:', error);
      return { success: false, error };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { email, senha } = formData;
      
      // Validação
      if (!email || !senha) {
        setError('Por favor, preencha todos os campos');
        setIsLoading(false);
        return;
      }

      // Verificar rate limiting
      const clientIP = getClientIP();
      const rateLimitCheck = checkLoginLimit(clientIP, email);
      
      if (!rateLimitCheck.allowed) {
        const timeRemaining = Math.ceil((rateLimitCheck.resetTime - Date.now()) / 60000);
        setError(`Muitas tentativas de login. Tente novamente em ${timeRemaining} minutos.`);
        setIsLoading(false);
        return;
      }

      // ========================================
      // ESTRATÉGIA: Supabase Auth PRIMEIRO
      // ========================================
      
      // 1. Tentar Supabase Auth
      const supabaseResult = await loginWithSupabaseAuth(email, senha);
      
      if (supabaseResult.success) {
        // ✅ Login Supabase bem-sucedido
        recordLoginAttempt(clientIP, email, true);
        
        // Redirecionar baseado no tipo
        if (supabaseResult.tipo === 'admin') {
          navigate('/dashboard-admin');
        } else {
          navigate('/dashboard');
        }
        return;
      }

      // 2. Se falhou, tentar Fallback Local
      console.log('🔄 Supabase Auth falhou, tentando fallback local...');
      const localResult = await loginWithLocalAuth(email, senha);
      
      if (localResult.success) {
        // ✅ Login local bem-sucedido
        recordLoginAttempt(clientIP, email, true);
        
        // Avisar sobre necessidade de migração
        if (localResult.needsMigration) {
          console.warn('⚠️ IMPORTANTE: Este usuário precisa ser migrado para Supabase Auth');
          console.warn('Execute: await migrateUsers() no console');
        }
        
        // Redirecionar
        if (localResult.tipo === 'admin') {
          navigate('/dashboard-admin');
        } else {
          navigate('/dashboard');
        }
        return;
      }

      // ❌ Ambos falharam
      recordLoginAttempt(clientIP, email, false);
      setError(localResult.error || 'Email ou senha incorretos');
      
    } catch (error) {
      console.error('❌ Erro no login:', error);
      setError('Erro ao fazer login. Tente novamente.');
      
      const clientIP = getClientIP();
      recordLoginAttempt(clientIP, formData.email, false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <UnifiedHeader />
      
      <div className="login-container">
        <div className="login-box">
          <div className="login-header">
            <h1>Login</h1>
            <p>Acesse o sistema de configuração</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="seu@email.com"
                disabled={isLoading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="senha">Senha</label>
              <input
                type="password"
                id="senha"
                value={formData.senha}
                onChange={(e) => handleInputChange('senha', e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
                required
              />
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              className="login-button"
              disabled={isLoading}
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="login-footer">
            <p className="auth-info">
              🔐 Sistema com Supabase Auth
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginRefactored;

