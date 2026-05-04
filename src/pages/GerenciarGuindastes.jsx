import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import UnifiedHeader from '../components/UnifiedHeader';
import BlobButton from '../components/BlobButton';
import ImageUpload from '../components/ImageUpload';
import LazyGuindasteImage from '../components/LazyGuindasteImage';

import { db } from '../config/supabase';
import { formatCurrency } from '../utils/formatters';
import { normalizarRegiaoPorUF } from '../utils/regiaoHelper';
import '../styles/GerenciarGuindastes.css';
import PrecosPorRegiaoModal from '../components/PrecosPorRegiaoModal';

const GerenciarGuindastes = () => {
  const navigate = useNavigate();
  const { user } = useOutletContext(); // Pega o usuário do AdminLayout
  const isAdminConcessionaria = user?.tipo === 'admin_concessionaria';
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
    quantidade_disponivel: 0,
    is_prototipo: false,
    prototipo_label: '',
    prototipo_observacoes_pdf: '',
    is_comercio_exterior: false
  });

  const [vendedoresDisponiveis, setVendedoresDisponiveis] = useState([]);

  const [showPrecosModal, setShowPrecosModal] = useState(false);
  const [guindasteIdPrecos, setGuindasteIdPrecos] = useState(null);
  const [filtroCapacidade, setFiltroCapacidade] = useState('6.5');
  const [hasInitializedFiltro, setHasInitializedFiltro] = useState(false);
  const [selectedModeloGrupo, setSelectedModeloGrupo] = useState(null);
  const [busca, setBusca] = useState('');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [guindasteToDelete, setGuindasteToDelete] = useState(null);

  const [showPrecoConcessionariaModal, setShowPrecoConcessionariaModal] = useState(false);
  const [guindasteSelecionadoPreco, setGuindasteSelecionadoPreco] = useState(null);
  const [precoStarkReferencia, setPrecoStarkReferencia] = useState(null);
  const [precoConcessionariaInput, setPrecoConcessionariaInput] = useState('');

  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const [concessionaria, setConcessionaria] = useState(null);
  const [regiaoReferencia, setRegiaoReferencia] = useState('sul-sudeste');
  const [precosConcessionariaMap, setPrecosConcessionariaMap] = useState({});

  const extractCapacidades = React.useCallback((data) => {
    const set = new Set();
    (data || []).forEach(g => {
      const subgrupo = g?.subgrupo || '';
      const modeloBase = subgrupo.replace(/^(Guindaste\s+)+/, '').split(' ').slice(0, 2).join(' ');
      const match = modeloBase.match(/(\d+\.?\d*)/);
      if (match) set.add(match[1]);
    });
    return Array.from(set).sort((a, b) => parseFloat(a) - parseFloat(b));
  }, []);

  useEffect(() => {
    if (user) {
      loadData(1, false); // Usar cache quando possível para melhor performance
    }
  }, [user]);

  const loadData = async (pageToLoad = page, forceRefresh = false) => {
    try {
      setIsLoading(true);

      const res = await db.getGuindastesLite(pageToLoad, pageSize, forceRefresh);
      const data = res?.data || [];
      const count = typeof res?.count === 'number' ? res.count : data.length;

      setGuindastes(data);
      setTotal(count);
      setPage(pageToLoad);
      setCapacidadesDisponiveis(extractCapacidades(data));
    } catch (e) {
      console.error('Erro ao carregar guindastes:', e);
      setGuindastes([]);
      setTotal(0);
      setCapacidadesDisponiveis([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (imageUrl) => {
    setFormData(prev => ({ ...prev, imagem_url: imageUrl }));
  };

  const handleImagensAdicionaisChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      const uploadedUrls = [];
      for (const file of files) {
        const fileName = `guindaste_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${file.name.split('.').pop()}`;
        const imageUrl = await db.uploadImagemGuindaste(file, fileName);
        uploadedUrls.push(imageUrl);
      }
      setFormData(prev => ({ ...prev, imagens_adicionais: [...(prev.imagens_adicionais || []), ...uploadedUrls] }));
    } catch (error) {
      console.error('Erro ao fazer upload das imagens:', error);
      alert('Erro ao fazer upload das imagens. Tente novamente.');
    }
  };

  const extractCapacidade = (g) => {
    const subgrupo = g?.subgrupo || '';
    const modeloBase = subgrupo.replace(/^(Guindaste\s+)+/, '').split(' ').slice(0, 2).join(' ');
    const match = modeloBase.match(/(\d+\.?\d*)/);
    return match ? match[1] : 'Outros';
  };

  const getCapacidadesUnicas = () => {
    const set = new Set((capacidadesDisponiveis || []).filter(Boolean));
    return Array.from(set);
  };

  const getGuindastesFiltrados = () => {
    if (filtroCapacidade === 'todos') return guindastes;
    return (guindastes || []).filter(g => extractCapacidade(g) === filtroCapacidade);
  };

  const getModeloBase = (g) => {
    const subgrupo = g?.subgrupo || '';
    return subgrupo.replace(/^(Guindaste\s+)+/, '').split(' ').slice(0, 2).join(' ');
  };

  const getUniqueModelos = () => {
    const base = filtroCapacidade === 'todos' ? (guindastes || []) : (guindastes || []).filter(g => extractCapacidade(g) === filtroCapacidade);
    const map = new Map();
    base.forEach(g => {
      const key = getModeloBase(g);
      if (!map.has(key)) map.set(key, { key, representante: g, count: 0, capacidade: extractCapacidade(g) });
      map.get(key).count++;
    });
    const lista = Array.from(map.values());
    return busca ? lista.filter(m => m.key.toLowerCase().includes(busca.toLowerCase())) : lista;
  };

  const getGuindastesDoModelo = (modeloKey) => (guindastes || []).filter(g => getModeloBase(g) === modeloKey);

  useEffect(() => {
    if (!user) return;
    if (isAdminConcessionaria) return;

    const loadVendedores = async () => {
      try {
        const users = await db.getUsers();
        const vendedores = (users || []).filter(u => u?.tipo === 'vendedor' || u?.tipo === 'vendedor_concessionaria');
        setVendedoresDisponiveis(vendedores);
      } catch (e) {
        console.error('Erro ao carregar vendedores:', e);
        setVendedoresDisponiveis([]);
      }
    };

    loadVendedores();
  }, [user, isAdminConcessionaria]);

  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        setToast(prev => ({ ...prev, visible: false }));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  useEffect(() => {
    const loadContextoConcessionaria = async () => {
      if (!user || !isAdminConcessionaria) return;
      if (!user?.concessionaria_id) return;

      try {
        const c = await db.getConcessionariaById(user.concessionaria_id);
        setConcessionaria(c);
        setRegiaoReferencia(c?.regiao_preco || normalizarRegiaoPorUF(c?.uf));

        const precos = await db.getConcessionariaPrecos(user.concessionaria_id);
        const map = (precos || []).reduce((acc, row) => {
          acc[row.guindaste_id] = row.preco_override;
          return acc;
        }, {});
        setPrecosConcessionariaMap(map);
      } catch (e) {
        console.error('Erro ao carregar contexto da concessionária:', e);
      }
    };

    loadContextoConcessionaria();
  }, [user, isAdminConcessionaria]);

  const removeImagemAdicional = (index) => {
    setFormData(prev => ({ ...prev, imagens_adicionais: prev.imagens_adicionais.filter((_, i) => i !== index) }));
  };

  const handleEdit = async (item) => {
    if (isAdminConcessionaria) {
      alert('Admin de concessionária não pode editar guindastes.');
      return;
    }

    console.log('🔧 [handleEdit] Item recebido:', item);

    try {
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
        quantidade_disponivel: guindasteData.quantidade_disponivel || 0,
        is_prototipo: !!guindasteData.is_prototipo,
        prototipo_label: guindasteData.prototipo_label || '',
        prototipo_observacoes_pdf: guindasteData.prototipo_observacoes_pdf || '',
        is_comercio_exterior: !!guindasteData.is_comercio_exterior
      };
      console.log('📝 [handleEdit] FormData sendo definido:', newFormData);
      setFormData(newFormData);

      setShowModal(true);
      document.body.classList.add('modal-open');
    } catch (error) {
      console.error('❌ Erro ao buscar dados completos do guindaste:', error);
      alert('Erro ao carregar dados do guindaste');
    }
  };

  const handleDeleteClick = (id) => {
    if (isAdminConcessionaria) {
      alert('Admin de concessionária não pode excluir guindastes.');
      return;
    }
    setGuindasteToDelete(id);
    setShowDeleteModal(true);
    document.body.classList.add('modal-open');
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
      quantidade_disponivel: 0,
      is_prototipo: false,
      prototipo_label: '',
      prototipo_observacoes_pdf: '',
      is_comercio_exterior: false
    });
    document.body.classList.remove('modal-open');
  };

  const handleAddNew = () => {
    if (isAdminConcessionaria) {
      alert('Apenas o Admin Stark pode cadastrar novos guindastes.');
      return;
    }
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
      quantidade_disponivel: 0,
      is_prototipo: false,
      prototipo_label: '',
      prototipo_observacoes_pdf: '',
      is_comercio_exterior: false
    });
    setShowModal(true);
    document.body.classList.add('modal-open');
  };

  const openPrecoConcessionaria = async (guindaste) => {
    try {
      setGuindasteSelecionadoPreco(guindaste);
      const precoCompra = await db.getPrecoCompraPorRegiao(guindaste.id, regiaoReferencia);
      setPrecoStarkReferencia(precoCompra);
      const precoVendaAtual = precosConcessionariaMap[guindaste.id] || 0;
      setPrecoConcessionariaInput(precoVendaAtual > 0 ? precoVendaAtual.toString() : '');
      setShowPrecoConcessionariaModal(true);
      document.body.classList.add('modal-open');
    } catch (error) {
      console.error('Erro ao abrir modal de preço:', error);
      alert('Erro ao carregar dados do preço. Tente novamente.');
    }
  };

  const closePrecoConcessionaria = () => {
    setShowPrecoConcessionariaModal(false);
    setGuindasteSelecionadoPreco(null);
    setPrecoStarkReferencia(null);
    setPrecoConcessionariaInput('');
    document.body.classList.remove('modal-open');
  };

  const salvarPrecoConcessionaria = async () => {
    const novoPreco = parseFloat(precoConcessionariaInput);
    if (!novoPreco || novoPreco <= 0) {
      alert('⚠️ Preço inválido. Digite um valor maior que zero.');
      return;
    }
    const precoCompra = precoStarkReferencia || 0;
    if (novoPreco < precoCompra) {
      const markup = precoCompra > 0 ? (((novoPreco - precoCompra) / precoCompra) * 100).toFixed(1) : 0;
      const confirmar = window.confirm(`⚠️ ATENÇÃO: O preço de venda (${formatCurrency(novoPreco)}) é MENOR que o preço de compra (${formatCurrency(precoCompra)}).\n\nMarkup: ${markup}%\n\nVocê terá PREJUÍZO nesta venda!\n\nDeseja continuar mesmo assim?`);
      if (!confirmar) return;
    }
    try {
      setIsLoading(true);
      await db.upsertConcessionariaPreco({
        concessionaria_id: user.concessionaria_id,
        guindaste_id: guindasteSelecionadoPreco.id,
        preco_override: novoPreco,
        updated_by: user.id
      });
      setPrecosConcessionariaMap(prev => ({ ...prev, [guindasteSelecionadoPreco.id]: novoPreco }));
      setToast({ visible: true, message: '✅ Preço de venda salvo com sucesso!', type: 'success' });
      closePrecoConcessionaria();
    } catch (error) {
      console.error('Erro ao salvar preço:', error);
      setToast({ visible: true, message: '❌ Erro ao salvar preço. Tente novamente.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!guindasteToDelete) return;
    try {
      setIsLoading(true);
      await db.deleteGuindaste(guindasteToDelete);
      setToast({ visible: true, message: 'Guindaste excluído com sucesso!', type: 'success' });
      setShowDeleteModal(false);
      setGuindasteToDelete(null);
      loadData(page, true);
    } catch (error) {
      console.error('Erro ao excluir guindaste:', error);
      setToast({ visible: true, message: 'Erro ao excluir guindaste', type: 'error' });
    } finally {
      setIsLoading(false);
      document.body.classList.remove('modal-open');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('🚀 [handleSubmit] Iniciando submit do formulário');
    setIsLoading(true);

    try {
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
        quantidade_disponivel: formData.quantidade_disponivel,
        is_prototipo: !!formData.is_prototipo,
        prototipo_label: (formData.prototipo_label || '').trim() || null,
        prototipo_observacoes_pdf: (formData.prototipo_observacoes_pdf || '').trim() || null,
        is_comercio_exterior: !!formData.is_comercio_exterior
      };

      console.log('📋 [handleSubmit] Dados do formulário:', formData);
      console.log('📋 [handleSubmit] Dados preparados para envio:', guindasteData);
      console.log('📋 [handleSubmit] Campo configuração:', guindasteData.configuração);
      console.log('📦 [handleSubmit] Quantidade disponível:', guindasteData.quantidade_disponivel);

      if (editingGuindaste) {
        console.log('🔧 [handleSubmit] Atualizando guindaste ID:', editingGuindaste.id);
        await db.updateGuindaste(editingGuindaste.id, guindasteData);
        setToast({ visible: true, message: 'Guindaste atualizado com sucesso!', type: 'success' });
      } else {
        console.log('🔧 [handleSubmit] Criando novo guindaste');
        const result = await db.createGuindaste(guindasteData);
        console.log('✅ [handleSubmit] Novo guindaste criado:', result);
        setToast({ visible: true, message: 'Guindaste criado com sucesso!', type: 'success' });
      }

      handleCloseModal();
      loadData(page, true);
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
        subtitle={isAdminConcessionaria ? 'Defina os preços da sua concessionária' : 'Cadastre e edite os guindastes'}
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
              <BlobButton
                className={`tab ${activeTab === 'guindastes' ? 'active' : ''}`}
                onClick={() => setActiveTab('guindastes')}
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
                Guindastes
              </BlobButton>
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
                      <BlobButton
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
                      </BlobButton>
                      {!isAdminConcessionaria && (
                        <BlobButton onClick={handleAddNew} className="add-btn">
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                          </svg>
                          Novo Guindaste
                        </BlobButton>
                      )}
                    </div>
                  </div>

                  {/* Barra de filtro e busca */}
                  <div className="gg-filter-bar">
                    <div className="gg-search-wrap">
                      <svg className="gg-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                      </svg>
                      <input
                        className="gg-search-input"
                        placeholder="Buscar modelo..."
                        value={busca}
                        onChange={e => { setBusca(e.target.value); setSelectedModeloGrupo(null); }}
                      />
                    </div>
                    <div className="gg-capacity-chips">
                      <button
                        className={`gg-chip ${filtroCapacidade === 'todos' ? 'active' : ''}`}
                        onClick={() => { setFiltroCapacidade('todos'); setSelectedModeloGrupo(null); }}
                      >Todos</button>
                      {getCapacidadesUnicas().map(cap => (
                        <button
                          key={cap}
                          className={`gg-chip ${filtroCapacidade === cap ? 'active' : ''}`}
                          onClick={() => { setFiltroCapacidade(cap); setSelectedModeloGrupo(null); }}
                        >{cap} Ton</button>
                      ))}
                    </div>
                    <span className="gg-total-count">{guindastes.length} guindaste(s) · {getUniqueModelos().length} modelo(s)</span>
                  </div>

                  {/* Workspace 2 painéis */}
                  <div className="gg-workspace">
                    {/* Painel esquerdo: lista de modelos */}
                    <div className="gg-models-panel">
                      <div className="gg-panel-header">
                        <span>Modelos</span>
                        <span className="gg-badge">{getUniqueModelos().length}</span>
                      </div>
                      <div className="gg-models-list">
                        {getUniqueModelos().length === 0 ? (
                          <div className="gg-no-models">Nenhum modelo encontrado</div>
                        ) : (
                          getUniqueModelos().map(m => (
                            <button
                              key={m.key}
                              className={`gg-model-item ${selectedModeloGrupo === m.key ? 'active' : ''}`}
                              onClick={() => setSelectedModeloGrupo(selectedModeloGrupo === m.key ? null : m.key)}
                            >
                              <div className="gg-model-thumb">
                                <LazyGuindasteImage
                                  guindasteId={m.representante.id}
                                  subgrupo={m.representante.subgrupo}
                                  className="gg-thumb-img"
                                  alt={m.key}
                                />
                              </div>
                              <div className="gg-model-meta">
                                <span className="gg-model-name">{m.key}</span>
                                <span className="gg-model-cap">{m.capacidade} Ton · {m.count} config.</span>
                              </div>
                              {selectedModeloGrupo === m.key && (
                                <svg className="gg-model-arrow" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M8 5v14l11-7z"/>
                                </svg>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Painel direito: configurações do modelo selecionado */}
                    <div className="gg-configs-panel">
                      {selectedModeloGrupo ? (
                        <>
                          <div className="gg-configs-head">
                            <div>
                              <h3 className="gg-configs-title">{selectedModeloGrupo}</h3>
                              <span className="gg-configs-sub">{getGuindastesDoModelo(selectedModeloGrupo).length} configurações disponíveis</span>
                            </div>
                          </div>
                          <div className="gg-configs-list">
                            {getGuindastesDoModelo(selectedModeloGrupo).map(guindaste => (
                              <div key={guindaste.id} className="gg-config-row">
                                <div className="gg-config-thumb">
                                  <LazyGuindasteImage
                                    guindasteId={guindaste.id}
                                    subgrupo={guindaste.subgrupo}
                                    className="gg-thumb-img"
                                    alt={guindaste.subgrupo}
                                  />
                                </div>
                                <div className="gg-config-info">
                                  <span className="gg-config-name">{guindaste.subgrupo}</span>
                                  <div className="gg-config-tags">
                                    {guindaste.codigo_referencia && (
                                      <span className="gg-tag gg-tag-code">{guindaste.codigo_referencia}</span>
                                    )}
                                    {guindaste.modelo && (
                                      <span className="gg-tag gg-tag-model">{guindaste.modelo}</span>
                                    )}
                                    {guindaste.is_comercio_exterior && (
                                      <span className="gg-tag gg-tag-ext">Comércio Exterior</span>
                                    )}
                                    {isAdminConcessionaria && (
                                      <span className={`gg-tag ${precosConcessionariaMap[guindaste.id] ? 'gg-tag-price-set' : 'gg-tag-price-unset'}`}>
                                        {precosConcessionariaMap[guindaste.id] ? formatCurrency(precosConcessionariaMap[guindaste.id]) : 'Preço não definido'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="gg-config-actions">
                                  {isAdminConcessionaria ? (
                                    <BlobButton
                                      className="gg-action-btn gg-btn-price"
                                      title="Preço da Concessionária"
                                      onClick={() => openPrecoConcessionaria(guindaste)}
                                    >
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="12" y1="1" x2="12" y2="23" />
                                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                                      </svg>
                                      Preço
                                    </BlobButton>
                                  ) : (
                                    <>
                                      <BlobButton
                                        className="gg-action-btn gg-btn-edit"
                                        title="Editar Guindaste"
                                        onClick={() => handleEdit(guindaste)}
                                      >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                        </svg>
                                        Editar
                                      </BlobButton>
                                      <BlobButton
                                        className="gg-action-btn gg-btn-prices"
                                        title="Preços por Região"
                                        onClick={() => { setGuindasteIdPrecos(guindaste.id); setShowPrecosModal(true); }}
                                      >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                          <line x1="12" y1="1" x2="12" y2="23" />
                                          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                                        </svg>
                                        Preços
                                      </BlobButton>
                                      <BlobButton
                                        className="gg-action-btn gg-btn-delete"
                                        title="Remover Guindaste"
                                        onClick={() => handleDeleteClick(guindaste.id)}
                                      >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                          <polyline points="3 6 5 6 21 6" />
                                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                          <line x1="10" y1="11" x2="10" y2="17" />
                                          <line x1="14" y1="11" x2="14" y2="17" />
                                        </svg>
                                        Excluir
                                      </BlobButton>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="gg-empty-selection">
                          <div className="gg-empty-icon">🏗️</div>
                          <h3>Selecione um modelo</h3>
                          <p>Escolha um modelo na lista ao lado para ver suas configurações e ações disponíveis</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}


        </div>
      </div>

      {showModal && (
        <div className="modern-modal-overlay" onClick={handleCloseModal}>
          <div className="modern-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modern-header">
              <h2>{formData.subgrupo || (editingGuindaste ? 'Editar Guindaste' : 'Novo Guindaste')}</h2>
              <div className="modern-header-actions">
                <button type="button" onClick={handleCloseModal} className="btn-modern-cancel">
                  Cancelar
                </button>
                <button type="submit" form="guindaste-form" className="btn-modern-save" disabled={isLoading}>
                  {isLoading ? 'Salvando...' : 'Salvar produto'}
                </button>
              </div>
            </div>

            <form id="guindaste-form" onSubmit={handleSubmit} className="modern-body">
              
              <div className="modern-form-group modern-nome-full">
                <label>Nome / Subgrupo *</label>
                <input
                  type="text"
                  value={formData.subgrupo}
                  onChange={e => handleInputChange('subgrupo', e.target.value)}
                  placeholder="Ex: Guindaste Hidráulico"
                  required
                  className="modern-input"
                />
              </div>

              <div className="modern-top-section">
                <div className="modern-left-col">
                  <div className="modern-image-box">
                    <ImageUpload onImageUpload={handleImageUpload} currentImageUrl={formData.imagem_url} />
                    {formData.imagem_url && (
                      <div className="modern-image-preview">
                        <img src={formData.imagem_url} alt="Principal" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="modern-right-col">
                  <div className="modern-grid-3">
                    <div className="modern-form-group">
                      <label>Código <span title="Código de Referência" style={{cursor:'help', color:'#3b82f6'}}>ℹ️</span></label>
                      <input
                        type="text"
                        value={formData.codigo_referencia}
                        onChange={e => handleInputChange('codigo_referencia', e.target.value)}
                        placeholder="Ex: GSI65001"
                        required
                        className="modern-input"
                      />
                    </div>
                    <div className="modern-form-group">
                      <label>Modelo *</label>
                      <input
                        type="text"
                        value={formData.modelo}
                        onChange={e => handleInputChange('modelo', e.target.value)}
                        placeholder="Ex: GH-25T"
                        required
                        className="modern-input"
                      />
                    </div>
                    <div className="modern-form-group">
                      <label>Grupo *</label>
                      <input
                        type="text"
                        value={formData.grupo}
                        onChange={e => handleInputChange('grupo', e.target.value)}
                        placeholder="Ex: Interno"
                        required
                        className="modern-input"
                      />
                    </div>
                  </div>

                  <div className="modern-grid-3">
                    <div className="modern-form-group">
                      <label>FINAME *</label>
                      <input
                        type="text"
                        value={formData.finame}
                        onChange={e => handleInputChange('finame', e.target.value)}
                        placeholder="Ex: 123456789"
                        required
                        className="modern-input"
                      />
                    </div>
                    <div className="modern-form-group">
                      <label>NCM *</label>
                      <input
                        type="text"
                        value={formData.ncm}
                        onChange={e => handleInputChange('ncm', e.target.value)}
                        placeholder="Ex: 84264100"
                        required
                        className="modern-input"
                      />
                    </div>
                    <div className="modern-form-group">
                      <label>Qtde. Disponível <span title="Estoque para pronta entrega" style={{cursor:'help', color:'#3b82f6'}}>ℹ️</span></label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={formData.quantidade_disponivel}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === '') { handleInputChange('quantidade_disponivel', ''); return; }
                          const num = parseInt(val, 10);
                          handleInputChange('quantidade_disponivel', isNaN(num) ? 0 : num);
                        }}
                        onBlur={e => {
                          const val = e.target.value;
                          if (val === '' || val === null || val === undefined) {
                            handleInputChange('quantidade_disponivel', 0);
                          }
                        }}
                        className="modern-input"
                      />
                    </div>
                  </div>

                  <div className="modern-grid-2">
                    <div className="modern-form-group">
                      <label>Configuração Completa *</label>
                      <select
                        value={formData.configuração}
                        onChange={e => handleInputChange('configuração', e.target.value)}
                        required
                        className="modern-input"
                      >
                        <option value="">Selecione uma configuração</option>
                        <option value="STANDARD - Pedido Padrão">STANDARD - Pedido Padrão</option>
                        <option value="CR - Controle Remoto">CR - Controle Remoto</option>
                        <option value="EH - Extensiva Hidráulica">EH - Extensiva Hidráulica</option>
                        <option value="P - Preparação p/ Perfuratriz">P - Preparação p/ Perfuratriz</option>
                        <option value="GR - Preparação p/ Garra e Rotator">GR - Preparação p/ Garra e Rotator</option>
                        <option value="Caminhão 3/4">Caminhão 3/4</option>
                        <option value="CR/EH - Controle Remoto e Extensiva Hidráulica">CR/EH - CR e Extensiva Hidráulica</option>
                        <option value="CR/EH/P - Controle Remoto, Extensiva Hidráulica e Preparação p/ Perfuratriz">CR/EH/P - CR, Ext. Hidr. e Prep. Perfuratriz</option>
                        <option value="EH/P - Extensiva Hidráulica e Preparação p/ Perfuratriz">EH/P - Ext. Hidr. e Prep. Perfuratriz</option>
                        <option value="CR/GR - Controle Remoto e Preparação p/ Garra e Rotator">CR/GR - CR e Prep. Garra/Rotator</option>
                        <option value="EH/GR - Extensiva Hidráulica e Preparação p/ Garra e Rotador">EH/GR - Ext. Hidr. e Prep. Garra/Rotador</option>
                      </select>
                    </div>
                    <div className="modern-form-group">
                      <label>Controle Remoto</label>
                      <select
                        value={formData.tem_contr}
                        onChange={e => handleInputChange('tem_contr', e.target.value)}
                        required
                        className="modern-input"
                      >
                        <option value="Sim">Sim</option>
                        <option value="Não">Não</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="modern-grid-3">
                    <div className="modern-form-group">
                      <label>Lanças (Config. Kg) <span title="Ex: 3h1m" style={{cursor:'help', color:'#3b82f6'}}>ℹ️</span></label>
                      <input
                        type="text"
                        value={formData.peso_kg}
                        onChange={e => handleInputChange('peso_kg', e.target.value)}
                        placeholder="Ex: 3h1m"
                        required
                        className="modern-input"
                      />
                    </div>
                  </div>

                </div>
              </div>

              {/* TABS E SEÇÕES INFERIORES */}
              <div className="modern-section-tabs">
                <div className="modern-tab-item">Características e Detalhes</div>
              </div>

              <div className="modern-bottom-section">
                <div className="modern-grid-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <div className="modern-form-group">
                    <label>Descrição Técnica *</label>
                    <textarea
                      value={formData.descricao}
                      onChange={e => handleInputChange('descricao', e.target.value)}
                      placeholder="Descreva as características técnicas do guindaste..."
                      required
                      className="modern-textarea"
                    />
                  </div>
                  <div className="modern-form-group">
                    <label>O que NÃO está incluído *</label>
                    <textarea
                      value={formData.nao_incluido}
                      onChange={e => handleInputChange('nao_incluido', e.target.value)}
                      placeholder="Liste os itens que não estão incluídos no produto..."
                      required
                      className="modern-textarea"
                    />
                  </div>
                </div>

                <div className="modern-divider"></div>

                <div className="modern-form-group">
                  <label style={{ fontSize: '14px', color: '#334155', fontWeight: '600' }}>Imagens Adicionais</label>
                  <input
                    type="file"
                    multiple
                    onChange={handleImagensAdicionaisChange}
                    accept="image/*"
                    className="modern-file-input"
                  />
                  {formData.imagens_adicionais && formData.imagens_adicionais.length > 0 && (
                    <div className="modern-imagens-grid">
                      {formData.imagens_adicionais.map((imgUrl, index) => (
                        <div key={index} className="modern-imagem-item">
                          <img src={imgUrl} alt={`Adicional ${index + 1}`} />
                          <button type="button" onClick={() => removeImagemAdicional(index)} className="modern-remove-img">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="modern-divider"></div>

                <div className="modern-grid-3">
                  <div className="modern-form-group">
                    <label>Equipamento de Comércio Exterior?</label>
                    <select
                      value={formData.is_comercio_exterior ? 'sim' : 'nao'}
                      onChange={e => handleInputChange('is_comercio_exterior', e.target.value === 'sim')}
                      className="modern-input"
                    >
                      <option value="nao">Não</option>
                      <option value="sim">Sim, Exclusivo</option>
                    </select>
                  </div>
                  <div className="modern-form-group">
                    <label>É protótipo?</label>
                    <select
                      value={formData.is_prototipo ? 'sim' : 'nao'}
                      onChange={e => handleInputChange('is_prototipo', e.target.value === 'sim')}
                      className="modern-input"
                    >
                      <option value="nao">Não</option>
                      <option value="sim">Sim</option>
                    </select>
                  </div>
                  <div className="modern-form-group">
                    <label>Label do Protótipo</label>
                    <input
                      type="text"
                      value={formData.prototipo_label}
                      onChange={e => handleInputChange('prototipo_label', e.target.value)}
                      placeholder="Ex: PROTÓTIPO"
                      className="modern-input"
                      disabled={!formData.is_prototipo}
                    />
                  </div>
                </div>
                
                <div className="modern-form-group">
                  <label>Observações do Protótipo no PDF</label>
                  <input
                    type="text"
                    value={formData.prototipo_observacoes_pdf}
                    onChange={e => handleInputChange('prototipo_observacoes_pdf', e.target.value)}
                    placeholder="Ex: Equipamento protótipo, sujeito a disponibilidade..."
                    className="modern-input"
                    disabled={!formData.is_prototipo}
                  />
                </div>
                
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Preços por Região */}
      {!isAdminConcessionaria && showPrecosModal && (
        <PrecosPorRegiaoModal
          guindasteId={guindasteIdPrecos}
          open={showPrecosModal}
          onClose={() => {
            setShowPrecosModal(false);
            setGuindasteIdPrecos(null);
          }}
        />
      )}

      {showPrecoConcessionariaModal && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Preço da Concessionária</h2>
              <BlobButton onClick={closePrecoConcessionaria} className="close-btn">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </BlobButton>
            </div>

            <div style={{ padding: '0 24px 24px 24px' }}>
              <div style={{ marginBottom: '14px', color: '#374151', fontWeight: 600 }}>
                {guindasteSelecionadoPreco?.subgrupo}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                <div style={{ background: '#f3f4f6', borderRadius: '10px', padding: '12px', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 700, marginBottom: '6px' }}>
                    PREÇO STARK (REFERÊNCIA) — {concessionaria?.uf || ''}
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#111827' }}>
                    {formatCurrency(precoStarkReferencia || 0)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px' }}>
                    Região: {regiaoReferencia}
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor="preco_concessionaria">Preço da Concessionária *</label>
                  <input
                    id="preco_concessionaria"
                    type="number"
                    step="0.01"
                    min="0"
                    value={precoConcessionariaInput}
                    onChange={(e) => setPrecoConcessionariaInput(e.target.value)}
                    placeholder="Ex: 79900"
                    required
                  />
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: '18px' }}>
                <BlobButton type="button" onClick={closePrecoConcessionaria} className="cancel-btn">Cancelar</BlobButton>
                <BlobButton type="button" onClick={salvarPrecoConcessionaria} className="save-btn">Salvar Preço</BlobButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content delete-modal">
            <div className="modal-header">
              <h2>⚠️ Confirmar Exclusão</h2>
              <BlobButton onClick={() => setShowDeleteModal(false)} className="close-btn">×</BlobButton>
            </div>
            <div className="modal-body">
              <p>Tem certeza que deseja excluir este guindaste?</p>
              <p className="warning-text">Esta ação não pode ser desfeita.</p>
            </div>
            <div className="modal-footer">
              <BlobButton onClick={() => setShowDeleteModal(false)} className="cancel-btn">
                Cancelar
              </BlobButton>
              <BlobButton onClick={handleConfirmDelete} className="delete-btn">
                Excluir
              </BlobButton>
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