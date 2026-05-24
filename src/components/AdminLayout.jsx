import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import AdminNavigation from './AdminNavigation';
import WelcomeLoading from './WelcomeLoading';
import { useAuth } from '../contexts/AuthContext';
import '../styles/AdminLayout.css';

const AdminLayout = () => {
  const { user, loading } = useAuth();
  const [showWelcome, setShowWelcome] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      console.warn('Usuário não encontrado, redirecionando para login...');
      navigate('/');
      return;
    }

    if (user.tipo !== 'admin' && user.tipo !== 'admin_concessionaria') {
      console.warn('Usuário não é admin, redirecionando...');
      navigate('/');
      return;
    }

    // Mostrar loading de boas-vindas apenas uma vez por sessão
    const hasShown = sessionStorage.getItem('welcomeShownAdmin');
    if (!hasShown) {
      setShowWelcome(true);
    }
  }, [user, loading, navigate]);

  const handleWelcomeComplete = () => {
    setShowWelcome(false);
    // Marcar como exibido nesta sessão
    sessionStorage.setItem('welcomeShownAdmin', '1');
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Carregando painel admin...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Mostrar loading de boas-vindas
  if (showWelcome) {
    return (
      <WelcomeLoading 
        userName={user.nome || user.email}
        userRole="admin"
        onComplete={handleWelcomeComplete}
      />
    );
  }

  return (
    <div className="admin-layout">
      <AdminNavigation user={user} />
      <div className="admin-content">
        <Outlet context={{ user }} />
      </div>
    </div>
  );
};

export default AdminLayout;

