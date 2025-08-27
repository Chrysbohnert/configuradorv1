import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UnifiedHeader from '../components/UnifiedHeader';
import GuindasteLoading from '../components/GuindasteLoading';
import { db } from '../config/supabase';
import '../styles/GerenciarGraficosCarga.css';

const GerenciarGraficosCarga = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [graficos, setGraficos] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingGrafico, setEditingGrafico] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    modelo: '',
    capacidade: '',
    tipo: '',
    lanca: '',
    arquivo: null
  });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const userObj = JSON.parse(userData);
      setUser(userObj);
      
      // Verificar se é admin
      if (userObj.tipo !== 'admin') {
        navigate('/dashboard');
        return;
      }
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
    } catch (error) {
      console.error('Erro ao carregar gráficos:', error);
      alert('Erro ao carregar gráficos. Verifique a conexão com o banco.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);
      
      let arquivoUrl = '';
      
      // Se há um arquivo para upload
      if (formData.arquivo) {
        const fileName = `grafico_${Date.now()}_${formData.arquivo.name}`;
        arquivoUrl = await db.uploadGraficoCarga(formData.arquivo, fileName);
      }
      
      const graficoData = {
        nome: formData.nome,
        modelo: formData.modelo,
        capacidade: parseFloat(formData.capacidade),
        tipo: formData.tipo,
        lanca: formData.lanca,
        arquivo_url: arquivoUrl || editingGrafico?.arquivo_url
      };
      
      if (editingGrafico) {
        await db.updateGraficoCarga(editingGrafico.id, graficoData);
        alert('Gráfico atualizado com sucesso!');
      } else {
        await db.createGraficoCarga(graficoData);
        alert('Gráfico criado com sucesso!');
      }
      
      setShowModal(false);
      setEditingGrafico(null);
      resetForm();
      loadGraficos();
      
    } catch (error) {
      console.error('Erro ao salvar gráfico:', error);
      alert('Erro ao salvar gráfico. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (grafico) => {
    setEditingGrafico(grafico);
    setFormData({
      nome: grafico.nome,
      modelo: grafico.modelo,
      capacidade: grafico.capacidade.toString(),
      tipo: grafico.tipo || '',
      lanca: grafico.lanca || '',
      arquivo: null
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este gráfico?')) {
      return;
    }
    
    try {
      setIsLoading(true);
      await db.deleteGraficoCarga(id);
      alert('Gráfico excluído com sucesso!');
      loadGraficos();
    } catch (error) {
      console.error('Erro ao excluir gráfico:', error);
      alert('Erro ao excluir gráfico. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      modelo: '',
      capacidade: '',
      tipo: '',
      lanca: '',
      arquivo: null
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setFormData(prev => ({ ...prev, arquivo: file }));
    } else {
      alert('Por favor, selecione apenas arquivos PDF.');
      e.target.value = '';
    }
  };

  if (isLoading) {
    return <GuindasteLoading text="Carregando..." />;
  }

  if (!user) {
    return <GuindasteLoading text="Verificando usuário..." />;
  }

  return (
    <div className="gerenciar-graficos-container">
      <UnifiedHeader 
        showBackButton={true}
        onBackClick={() => navigate('/dashboard-admin')}
        showSupportButton={true}
        showUserInfo={true}
        user={user}
        title="Gerenciar Gráficos de Carga"
        subtitle="Upload e gestão de gráficos técnicos"
      />

      <div className="gerenciar-content">
        <div className="header-section">
          <div className="header-info">
            <h1>Gerenciar Gráficos de Carga</h1>
            <p>Faça upload e gerencie os gráficos técnicos dos guindastes</p>
          </div>
          
          <button 
            onClick={() => {
              setEditingGrafico(null);
              resetForm();
              setShowModal(true);
            }}
            className="add-btn"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            Adicionar Gráfico
          </button>
        </div>

        {/* Lista de Gráficos */}
        <div className="graficos-list">
          {graficos.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                </svg>
              </div>
              <h3>Nenhum gráfico cadastrado</h3>
              <p>Clique em "Adicionar Gráfico" para começar</p>
            </div>
          ) : (
            <div className="graficos-grid">
              {graficos.map((grafico) => (
                <div key={grafico.id} className="grafico-item">
                  <div className="grafico-info">
                    <div className="grafico-header">
                      <div className="grafico-icon">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                        </svg>
                      </div>
                      <div className="grafico-details">
                        <h3>{grafico.nome}</h3>
                        <p className="modelo">{grafico.modelo}</p>
                        <span className="capacidade">{grafico.capacidade} Ton</span>
                      </div>
                    </div>
                    
                    <div className="grafico-meta">
                      <div className="meta-item">
                        <span className="label">Tipo:</span>
                        <span className="value">{grafico.tipo || 'Padrão'}</span>
                      </div>
                      <div className="meta-item">
                        <span className="label">Lança:</span>
                        <span className="value">{grafico.lanca || 'N/A'}</span>
                      </div>
                      <div className="meta-item">
                        <span className="label">Atualizado:</span>
                        <span className="value">
                          {new Date(grafico.updated_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grafico-actions">
                    <button 
                      onClick={() => handleEdit(grafico)}
                      className="edit-btn"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                      </svg>
                      Editar
                    </button>
                    
                    <button 
                      onClick={() => handleDelete(grafico.id)}
                      className="delete-btn"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                      </svg>
                      Excluir
                    </button>
                    
                    <button 
                      onClick={() => window.open(grafico.arquivo_url, '_blank')}
                      className="view-btn"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                      </svg>
                      Visualizar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingGrafico ? 'Editar Gráfico' : 'Adicionar Gráfico'}</h2>
              <button 
                onClick={() => setShowModal(false)}
                className="close-btn"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Nome do Gráfico *</label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                    placeholder="Ex: GSI 6.5 - Gráfico de Carga"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Modelo *</label>
                  <input
                    type="text"
                    value={formData.modelo}
                    onChange={(e) => setFormData(prev => ({ ...prev, modelo: e.target.value }))}
                    placeholder="Ex: GSI 6.5"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Capacidade (Ton) *</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.capacidade}
                    onChange={(e) => setFormData(prev => ({ ...prev, capacidade: e.target.value }))}
                    placeholder="Ex: 6.5"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Tipo</label>
                  <input
                    type="text"
                    value={formData.tipo}
                    onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value }))}
                    placeholder="Ex: Padrão, Especial"
                  />
                </div>
                
                <div className="form-group">
                  <label>Lança</label>
                  <input
                    type="text"
                    value={formData.lanca}
                    onChange={(e) => setFormData(prev => ({ ...prev, lanca: e.target.value }))}
                    placeholder="Ex: 12m, 15m"
                  />
                </div>
                
                <div className="form-group full-width">
                  <label>Arquivo PDF *</label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    required={!editingGrafico}
                  />
                  <small>Apenas arquivos PDF são aceitos</small>
                </div>
              </div>
              
              <div className="modal-actions">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="cancel-btn"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="save-btn"
                  disabled={isLoading}
                >
                  {isLoading ? 'Salvando...' : (editingGrafico ? 'Atualizar' : 'Salvar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GerenciarGraficosCarga;
