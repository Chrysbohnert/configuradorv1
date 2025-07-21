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
  const [opcionais, setOpcionais] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showOpcionalModal, setShowOpcionalModal] = useState(false);
  const [editingGuindaste, setEditingGuindaste] = useState(null);
  const [editingOpcional, setEditingOpcional] = useState(null);
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
      
      // Carregar opcionais do Supabase
      const opcionaisData = await db.getOpcionais();
      setOpcionais(opcionaisData);
      
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
    setOpcionaisForm(prev => [...prev, { nome: '', preco: '' }]);
  };

  // Função para remover campo de opcional
  const handleRemoveOpcionalField = (index) => {
    setOpcionaisForm(prev => prev.filter((_, i) => i !== index));
  };

  // Função para atualizar campo
  const handleOpcionalFieldChange = (index, field, value) => {
    setOpcionaisForm(prev => prev.map((opc, i) => i === index ? { ...opc, [field]: value } : opc));
  };

  const handleImageUpload = (imageUrl) => {
    setFormData(prev => ({ ...prev, imagem_url: imageUrl }));
  };

  const handleOpcionalImageUpload = (imageUrl) => {
    setOpcionalFormData(prev => ({ ...prev, imagem_url: imageUrl }));
  };

  // Novo handleOpcionalSubmit para cadastrar todos de uma vez
  const handleOpcionalSubmit = async (e) => {
    e.preventDefault();
    try {
      const opcionaisValidos = opcionaisForm.filter(opc => opc.nome && opc.preco);
      if (opcionaisValidos.length === 0) {
        alert('Preencha pelo menos um opcional com nome e valor.');
        return;
      }
      await Promise.all(opcionaisValidos.map(opc => db.createOpcional({ nome: opc.nome, preco: parseFloat(opc.preco), ativo: true })));
      await loadData();
      handleCloseOpcionalModal();
      setOpcionaisForm([{ nome: '', preco: '' }]);
    } catch (error) {
      console.error('Erro ao salvar opcionais:', error);
      alert('Erro ao salvar opcionais. Tente novamente.');
    }
  };

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
    } else {
      setEditingOpcional(item);
      setOpcionalFormData({
        nome: item.nome,
        preco: item.preco.toString(),
        descricao: item.descricao || '',
        categoria: item.categoria,
        imagem_url: item.imagem_url || ''
      });
      setShowOpcionalModal(true);
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

  const handleCloseOpcionalModal = () => {
    setShowOpcionalModal(false);
    setEditingOpcional(null);
    setOpcionalFormData({
      nome: '',
      preco: '',
      descricao: '',
      categoria: 'acessorio',
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
    } else {
      setEditingOpcional(null);
      setOpcionalFormData({
        nome: '',
        preco: '',
        descricao: '',
        categoria: 'acessorio',
        imagem_url: ''
      });
      setShowOpcionalModal(true);
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
            <button 
              className={`tab ${activeTab === 'opcionais' ? 'active' : ''}`}
              onClick={() => setActiveTab('opcionais')}
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
              Opcionais
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

        {activeTab === 'opcionais' && (
          <div className="tab-content">
            <div className="content-header">
              <h2>Opcionais Disponíveis</h2>
              <button onClick={() => handleAddNew('opcional')} className="add-btn">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                Novo Opcional
              </button>
            </div>

            <div className="opcionais-grid">
              {opcionais.map((opcional) => (
                <div key={opcional.id} className="opcional-card">
                  <div className="opcional-header">
                    <div className="opcional-image">
                      {opcional.imagem_url ? (
                        <img 
                          src={opcional.imagem_url} 
                          alt={opcional.nome}
                          className="opcional-thumbnail"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className="opcional-icon" style={{ display: opcional.imagem_url ? 'none' : 'flex' }}>
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                        </svg>
                      </div>
                    </div>
                    <div className="opcional-info">
                      <h3>{opcional.nome}</h3>
                      <p>{opcional.categoria.charAt(0).toUpperCase() + opcional.categoria.slice(1)}</p>
                    </div>
                    <div className="opcional-actions">
                      <button 
                        onClick={() => handleEdit(opcional, 'opcional')}
                        className="action-btn edit-btn"
                        title="Editar"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                        </svg>
                      </button>
                      <button 
                        onClick={() => handleDelete(opcional.id, 'opcional')}
                        className="action-btn delete-btn"
                        title="Remover"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <div className="opcional-details">
                    <div className="detail-row">
                      <span className="detail-label">Preço:</span>
                      <span className="detail-value price">{formatCurrency(opcional.preco)}</span>
                    </div>
                  </div>
                  
                  {opcional.descricao && (
                    <div className="opcional-description">
                      <p>{opcional.descricao}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {opcionais.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                  </svg>
                </div>
                <h3>Nenhum opcional cadastrado</h3>
                <p>Comece adicionando o primeiro opcional</p>
                <button onClick={() => handleAddNew('opcional')} className="add-btn">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                  </svg>
                  Adicionar Primeiro Opcional
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
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="nome">Nome *</label>
                  <input
                    id="nome"
                    type="text"
                    value={formData.nome}
                    onChange={(e) => handleInputChange('nome', e.target.value)}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="modelo">Modelo *</label>
                  <input
                    id="modelo"
                    type="text"
                    value={formData.modelo}
                    onChange={(e) => handleInputChange('modelo', e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="tipo">Tipo *</label>
                  <select
                    id="tipo"
                    value={formData.tipo}
                    onChange={(e) => handleInputChange('tipo', e.target.value)}
                    required
                  >
                    <option value="interno">interno</option>
                    <option value="externo">externo</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="preco">Preço (R$) *</label>
                  <input
                    id="preco"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.preco}
                    onChange={(e) => handleInputChange('preco', e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="capacidade">Capacidade *</label>
                  <input
                    id="capacidade"
                    type="text"
                    value={formData.capacidade}
                    onChange={(e) => handleInputChange('capacidade', e.target.value)}
                    placeholder="Ex: 3 toneladas"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="alcance">Alcance Horizontal *</label>
                  <input
                    id="alcance"
                    type="text"
                    value={formData.alcance}
                    onChange={(e) => handleInputChange('alcance', e.target.value)}
                    placeholder="Ex: 6 metros"
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="altura">Alcance Vertical</label>
                <input
                  id="altura"
                  type="text"
                  value={formData.altura}
                  onChange={(e) => handleInputChange('altura', e.target.value)}
                  placeholder="Ex: 8 metros"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="descricao">Descrição</label>
                <textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => handleInputChange('descricao', e.target.value)}
                  rows="3"
                  placeholder="Descrição detalhada do guindaste..."
                />
              </div>

              {/* Upload de Imagem */}
              <div className="form-group">
                <ImageUpload
                  onImageUpload={handleImageUpload}
                  currentImageUrl={formData.imagem_url}
                  label="Foto do Guindaste"
                />
              </div>
              
              <div className="form-group">
                <label>Opcionais do Guindaste</label>
                {opcionaisGuindasteForm.map((opc, idx) => (
                  <div className="form-row" key={idx} style={{ alignItems: 'center', gap: 8 }}>
                    <input
                      type="text"
                      placeholder="Nome do opcional"
                      value={opc.nome}
                      onChange={e => handleOpcionalGuindasteChange(idx, 'nome', e.target.value)}
                      style={{ flex: 2, marginRight: 8 }}
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Valor"
                      value={opc.preco}
                      onChange={e => handleOpcionalGuindasteChange(idx, 'preco', e.target.value)}
                      style={{ flex: 1, marginRight: 8 }}
                    />
                    {opcionaisGuindasteForm.length > 1 && (
                      <button type="button" onClick={() => handleRemoveOpcionalGuindaste(idx)} style={{ marginTop: 0 }}>🗑️</button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={handleAddOpcionalGuindaste} style={{ margin: '8px 0' }}>+ Adicionar Opcional</button>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={handleCloseModal} className="cancel-btn">
                  Cancelar
                </button>
                <button type="submit" className="save-btn">
                  {editingGuindaste ? 'Salvar Alterações' : 'Cadastrar Guindaste'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Cadastro/Edição de Opcional */}
      {showOpcionalModal && (
        <div className="modal-overlay" onClick={handleCloseOpcionalModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingOpcional ? 'Editar Opcional' : 'Novo Opcional'}</h2>
              <button onClick={handleCloseOpcionalModal} className="close-btn">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleOpcionalSubmit} className="modal-form">
              {opcionaisForm.map((opc, idx) => (
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
                  {opcionaisForm.length > 1 && (
                    <button type="button" onClick={() => handleRemoveOpcionalField(idx)} style={{ marginTop: 24 }}>🗑️</button>
                  )}
                </div>
              ))}
              <button type="button" onClick={handleAddOpcionalField} style={{ margin: '8px 0' }}>+ Adicionar mais</button>
              <div className="modal-actions">
                <button type="button" onClick={handleCloseOpcionalModal} className="cancel-btn">Cancelar</button>
                <button type="submit" className="save-btn">Salvar Opcionais</button>
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