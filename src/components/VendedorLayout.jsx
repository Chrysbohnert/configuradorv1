import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import VendedorNavigation from './VendedorNavigation';
import '../styles/VendedorLayout.css';

const VendedorLayout = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      // Verificar se é vendedor
      if (parsedUser.tipo === 'vendedor') {
        setUser(parsedUser);
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
