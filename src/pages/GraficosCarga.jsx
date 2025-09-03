import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UnifiedHeader from '../components/UnifiedHeader';
import GuindasteLoading from '../components/GuindasteLoading';
import { db } from '../config/supabase';
import '../styles/GraficosCarga.css';

const GraficosCarga = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [graficos, setGraficos] = useState([]);
  const [filteredGraficos, setFilteredGraficos] = useState([]);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      navigate('/');
      return;
    }

    loadGraficos();
  }, [navigate]);

  const loadGraficos = async () => {
    try {
      setIsLoading(true);
      const graficosData = await db.getGraficosCarga();
      setGraficos(graficosData);
      setFilteredGraficos(graficosData);
    } catch (error) {
      console.error('Erro ao carregar gráficos:', error);
      alert('Erro ao carregar gráficos.');
    } finally {
      setIsLoading(false);
    }
  };

  // Filtro simples
  useEffect(() => {
    if (!filter) {
      setFilteredGraficos(graficos);
      return;
    }

    const filtered = graficos.filter(grafico => {
      const searchTerm = filter.toLowerCase();
      return (
        grafico.modelo.toLowerCase().includes(searchTerm) ||
        grafico.capacidade.toString().includes(searchTerm)
      );
    });

    setFilteredGraficos(filtered);
  }, [filter, graficos]);

  const handleDownload = (grafico) => {
    try {
      const link = document.createElement('a');
      link.href = grafico.arquivo_url;
      link.download = `${grafico.modelo}_${grafico.capacidade}ton.pdf`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Erro ao fazer download:', error);
      alert('Erro ao fazer download.');
    }
  };

  if (isLoading) {
    return <GuindasteLoading text="Carregando..." />;
  }

  if (!user) {
    return <GuindasteLoading text="Verificando usuário..." />;
  }

  return (
    <div className="graficos-carga-container">
      <UnifiedHeader 
        showBackButton={true}
        onBackClick={() => navigate('/dashboard')}
        showSupportButton={true}
        showUserInfo={true}
        user={user}
        title="Gráficos de Carga"
        subtitle="Download de gráficos técnicos"
      />

      <div className="graficos-content">
        {/* Header da Busca */}
        <div className="search-header">
          <div className="search-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
          </div>
          <input
            type="text"
            placeholder="🔍 Buscar por modelo (GSI, GSE) ou capacidade..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="search-input"
          />
          <div className="search-stats">
            <span className="stats-badge">
              {filteredGraficos.length} gráfico{filteredGraficos.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Grid de Gráficos */}
        <div className="graficos-grid">
          {filteredGraficos.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                </svg>
              </div>
              <h3>Nenhum gráfico encontrado</h3>
              <p>Tente buscar por outro termo ou verifique a grafia</p>
              <div className="search-suggestions">
                <span className="suggestion-tag">GSI 6.5</span>
                <span className="suggestion-tag">GSE 8.0</span>
                <span className="suggestion-tag">10.8 ton</span>
              </div>
            </div>
          ) : (
            filteredGraficos.map((grafico) => (
              <div key={grafico.id} className="grafico-card">
                <div className="card-header">
                  <div className="modelo-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                    </svg>
                  </div>
                  <div className="modelo-info">
                    <h3 className="modelo-nome">{grafico.nome || grafico.modelo}</h3>
                    <div className="modelo-meta">
                      <span className="capacidade-badge">
                        {grafico.capacidade || 'N/A'} Ton
                      </span>
                      {grafico.tipo && (
                        <span className="tipo-badge">{grafico.tipo}</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="card-actions">
                  <button 
                    onClick={() => handleDownload(grafico)}
                    className="download-button"
                    title="Baixar gráfico de carga"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                    </svg>
                    <span>Baixar PDF</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default GraficosCarga;
