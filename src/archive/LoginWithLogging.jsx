import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLogger } from '../hooks/useLogger';
import { LOG_CATEGORIES } from '../utils/logger';
import { showError } from '../utils/errorHandler';
import { checkLoginLimit, recordLoginAttempt, getClientIP } from '../utils/rateLimiter';
import { validateEmail, validatePassword } from '../utils/validation';
import { debugLogin } from '../utils/debug/authDebug';
import { supabase } from '../config/supabase';
import '../styles/Login.css';

/**
 * Versão do Login com sistema de logging completo
 * Este é um exemplo de como usar o sistema de logging
 */
const LoginWithLogging = () => {
  const navigate = useNavigate();
  const logger = useLogger('LoginWithLogging', LOG_CATEGORIES.AUTH);
  
  const [formData, setFormData] = useState({
    email: '',
    senha: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Log de ciclo de vida
  useEffect(() => {
    logger.logLifecycle('mounted');
    
    // Log de performance da página
    logger.startTimer('page-load');
    
    return () => {
      logger.logLifecycle('unmounted');
    };
  }, [logger]);

  // Log de mudanças no formulário
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const oldValue = formData[name];
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Log da mudança
    logger.logState(name, oldValue, value);
    
    // Log de interação
    logger.logInteraction('input', 'change', { field: name, value });
  };

  // Log de validação
  const validateForm = () => {
    logger.logDebug('Validating form', { formData });
    
    // Validar email
    if (!validateEmail(formData.email)) {
      logger.logValidation('email', false, 'Email inválido');
      setError('Email inválido');
      return false;
    }
    
    // Validar senha
    if (!validatePassword(formData.senha)) {
      logger.logValidation('password', false, 'Senha inválida');
      setError('Senha inválida');
      return false;
    }
    
    logger.logValidation('form', true, 'Formulário válido');
    return true;
  };

  // Log de tentativa de login
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Log de início do processo
    logger.logUserAction('login-attempt', { email: formData.email });
    logger.startTimer('login-process');
    
    setIsLoading(true);
    setError('');

    try {
      // Validar formulário
      if (!validateForm()) {
        logger.logFailure('form-validation', new Error('Formulário inválido'));
        return;
      }

      // Verificar rate limiting
      const clientIP = getClientIP();
      const rateLimitCheck = checkLoginLimit(clientIP, formData.email);
      
      if (!rateLimitCheck.allowed) {
        const timeRemaining = Math.ceil((rateLimitCheck.resetTime - Date.now()) / 60000);
        const errorMsg = `Muitas tentativas de login. Tente novamente em ${timeRemaining} minutos.`;
        
        logger.logSecurity('rate-limit-exceeded', {
          ip: clientIP,
          email: formData.email,
          timeRemaining
        });
        
        setError(errorMsg);
        setIsLoading(false);
        return;
      }

      // Tentar login com Supabase Auth
      logger.logApi('supabase-auth-login', { email: formData.email });
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.senha
      });

      if (authError) {
        logger.logApi('supabase-auth-failed', { error: authError.message });
        
        // Fallback para autenticação local
        logger.logApi('fallback-auth-start', { email: formData.email });
        const debugResult = await debugLogin(formData.email, formData.senha);
        
        if (debugResult.user && debugResult.isValidPassword) {
          // Login bem-sucedido via fallback
          logger.logSuccess('fallback-login', { 
            userId: debugResult.user.id,
            email: debugResult.user.email 
          });
          
          // Registrar tentativa bem-sucedida
          recordLoginAttempt(clientIP, formData.email, true);
          
          // Navegar baseado no tipo de usuário
          const redirectPath = debugResult.user.tipo === 'admin' ? '/dashboard-admin' : '/dashboard';
          logger.logNavigation('login', redirectPath);
          navigate(redirectPath);
        } else {
          // Login falhou
          logger.logFailure('fallback-login', new Error('Credenciais inválidas'));
          
          // Registrar tentativa falhada
          recordLoginAttempt(clientIP, formData.email, false);
          
          setError('Email ou senha incorretos');
        }
      } else {
        // Login bem-sucedido via Supabase Auth
        logger.logSuccess('supabase-auth-login', { 
          userId: authData.user?.id,
          email: authData.user?.email 
        });
        
        // Registrar tentativa bem-sucedida
        recordLoginAttempt(clientIP, formData.email, true);
        
        // Navegar baseado no tipo de usuário
        const redirectPath = authData.user?.user_metadata?.tipo === 'admin' ? '/dashboard-admin' : '/dashboard';
        logger.logNavigation('login', redirectPath);
        navigate(redirectPath);
      }
      
    } catch (error) {
      // Log de erro
      logger.logError('login-error', 'Erro durante o login', { 
        email: formData.email,
        error: error.message 
      }, error);
      
      const errorInfo = showError(error, 'Login');
      setError(errorInfo.message);
      
      // Registrar tentativa falhada
      const clientIP = getClientIP();
      recordLoginAttempt(clientIP, formData.email, false);
      
    } finally {
      // Finalizar timer
      const duration = logger.endTimer('login-process');
      logger.logPerformance('login-process', duration);
      
      setIsLoading(false);
    }
  };

  // Log de render
  useEffect(() => {
    logger.logRender('state-change');
  });

  return (
    <div className="login-container">
      <div className="login-form">
        <h1 className="login-title">Sistema de Orçamentos</h1>
        <p className="login-subtitle">Faça login para continuar</p>
        
        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="form-input"
              placeholder="seu@email.com"
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="senha" className="form-label">
              Senha
            </label>
            <input
              type="password"
              id="senha"
              name="senha"
              value={formData.senha}
              onChange={handleInputChange}
              className="form-input"
              placeholder="Sua senha"
              required
              disabled={isLoading}
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
          <p className="login-help">
            Problemas para acessar?{' '}
            <a href="/suporte" className="login-link">
              Entre em contato
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginWithLogging;
