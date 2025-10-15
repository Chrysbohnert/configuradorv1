import React, { useEffect, useState } from 'react';
import UnifiedHeader from '../components/UnifiedHeader';
import { db } from '../config/supabase';
import '../styles/Dashboard.css';

const ProntaEntrega = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [itens, setItens] = useState([]);
  const [descricao, setDescricao] = useState('');

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
      
      // Carregar itens de pronta entrega
      try {
        const data = await db.getProntaEntrega();
        setItens(data.filter(i => (i.status || 'disponivel') === 'disponivel'));
      } catch (error) {
        console.error('Erro ao carregar itens de pronta-entrega:', error);
        // Não bloqueia o carregamento da descrição
      }
      
      // Carregar descrição de pronta entrega
      try {
        const descricaoData = await db.getProntaEntregaDescricao();
        console.log('Descrição carregada:', descricaoData);
        setDescricao(descricaoData?.descricao || '');
      } catch (error) {
        console.error('Erro ao carregar descrição:', error);
        console.error('Detalhes:', error.message);
        // Define vazio se houver erro
        setDescricao('');
      }
    } catch (error) {
      console.error('Erro geral ao carregar pronta-entrega:', error);
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
        {/* Card de Descrição de Pronta Entrega */}
        {descricao && (
          <div style={{
            background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
            borderRadius: 16,
            padding: 24,
            marginBottom: 24,
            border: '2px solid #10b981',
            boxShadow: '0 4px 16px rgba(16, 185, 129, 0.15)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 32 }}>📦</span>
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: '#065f46', margin: 0 }}>
                  Itens Disponíveis em Pronta Entrega
                </h3>
                <p style={{ fontSize: 14, color: '#059669', margin: '4px 0 0 0' }}>
                  Guindastes disponíveis para venda imediata
                </p>
              </div>
            </div>
            <div style={{
              background: '#ffffff',
              borderRadius: 12,
              padding: 16,
              border: '1px solid #d1fae5',
              whiteSpace: 'pre-wrap',
              fontSize: 14,
              lineHeight: 1.6,
              color: '#374151'
            }}>
              {descricao}
            </div>
          </div>
        )}

        {!descricao && (
          <div style={{
            background: '#f9fafb',
            borderRadius: 16,
            padding: 24,
            marginBottom: 24,
            border: '2px dashed #e5e7eb',
            textAlign: 'center'
          }}>
            <span style={{ fontSize: 48, opacity: 0.5 }}>📦</span>
            <p style={{ fontSize: 16, color: '#6b7280', margin: '12px 0 0 0' }}>
              Nenhum item em pronta entrega no momento
            </p>
            <p style={{ fontSize: 14, color: '#9ca3af', margin: '8px 0 0 0' }}>
              Aguarde atualizações do administrador
            </p>
          </div>
        )}

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
        </div>
      </div>
    </div>
  );
};

export default ProntaEntrega;



