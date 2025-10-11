import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminNavigation from '../components/AdminNavigation';
import UnifiedHeader from '../components/UnifiedHeader';
import ImageUpload from '../components/ImageUpload';

import { db } from '../config/supabase';
import '../styles/GerenciarGuindastes.css';
import PrecosPorRegiaoModal from '../components/PrecosPorRegiaoModal';

const GerenciarGuindastes = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [guindastes, setGuindastes] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 24;
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
    descricao: '',
    nao_incluido: '',
    imagens_adicionais: [],
    finame: '',
    ncm: ''
  });
  const [showPrecosModal, setShowPrecosModal] = useState(false);
  const [guindasteIdPrecos, setGuindasteIdPrecos] = useState(null);
  const [filtroCapacidade, setFiltroCapacidade] = useState('todos');
  const [hasInitializedFiltro, setHasInitializedFiltro] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [guindasteToDelete, setGuindasteToDelete] = useState(null);

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

    loadData(1);
  }, [navigate]);

  const loadData = async (pageToLoad = page) => {
    try {
      setIsLoading(true);
      const { data, count } = await db.getGuindastesLite({ page: pageToLoad, pageSize });
      setGuindastes(data);
      setTotal(count || 0);
      setPage(pageToLoad);
      // Define a capacidade inicial (primeira) apenas na primeira carga
      if (!hasInitializedFiltro && Array.isArray(data) && data.length > 0) {
        const capacidades = (() => {
          const set = new Set();
          data.forEach(g => {
            const subgrupo = g.subgrupo || '';
            const modeloBase = subgrupo.replace(/^(Guindaste\s+)+/, '').split(' ').slice(0, 2).join(' ');
            const match = modeloBase.match(/(\d+\.?\d*)/);
            if (match) set.add(match[1]);
          });
          return Array.from(set).sort((a, b) => parseFloat(a) - parseFloat(b));
        })();
        if (capacidades.length > 0) {
          const saved = localStorage.getItem('gg_capacidade');
          const initial = saved && (saved === 'todos' || capacidades.includes(saved)) ? saved : capacidades[0];
          setFiltroCapacidade(initial);
          setHasInitializedFiltro(true);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      alert('Erro ao carregar dados. Verifique a conexão com o banco.');
    } finally {
      setIsLoading(false);
    }
  };

  // Persistir preferência do usuário
  useEffect(() => {
    if (filtroCapacidade) {
      localStorage.setItem('gg_capacidade', filtroCapacidade);
    }
  }, [filtroCapacidade]);

  // Função para extrair capacidades únicas dos guindastes
  const getCapacidadesUnicas = () => {
    const capacidades = new Set();
    guindastes.forEach(guindaste => {
      const subgrupo = guindaste.subgrupo || '';
      const modeloBase = subgrupo.replace(/^(Guindaste\s+)+/, '').split(' ').slice(0, 2).join(' ');
      const match = modeloBase.match(/(\d+\.?\d*)/);
      if (match) capacidades.add(match[1]);
    });
    return Array.from(capacidades).sort((a, b) => parseFloat(a) - parseFloat(b));
  };

  // Extrai a capacidade (toneladas) de um registro de guindaste
  const extractCapacidade = (guindaste) => {
    const subgrupo = guindaste.subgrupo || '';
    const modeloBase = subgrupo.replace(/^(Guindaste\s+)+/, '').split(' ').slice(0, 2).join(' ');
    const match = modeloBase.match(/(\d+\.?\d*)/);
    return match ? match[1] : null;
  };

  const getGuindastesFiltrados = () => {
    if (filtroCapacidade === 'todos') return guindastes;
    return guindastes.filter(guindaste => {
      const cap = extractCapacidade(guindaste);
      return cap && cap === filtroCapacidade;
    });
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

  // Removido upload de gráfico de carga (PDF é anexado automaticamente na proposta)

  const handleImagensAdicionaisChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    try {
      const uploadedUrls = [];
      for (const file of files) {
        const fileName = `guindaste_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${file.name.split('.').pop()}`;
        const imageUrl = await db.uploadImagemGuindaste(file, fileName);
        uploadedUrls.push(imageUrl);
      }
      setFormData(prev => ({ ...prev, imagens_adicionais: [...prev.imagens_adicionais, ...uploadedUrls] }));
    } catch (error) {
      console.error('Erro ao fazer upload das imagens:', error);
      alert('Erro ao fazer upload das imagens. Tente novamente.');
    }
  };

  const removeImagemAdicional = (index) => {
    setFormData(prev => ({ ...prev, imagens_adicionais: prev.imagens_adicionais.filter((_, i) => i !== index) }));
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
      descricao: item.descricao || '',
      nao_incluido: item.nao_incluido || '',
      imagens_adicionais: item.imagens_adicionais || [],
      finame: item.finame || '',
      ncm: item.ncm || ''
    });
    setShowModal(true);
    // Bloquear scroll do body
    document.body.classList.add('modal-open');
  };

  const handleDeleteClick = (id) => {
    setGuindasteToDelete(id);
    setShowDeleteModal(true);
    // Bloquear scroll do body
    document.body.classList.add('modal-open');
  };

  const confirmDelete = async () => {
    if (guindasteToDelete) {
      try {
        await db.deleteGuindaste(guindasteToDelete);
        await loadData(page);
        setShowDeleteModal(false);
        setGuindasteToDelete(null);
        // Restaurar scroll do body
        document.body.classList.remove('modal-open');
      } catch (error) {
        console.error('Erro ao remover guindaste:', error);
        alert('Erro ao remover guindaste. Tente novamente.');
      }
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setGuindasteToDelete(null);
    // Restaurar scroll do body
    document.body.classList.remove('modal-open');
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
      descricao: '',
      nao_incluido: '',
      imagens_adicionais: [],
      finame: '',
      ncm: ''
    });
    // Restaurar scroll do body
    document.body.classList.remove('modal-open');
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
      descricao: '',
      nao_incluido: '',
      imagens_adicionais: [],
      finame: '',
      ncm: ''
    });
    setShowModal(true);
    // Bloquear scroll do body
    document.body.classList.add('modal-open');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Validação de campos obrigatórios
      if (!formData.subgrupo || !formData.modelo || !formData.peso_kg || !formData.configuração) {
        alert('Por favor, preencha todos os campos obrigatórios: Subgrupo, Modelo, Configuração de lanças e Configuração.');
        return;
      }
      
      // Converter peso_kg para string e validar
      const configuracaoLancas = String(formData.peso_kg).trim();
      if (!configuracaoLancas) {
        alert('Por favor, insira a configuração de lanças (ex: 3h1m, 4h2m).');
        return;
      }
      
      const guindasteData = {
        subgrupo: formData.subgrupo.trim(),
        modelo: formData.modelo.trim(),
        peso_kg: configuracaoLancas, // Agora é texto (ex: "3h1m")
        configuração: formData.configuração.trim(),
        tem_contr: formData.tem_contr,
        imagem_url: formData.imagem_url?.trim() || null,
        descricao: formData.descricao?.trim() || null,
        nao_incluido: formData.nao_incluido?.trim() || null,
        imagens_adicionais: formData.imagens_adicionais || []
      };
      
      if (editingGuindaste) {
        await db.updateGuindaste(editingGuindaste.id, guindasteData);
      } else {
        await db.createGuindaste(guindasteData);
      }
      
      await loadData(page);
      handleCloseModal();
      alert('Guindaste salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar guindaste:', error);
      alert(`Erro ao salvar guindaste: ${error.message}`);
    }
  };

  if (!user) return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="admin-layout">
      <AdminNavigation user={user} />
      
      <div className="admin-content">
        <UnifiedHeader 
          showBackButton={false}
          showSupportButton={true}
          showUserInfo={true}
          user={user}
          title="Gerenciar Guindastes"
          subtitle="Cadastre e edite os guindastes"
        />
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

                <div className="filtro-container">
                  <div className="capacity-chips">
                    {getCapacidadesUnicas().map((capacidade) => (
                      <button
                        key={capacidade}
                        type="button"
                        className={`chip ${filtroCapacidade === capacidade ? 'active' : ''}`}
                        onClick={() => setFiltroCapacidade(capacidade)}
                      >
                        {capacidade} t
                      </button>
                    ))}
                    <button
                      type="button"
                      className={`chip ${filtroCapacidade === 'todos' ? 'active' : ''}`}
                      onClick={() => setFiltroCapacidade('todos')}
                    >
                      Todos
                    </button>
                  </div>
                  <div className="filtro-info">
                    <span className="resultado-count">
                      {getGuindastesFiltrados().length} guindaste(s) listado(s)
                    </span>
                  </div>
                </div>

                {filtroCapacidade === 'todos' ? (
                  getCapacidadesUnicas().map((capacidade) => {
                    const items = guindastes.filter(g => extractCapacidade(g) === capacidade);
                    if (items.length === 0) return null;
                    return (
                      <section key={capacidade} className="capacity-section">
                        <div className="capacity-header">
                          <h3>{capacidade} t</h3>
                          <span className="capacity-count">{items.length}</span>
                        </div>
                        <div className="guindastes-grid">
                          {items.map((guindaste) => (
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
                                    aria-label="Editar"
                                  />
                                  <button
                                    onClick={() => handleDeleteClick(guindaste.id)}
                                    className="action-btn delete-btn"
                                    title="Remover"
                                    aria-label="Remover"
                                  />
                                  <button
                                    className="action-btn price-btn"
                                    title="Preços por Região"
                                    aria-label="Preços por Região"
                                    onClick={() => { setGuindasteIdPrecos(guindaste.id); setShowPrecosModal(true); }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    );
                  })
                ) : (
                  <section className="capacity-section">
                    <div className="capacity-header">
                      <h3>{filtroCapacidade} t</h3>
                      <span className="capacity-count">{getGuindastesFiltrados().length}</span>
                    </div>
                    <div className="guindastes-grid">
                      {getGuindastesFiltrados().map((guindaste) => (
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
                                aria-label="Editar"
                              />
                              <button
                                onClick={() => handleDeleteClick(guindaste.id)}
                                className="action-btn delete-btn"
                                title="Remover"
                                aria-label="Remover"
                              />
                              <button
                                className="action-btn price-btn"
                                title="Preços por Região"
                                aria-label="Preços por Região"
                                onClick={() => { setGuindasteIdPrecos(guindaste.id); setShowPrecosModal(true); }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Paginação: exibir apenas se houver mais de 10 itens no filtro atual */}
                {((filtroCapacidade === 'todos' ? total : getGuindastesFiltrados().length) > 10) && (
                  <div className="pagination">
                    <button 
                      className="page-btn ghost"
                      disabled={page <= 1}
                      onClick={() => loadData(page - 1)}
                    >
                      Anterior
                    </button>
                    <div className="page-info">Página {page} de {totalPages}</div>
                    <button 
                      className="page-btn primary"
                      disabled={page >= totalPages}
                      onClick={() => loadData(page + 1)}
                    >
                      Próxima
                    </button>
                  </div>
                )}

              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content guindaste-form-modal">
            <div className="modal-header">
              <div className="modal-title-section">
                <h2>{editingGuindaste ? 'Editar Guindaste' : 'Novo Guindaste'}</h2>
                <div className="modal-subtitle">
                  {editingGuindaste ? `Editando: ${editingGuindaste.modelo}` : 'Preencha os dados do novo guindaste'}
                </div>
              </div>
              <div className="modal-header-actions">
                <button form="guindaste-form" type="submit" className="save-btn">
                  <span>💾</span>
                  Salvar
                </button>
                <button onClick={handleCloseModal} className="close-btn">×</button>
              </div>
            </div>
            <form id="guindaste-form" onSubmit={handleSubmit} className="modal-form">
              {/* Seção: Informações Básicas */}
              <div className="form-section">
                <div className="section-header">
                  <h3>📋 Informações Básicas</h3>
                  <div className="section-divider"></div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>
                      <span className="label-icon">🏗️</span>
                      Subgrupo
                    </label>
                    <input
                      type="text"
                      value={formData.subgrupo}
                      onChange={e => handleInputChange('subgrupo', e.target.value)}
                      placeholder="Ex: Guindaste Hidráulico"
                      required
                      className="form-input"
                    />
                    <small className="form-help">Categoria principal do equipamento</small>
                  </div>
                  <div className="form-group">
                    <label>
                      <span className="label-icon">🔧</span>
                      Modelo
                    </label>
                    <input
                      type="text"
                      value={formData.modelo}
                      onChange={e => handleInputChange('modelo', e.target.value)}
                      placeholder="Ex: GH-25T"
                      required
                      className="form-input"
                    />
                    <small className="form-help">Nome/identificação do modelo</small>
                  </div>
                </div>
              </div>
              {/* Seção: Configuração Técnica */}
              <div className="form-section">
                <div className="section-header">
                  <h3>⚙️ Configuração Técnica</h3>
                  <div className="section-divider"></div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>
                      <span className="label-icon">🔗</span>
                      Configuração de Lanças
                    </label>
                    <input
                      type="text"
                      value={formData.peso_kg}
                      onChange={e => handleInputChange('peso_kg', e.target.value)}
                      placeholder="Ex: 3h1m, 4h2m, etc"
                      required
                      className="form-input"
                    />
                    <small className="form-help">Ex: 3h1m = 3 hidráulicas + 1 manual</small>
                  </div>
                  <div className="form-group">
                    <label>
                      <span className="label-icon">🎮</span>
                      Controle Remoto
                    </label>
                    <select
                      value={formData.tem_contr}
                      onChange={e => handleInputChange('tem_contr', e.target.value)}
                      required
                      className="form-select"
                    >
                      <option value="Sim">✅ Sim</option>
                      <option value="Não">❌ Não</option>
                    </select>
                    <small className="form-help">Campo automático baseado na configuração</small>
                  </div>
                </div>
                <div className="form-group">
                  <label>
                    <span className="label-icon">🔧</span>
                    Configuração Completa
                  </label>
                  <select
                    value={formData.configuração}
                    onChange={e => handleInputChange('configuração', e.target.value)}
                    required
                    className="form-select"
                  >
                    <option value="">Selecione uma configuração</option>
                    <option value="STANDARD - Pedido Padrão">📦 STANDARD - Pedido Padrão</option>
                    <option value="CR - Controle Remoto">🎮 CR - Controle Remoto</option>
                    <option value="EH - Extensiva Hidráulica">🔧 EH - Extensiva Hidráulica</option>
                    <option value="ECL - Extensiva Cilindro Lateral">⚙️ ECL - Extensiva Cilindro Lateral</option>
                    <option value="ECS - Extensiva Cilindro Superior">🔩 ECS - Extensiva Cilindro Superior</option>
                    <option value="P - Preparação p/ Perfuratriz">🔨 P - Preparação p/ Perfuratriz</option>
                    <option value="GR - Preparação p/ Garra e Rotator">🦾 GR - Preparação p/ Garra e Rotator</option>
                    <option value="Caminhão 3/4">🚛 Caminhão 3/4</option>
                    <option value="CR/EH - Controle Remoto e Extensiva Hidráulica">🎮🔧 CR/EH - Controle Remoto e Extensiva Hidráulica</option>
                    <option value="CR/ECL - Controle Remoto e Extensiva Cilindro Lateral">🎮⚙️ CR/ECL - Controle Remoto e Extensiva Cilindro Lateral</option>
                    <option value="CR/ECS - Controle Remoto e Extensiva Cilindro Superior">🎮🔩 CR/ECS - Controle Remoto e Extensiva Cilindro Superior</option>
                    <option value="CR/EH/P - Controle Remoto, Extensiva Hidráulica e Preparação p/ Perfuratriz">🎮🔧🔨 CR/EH/P - Controle Remoto, Extensiva Hidráulica e Preparação p/ Perfuratriz</option>
                    <option value="CR/GR - Controle Remoto e Preparação p/ Garra e Rotator">🎮🦾 CR/GR - Controle Remoto e Preparação p/ Garra e Rotator</option>
                  </select>
                  <small className="form-help">Selecione a configuração completa do guindaste</small>
                </div>
              </div>

              {/* Seção: Mídia e Documentação */}
              <div className="form-section">
                <div className="section-header">
                  <h3>📸 Mídia e Documentação</h3>
                  <div className="section-divider"></div>
                </div>
                <div className="form-group">
                  <label>
                    <span className="label-icon">🖼️</span>
                    Imagem Principal
                  </label>
                  <ImageUpload onImageUpload={handleImageUpload} currentImageUrl={formData.imagem_url} />
                  {formData.imagem_url ? (
                    <small className="form-help success">✅ Imagem já cadastrada</small>
                  ) : (
                    <small className="form-help">⚠️ Nenhuma imagem cadastrada</small>
                  )}
                </div>
              </div>

              {/* Upload de gráfico de carga removido: agora os PDFs técnicos são gerenciados em Gráficos de Carga e anexados automaticamente na proposta. */}

              {/* Seção: Descrições */}
              <div className="form-section">
                <div className="section-header">
                  <h3>📝 Descrições</h3>
                  <div className="section-divider"></div>
                </div>
                <div className="form-group">
                  <label>
                    <span className="label-icon">📋</span>
                    Descrição Técnica
                  </label>
                  <textarea
                    value={formData.descricao}
                    onChange={e => handleInputChange('descricao', e.target.value)}
                    rows="6"
                    placeholder="Descreva as características técnicas, especificações, materiais, funcionalidades e qualquer informação relevante sobre o equipamento..."
                    className="form-textarea"
                  />
                  <small className="form-help">Descrição completa do equipamento para os vendedores</small>
                </div>

                <div className="form-group">
                  <label>
                    <span className="label-icon">❌</span>
                    O que NÃO está incluído
                  </label>
                  <textarea
                    value={formData.nao_incluido}
                    onChange={e => handleInputChange('nao_incluido', e.target.value)}
                    rows="4"
                    placeholder="Ex: Instalação, transporte, documentação, treinamento, peças de reposição, etc..."
                    className="form-textarea"
                  />
                  <small className="form-help">Itens que NÃO estão incluídos na proposta para evitar mal-entendidos</small>
                </div>
              </div>

              {/* Seção: Informações Financeiras */}
              <div className="form-section financial-section">
                <div className="section-header">
                  <h3>💰 Informações Financeiras</h3>
                  <div className="section-divider"></div>
                </div>
                <div className="financial-warning">
                  <div className="warning-icon">⚠️</div>
                  <div className="warning-text">
                    <strong>Informações Obrigatórias para Financiamento</strong>
                    <p>Estes códigos são necessários para financiamento FINAME e importação</p>
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="financial-label">
                      <span className="label-icon">🏦</span>
                      Código FINAME *
                    </label>
                    <input
                      type="text"
                      value={formData.finame}
                      onChange={e => handleInputChange('finame', e.target.value)}
                      placeholder="Ex: 03795187"
                      required
                      className="form-input financial-input"
                    />
                    <small className="form-help financial-help">
                      Código obrigatório para financiamento FINAME
                    </small>
                  </div>
                  
                  <div className="form-group">
                    <label className="financial-label">
                      <span className="label-icon">🌍</span>
                      Código NCM *
                    </label>
                    <input
                      type="text"
                      value={formData.ncm}
                      onChange={e => handleInputChange('ncm', e.target.value)}
                      placeholder="Ex: 8436.80.00"
                      required
                      className="form-input financial-input"
                    />
                    <small className="form-help financial-help">
                      Nomenclatura Comum do Mercosul (obrigatório)
                    </small>
                  </div>
                </div>
              </div>

              {/* Seção: Galeria de Imagens */}
              <div className="form-section">
                <div className="section-header">
                  <h3>🖼️ Galeria de Imagens</h3>
                  <div className="section-divider"></div>
                </div>
                <div className="form-group">
                  <label>
                    <span className="label-icon">📷</span>
                    Imagens Adicionais
                  </label>
                  <div className="imagens-adicionais-container">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImagensAdicionaisChange}
                      className="file-input"
                    />
                    <small className="form-help">
                      Selecione múltiplas imagens para criar uma galeria. A primeira imagem será a foto principal.
                    </small>
                  </div>
                  {formData.imagens_adicionais.length > 0 && (
                    <div className="imagens-preview">
                      <h4>Imagens Selecionadas:</h4>
                      <div className="imagens-grid">
                        {formData.imagens_adicionais.map((img, index) => (
                          <div key={index} className="imagem-preview-item">
                            <img src={img} alt={`Preview ${index + 1}`} />
                            <button
                              type="button"
                              onClick={() => removeImagemAdicional(index)}
                              className="remove-imagem-btn"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={handleCloseModal} className="cancel-btn">Cancelar</button>
                <button type="submit" className="save-btn">Salvar Guindaste</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <PrecosPorRegiaoModal guindasteId={guindasteIdPrecos} open={showPrecosModal} onClose={() => setShowPrecosModal(false)} />

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirmar Exclusão</h2>
              <button onClick={cancelDelete} className="close-btn">×</button>
            </div>
            <div className="modal-form">
              <p>Tem certeza que deseja remover este guindaste?</p>
              <p style={{ color: '#dc3545', fontSize: '14px', marginTop: '8px' }}>
                ⚠️ Esta ação não pode ser desfeita.
              </p>
              <div className="modal-actions">
                <button type="button" onClick={cancelDelete} className="cancel-btn">
                  Cancelar
                </button>
                <button type="button" onClick={confirmDelete} className="save-btn delete-confirm-btn">
                  Remover
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GerenciarGuindastes;
