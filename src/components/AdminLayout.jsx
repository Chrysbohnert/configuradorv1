import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import AdminNavigation from './AdminNavigation';
import '../styles/AdminLayout.css';

const AdminLayout = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      // Verificar se é admin
      if (parsedUser.tipo === 'admin') {
        setUser(parsedUser);
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

