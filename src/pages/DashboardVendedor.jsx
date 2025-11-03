import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import UnifiedHeader from '../components/UnifiedHeader';
import { db } from '../config/supabase';
import { formatCurrency } from '../utils/formatters';
import '../styles/Dashboard.css';
import '../styles/DashboardVendedor.css';

const DashboardVendedor = () => {
  const navigate = useNavigate();
  const { user } = useOutletContext(); // Pega o usuário do VendedorLayout
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({
    totalPedidos: 0,
    valorTotal: 0
  });

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        
        // Carregar propostas do vendedor
        const propostas = await db.getPropostas({ vendedor_id: user?.id });
        
        // Calcular estatísticas do mês atual (apenas propostas finalizadas)
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const propostasFinalizadasMes = propostas.filter(proposta => {
          // Contar apenas propostas finalizadas
          if (proposta.status !== 'finalizado') return false;
          const d = new Date(proposta.data || proposta.created_at);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });
        const valorTotalMes = propostasFinalizadasMes.reduce((total, proposta) => total + (proposta.valor_total || 0), 0);

        console.log('📊 [Dashboard] Propostas finalizadas do mês:', propostasFinalizadasMes.length);
        console.log('💰 [Dashboard] Valor total:', valorTotalMes);

        setStats({
          totalPedidos: propostasFinalizadasMes.length,
          valorTotal: valorTotalMes
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
    localStorage.removeItem('authToken');
    localStorage.removeItem('supabaseSession');
    localStorage.removeItem('carrinho');
    navigate('/');
  };

  if (!user) {
    return null;
  }

  return (
    <>
      <UnifiedHeader
        showBackButton={false}
        showSupportButton={true}
        showUserInfo={true}
        user={user}
        title="Dashboard Vendedor"
        subtitle="Painel de controle do vendedor"
      />
      <div className="dashboard-container">
        <div className="dashboard-content">
          {/* Header de Boas-vindas */}
          <div className="welcome-header">
            <h1>Bem-vindo, {user.nome}!</h1>
            <p>Gerencie seus pedidos e orçamentos</p>
          </div>

          {/* Seção Missão, Visão e Valores */}
          <div className="mvv-grid">
            <div className="mvv-card">
              <div className="mvv-icon info">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm-1 5h2v2h-2V7zm0 4h2v6h-2v-6z"/>
                </svg>
              </div>
              <h3>MISSÃO</h3>
              <p>Tornar eficiente o trabalho no campo e na cidade.</p>
            </div>
            
            <div className="mvv-card">
              <div className="mvv-icon vision">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <h3>VISÃO</h3>
              <p>Ser referência no segmento de elevação e movimentação cargas, através produtos inovadores com alta qualidade, confiabilidade produtividade em todo o território nacional até 2030. Primando por rentabilidade crescimento financeiro da empresa.</p>
            </div>
            
            <div className="mvv-card">
              <div className="mvv-icon values">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2a10 10 0 1010 10A10 10 0 0012 2zm-1 15l-5-5 1.41-1.41L11 13.17l5.59-5.59L18 9z"/>
                </svg>
              </div>
              <h3>VALORES</h3>
              <p>Ambição em fazer o melhor e crescer juntos, com transparência, honestidade e qualidade.</p>
            </div>
          </div>

          {/* Métricas do Vendedor */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                </svg>
              </div>
              <div className="metric-content">
                <div className="metric-value">{stats.totalPedidos}</div>
                <div className="metric-label">PEDIDOS NO MÊS</div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
                </svg>
              </div>
              <div className="metric-content">
                <div className="metric-value">{formatCurrency(stats.valorTotal)}</div>
                <div className="metric-label">VENDAS NO MÊS</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DashboardVendedor;