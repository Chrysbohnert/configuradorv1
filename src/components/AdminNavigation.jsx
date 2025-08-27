import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/AdminNavigation.css';

const AdminNavigation = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      path: '/dashboard-admin',
      label: 'Dashboard',
      icon: '📊'
    },
    {
      path: '/gerenciar-vendedores',
      label: 'Gerenciar Vendedores',
      icon: '👥'
    },
    {
      path: '/gerenciar-guindastes',
      label: 'Gerenciar Guindastes',
      icon: '🏗️'
    },
    {
      path: '/gerenciar-graficos-carga',
      label: 'Gerenciar Gráficos',
      icon: '📊'
    },
    {
      path: '/relatorio-completo',
      label: 'Relatório Completo',
      icon: '📈'
    }
  ];

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <div className="admin-navigation">
      <div className="nav-header">
        <div className="admin-info">
          <div className="admin-avatar">
            {user?.nome?.charAt(0).toUpperCase()}
          </div>
          <div className="admin-details">
            <div className="admin-name">{user?.nome}</div>
            <div className="admin-role">Administrador</div>
          </div>
        </div>
      </div>

      <nav className="nav-menu">
        {navItems.map((item) => (
          <button
            key={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="nav-footer">
        <button className="logout-button" onClick={handleLogout}>
          <span className="logout-icon">🚪</span>
          <span>Sair</span>
        </button>
      </div>
    </div>
  );
};

export default AdminNavigation; 