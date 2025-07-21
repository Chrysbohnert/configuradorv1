import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UnifiedHeader from '../components/UnifiedHeader';
import GuindasteLoading from '../components/GuindasteLoading';
import ImageUpload from '../components/ImageUpload';
import { db } from '../config/supabase';
import { formatCurrency } from '../utils/formatters';
import '../styles/GerenciarGuindastes.css';
import PrecosPorRegiaoModal from '../components/PrecosPorRegiaoModal';

const GerenciarGuindastes = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [guindastes, setGuindastes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingGuindaste, setEditingGuindaste] = useState(null);
  const [activeTab, setActiveTab] = useState('guindastes');
  const [formData, setFormData] = useState({
    nome: '',
    modelo: '',
    tipo: 'hidraulico',
    capacidade: '',
    alcance: '',
    altura: '',
    preco: '',
    descricao: '',
    imagem_url: ''
  });
  // Substituir o estado do opcionalFormData por um array de opcionais
  const [opcionaisGuindasteForm, setOpcionaisGuindasteForm] = useState([{ nome: '', preco: '' }]);
  const [showPrecosModal, setShowPrecosModal] = useState(false);
  const [guindasteIdPrecos, setGuindasteIdPrecos] = useState(null);
  const [selectedOpcionais, setSelectedOpcionais] = useState([]);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const userObj = JSON.parse(userData);
      if (userObj.tipo !== 'admin') {
        navigate('/dashboard');
        return;
      }
      setUser(userObj);
    } else {
      navigate('/');
      return;
    }

    loadData();
  }, [navigate]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Carregar guindastes do Supabase
      const guindastesData = await db.getGuindastes();
      setGuindastes(guindastesData);
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      alert('Erro ao carregar dados. Verifique a conexão com o banco.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Função para adicionar novo campo de opcional
  const handleAddOpcionalField = () => {
    setOpcionaisGuindasteForm(prev => [...prev, { nome: '', preco: '' }]);
  };

  // Função para remover campo de opcional
  const handleRemoveOpcionalField = (index) => {
    setOpcionaisGuindasteForm(prev => prev.filter((_, i) => i !== index));
  };

  // Função para atualizar campo
  const handleOpcionalFieldChange = (index, field, value) => {
    setOpcionaisGuindasteForm(prev => prev.map((opc, i) => i === index ? { ...opc, [field]: value } : opc));
  };

  const handleImageUpload = (imageUrl) => {
    setFormData(prev => ({ ...prev, imagem_url: imageUrl }));
  };

  // Novo handleOpcionalSubmit para cadastrar todos de uma vez
  // Remover handleOpcionalSubmit completamente
  // No modal, trocar <form onSubmit={handleOpcionalSubmit}> por <form onSubmit={handleSubmit}>
  // O botão de submit deve ser 'Cadastrar Guindaste' ou 'Salvar Alterações'

  // Ao editar guindaste, buscar opcionais vinculados e preencher campos
  const handleEdit = async (item, type) => {
    if (type === 'guindaste') {
      setEditingGuindaste(item);
      setFormData({
        nome: item.nome,
        modelo: item.modelo,
        tipo: item.tipo,
        capacidade: item.capacidade,
        alcance: item.alcance,
        altura: item.altura || '',
        preco: item.preco.toString(),
        descricao: item.descricao || '',
        imagem_url: item.imagem_url || ''
      });
      try {
        const opcionaisVinculados = await db.getOpcionaisDoGuindaste(item.id);
        if (Array.isArray(opcionaisVinculados) && opcionaisVinculados.length > 0) {
          setOpcionaisGuindasteForm(opcionaisVinculados.map(o => ({ nome: o.nome || '', preco: o.preco || '' })));
        } else {
          setOpcionaisGuindasteForm([{ nome: '', preco: '' }]);
        }
      } catch (err) {
        setOpcionaisGuindasteForm([{ nome: '', preco: '' }]);
      }
      setShowModal(true);
    }
  };

  const handleDelete = async (id, type) => {
    const itemType = type === 'guindaste' ? 'guindaste' : 'opcional';
    if (window.confirm(`Tem certeza que deseja remover este ${itemType}?`)) {
      try {
        if (type === 'guindaste') {
          await db.deleteGuindaste(id);
        } else {
          await db.deleteOpcional(id);
        }
        
        console.log(`✅ ${itemType} removido com sucesso!`);
        await loadData();
        
      } catch (error) {
        console.error(`Erro ao remover ${itemType}:`, error);
        alert(`Erro ao remover ${itemType}. Tente novamente.`);
      }
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingGuindaste(null);
    setFormData({
      nome: '',
      modelo: '',
      tipo: 'hidraulico',
      capacidade: '',
      alcance: '',
      altura: '',
      preco: '',
      descricao: '',
      imagem_url: ''
    });
  };

  // Ao adicionar novo guindaste, limpar opcionais
  const handleAddNew = (type) => {
    if (type === 'guindaste') {
      setEditingGuindaste(null);
      setFormData({
        nome: '',
        modelo: '',
        tipo: 'hidraulico',
        capacidade: '',
        alcance: '',
        altura: '',
        preco: '',
        descricao: '',
        imagem_url: ''
      });
      setOpcionaisGuindasteForm([{ nome: '', preco: '' }]);
      setShowModal(true);
    }
  };

  const getTipoIcon = (tipo) => {
    switch (tipo) {
      case 'hidraulico':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        );
      case 'telescopico':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        );
      case 'torre':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        );
    }
  };

  // Adicionar/garantir a função handleSubmit:
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const guindasteData = {
        ...formData,
        preco: parseFloat(
          String(formData.preco)
            .replace('R$', '')
            .replace(/\./g, '')
            .replace(',', '.')
        ),
        ativo: true,
        opcionais: opcionaisGuindasteForm.filter(opc => opc.nome && opc.preco)
      };
      if (editingGuindaste) {
        await db.updateGuindaste(editingGuindaste.id, guindasteData);
      } else {
        await db.createGuindaste(guindasteData);
      }
      await loadData();
      handleCloseModal();
    } catch (error) {
      console.error('Erro ao salvar guindaste:', error);
      alert('Erro ao salvar guindaste. Tente novamente.');
    }
  };

  if (isLoading) {
    return <GuindasteLoading text="Carregando guindastes..." />;
  }

  if (!user) {
    return <GuindasteLoading text="Verificando usuário..." />;
  }

  return (
    <div className="gerenciar-guindastes-container">
      <UnifiedHeader 
        showBackButton={true}
        onBackClick={() => navigate('/dashboard-admin')}
        showSupportButton={true}
        showUserInfo={true}
        user={user}
        title="Gerenciar Guindastes"
        subtitle="Cadastro e Configuração de Equipamentos"
      />

      <div className="gerenciar-guindastes-content">
        <div className="page-header">
          <div className="header-info">
            <h1>Gerenciar Equipamentos</h1>
            <p>Configure guindastes e opcionais disponíveis</p>
          </div>
        </div>

        <div className="tabs-container">
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'guindastes' ? 'active' : ''}`}
              onClick={() => setActiveTab('guindastes')}
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
              Guindastes
            </button>
          </div>
        </div>

        {activeTab === 'guindastes' && (
          <div className="tab-content">
            <div className="content-header">
              <h2>Guindastes Cadastrados</h2>
              <button onClick={() => handleAddNew('guindaste')} className="add-btn">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                Novo Guindaste
              </button>
            </div>

            <div className="guindastes-grid">
              {guindastes.map((guindaste) => (
                <div key={guindaste.id} className="guindaste-card">
                  <div className="guindaste-header">
                    <div className="guindaste-image">
                      {guindaste.imagem_url ? (
                        <img 
                          src={guindaste.imagem_url} 
                          alt={guindaste.nome}
                          className="guindaste-thumbnail"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className="guindaste-icon" style={{ display: guindaste.imagem_url ? 'none' : 'flex' }}>
                        {getTipoIcon(guindaste.tipo)}
                      </div>
                    </div>
                    <div className="guindaste-info">
                      <h3>{guindaste.nome}</h3>
                      <p>{guindaste.modelo}</p>
                    </div>
                    <div className="guindaste-actions">
                      <button 
                        onClick={() => handleEdit(guindaste, 'guindaste')}
                        className="action-btn edit-btn"
                        title="Editar"
                      >
                        {/* Ícone de lápis */}
                        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                        </svg>
                      </button>
                      <button 
                        onClick={() => handleDelete(guindaste.id, 'guindaste')}
                        className="action-btn delete-btn"
                        title="Remover"
                      >
                        {/* Ícone de X */}
                        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                          <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12l-4.89 4.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.89a1 1 0 0 0 1.41-1.41L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4z"/>
                        </svg>
                      </button>
                      <button
                        className="action-btn"
                        title="Preços por Região"
                        onClick={() => { setGuindasteIdPrecos(guindaste.id); setShowPrecosModal(true); }}
                      >
                        💲
                      </button>
                    </div>
                  </div>
                  
                  <div className="guindaste-details">
                    <div className="detail-row">
                      <span className="detail-label">Tipo:</span>
                      <span className="detail-value">{guindaste.tipo.charAt(0).toUpperCase() + guindaste.tipo.slice(1)}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Capacidade:</span>
                      <span className="detail-value">{guindaste.capacidade}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Alcance:</span>
                      <span className="detail-value">{guindaste.alcance}</span>
                    </div>
                    {guindaste.altura && (
                      <div className="detail-row">
                        <span className="detail-label">Altura:</span>
                        <span className="detail-value">{guindaste.altura}</span>
                      </div>
                    )}
                    <div className="detail-row">
                      <span className="detail-label">Preço:</span>
                      <span className="detail-value price">{formatCurrency(guindaste.preco)}</span>
                    </div>
                  </div>
                  
                  {guindaste.descricao && (
                    <div className="guindaste-description">
                      <p>{guindaste.descricao}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {guindastes.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                </div>
                <h3>Nenhum guindaste cadastrado</h3>
                <p>Comece adicionando o primeiro guindaste</p>
                <button onClick={() => handleAddNew('guindaste')} className="add-btn">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                  </svg>
                  Adicionar Primeiro Guindaste
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Cadastro/Edição de Guindaste */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingGuindaste ? 'Editar Guindaste' : 'Novo Guindaste'}</h2>
              <button onClick={handleCloseModal} className="close-btn">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Nome do Guindaste</label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={e => handleInputChange('nome', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Modelo</label>
                <input
                  type="text"
                  value={formData.modelo}
                  onChange={e => handleInputChange('modelo', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Tipo</label>
                <select
                  value={formData.tipo}
                  onChange={e => handleInputChange('tipo', e.target.value)}
                  required
                >
                  <option value="hidraulico">Hidráulico</option>
                  <option value="telescopico">Telescópico</option>
                  <option value="torre">Torre</option>
                </select>
              </div>
              <div className="form-group">
                <label>Capacidade (ex: 1000kg)</label>
                <input
                  type="text"
                  value={formData.capacidade}
                  onChange={e => handleInputChange('capacidade', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Alcance (ex: 50m)</label>
                <input
                  type="text"
                  value={formData.alcance}
                  onChange={e => handleInputChange('alcance', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Altura (ex: 20m)</label>
                <input
                  type="text"
                  value={formData.altura}
                  onChange={e => handleInputChange('altura', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Preço (ex: R$ 1000,00)</label>
                <input
                  type="text"
                  value={formData.preco}
                  onChange={e => handleInputChange('preco', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Descrição</label>
                <textarea
                  value={formData.descricao}
                  onChange={e => handleInputChange('descricao', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Imagem do Guindaste</label>
                <ImageUpload onImageUpload={handleImageUpload} />
              </div>

              {opcionaisGuindasteForm.map((opc, idx) => (
                <div className="form-row" key={idx} style={{ alignItems: 'center', gap: 8 }}>
                  <div className="form-group" style={{ flex: 2 }}>
                    <label>O que é o opcional?</label>
                    <input
                      type="text"
                      value={opc.nome}
                      onChange={e => handleOpcionalFieldChange(idx, 'nome', e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Valor</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={opc.preco}
                      onChange={e => handleOpcionalFieldChange(idx, 'preco', e.target.value)}
                      required
                    />
                  </div>
                  {opcionaisGuindasteForm.length > 1 && (
                    <button type="button" onClick={() => handleRemoveOpcionalField(idx)} style={{ marginTop: 24 }}>🗑️</button>
                  )}
                </div>
              ))}
              <button type="button" onClick={handleAddOpcionalField} style={{ margin: '8px 0' }}>+ Adicionar mais</button>
              <div className="modal-actions">
                <button type="button" onClick={handleCloseModal} className="cancel-btn">Cancelar</button>
                <button type="submit" className="save-btn">Salvar Guindaste</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <PrecosPorRegiaoModal
        guindasteId={guindasteIdPrecos}
        open={showPrecosModal}
        onClose={() => setShowPrecosModal(false)}
      />
    </div>
  );
};

export default GerenciarGuindastes; 