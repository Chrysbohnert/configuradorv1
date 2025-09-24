import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UnifiedHeader from '../components/UnifiedHeader';
import { db } from '../config/supabase';
import { formatCurrency } from '../utils/formatters';
import '../styles/Dashboard.css';

const DashboardVendedor = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({
    totalPedidos: 0,
    valorTotal: 0
  });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      navigate('/');
      return;
    }

    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        
        // Carregar pedidos do vendedor
        const pedidos = await db.getPedidos();
        
        // Filtrar pedidos do usuário atual
        const pedidosDoVendedor = pedidos.filter(pedido => pedido.vendedor_id === user?.id);
        
        // Calcular estatísticas apenas de pedidos finalizados
        const pedidosFinalizados = pedidosDoVendedor.filter(pedido => pedido.status === 'finalizado');
        const valorTotal = pedidosFinalizados.reduce((total, pedido) => total + (pedido.valor_total || 0), 0);

        setStats({
          totalPedidos: pedidosFinalizados.length,
          valorTotal: valorTotal
        });

        // (Removido resumo de pronta-entrega no dashboard)
        
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
        alert('Erro ao carregar dados. Verifique a conexão com o banco.');
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [navigate, user?.id]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="dashboard-container">
      <UnifiedHeader 
        showBackButton={false}
        showSupportButton={true}
        showUserInfo={true}
        user={user}
        title="Dashboard"
        subtitle="Painel do Vendedor"
      />

      <div className="dashboard-content">
        {/* Widget de Pronta Entrega removido conforme solicitação */}
        <div className="dashboard-header">
          <div className="welcome-section">
            <h1>Bem-vindo, {user.nome}!</h1>
            <p>Gerencie seus pedidos e orçamentos</p>
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
        </div>

        <div className="actions-grid">
          <div className="action-card" onClick={() => navigate('/pronta-entrega')}>
            <div className="action-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 8h-3V4H3v13h2a3 3 0 106 0h4a3 3 0 106 0h1V12l-2-4zM7 19a1 1 0 110-2 1 1 0 010 2zm10-9h2.586L21 12h-4V10zM17 19a1 1 0 110-2 1 1 0 010 2z"/>
              </svg>
            </div>
            <div className="action-content">
              <h3>Pronta Entrega</h3>
              <p>Ver equipamentos disponíveis</p>
            </div>
          </div>
          <div className="action-card" onClick={() => navigate('/novo-pedido')}>
            <div className="action-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
            </div>
            <div className="action-content">
              <h3>Novo Pedido</h3>
              <p>Criar orçamento profissional</p>
            </div>
          </div>

          <div className="action-card" onClick={() => navigate('/historico')}>
            <div className="action-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
              </svg>
            </div>
            <div className="action-content">
              <h3>Histórico</h3>
              <p>Ver pedidos anteriores</p>
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
              <p>Precisa de ajuda?</p>
            </div>
          </div>

          <div className="action-card" onClick={() => navigate('/graficos-carga')}>
            <div className="action-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
              </svg>
            </div>
            <div className="action-content">
              <h3>Gráficos de Carga</h3>
              <p>Download de gráficos técnicos</p>
            </div>
          </div>

          <div className="action-card" onClick={() => navigate('/alterar-senha')}>
            <div className="action-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
              </svg>
            </div>
            <div className="action-content">
              <h3>Alterar Senha</h3>
              <p>Atualizar senha de acesso</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardVendedor; 