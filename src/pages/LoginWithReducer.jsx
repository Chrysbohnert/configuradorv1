import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLogin } from '../hooks/useLogin';
import { checkLoginLimit, recordLoginAttempt, getClientIP } from '../utils/rateLimiter';
import { showError } from '../utils/errorHandler';
import { debugAuth } from '../utils/debugAuth';
import { supabase } from '../config/supabase';
import '../styles/Login.css';

/**
 * Versão do Login usando useReducer para gerenciar estados complexos
 * Este é um exemplo de como usar o hook useLogin
 */
const LoginWithReducer = () => {
  const navigate = useNavigate();
  
  // Hook personalizado com useReducer
  const {
    state,
    setLoading,
    setError,
    clearError,
    updateFormField,
    setValidationErrors,
    setUser,
    setRateLimit,
    updateRateLimit,
    validateForm,
    canSubmit
  } = useLogin();

  // Verificar se já está logado
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      setUser(user);
      
      // Redirecionar baseado no tipo de usuário
      if (user.tipo === 'admin') {
        navigate('/dashboard-admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [navigate, setUser]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    updateFormField(name, value);
    
    // Limpar erro do campo quando usuário digita
    if (state.validationErrors[name]) {
      setValidationErrors({
        ...state.validationErrors,
        [name]: ''
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    clearError();

    try {
      // Validar formulário
      if (!validateForm()) {
        setLoading(false);
        return;
      }

      const { email, senha } = state.formData;

      // Verificar rate limiting
      const clientIP = getClientIP();
      const rateLimitCheck = checkLoginLimit(clientIP, email);

      if (!rateLimitCheck.allowed) {
        const timeRemaining = Math.ceil((rateLimitCheck.resetTime - Date.now()) / 60000);
        setError(`Muitas tentativas de login. Tente novamente em ${timeRemaining} minutos.`);
        setLoading(false);
        return;
      }

      // Tentar login com Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: senha
      });

      if (authError) {
        // Fallback para autenticação local
        const debugResult = await debugAuth(email, senha);
        
        if (debugResult.user && debugResult.isValidPassword) {
          // Login bem-sucedido
          const user = {
            id: debugResult.user.id,
            nome: debugResult.user.nome,
            email: debugResult.user.email,
            tipo: debugResult.user.tipo,
            regiao: debugResult.user.regiao
          };
          
          localStorage.setItem('user', JSON.stringify(user));
          setUser(user);
          
          // Registrar tentativa bem-sucedida
          recordLoginAttempt(clientIP, email, true);
          
          // Redirecionar baseado no tipo
          if (user.tipo === 'admin') {
            navigate('/dashboard-admin');
          } else {
            navigate('/dashboard');
          }
        } else {
          // Login falhou
          setError('Email ou senha incorretos');
          recordLoginAttempt(clientIP, email, false);
        }
      } else {
        // Login bem-sucedido com Supabase Auth
        const user = {
          id: authData.user.id,
          nome: authData.user.user_metadata?.nome || 'Usuário',
          email: authData.user.email,
          tipo: authData.user.user_metadata?.tipo || 'vendedor',
          regiao: authData.user.user_metadata?.regiao || 'N/A'
        };
        
        localStorage.setItem('user', JSON.stringify(user));
        setUser(user);
        
        // Registrar tentativa bem-sucedida
        recordLoginAttempt(clientIP, email, true);
        
        // Redirecionar baseado no tipo
        if (user.tipo === 'admin') {
          navigate('/dashboard-admin');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (error) {
      const errorInfo = showError(error, 'Login');
      setError(errorInfo.message);
      
      // Registrar tentativa falhada
      const clientIP = getClientIP();
      recordLoginAttempt(clientIP, state.formData.email, false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-form">
        <div className="login-header">
          <h1>Sistema de Orçamentos</h1>
          <p>Faça login para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={state.formData.email}
              onChange={handleInputChange}
              className={state.validationErrors.email ? 'error' : ''}
              placeholder="Digite seu email"
              disabled={state.isLoading}
            />
            {state.validationErrors.email && (
              <span className="error-message">{state.validationErrors.email}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="senha">Senha</label>
            <input
              type="password"
              id="senha"
              name="senha"
              value={state.formData.senha}
              onChange={handleInputChange}
              className={state.validationErrors.senha ? 'error' : ''}
              placeholder="Digite sua senha"
              disabled={state.isLoading}
            />
            {state.validationErrors.senha && (
              <span className="error-message">{state.validationErrors.senha}</span>
            )}
          </div>

          {state.error && (
            <div className="error-message global-error">
              {state.error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={!canSubmit()}
          >
            {state.isLoading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        {/* Debug Info (apenas em desenvolvimento) */}
        {import.meta.env.DEV && (
          <div className="debug-info" style={{ 
            marginTop: '2rem', 
            padding: '1rem', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '8px',
            fontSize: '0.875rem'
          }}>
            <h4>Debug Info (useReducer):</h4>
            <p><strong>Loading:</strong> {state.isLoading ? 'Sim' : 'Não'}</p>
            <p><strong>Erro:</strong> {state.error || 'Nenhum'}</p>
            <p><strong>Formulário válido:</strong> {state.formData.email && state.formData.senha ? 'Sim' : 'Não'}</p>
            <p><strong>Pode enviar:</strong> {canSubmit() ? 'Sim' : 'Não'}</p>
            <p><strong>Rate limit:</strong> {state.rateLimit.isBlocked ? 'Bloqueado' : 'Liberado'}</p>
            <p><strong>Autenticado:</strong> {state.isAuthenticated ? 'Sim' : 'Não'}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginWithReducer;
