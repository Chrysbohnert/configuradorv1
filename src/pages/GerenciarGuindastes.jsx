import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminNavigation from '../components/AdminNavigation';
import GuindasteLoading from '../components/GuindasteLoading';
import ImageUpload from '../components/ImageUpload';
import { db } from '../config/supabase';
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
    subgrupo: '',
    modelo: '',
    peso_kg: '',
    configuração: '',
    tem_contr: 'Sim',
    imagem_url: '',
    grafico_carga_url: ''
  });
  const [showPrecosModal, setShowPrecosModal] = useState(false);
  const [guindasteIdPrecos, setGuindasteIdPrecos] = useState(null);

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
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      if (field === 'configuração') {
        const temControleRemoto = value.includes('CR') || value.includes('Controle Remoto') ? 'Sim' : 'Não';
        newData.tem_contr = temControleRemoto;
      }
      return newData;
    });
  };

  const handleImageUpload = (imageUrl) => {
    setFormData(prev => ({ ...prev, imagem_url: imageUrl }));
  };

  const handleGraficoCargaUpload = (imageUrl) => {
    setFormData(prev => ({ ...prev, grafico_carga_url: imageUrl }));
  };

  const handleEdit = async (item) => {
    setEditingGuindaste(item);
    setFormData({
      subgrupo: item.subgrupo,
      modelo: item.modelo,
      peso_kg: item.peso_kg,
      configuração: item.configuração,
      tem_contr: item.tem_contr,
      imagem_url: item.imagem_url || '',
      grafico_carga_url: item.grafico_carga_url || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja remover este guindaste?')) {
      try {
        await db.deleteGuindaste(id);
        await loadData();
      } catch (error) {
        console.error('Erro ao remover guindaste:', error);
        alert('Erro ao remover guindaste. Tente novamente.');
      }
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingGuindaste(null);
    setFormData({
      subgrupo: '',
      modelo: '',
      peso_kg: '',
      configuração: '',
      tem_contr: 'Sim',
      imagem_url: '',
      grafico_carga_url: ''
    });
  };

  const handleAddNew = () => {
    setEditingGuindaste(null);
    setFormData({
      subgrupo: '',
      modelo: '',
      peso_kg: '',
      configuração: '',
      tem_contr: 'Sim',
      imagem_url: '',
      grafico_carga_url: ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!formData.subgrupo || !formData.modelo || !formData.peso_kg || !formData.configuração) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
      }
      
      const guindasteData = {
        subgrupo: formData.subgrupo.trim(),
        modelo: formData.modelo.trim(),
        peso_kg: parseInt(formData.peso_kg) || 0,
        configuração: formData.configuração,
        tem_contr: formData.tem_contr,
        imagem_url: formData.imagem_url || '',
        grafico_carga_url: formData.grafico_carga_url || ''
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
      alert(`Erro ao salvar guindaste: ${error.message || 'Erro desconhecido'}`);
    }
  };

  if (isLoading) {
    return <GuindasteLoading text="Carregando guindastes..." />;
  }

  if (!user) {
    return <GuindasteLoading text="Verificando usuário..." />;
  }

  return (
    <div className="admin-layout">
      <AdminNavigation user={user} />
      
      <div className="admin-content">
        <div className="gerenciar-guindastes-container">
          <div className="gerenciar-guindastes-content">
            <div className="page-header">
              <div className="header-info">
                <h1>Gerenciar Guindastes</h1>
                <p>Configure guindastes disponíveis</p>
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
                  <button onClick={handleAddNew} className="add-btn">
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
                              alt={guindaste.subgrupo}
                              className="guindaste-thumbnail"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div className="guindaste-icon" style={{ display: guindaste.imagem_url ? 'none' : 'flex' }}>
                            <svg viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                            </svg>
                          </div>
                        </div>
                        <div className="guindaste-info">
                          <h3>{guindaste.subgrupo}</h3>
                          <p>Modelo: {guindaste.modelo}</p>
                        </div>
                        <div className="guindaste-actions">
                          <button 
                            onClick={() => handleEdit(guindaste)}
                            className="action-btn edit-btn"
                            title="Editar"
                          >
                            ✏️
                          </button>
                          <button 
                            onClick={() => handleDelete(guindaste.id)}
                            className="action-btn delete-btn"
                            title="Remover"
                          >
                            🗑️
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
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingGuindaste ? 'Editar Guindaste' : 'Novo Guindaste'}</h2>
              <button onClick={handleCloseModal} className="close-btn">×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Subgrupo</label>
                <input
                  type="text"
                  value={formData.subgrupo}
                  onChange={e => handleInputChange('subgrupo', e.target.value)}
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
                <label>Peso (kg)</label>
                <input
                  type="text"
                  value={formData.peso_kg}
                  onChange={e => handleInputChange('peso_kg', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Configuração</label>
                <select
                  value={formData.configuração}
                  onChange={e => handleInputChange('configuração', e.target.value)}
                  required
                >
                  <option value="">Selecione uma configuração</option>
                  <option value="STANDARD - Pedido Padrão">STANDARD - Pedido Padrão</option>
                  <option value="CR - Controle Remoto">CR - Controle Remoto</option>
                  <option value="EH - Extensiva Hidráulica">EH - Extensiva Hidráulica</option>
                  <option value="ECL - Extensiva Cilindro Lateral">ECL - Extensiva Cilindro Lateral</option>
                  <option value="ECS - Extensiva Cilindro Superior">ECS - Extensiva Cilindro Superior</option>
                  <option value="P - Preparação p/ Perfuratriz">P - Preparação p/ Perfuratriz</option>
                  <option value="GR - Preparação p/ Garra e Rotator">GR - Preparação p/ Garra e Rotator</option>
                  <option value="Caminhão 3/4">Caminhão 3/4</option>
                  <option value="CR/EH - Controle Remoto e Extensiva Hidráulica">CR/EH - Controle Remoto e Extensiva Hidráulica</option>
                  <option value="CR/ECL - Controle Remoto e Extensiva Cilindro Lateral">CR/ECL - Controle Remoto e Extensiva Cilindro Lateral</option>
                  <option value="CR/ECS - Controle Remoto e Extensiva Cilindro Superior">CR/ECS - Controle Remoto e Extensiva Cilindro Superior</option>
                  <option value="CR/EH/P - Controle Remoto, Extensiva Hidráulica e Preparação p/ Perfuratriz">CR/EH/P - Controle Remoto, Extensiva Hidráulica e Preparação p/ Perfuratriz</option>
                  <option value="CR/GR - Controle Remoto e Preparação p/ Garra e Rotator">CR/GR - Controle Remoto e Preparação p/ Garra e Rotator</option>
                </select>
                <small style={{ color: '#6c757d', fontSize: '12px' }}>
                  Selecione a configuração completa do guindaste
                </small>
              </div>
              <div className="form-group">
                <label>Tem Controle Remoto</label>
                <select
                  value={formData.tem_contr}
                  onChange={e => handleInputChange('tem_contr', e.target.value)}
                  required
                >
                  <option value="Sim">Sim</option>
                  <option value="Não">Não</option>
                </select>
                <small style={{ color: '#6c757d', fontSize: '12px' }}>
                  Campo automático baseado na configuração selecionada
                </small>
              </div>

              <div className="form-group">
                <label>Imagem do Guindaste</label>
                <ImageUpload onImageUpload={handleImageUpload} />
              </div>

              <div className="form-group">
                <label>Gráfico de Carga (Opcional)</label>
                <ImageUpload 
                  onImageUpload={handleGraficoCargaUpload} 
                  label="Upload do Gráfico de Carga"
                />
                <small style={{ color: '#6c757d', fontSize: '12px' }}>
                  Imagem que mostra a capacidade de carga em diferentes posições da lança
                </small>
              </div>

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
