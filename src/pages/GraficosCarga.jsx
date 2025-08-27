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
        {/* Filtro Simples */}
        <div className="filtro-simples">
          <input
            type="text"
            placeholder="Digite GSI, GSE ou capacidade (ex: 6.5, 8.0, 10.8)"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="filtro-input"
          />
        </div>

        {/* Lista Simples */}
        <div className="graficos-lista">
          {filteredGraficos.length === 0 ? (
            <div className="sem-resultados">
              <p>Nenhum gráfico encontrado</p>
              <small>Tente buscar por GSI, GSE ou capacidade</small>
            </div>
          ) : (
            filteredGraficos.map((grafico) => (
              <div key={grafico.id} className="grafico-item">
                <div className="grafico-info">
                  <h3>{grafico.modelo}</h3>
                  <span className="capacidade">{grafico.capacidade} Ton</span>
                </div>
                <button 
                  onClick={() => handleDownload(grafico)}
                  className="download-btn"
                >
                  📥 Baixar
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default GraficosCarga;
