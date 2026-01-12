import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import AdminNavigation from './AdminNavigation';
import WelcomeLoading from './WelcomeLoading';
import '../styles/AdminLayout.css';

const AdminLayout = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      // Verificar se é admin
      if (parsedUser.tipo === 'admin' || parsedUser.tipo === 'admin_concessionaria') {
        setUser(parsedUser);
        // Mostrar loading de boas-vindas apenas uma vez por sessão
        const hasShown = sessionStorage.getItem('welcomeShownAdmin');
        if (!hasShown) {
          setShowWelcome(true);
        }
      } else {
        console.warn('Usuário não é admin, redirecionando...');
        navigate('/');
      }
    } else {
      console.warn('Usuário não encontrado, redirecionando para login...');
      navigate('/');
    }
    setIsLoading(false);
  }, [navigate]);

  const handleWelcomeComplete = () => {
    setShowWelcome(false);
    // Marcar como exibido nesta sessão
    sessionStorage.setItem('welcomeShownAdmin', '1');
  };

  if (isLoading) {
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

