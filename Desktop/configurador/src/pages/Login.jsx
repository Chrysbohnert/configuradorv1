import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UnifiedHeader from '../components/UnifiedHeader';
import GuindasteLoading from '../components/GuindasteLoading';
import { db, supabase } from '../config/supabase';
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

      // Buscar usuário diretamente no banco
      const users = await db.getUsers();
      const user = users.find(u => u.email === email && u.senha === senha);

      if (user) {
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