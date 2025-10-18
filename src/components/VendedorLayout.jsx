import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import VendedorNavigation from './VendedorNavigation';
import WelcomeLoading from './WelcomeLoading';
import '../styles/VendedorLayout.css';

const VendedorLayout = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      // Verificar se é vendedor
      if (parsedUser.tipo === 'vendedor') {
        setUser(parsedUser);
        // Mostrar loading de boas-vindas apenas uma vez por sessão
        const hasShown = sessionStorage.getItem('welcomeShownVendedor');
        if (!hasShown) {
          setShowWelcome(true);
        }
      } else {
        console.warn('Usuário não é vendedor, redirecionando...');
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
    sessionStorage.setItem('welcomeShownVendedor', '1');
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Carregando dashboard...</p>
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
        userRole="vendedor"
        onComplete={handleWelcomeComplete}
      />
    );
  }

  return (
    <div className="vendedor-layout">
      <VendedorNavigation user={user} />
      <div className="vendedor-content">
        <Outlet context={{ user }} />
      </div>
    </div>
  );
};

export default VendedorLayout;
