import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UnifiedHeader from '../components/UnifiedHeader';
import GuindasteLoading from '../components/GuindasteLoading';
import { db } from '../config/supabase';
import { formatCurrency } from '../utils/formatters';
import '../styles/Dashboard.css';

const DashboardAdmin = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalVendedores: 0,
    totalPedidos: 0,
    valorTotal: 0,
    totalGuindastes: 0
  });
  const [topVendedores, setTopVendedores] = useState([]);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      navigate('/');
      return;
    }

    loadDashboardData();
  }, [navigate]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Carregar dados do banco
      const [users, pedidos, guindastes] = await Promise.all([
        db.getUsers(),
        db.getPedidos(),
        db.getGuindastes()
      ]);

      // Filtrar apenas vendedores
      const vendedores = users.filter(u => u.tipo === 'vendedor');
      
      // Calcular estatísticas
      const valorTotal = pedidos.reduce((total, pedido) => total + (pedido.valor_total || 0), 0);
      
      // Criar top vendedores (simulado por enquanto)
      const topVendedoresData = vendedores.slice(0, 4).map(vendedor => ({
        nome: vendedor.nome,
        vendas: Math.floor(Math.random() * 15) + 1, // Simulado
        valor: Math.floor(Math.random() * 500000) + 100000, // Simulado
        avatar: vendedor.nome.split(' ').map(n => n[0]).join('').toUpperCase()
      }));

      setStats({
        totalVendedores: vendedores.length,
        totalPedidos: pedidos.length,
        valorTotal: valorTotal,
        totalGuindastes: guindastes.length
      });

      setTopVendedores(topVendedoresData);
      
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
      alert('Erro ao carregar dados. Verifique a conexão com o banco.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };



  if (isLoading) {
    return <GuindasteLoading text="Carregando dashboard..." />;
  }

  if (!user) {
    return <GuindasteLoading text="Verificando usuário..." />;
  }

  return (
    <div className="dashboard-container">
      <UnifiedHeader 
        showBackButton={false}
        showSupportButton={true}
        showUserInfo={true}
        user={user}
        title="Dashboard Admin"
        subtitle="Painel Administrativo"
      />

      <div className="dashboard-content">
        <div className="dashboard-header">
          <div className="welcome-section">
            <h1>Bem-vindo, {user.nome}!</h1>
            <p>Gerencie vendedores, guindastes e monitore vendas</p>
          </div>
          
          <div className="user-actions">
            <button onClick={handleLogout} className="logout-btn">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
              </svg>
              Sair
            </button>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
            <div className="stat-info">
              <div className="stat-value">{stats.totalVendedores}</div>
              <div className="stat-label">Vendedores</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
              </svg>
            </div>
            <div className="stat-info">
              <div className="stat-value">{stats.totalPedidos}</div>
              <div className="stat-label">Total de Pedidos</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
              </svg>
            </div>
            <div className="stat-info">
              <div className="stat-value">{formatCurrency(stats.valorTotal)}</div>
              <div className="stat-label">Valor Total</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div className="stat-info">
              <div className="stat-value">{stats.totalGuindastes}</div>
              <div className="stat-label">Guindastes</div>
            </div>
          </div>
        </div>

        <div className="admin-sections">
          <div className="top-vendedores-section">
            <h2>Top Vendedores</h2>
            <div className="vendedores-list">
              {topVendedores.map((vendedor, index) => (
                <div key={index} className="vendedor-card">
                  <div className="vendedor-info">
                    <div className="vendedor-avatar">
                      {vendedor.avatar}
                    </div>
                    <div className="vendedor-details">
                      <div className="vendedor-name">{vendedor.nome}</div>
                      <div className="vendedor-stats">
                        <span>{vendedor.vendas} vendas realizadas</span>
                        <span className="vendedor-value">{formatCurrency(vendedor.valor)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="vendedor-actions">
                    <button className="action-btn">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                      </svg>
                      Ver Detalhes | Relatório
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="admin-actions">
            <h2>Gerenciamento</h2>
            <div className="actions-grid">
              <div className="action-card" onClick={() => navigate('/gerenciar-vendedores')}>
                <div className="action-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
                <div className="action-content">
                  <h3>Gerenciar Vendedores</h3>
                  <p>Cadastrar, editar e remover vendedores</p>
                </div>
              </div>

              <div className="action-card" onClick={() => navigate('/gerenciar-guindastes')}>
                <div className="action-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                </div>
                <div className="action-content">
                  <h3>Gerenciar Guindastes</h3>
                  <p>Cadastrar, editar e configurar guindastes</p>
                </div>
              </div>

              <div className="action-card" onClick={() => navigate('/relatorios')}>
                <div className="action-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                  </svg>
                </div>
                <div className="action-content">
                  <h3>Relatórios</h3>
                  <p>Gerar relatórios de vendas e performance</p>
                </div>
              </div>

              <div className="action-card" onClick={() => navigate('/suporte')}>
                <div className="action-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <div className="action-content">
                  <h3>Suporte</h3>
                  <p>Acessar sistema de suporte</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardAdmin; 