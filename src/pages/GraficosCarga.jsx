import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UnifiedHeader from '../components/UnifiedHeader';
import BlobButton from '../components/BlobButton';
import { db } from '../config/supabase';
import '../styles/GraficosCarga.css';

const GraficosCarga = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
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
        (grafico.nome && grafico.nome.toLowerCase().includes(searchTerm)) ||
        (grafico.modelo && grafico.modelo.toLowerCase().includes(searchTerm)) ||
        (grafico.capacidade && grafico.capacidade.toString().includes(searchTerm))
      );
    });

    setFilteredGraficos(filtered);
  }, [filter, graficos]);

  const handleDownload = async (grafico) => {
    try {
      const response = await fetch(grafico.arquivo_url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${grafico.nome || grafico.modelo}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Erro ao fazer download:', error);
      alert('Erro ao fazer download. Tente usar o botão Visualizar e salvar pelo navegador.');
    }
  };

  if (!user) {
    return null;
  }

  return (
    <>
      <UnifiedHeader 
        showBackButton={true}
        onBackClick={() => navigate('/dashboard')}
        showSupportButton={true}
        showUserInfo={true}
        user={user}
        title="Gráficos de Carga"
        subtitle="Download de gráficos técnicos"
      />

      <div className="gerenciar-graficos-container">
        <div className="gerenciar-content">
          <div className="header-section">
            <div className="header-info">
              <h1>Gráficos de Carga</h1>
              <p>Baixe e visualize os gráficos técnicos dos guindastes</p>
            </div>
            
            <div className="search-box">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
              <input
                type="text"
                placeholder="Buscar por nome ou modelo..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
              <div className="search-stats">
                {filteredGraficos.length}
              </div>
            </div>
          </div>

          <div className="graficos-list">
            {isLoading && graficos.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                  </svg>
                </div>
                <h3>Carregando gráficos</h3>
                <p>Aguarde enquanto buscamos os arquivos técnicos.</p>
              </div>
            ) : filteredGraficos.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                  </svg>
                </div>
                <h3>Nenhum gráfico cadastrado</h3>
                <p>Nenhum gráfico de carga foi encontrado.</p>
              </div>
            ) : (
              <div className="graficos-grid">
                {filteredGraficos.map((grafico) => (
                  <div key={grafico.id} className="grafico-item">
                    <div className="grafico-info">
                      <div className="grafico-header">
                        <div className="grafico-icon">
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                          </svg>
                        </div>
                        <div className="grafico-details">
                          <h3>{grafico.nome || grafico.modelo}</h3>
                          {grafico.arquivo_url && (
                            <a 
                              href={grafico.arquivo_url}
                              target="_blank"
                              rel="noreferrer"
                              className="pdf-chip"
                              title="Abrir PDF em nova aba"
                            >
                              <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 3H5c-1.1 0-2 .9-2 2v14l4-4h12c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
                              </svg>
                              Abrir PDF
                            </a>
                          )}
                        </div>
                      </div>
                      
                      <div className="grafico-meta">
                        <div className="meta-item">
                          <span className="label">Atualizado:</span>
                          <span className="value">
                            {new Date(grafico.updated_at || Date.now()).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grafico-actions">
                      <BlobButton 
                        onClick={() => handleDownload(grafico)}
                        className="edit-btn"
                        title="Baixar gráfico de carga"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                        </svg>
                        Baixar PDF
                      </BlobButton>
                      <BlobButton 
                        onClick={() => window.open(grafico.arquivo_url, '_blank')}
                        className="view-btn"
                        title="Visualizar gráfico de carga"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 10.5a3 3 0 110-6 3 3 0 010 6z"/>
                        </svg>
                        Visualizar
                      </BlobButton>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default GraficosCarga;
