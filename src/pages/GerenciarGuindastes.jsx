import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import UnifiedHeader from '../components/UnifiedHeader';
import ImageUpload from '../components/ImageUpload';
import LazyGuindasteImage from '../components/LazyGuindasteImage';

import { db } from '../config/supabase';
import '../styles/GerenciarGuindastes.css';
import PrecosPorRegiaoModal from '../components/PrecosPorRegiaoModal';

const GerenciarGuindastes = () => {
  const navigate = useNavigate();
  const { user } = useOutletContext(); // Pega o usuário do AdminLayout
  const [isLoading, setIsLoading] = useState(true);
  const [guindastes, setGuindastes] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [capacidadesDisponiveis, setCapacidadesDisponiveis] = useState([]);
  const pageSize = 100; // Aumentado para pegar todos os 51 guindastes
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const [showModal, setShowModal] = useState(false);
  const [editingGuindaste, setEditingGuindaste] = useState(null);
  const [activeTab, setActiveTab] = useState('guindastes');
  const [formData, setFormData] = useState({
    subgrupo: '',
    modelo: '',
    grupo: '',
    peso_kg: '',
    configuração: '',
    tem_contr: 'Sim',
    imagem_url: '',
    descricao: '',
    nao_incluido: '',
    imagens_adicionais: [],
    finame: '',
    ncm: '',
    codigo_referencia: '',
    quantidade_disponivel: 0
  });
  const [showPrecosModal, setShowPrecosModal] = useState(false);
  const [guindasteIdPrecos, setGuindasteIdPrecos] = useState(null);
  const [filtroCapacidade, setFiltroCapacidade] = useState('todos');
  const [hasInitializedFiltro, setHasInitializedFiltro] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [guindasteToDelete, setGuindasteToDelete] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  useEffect(() => {
    if (user) {
      loadData(1, false); // Usar cache quando possível para melhor performance
    }
  }, [user]);


  // Auto-esconde o toast após alguns segundos
  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        setToast(prev => ({ ...prev, visible: false }));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  // Memoizar extração de capacidades para evitar recálculos
  const extractCapacidades = React.useCallback((data) => {
    const set = new Set();
    data.forEach(g => {
      const subgrupo = g.subgrupo || '';
      const modeloBase = subgrupo.replace(/^(Guindaste\s+)+/, '').split(' ').slice(0, 2).join(' ');
      const match = modeloBase.match(/(\d+\.?\d*)/);
      if (match) set.add(match[1]);
    });
    return Array.from(set).sort((a, b) => parseFloat(a) - parseFloat(b));
  }, []);

  const loadData = async (pageToLoad = page, forceRefresh = false) => {
    try {
      setIsLoading(true);

      // Verificar autenticação (Supabase Auth ou localStorage)
      const userData = localStorage.getItem('user');
      if (!userData) {
        console.error('❌ Usuário não encontrado. Redirecionando para login...');
        navigate('/');
        return;
      }

      // Verificação de sessão removida para melhor performance

      console.log('🔄 [loadData] Carregando dados da página:', pageToLoad);
      const { data, count } = await db.getGuindastesLite(pageToLoad, pageSize, forceRefresh);

      console.log('📊 [loadData] Dados carregados:', data?.length || 0, 'registros');
      console.log('📊 [loadData] Total de registros:', count);
      setGuindastes(data);
      setTotal(count || 0);
      setPage(pageToLoad);

      // Processar capacidades apenas se não foram inicializadas ainda
      if (!hasInitializedFiltro && data.length > 0) {
        const capacidades = extractCapacidades(data);
        setCapacidadesDisponiveis(capacidades);

        if (capacidades.length > 0) {
          const saved = localStorage.getItem('gg_capacidade');
          // Sempre inicia na primeira capacidade disponível. Ignora 'todos'.
          const initial = saved && capacidades.includes(saved) ? saved : capacidades[0];
          setFiltroCapacidade(initial);
          setHasInitializedFiltro(true);
        }
      } else if (hasInitializedFiltro && data.length > 0) {
        // Atualizar capacidades disponíveis se já foram inicializadas
        const capacidades = extractCapacidades(data);
        setCapacidadesDisponiveis(capacidades);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      console.error('❌ Detalhes do erro:', error.message);
      console.error('❌ Stack trace:', error.stack);
      alert(`Erro ao carregar dados: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Persistir preferência do usuário
  useEffect(() => {
    if (filtroCapacidade && filtroCapacidade !== 'todos') {
      localStorage.setItem('gg_capacidade', filtroCapacidade);
    } else if (filtroCapacidade === 'todos') {
      localStorage.removeItem('gg_capacidade');
    }
  }, [filtroCapacidade]);

  // Função para extrair capacidades únicas dos guindastes (otimizada)
  const getCapacidadesUnicas = React.useCallback(() => {
    return capacidadesDisponiveis;
  }, [capacidadesDisponiveis]);

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
    console.log('🔧 [handleEdit] Item recebido:', item);

    try {
      // ⚡ OTIMIZADO: Buscar apenas o guindaste específico por ID
      console.log('🔍 Buscando dados completos do guindaste ID:', item.id);
      const guindasteData = await db.getGuindasteById(item.id);

      if (!guindasteData) {
        console.error('❌ Guindaste não encontrado:', item.id);
        alert('Erro: Guindaste não encontrado');
        return;
      }

      console.log('✅ Dados completos encontrados:', guindasteData);

      setEditingGuindaste(guindasteData);
      const newFormData = {
        subgrupo: guindasteData.subgrupo || '',
        modelo: guindasteData.modelo || '',
        grupo: guindasteData.grupo || '',
        peso_kg: guindasteData.peso_kg || '',
        configuração: guindasteData.configuração || '',
        tem_contr: guindasteData.tem_contr || 'Sim',
        imagem_url: guindasteData.imagem_url || '',
        descricao: guindasteData.descricao || '',
        nao_incluido: guindasteData.nao_incluido || '',
        imagens_adicionais: guindasteData.imagens_adicionais || [],
        finame: guindasteData.finame || '',
        ncm: guindasteData.ncm || '',
        codigo_referencia: guindasteData.codigo_referencia || '',
        quantidade_disponivel: guindasteData.quantidade_disponivel || 0
      };
      console.log('📝 [handleEdit] FormData sendo definido:', newFormData);
      setFormData(newFormData);
      setShowModal(true);
      // Bloquear scroll do body
      document.body.classList.add('modal-open');
    } catch (error) {
      console.error('❌ Erro ao buscar dados completos do guindaste:', error);
      alert('Erro ao carregar dados do guindaste');
    }
  };

  const handleDeleteClick = (id) => {
    setGuindasteToDelete(id);
    setShowDeleteModal(true);
    // Bloquear scroll do body
    document.body.classList.add('modal-open');
  };

  const handleConfirmDelete = async () => {
    if (guindasteToDelete) {
      try {
        await db.deleteGuindaste(guindasteToDelete);
        await loadData(page, true); // forceRefresh = true para limpar cache
        setShowDeleteModal(false);
        setGuindasteToDelete(null);
        // Restaurar scroll do body
        document.body.classList.remove('modal-open');
        // Notificação de sucesso
        setToast({ visible: true, message: 'Guindaste removido com sucesso!', type: 'success' });
      } catch (error) {
        console.error('Erro ao remover guindaste:', error);
        
        // Mensagem de erro mais específica
        const mensagemErro = error.message || 'Erro desconhecido ao remover guindaste.';
        
        if (mensagemErro.includes('vinculado a') || mensagemErro.includes('pedido')) {
          alert(`❌ ${mensagemErro}`);
        } else {
          alert(`❌ Erro ao remover guindaste: ${mensagemErro}\n\nVerifique se não há pedidos ou preços vinculados a este equipamento.`);
        }
        
        setShowDeleteModal(false);
        setGuindasteToDelete(null);
        document.body.classList.remove('modal-open');
      }
    }
  };

  const handleCloseModal = () => {
    console.log('🚪 [handleCloseModal] Fechando modal e resetando formData');
    setShowModal(false);
    setEditingGuindaste(null);
    setFormData({
      subgrupo: '',
      modelo: '',
      grupo: '',
      peso_kg: '',
      configuração: '',
      tem_contr: 'Sim',
      imagem_url: '',
      descricao: '',
      nao_incluido: '',
      imagens_adicionais: [],
      finame: '',
      ncm: '',
      codigo_referencia: '',
      quantidade_disponivel: 0
    });
    // Restaurar scroll do body
    document.body.classList.remove('modal-open');
  };

  const handleAddNew = () => {
    setEditingGuindaste(null);
    setFormData({
      subgrupo: '',
      modelo: '',
      grupo: '',
      peso_kg: '',
      configuração: '',
      tem_contr: 'Sim',
      imagem_url: '',
      descricao: '',
      nao_incluido: '',
      imagens_adicionais: [],
      finame: '',
      ncm: '',
      codigo_referencia: '',
      quantidade_disponivel: 0
    });
    setShowModal(true);
    // Bloquear scroll do body
    document.body.classList.add('modal-open');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('🚀 [handleSubmit] Iniciando submit do formulário');
    setIsLoading(true);

    try {
      // Validação completa de todos os campos obrigatórios
      const requiredFields = [
        { field: 'subgrupo', name: 'Subgrupo' },
        { field: 'modelo', name: 'Modelo' },
        { field: 'grupo', name: 'Grupo' },
        { field: 'codigo_referencia', name: 'Código de Referência' },
        { field: 'peso_kg', name: 'Configuração de Lanças' },
        { field: 'configuração', name: 'Configuração Completa' },
        { field: 'imagem_url', name: 'Imagem Principal' },
        { field: 'descricao', name: 'Descrição Técnica' },
        { field: 'nao_incluido', name: 'O que NÃO está incluído' },
        { field: 'finame', name: 'Código FINAME' },
        { field: 'ncm', name: 'Código NCM' }
      ];

      const missingFields = requiredFields
        .filter(({ field }) => !formData[field] || String(formData[field]).trim() === '')
        .map(({ name }) => name);

      if (missingFields.length > 0) {
        alert(`Por favor, preencha todos os campos obrigatórios:\n\n• ${missingFields.join('\n• ')}`);
        return;
      }

      // Monta o objeto de dados com base no formulário
      const guindasteData = {
        subgrupo: formData.subgrupo.trim(),
        modelo: formData.modelo.trim(),
        grupo: formData.grupo.trim(),
        peso_kg: String(formData.peso_kg).trim(),
        configuração: formData.configuração.trim(),
        tem_contr: formData.tem_contr,
        imagem_url: formData.imagem_url.trim(),
        descricao: formData.descricao.trim(),
        nao_incluido: formData.nao_incluido.trim(),
        imagens_adicionais: formData.imagens_adicionais || [],
        codigo_referencia: formData.codigo_referencia.trim(),
        finame: formData.finame.trim(),
        ncm: formData.ncm.trim(),
        quantidade_disponivel: formData.quantidade_disponivel
      };
      
      console.log('📋 [handleSubmit] Dados do formulário:', formData);
      console.log('📋 [handleSubmit] Dados preparados para envio:', guindasteData);
      console.log('📋 [handleSubmit] Campo configuração:', guindasteData.configuração);
      console.log('📦 [handleSubmit] Quantidade disponível:', guindasteData.quantidade_disponivel);

      if (editingGuindaste) {
        // LÓGICA DE ATUALIZAÇÃO
        console.log('🔧 [handleSubmit] Atualizando guindaste ID:', editingGuindaste.id);
        await db.updateGuindaste(editingGuindaste.id, guindasteData);
        setToast({ visible: true, message: 'Guindaste atualizado com sucesso!', type: 'success' });
      } else {
        // LÓGICA DE CRIAÇÃO
        console.log('🔧 [handleSubmit] Criando novo guindaste');
        const result = await db.createGuindaste(guindasteData);
        console.log('✅ [handleSubmit] Novo guindaste criado:', result);
        setToast({ visible: true, message: 'Guindaste criado com sucesso!', type: 'success' });
      }

      // ⚡ OTIMIZADO: Fechar modal imediatamente para feedback rápido
      handleCloseModal();
      
      // Recarregar dados em segundo plano com forceRefresh para limpar cache
      loadData(page, true);
      
      // Scroll suave para o topo para mostrar o novo guindaste
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
      console.error('❌ Erro ao salvar guindaste:', error);
      if (error.code === '23505') {
        if (error.message.includes('codigo_referencia')) {
          alert('Erro: Já existe um guindaste com este Código de Referência. Use um código único.');
        } else {
          alert('Erro: Dados duplicados. Verifique se todos os valores únicos são diferentes.');
        }
      } else {
        alert(`Erro ao salvar guindaste: ${error.message}`);
      }
      setToast({ visible: true, message: 'Erro ao salvar guindaste', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  // Função para resolver a imagem do guindaste, com fallback (otimizada)
  const resolveGuindasteImage = (guindaste) => {
    // Verificar se tem imagem_url válida
    if (guindaste.imagem_url && typeof guindaste.imagem_url === 'string') {
      // Se é uma URL HTTP válida, usar diretamente
      if (guindaste.imagem_url.startsWith('http')) {
        return guindaste.imagem_url;
      }

      // Se é base64 válido e completo, usar diretamente
      if (guindaste.imagem_url.startsWith('data:image/') && guindaste.imagem_url.length > 50) {
        return guindaste.imagem_url;
      }

      // Se parece ser um caminho relativo válido (não contém base64 corrompido)
      if (!guindaste.imagem_url.includes('base64') && guindaste.imagem_url.length < 200) {
        return guindaste.imagem_url;
      }
    }

    // Fallback final para placeholder
    return '/header-bg.jpg';
  };

  return (
    <>
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
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
                Guindastes
              </button>
            </div>
          </div>

          {activeTab === 'guindastes' && (
            <div className="tab-content">
              {isLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: '20px' }}>
                  <div style={{ width: '48px', height: '48px', border: '4px solid #f3f4f6', borderTop: '4px solid #111827', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                  <p style={{ color: '#6b7280', fontSize: '14px', fontWeight: '500' }}>Carregando guindastes...</p>
                  <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                </div>
              ) : (
                <>
                  <div className="content-header">
                    <h2>Guindastes Cadastrados</h2>
                    <div className="header-actions">
                      <button
                        onClick={() => loadData(page, true)}
                        className="refresh-btn"
                        title="Atualizar dados"
                        disabled={isLoading}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="23 4 23 10 17 10" />
                          <polyline points="1 20 1 14 7 14" />
                          <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                        </svg>
                        Atualizar
                      </button>
                      <button onClick={handleAddNew} className="add-btn">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                        </svg>
                        Novo Guindaste
                      </button>
                    </div>
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
                          {capacidade}
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
                            <h3>{capacidade}</h3>
                            <span className="capacity-count">{items.length}</span>
                          </div>
                          <div className="guindastes-grid">
                            {items.map((guindaste) => {
                              return (
                                <div key={guindaste.id} className="guindaste-card">
                                  <div className="guindaste-image">
                                    <LazyGuindasteImage
                                      guindasteId={guindaste.id}
                                      subgrupo={guindaste.subgrupo}
                                      className="guindaste-thumbnail"
                                      alt={guindaste.subgrupo}
                                    />
                                    <div className="guindaste-icon" style={{ display: 'none' }}>
                                      <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                                      </svg>
                                    </div>
                                  </div>
                                  <div className="guindaste-header">
                                    <div className="guindaste-info">
                                      <h3>{guindaste.subgrupo}</h3>
                                      <p>{guindaste.modelo}</p>
                                      {guindaste.codigo_referencia && (
                                        <p className="codigo-referencia">Código: {guindaste.codigo_referencia}</p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="guindaste-actions">
                                    <button
                                      onClick={() => handleEdit(guindaste)}
                                      className="action-btn edit-btn"
                                      title="Editar Guindaste"
                                      aria-label="Editar"
                                    >
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                      </svg>
                                      Editar
                                    </button>
                                    <button
                                      onClick={() => handleDeleteClick(guindaste.id)}
                                      className="action-btn delete-btn"
                                      title="Remover Guindaste"
                                      aria-label="Remover"
                                    >
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="3 6 5 6 21 6" />
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                        <line x1="10" y1="11" x2="10" y2="17" />
                                        <line x1="14" y1="11" x2="14" y2="17" />
                                      </svg>
                                      Excluir
                                    </button>
                                    <button
                                      className="action-btn price-btn"
                                      title="Preços por Região"
                                      aria-label="Preços por Região"
                                      onClick={() => { setGuindasteIdPrecos(guindaste.id); setShowPrecosModal(true); }}
                                    >
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="12" y1="1" x2="12" y2="23" />
                                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                                      </svg>
                                      Preços
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </section>
                      );
                    })
                  ) : (
                    <section className="capacity-section">
                      <div className="capacity-header">
                        <h3>{filtroCapacidade}</h3>
                        <span className="capacity-count">{getGuindastesFiltrados().length}</span>
                      </div>
                      <div className="guindastes-grid">
                        {getGuindastesFiltrados().map((guindaste) => {
                          return (
                            <div key={guindaste.id} className="guindaste-card">
                              <div className="guindaste-image">
                                <LazyGuindasteImage
                                  guindasteId={guindaste.id}
                                  subgrupo={guindaste.subgrupo}
                                  className="guindaste-thumbnail"
                                  alt={guindaste.subgrupo}
                                />
                                <div className="guindaste-icon" style={{ display: 'none' }}>
                                  <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                                  </svg>
                                </div>
                              </div>
                              <div className="guindaste-header">
                                <div className="guindaste-info">
                                  <h3>{guindaste.subgrupo}</h3>
                                  <p>{guindaste.modelo}</p>
                                  {guindaste.codigo_referencia && (
                                    <p className="codigo-referencia">Código: {guindaste.codigo_referencia}</p>
                                  )}
                                </div>
                              </div>
                              <div className="guindaste-actions">
                                <button
                                  onClick={() => handleEdit(guindaste)}
                                  className="action-btn edit-btn"
                                  title="Editar Guindaste"
                                  aria-label="Editar"
                                >
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                  </svg>
                                  Editar
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(guindaste.id)}
                                  className="action-btn delete-btn"
                                  title="Remover Guindaste"
                                  aria-label="Remover"
                                >
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    <line x1="10" y1="11" x2="10" y2="17" />
                                    <line x1="14" y1="11" x2="14" y2="17" />
                                  </svg>
                                  Excluir
                                </button>
                                <button
                                  className="action-btn price-btn"
                                  title="Preços por Região"
                                  aria-label="Preços por Região"
                                  onClick={() => { setGuindasteIdPrecos(guindaste.id); setShowPrecosModal(true); }}
                                >
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="12" y1="1" x2="12" y2="23" />
                                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                                  </svg>
                                  Preços
                                </button>
                              </div>
                            </div>
                          );
                        })}
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
                </>
              )}
            </div>
          )}


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
                  <div className="form-group">
                    <label>
                      <span className="label-icon">🏷️</span>
                      Grupo *
                    </label>
                    <input
                      type="text"
                      value={formData.grupo}
                      onChange={e => handleInputChange('grupo', e.target.value)}
                      placeholder="Ex: Interno, Externo"
                      required
                      className="form-input"
                    />
                    <small className="form-help">Categoria do grupo do guindaste</small>
                  </div>
                  <div className="form-group">
                    <label>
                      <span className="label-icon">🏷️</span>
                      Código de Referência *
                    </label>
                    <input
                      type="text"
                      value={formData.codigo_referencia}
                      onChange={e => handleInputChange('codigo_referencia', e.target.value)}
                      placeholder="Ex: GSI65001, GSE80010"
                      required
                      className="form-input"
                    />
                    <small className="form-help">Código único para identificação do produto</small>
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
                    <option value="P - Preparação p/ Perfuratriz">🔨 P - Preparação p/ Perfuratriz</option>
                    <option value="GR - Preparação p/ Garra e Rotator">🦾 GR - Preparação p/ Garra e Rotator</option>
                    <option value="Caminhão 3/4">🚛 Caminhão 3/4</option>
                    <option value="CR/EH - Controle Remoto e Extensiva Hidráulica">🎮🔧 CR/EH - Controle Remoto e Extensiva Hidráulica</option>
                    <option value="CR/EH/P - Controle Remoto, Extensiva Hidráulica e Preparação p/ Perfuratriz">🎮🔧🔨 CR/EH/P - Controle Remoto, Extensiva Hidráulica e Preparação p/ Perfuratriz</option>
                    <option value="EH/P - Extensiva Hidráulica e Preparação p/ Perfuratriz">🔧🔨 EH/P - Extensiva Hidráulica e Preparação p/ Perfuratriz</option>
                    <option value="CR/GR - Controle Remoto e Preparação p/ Garra e Rotator">🎮🦾 CR/GR - Controle Remoto e Preparação p/ Garra e Rotator</option>
                    <option value="EH/GR - Extensiva Hidráulica e Preparação p/ Garra e Rotador">🔧🦾 EH/GR - Extensiva Hidráulica e Preparação p/ Garra e Rotador</option>
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
                    Imagem Principal *
                  </label>
                  <ImageUpload onImageUpload={handleImageUpload} currentImageUrl={formData.imagem_url} />
                  {formData.imagem_url && (
                    <div className="image-preview">
                      <img
                        src={resolveGuindasteImage({ imagem_url: formData.imagem_url })}
                        alt="Preview da Imagem Principal"
                        className="uploaded-image-thumbnail"
                        onError={(e) => { e.currentTarget.src = '/header-bg.jpg'; }}
                      />
                      <small className="form-help">Preview da imagem principal</small>
                    </div>
                  )}
                </div>

                <div className="form-group full-width">
                  <label>Imagens Adicionais:</label>
                  <input
                    type="file"
                    multiple
                    onChange={handleImagensAdicionaisChange}
                    accept="image/*"
                  />
                  <div className="additional-images-preview">
                    {formData.imagens_adicionais.map((imgUrl, index) => (
                      <div key={index} className="additional-image-item">
                        <img src={imgUrl} alt={`Adicional ${index + 1}`} className="uploaded-image-thumbnail" />
                        <button type="button" onClick={() => removeImagemAdicional(index)} className="remove-image-btn">X</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Seção: Descrições e Especificações */}
              <div className="form-section">
                <div className="section-header">
                  <h3>📝 Descrições e Especificações</h3>
                  <div className="section-divider"></div>
                </div>
                <div className="form-group full-width">
                  <label>
                    <span className="label-icon">📄</span>
                    Descrição Técnica *
                  </label>
                  <textarea
                    value={formData.descricao}
                    onChange={e => handleInputChange('descricao', e.target.value)}
                    placeholder="Descreva as características técnicas do guindaste..."
                    required
                    className="form-textarea"
                    rows="4"
                  />
                  <small className="form-help">Descrição detalhada das especificações técnicas</small>
                </div>

                <div className="form-group full-width">
                  <label>
                    <span className="label-icon">❌</span>
                    O que NÃO está incluído *
                  </label>
                  <textarea
                    value={formData.nao_incluido}
                    onChange={e => handleInputChange('nao_incluido', e.target.value)}
                    placeholder="Liste os itens que não estão incluídos no produto..."
                    required
                    className="form-textarea"
                    rows="3"
                  />
                  <small className="form-help">Especifique claramente o que não está incluído</small>
                </div>
              </div>

              {/* Seção: Códigos e Classificações */}
              <div className="form-section">
                <div className="section-header">
                  <h3>🏷️ Códigos e Classificações</h3>
                  <div className="section-divider"></div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>
                      <span className="label-icon">🏦</span>
                      Código FINAME *
                    </label>
                    <input
                      type="text"
                      value={formData.finame}
                      onChange={e => handleInputChange('finame', e.target.value)}
                      placeholder="Ex: 123456789"
                      required
                      className="form-input"
                    />
                    <small className="form-help">Código para financiamento FINAME</small>
                  </div>
                  <div className="form-group">
                    <label>
                      <span className="label-icon">📊</span>
                      Código NCM *
                    </label>
                    <input
                      type="text"
                      value={formData.ncm}
                      onChange={e => handleInputChange('ncm', e.target.value)}
                      placeholder="Ex: 84264100"
                      required
                      className="form-input"
                    />
                    <small className="form-help">Nomenclatura Comum do Mercosul</small>
                  </div>
                  <div className="form-group">
                    <label>
                      <span className="label-icon">📦</span>
                      Quantidade Disponível
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={formData.quantidade_disponivel}
                      onChange={e => {
                        const val = e.target.value;
                        // Permitir campo vazio durante a digitação
                        if (val === '') {
                          handleInputChange('quantidade_disponivel', '');
                          return;
                        }
                        const num = parseInt(val, 10);
                        handleInputChange('quantidade_disponivel', isNaN(num) ? 0 : num);
                      }}
                      onBlur={e => {
                        // Ao sair do campo, garantir que seja número
                        const val = e.target.value;
                        if (val === '' || val === null || val === undefined) {
                          handleInputChange('quantidade_disponivel', 0);
                        }
                      }}
                      placeholder="Ex: 5"
                      className="form-input"
                    />
                    <small className="form-help">Quantidade em estoque para pronta entrega</small>
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="submit-btn" disabled={isLoading}>
                  {isLoading ? 'Salvando...' : (editingGuindaste ? 'Atualizar Guindaste' : 'Criar Guindaste')}
                </button>
                <button type="button" className="cancel-btn" onClick={handleCloseModal}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Preços por Região */}
      {showPrecosModal && (
        <PrecosPorRegiaoModal
          guindasteId={guindasteIdPrecos}
          open={showPrecosModal}
          onClose={() => {
            setShowPrecosModal(false);
            setGuindasteIdPrecos(null);
          }}
        />
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content delete-modal">
            <div className="modal-header">
              <h2>⚠️ Confirmar Exclusão</h2>
              <button onClick={() => setShowDeleteModal(false)} className="close-btn">×</button>
            </div>
            <div className="modal-body">
              <p>Tem certeza que deseja excluir este guindaste?</p>
              <p className="warning-text">Esta ação não pode ser desfeita.</p>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowDeleteModal(false)} className="cancel-btn">
                Cancelar
              </button>
              <button onClick={handleConfirmDelete} className="delete-btn">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.visible && (
        <div className={`toast ${toast.type}`}>
          <div className="toast-content">
            <span className="toast-icon">
              {toast.type === 'success' ? '✅' : '❌'}
            </span>
            <span className="toast-message">{toast.message}</span>
          </div>
        </div>
      )}

    </>
  );
};

export default GerenciarGuindastes;