import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UnifiedHeader from '../components/UnifiedHeader';
import { db, supabase } from '../config/supabase';
import { verifyPassword } from '../utils/passwordHash';
import { showError } from '../utils/errorHandler';
import { debugLogin } from '../utils/debug/authDebug';
import { checkLoginLimit, recordLoginAttempt, getClientIP } from '../utils/rateLimiter';
import '../styles/Login.css';

const Login = () => {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { email, senha } = formData;
      
      // Validação simples
      if (!email || !senha) {
        setError('Por favor, preencha todos os campos');
        setIsLoading(false);
        return;
      }

      // Verificar rate limiting
      const clientIP = getClientIP();
      const rateLimitCheck = checkLoginLimit(clientIP, email);
      
      if (!rateLimitCheck.allowed) {
        const resetTime = new Date(rateLimitCheck.resetTime);
        const timeRemaining = Math.ceil((rateLimitCheck.resetTime - Date.now()) / 60000);
        
        setError(`Muitas tentativas de login. Tente novamente em ${timeRemaining} minutos.`);
        setIsLoading(false);
        return;
      }

      // Primeiro, fazer login no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: senha
      });

      if (authError) {
        console.error('Erro no Supabase Auth:', authError);
        console.log('🔄 Tentando fallback para banco local...');
        
        // Debug detalhado do login
        const debugResult = await debugLogin(email, senha);
        
        if (debugResult.user && debugResult.isValidPassword) {
          console.log('✅ Login via fallback bem-sucedido!');
          
          // Login direto no banco (fallback) - senha verificada com hash
          const { senha: _, ...userWithoutPassword } = debugResult.user;
          localStorage.setItem('user', JSON.stringify(userWithoutPassword));
          localStorage.setItem('authToken', `auth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
          
          if (debugResult.user.tipo === 'admin') {
            // Registrar tentativa bem-sucedida
            const clientIP = getClientIP();
            recordLoginAttempt(clientIP, email, true);
            navigate('/dashboard-admin');
          } else {
            // Registrar tentativa bem-sucedida
            const clientIP = getClientIP();
            recordLoginAttempt(clientIP, email, true);
            navigate('/dashboard');
          }
        } else {
          console.log('❌ Fallback falhou:', debugResult);
          
          // Registrar tentativa falhada
          const clientIP = getClientIP();
          recordLoginAttempt(clientIP, email, false);
          
          if (!debugResult.user) {
            setError('Email não encontrado no sistema');
          } else if (!debugResult.isValidPassword) {
            if (!debugResult.isHashed) {
              setError('Senha em formato antigo. Execute a migração de senhas.');
            } else {
              setError('Senha incorreta');
            }
          } else {
            setError('Erro interno. Tente novamente.');
          }
        }
      } else {
        // Login no Supabase Auth bem-sucedido
        console.log('✅ Login no Supabase Auth realizado');

        // Criar/Padronizar token local com expiração (alinha com validateSession)
        const loginTime = Date.now();
        const rand = Math.random().toString(36).substr(2, 9);
        localStorage.setItem('authToken', `auth_${loginTime}_${rand}`);

        // Marcar indicador de sessão Supabase
        localStorage.setItem('supabaseSession', 'active');

        // Buscar dados completos do usuário no banco
        const users = await db.getUsers();
        const user = users.find(u => u.email === email);

        if (user) {
          // Salvar dados do usuário (sem senha)
          const { senha: _, ...userWithoutPassword } = user;
          localStorage.setItem('user', JSON.stringify(userWithoutPassword));

          if (user.tipo === 'admin') {
            // Registrar tentativa bem-sucedida
            const clientIP = getClientIP();
            recordLoginAttempt(clientIP, email, true);
            navigate('/dashboard-admin');
          } else {
            // Registrar tentativa bem-sucedida
            const clientIP = getClientIP();
            recordLoginAttempt(clientIP, email, true);
            navigate('/dashboard');
          }
        } else {
          setError('Usuário não encontrado no banco de dados');
        }
      }
    } catch (error) {
      const errorInfo = showError(error, 'Login');
      setError(errorInfo.message);
      
      // Registrar tentativa falhada
      const clientIP = getClientIP();
      recordLoginAttempt(clientIP, formData.email, false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <UnifiedHeader 
        showBackButton={false}
        showSupportButton={true}
        showUserInfo={false}
        title="STARK Orçamento"
        subtitle="Sistema Profissional de Orçamentos"
      />
      
      <div className="login-container">
        <div className="login-card">
          <div className="login-form">
            <div className="form-header">
              <h2>Bem-vindo de volta!</h2>
              <p>Faça login para acessar o sistema</p>
            </div>

            {error && (
              <div className="error-message">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Digite seu email"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="senha">Senha</label>
                <input
                  id="senha"
                  type="password"
                  value={formData.senha}
                  onChange={(e) => handleInputChange('senha', e.target.value)}
                  placeholder="Digite sua senha"
                  required
                />
              </div>

              <button 
                type="submit" 
                className="login-button"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="loading-spinner"></div>
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </button>
            </form>

            {/* Removido: Credenciais de Teste e botões de login rápido */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login; 