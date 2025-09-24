import React, { useEffect, useState } from 'react';
import UnifiedHeader from '../components/UnifiedHeader';
import { db } from '../config/supabase';
import '../styles/Dashboard.css';

const ProntaEntrega = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [itens, setItens] = useState([]);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
      loadData();
    } else {
      window.location.href = '/';
    }
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await db.getProntaEntrega();
      setItens(data.filter(i => (i.status || 'disponivel') === 'disponivel'));
    } catch (error) {
      console.error('Erro ao carregar pronta-entrega:', error);
      alert('Erro ao carregar pronta-entrega.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="dashboard-container pronta-compact">
      <UnifiedHeader 
        showBackButton={true}
        showSupportButton={true}
        showUserInfo={true}
        user={user}
        title="Pronta Entrega"
        subtitle="Guindastes disponíveis para venda imediata"
      />

      <div className="dashboard-content">
        <div className="vendedores-list compact-list">
          {itens.map(item => (
            <div key={item.id} className="vendedor-card">
              <div className="vendedor-info">
                <div className="vendedor-details">
                  <div className="vendedor-name">{item.guindaste?.subgrupo} - {item.guindaste?.modelo}</div>
                </div>
              </div>
            </div>
          ))}
          {itens.length === 0 && (
            <div className="vendedor-card">
              <div className="vendedor-info">
                <div className="vendedor-details">
                  <div className="vendedor-name">Nenhum item à pronta-entrega no momento</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProntaEntrega;



