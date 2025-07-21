import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UnifiedHeader from '../components/UnifiedHeader';
import GuindasteLoading from '../components/GuindasteLoading';
import { db } from '../config/supabase';
import '../styles/Login.css';

const AlterarSenha = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    senhaAtual: '',
    novaSenha: '',
    confirmarSenha: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      navigate('/');
    }
  }, [navigate]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const { senhaAtual, novaSenha, confirmarSenha } = formData;

      // Validações
      if (!senhaAtual || !novaSenha || !confirmarSenha) {
        setError('Todos os campos são obrigatórios');
        return;
      }

      if (novaSenha.length < 6) {
        setError('A nova senha deve ter pelo menos 6 caracteres');
        return;
      }

      if (novaSenha !== confirmarSenha) {
        setError('As senhas não coincidem');
        return;
      }

      // Buscar usuário atual no banco
      const users = await db.getUsers();
      const currentUser = users.find(u => u.id === user.id);

      if (!currentUser) {
        setError('Usuário não encontrado');
        return;
      }

      // Verificar senha atual
      if (currentUser.senha !== senhaAtual) {
        setError('Senha atual incorreta');
        return;
      }

      // Atualizar senha
      await db.updateUser(user.id, { senha: novaSenha });

      setSuccess('Senha alterada com sucesso!');
      
      // Limpar formulário
      setFormData({
        senhaAtual: '',
        novaSenha: '',
        confirmarSenha: ''
      });

      // Redirecionar após 2 segundos
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      setError('Erro ao alterar senha. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return <GuindasteLoading text="Verificando usuário..." />;
  }

  return (
    <div className="login-page">
      <UnifiedHeader 
        showBackButton={true}
        onBackClick={() => navigate('/dashboard')}
        showSupportButton={true}
        showUserInfo={true}
        user={user}
        title="Alterar Senha"
        subtitle="Atualize sua senha de acesso"
      />
      
      <div className="login-container">
        <div className="login-card">
          <div className="login-form">
            <div className="form-header">
              <h2>Alterar Senha</h2>
              <p>Digite sua senha atual e a nova senha</p>
            </div>

            {error && (
              <div className="error-message">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                {error}
              </div>
            )}

            {success && (
              <div className="success-message">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="senhaAtual">Senha Atual</label>
                <input
                  id="senhaAtual"
                  type="password"
                  value={formData.senhaAtual}
                  onChange={(e) => handleInputChange('senhaAtual', e.target.value)}
                  placeholder="Digite sua senha atual"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="novaSenha">Nova Senha</label>
                <input
                  id="novaSenha"
                  type="password"
                  value={formData.novaSenha}
                  onChange={(e) => handleInputChange('novaSenha', e.target.value)}
                  placeholder="Digite a nova senha"
                  required
                />
                <small>Mínimo 6 caracteres</small>
              </div>

              <div className="form-group">
                <label htmlFor="confirmarSenha">Confirmar Nova Senha</label>
                <input
                  id="confirmarSenha"
                  type="password"
                  value={formData.confirmarSenha}
                  onChange={(e) => handleInputChange('confirmarSenha', e.target.value)}
                  placeholder="Confirme a nova senha"
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
                    Alterando...
                  </>
                ) : (
                  'Alterar Senha'
                )}
              </button>
            </form>

            <div className="form-footer">
              <button 
                type="button" 
                onClick={() => navigate('/dashboard')}
                className="back-btn"
              >
                Voltar ao Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlterarSenha; 