import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminNavigation from '../components/AdminNavigation';
import { db } from '../config/supabase';
import { formatCurrency } from '../utils/formatters';
import '../styles/Dashboard.css';

const DashboardAdmin = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [guindastes, setGuindastes] = useState([]);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      navigate('/');
      return;
    }
  }, [navigate]);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const [usersResp, pedidosResp, guindastesResp] = await Promise.all([
          db.getUsers(),
          db.getPedidos(),
          db.getGuindastes()
        ]);
        setUsers(usersResp);
        setPedidos(pedidosResp);
        setGuindastes(guindastesResp);
      } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
      } finally {
        setIsLoading(false);
      }
    };
    if (user) load();
  }, [user]);

  const kpis = useMemo(() => {
    const totalVendedores = users.filter(u => u.tipo === 'vendedor').length;
    const totalGuindastes = guindastes.length;
    const totalPedidos = pedidos.length;
    const resultado = pedidos.reduce((s, p) => s + (p.valor_total || 0), 0);
    return { totalVendedores, totalGuindastes, totalPedidos, resultado };
  }, [users, pedidos, guindastes]);

  if (!user) return null;

  return (
    <div className="admin-layout">
      <AdminNavigation user={user} />
      <div className="admin-content">
        <div className="dashboard-container">
          <div className="dashboard-content">
            <div className="dashboard-header">
              <div className="welcome-section">
                <h1>Dashboard</h1>
                <p>Resumo geral do sistema</p>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-info">
                  <div className="stat-value">{kpis.totalGuindastes}</div>
                  <div className="stat-label">Guindastes</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-info">
                  <div className="stat-value">{kpis.totalVendedores}</div>
                  <div className="stat-label">Vendedores</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-info">
                  <div className="stat-value">{kpis.totalPedidos}</div>
                  <div className="stat-label">Pedidos</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-info">
                  <div className="stat-value">{formatCurrency(kpis.resultado)}</div>
                  <div className="stat-label">Resultado</div>
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