import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UnifiedHeader from '../components/UnifiedHeader';
import GuindasteLoading from '../components/GuindasteLoading';
import { db } from '../config/supabase';
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

      // Buscar usuário no banco de dados
      const users = await db.getUsers();
      const user = users.find(u => u.email === email && u.senha === senha);

      if (user) {
        // Remover senha do objeto antes de salvar no localStorage
        const { senha: _, ...userWithoutPassword } = user;
        localStorage.setItem('user', JSON.stringify(userWithoutPassword));
        
        if (user.tipo === 'admin') {
          navigate('/dashboard-admin');
        } else {
          navigate('/dashboard');
        }
      } else {
        setError('Email ou senha incorretos');
      }
      
    } catch (error) {
      console.error('Erro no login:', error);
      setError('Erro ao fazer login. Verifique a conexão com o banco.');
    } finally {
      setIsLoading(false);
    }
  };

  const quickLogin = async (email, senha, tipo) => {
    setFormData({ email, senha });
    setIsLoading(true);
    
    try {
      const users = await db.getUsers();
      const user = users.find(u => u.email === email && u.senha === senha);

      if (user) {
        const { senha: _, ...userWithoutPassword } = user;
        localStorage.setItem('user', JSON.stringify(userWithoutPassword));
        navigate(tipo === 'admin' ? '/dashboard-admin' : '/dashboard');
      } else {
        setError('Usuário não encontrado no banco de dados');
      }
    } catch (error) {
      console.error('Erro no login rápido:', error);
      setError('Erro ao fazer login. Verifique a conexão com o banco.');
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

            <div className="test-credentials">
              <h3>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                Credenciais de Teste
              </h3>
              
              <div className="credential-group">
                <div className="credential-title">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                  Administrador
                </div>
                <div className="credential-value">admin@starkorcamento.com</div>
                <div className="credential-value">admin123</div>
                <button 
                  className="quick-login-btn admin"
                  onClick={() => quickLogin('admin@starkorcamento.com', 'admin123', 'admin')}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  Login Admin
                </button>
              </div>

              <div className="credential-group">
                <div className="credential-title">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                  Vendedor
                </div>
                <div className="credential-value">vendedor@starkorcamento.com</div>
                <div className="credential-value">vendedor123</div>
                <button 
                  className="quick-login-btn seller"
                  onClick={() => quickLogin('vendedor@starkorcamento.com', 'vendedor123', 'vendedor')}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  Login Vendedor
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login; 