import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const validarConcessionariaAtiva = async (user) => {
    if (!user) return true;

    const isConcessionariaUser = user.tipo === 'admin_concessionaria' || user.tipo === 'vendedor_concessionaria';
    if (!isConcessionariaUser) return true;

    if (!user.concessionaria_id) {
      setError('Usuário de concessionária sem vínculo. Contate o administrador.');
      return false;
    }

    try {
      const c = await db.getConcessionariaById(user.concessionaria_id);
      if (c?.ativo === false) {
        setError('Concessionária inativa. Contate o administrador Stark.');
        return false;
      }
      return true;
    } catch (e) {
      console.error('Erro ao validar concessionária:', e);
      setError('Erro ao validar concessionária. Tente novamente.');
      return false;
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const rawEmail = formData.email;
      const senha = formData.senha;
      const email = (rawEmail || '').trim().toLowerCase();
      
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
        
        // Debug detalhado do login
        const debugResult = await debugLogin(email, senha);
        
        if (debugResult.user && debugResult.isValidPassword) {
          
          // Login direto no banco (fallback) - senha verificada com hash
          const { senha: _, ...userWithoutPassword } = debugResult.user;

          const concessionariaOk = await validarConcessionariaAtiva(userWithoutPassword);
          if (!concessionariaOk) {
            const clientIP = getClientIP();
            recordLoginAttempt(clientIP, email, false);
            setIsLoading(false);
            return;
          }

          localStorage.setItem('user', JSON.stringify(userWithoutPassword));
          localStorage.setItem('authToken', `auth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
          localStorage.setItem('rememberMe', String(rememberMe));
          
          if (debugResult.user.tipo === 'admin' || debugResult.user.tipo === 'admin_concessionaria') {
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

        // Criar/Padronizar token local com expiração (alinha com validateSession)
        const loginTime = Date.now();
        const rand = Math.random().toString(36).substr(2, 9);
        localStorage.setItem('authToken', `auth_${loginTime}_${rand}`);

        // Marcar indicador de sessão Supabase
        localStorage.setItem('supabaseSession', 'active');

        // Buscar dados completos do usuário no banco
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, nome, email, tipo, regiao, concessionaria_id, regioes_operacao, created_at, updated_at')
          .ilike('email', email)
          .single();

        if (!userError && user) {
          // Salvar dados do usuário (sem senha)
          const userWithoutPassword = user;

          const concessionariaOk = await validarConcessionariaAtiva(userWithoutPassword);
          if (!concessionariaOk) {
            try {
              await supabase.auth.signOut();
            } catch (e) {
              console.error('Erro ao signOut:', e);
            }
            const clientIP = getClientIP();
            recordLoginAttempt(clientIP, email, false);
            setIsLoading(false);
            return;
          }

          localStorage.setItem('user', JSON.stringify(userWithoutPassword));
          localStorage.setItem('rememberMe', String(rememberMe));

          if (user.tipo === 'admin' || user.tipo === 'admin_concessionaria') {
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

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setResetSuccess(false);

    try {
      if (!resetEmail) {
        setError('Por favor, digite seu email');
        setIsLoading(false);
        return;
      }

      // Enviar email de recuperação via Supabase Auth
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });

      if (resetError) {
        console.error('Erro ao enviar email:', resetError);
        setError('Erro ao enviar email. Verifique se o email está correto.');
      } else {
        setResetSuccess(true);
        setResetEmail('');
        // Voltar para tela de login após 3 segundos
        setTimeout(() => {
          setShowForgotPassword(false);
          setResetSuccess(false);
        }, 3000);
      }
    } catch (error) {
      console.error('Erro:', error);
      setError('Erro ao processar solicitação. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const bgImage = encodeURI('/páginas do pdf/CAPA-1.jpg');

  return (
    <div className="login-page">
      {/* Painel Esquerdo - Imagem */}
      <div
        className="login-left"
        style={{ backgroundImage: `url("${bgImage}")` }}
      >
        <div className="login-left-overlay" />
      </div>

      {/* Painel Direito - Formulário */}
      <div className="login-right">
        <div className="login-card">
          {/* Logo da marca */}
          <div className="login-brand">
            <span className="brand-stark">STARK</span>
            <span className="brand-guindastes">CONFIGURADOR</span>
          </div>

          {!showForgotPassword ? (
            <>
              <div className="form-header">
                <h2>Acesse sua conta</h2>
                <p>Entre com suas credenciais abaixo.</p>
              </div>

              {error && (
                <div className="error-message">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="email">E-mail</label>
                  <div className="input-wrapper">
                    <span className="input-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="20" height="16" x="2" y="4" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                    </span>
                    <input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="voce@empresa.com"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <div className="label-row">
                    <label htmlFor="senha">Senha</label>
                    <button
                      type="button"
                      className="forgot-link"
                      onClick={() => { setShowForgotPassword(true); setError(''); }}
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                  <div className="input-wrapper">
                    <span className="input-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                    <input
                      id="senha"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.senha}
                      onChange={(e) => handleInputChange('senha', e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      className="eye-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                          <line x1="2" y1="2" x2="22" y2="22" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="remember-row">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span>Manter-me conectado</span>
                  </label>
                </div>

                <button type="submit" className="login-button" disabled={isLoading}>
                  {isLoading ? (
                    <><div className="loading-spinner" />Entrando...</>
                  ) : 'Entrar'}
                </button>
              </form>

              <div className="signup-row">
                Não tem cadastro?{' '}
                <a href="mailto:contato@starkguindastes.com.br">Solicitar acesso</a>
              </div>
            </>
          ) : (
            <>
              <div className="form-header">
                <h2>Recuperar senha</h2>
                <p>Digite seu email para receber o link de recuperação.</p>
              </div>

              {error && (
                <div className="error-message">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {error}
                </div>
              )}

              {resetSuccess && (
                <div className="success-message">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  Email enviado! Verifique sua caixa de entrada.
                </div>
              )}

              <form onSubmit={handleForgotPassword}>
                <div className="form-group">
                  <label htmlFor="reset-email">E-mail</label>
                  <div className="input-wrapper">
                    <span className="input-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="20" height="16" x="2" y="4" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                    </span>
                    <input
                      id="reset-email"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="voce@empresa.com"
                      required
                    />
                  </div>
                  <span className="form-help">Enviaremos um link para redefinir sua senha</span>
                </div>

                <button type="submit" className="login-button" disabled={isLoading}>
                  {isLoading ? (
                    <><div className="loading-spinner" />Enviando...</>
                  ) : 'Enviar Link de Recuperação'}
                </button>

                <button
                  type="button"
                  className="back-btn"
                  onClick={() => { setShowForgotPassword(false); setError(''); setResetSuccess(false); }}
                >
                  ← Voltar para Login
                </button>
              </form>
            </>
          )}
        </div>

        <div className="login-footer">
          © 2026 Stark Guindastes. Todos os direitos reservados.
        </div>
      </div>
    </div>
  );
};

export default Login; 
