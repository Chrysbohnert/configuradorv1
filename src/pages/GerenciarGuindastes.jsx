import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
// TODO: Implementar virtual scrolling com react-window quando necessário (100+ itens)
// import { FixedSizeList } from 'react-window';
import AdminNavigation from '../components/AdminNavigation';
import UnifiedHeader from '../components/UnifiedHeader';
import ImageUpload from '../components/ImageUpload';
import OptimizedGuindasteCard from '../components/OptimizedGuindasteCard';

import { db } from '../config/supabase';
import cacheManager, { withCache } from '../utils/cacheManager';
import '../styles/GerenciarGuindastes.css';
import PrecosPorRegiaoModal from '../components/PrecosPorRegiaoModal';

/**
 * PÁGINA GERENCIAR GUINDASTES - OTIMIZADA ✨
 * 
 * Otimizações aplicadas:
 * 1. ✅ Lazy loading de imagens
 * 2. ✅ Componentes memoizados
 * 3. ✅ Query otimizada com filtros server-side
 * 4. ✅ Sistema de cache in-memory (5 minutos)
 * 5. ✅ Lazy state initialization
 * 6. ✅ useCallback para handlers estáveis
 * 7. ✅ useMemo para computações pesadas
 * 
 * @author SpecEngineer
 */
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
  
  // Lazy initialization para formData (evita criar objeto complexo em todo render)
  const [formData, setFormData] = useState(() => ({
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
  }));
  
  const [showPrecosModal, setShowPrecosModal] = useState(false);
  const [guindasteIdPrecos, setGuindasteIdPrecos] = useState(null);
  const [filtroCapacidade, setFiltroCapacidade] = useState(''); // Vazio até carregar
  const [hasInitializedFiltro, setHasInitializedFiltro] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [guindasteToDelete, setGuindasteToDelete] = useState(null);
  
  // Estados para busca avançada
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [useVirtualScroll, setUseVirtualScroll] = useState(false);

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

  /**
   * Carrega dados com cache e filtros server-side
   * Otimizado para reduzir payload e melhorar performance
   * ⚡ OTIMIZAÇÃO: Verifica cache ANTES de mostrar loading (UX instantânea)
   */
  const loadData = useCallback(async (pageToLoad = page, forceRefresh = false) => {
    try {
      // Parâmetros da query otimizada
      const queryParams = {
        page: pageToLoad,
        pageSize,
        capacidade: null, // ← SEMPRE NULL: filtro server-side desabilitado
        fieldsOnly: false, // Garante que busca todos os campos
        noPagination: true // ← BUSCA TODOS os guindastes (sem limite de 24)
      };

      // ⚡ OTIMIZAÇÃO: Verificar cache ANTES de mostrar loading
      if (!forceRefresh) {
        const cacheKey = 'guindastes';
        const cachedData = cacheManager.get(cacheKey, queryParams);
        
        if (cachedData) {
          // ✅ CACHE HIT: Dados instantâneos, sem loading!
          console.log('⚡ Cache HIT: Dados carregados instantaneamente');
          setGuindastes(cachedData.data);
          setTotal(cachedData.count || 0);
          setPage(pageToLoad);
          setIsLoading(false);
          return; // Não precisa buscar do banco
        }
      }

      // Só mostra loading se NÃO tiver cache
      setIsLoading(true);

      let data, count;

      if (forceRefresh) {
        // Invalida cache e busca novamente
        cacheManager.invalidatePattern('guindastes:');
        const result = await db.getGuindastesLite(queryParams);
        data = result.data;
        count = result.count;
      } else {
        // Usa cache (5 minutos de TTL)
        const result = await withCache(
          () => db.getGuindastesLite(queryParams),
          'guindastes',
          queryParams,
          5 * 60 * 1000
        );
        data = result.data;
        count = result.count;
      }

      // Debug: Verificar dados recebidos
      console.log('📊 Dados recebidos do banco:', {
        total_carregado: data.length,
        total_banco: count,
        esta_completo: data.length === count ? '✅ SIM' : '❌ NÃO',
        amostra: data.slice(0, 3).map(g => ({
          id: g.id,
          subgrupo: g.subgrupo,
          modelo: g.modelo,
          capacidade: g.subgrupo?.match(/(\d+\.?\d*)/)?.[1] || '?',
          tem_imagem: !!g.imagem_url
        }))
      });
      
      // Alerta se não carregou tudo
      if (data.length < count) {
        console.warn('⚠️ ATENÇÃO: Carregou apenas', data.length, 'de', count, 'guindastes!');
      } else {
        console.log('✅ Todos os', count, 'guindastes foram carregados!');
      }

      setGuindastes(data);
      setTotal(count || 0);
      setPage(pageToLoad);
      
      // Define a capacidade inicial (primeira) apenas na primeira carga
      if (!hasInitializedFiltro && Array.isArray(data) && data.length > 0) {
        const capacidades = extractCapacidadesUnicas(data);
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
  }, [page, filtroCapacidade, hasInitializedFiltro]);

  // Recarrega quando filtro de capacidade muda
  useEffect(() => {
    if (hasInitializedFiltro) {
      loadData(1);
    }
  }, [filtroCapacidade]);

  // Persistir preferência do usuário
  useEffect(() => {
    if (filtroCapacidade) {
      localStorage.setItem('gg_capacidade', filtroCapacidade);
    }
  }, [filtroCapacidade]);

  // Debounce para busca (performance)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms de delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Ativar virtual scroll automaticamente se houver muitos guindastes
  useEffect(() => {
    setUseVirtualScroll(guindastes.length > 50);
  }, [guindastes.length]);

  /**
   * Extrai capacidades únicas de um array de guindastes
   * Memoizada para evitar reprocessamento
   */
  const extractCapacidadesUnicas = useMemo(() => (guindastesList) => {
    const capacidades = new Set();
    guindastesList.forEach(guindaste => {
      const subgrupo = guindaste.subgrupo || '';
      const modeloBase = subgrupo.replace(/^(Guindaste\s+)+/, '').split(' ').slice(0, 2).join(' ');
      const match = modeloBase.match(/(\d+\.?\d*)/);
      if (match) capacidades.add(match[1]);
    });
    return Array.from(capacidades).sort((a, b) => parseFloat(a) - parseFloat(b));
  }, []);

  /**
   * Capacidades únicas da lista atual
   * Memoizado para não recalcular em todo render
   */
  const capacidadesUnicas = useMemo(() => {
    return extractCapacidadesUnicas(guindastes);
  }, [guindastes, extractCapacidadesUnicas]);

  /**
   * Função para extrair capacidades únicas (compatibilidade)
   */
  const getCapacidadesUnicas = () => capacidadesUnicas;

  // Inicializar filtro com a primeira capacidade (6.5t, etc)
  // IMPORTANTE: Deve estar DEPOIS da declaração de capacidadesUnicas
  useEffect(() => {
    if (guindastes.length > 0 && !hasInitializedFiltro && capacidadesUnicas.length > 0) {
      const primeiraCapacidade = capacidadesUnicas[0]; // Menor capacidade
      setFiltroCapacidade(primeiraCapacidade);
      setHasInitializedFiltro(true);
      console.log(`🎯 Filtro inicial configurado: ${primeiraCapacidade}t`);
    }
  }, [guindastes.length, capacidadesUnicas, hasInitializedFiltro]);

  /**
   * Extrai a capacidade de um guindaste individual
   * Extração melhorada para evitar falsos positivos
   */
  const extractCapacidade = useCallback((guindaste) => {
    const subgrupo = guindaste.subgrupo || '';
    const modeloBase = subgrupo.replace(/^(Guindaste\s+)+/, '').split(' ').slice(0, 2).join(' ');
    const match = modeloBase.match(/(\d+\.?\d*)/);
    return match ? match[1] : null;
  }, []);

  /**
   * Filtra guindastes por capacidade E busca textual
   * Memoizado para evitar reprocessamento
   * FILTRO CLIENT-SIDE: Mais preciso que o server-side
   */
  const guindastesFiltrados = useMemo(() => {
    let filtrados = guindastes;
    
    // Filtro 1: Capacidade (ignora se estiver vazio ou 'todos')
    if (filtroCapacidade && filtroCapacidade !== 'todos') {
      filtrados = filtrados.filter(guindaste => {
        const cap = extractCapacidade(guindaste);
        return cap && cap === filtroCapacidade;
      });
    }
    
    // Filtro 2: Busca textual
    if (debouncedSearchTerm.trim()) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filtrados = filtrados.filter(guindaste => {
        const subgrupo = (guindaste.subgrupo || '').toLowerCase();
        const modelo = (guindaste.modelo || '').toLowerCase();
        return subgrupo.includes(searchLower) || modelo.includes(searchLower);
      });
    }
    
    const filtroLabel = (!filtroCapacidade || filtroCapacidade === 'todos') ? 'todos' : `${filtroCapacidade}t`;
    console.log(`🔍 Filtro ${filtroLabel} + busca "${debouncedSearchTerm}": ${filtrados.length}/${guindastes.length} guindastes`);
    return filtrados;
  }, [guindastes, filtroCapacidade, debouncedSearchTerm, extractCapacidade]);

  const getGuindastesFiltrados = () => guindastesFiltrados;

  /**
   * Guindastes agrupados por capacidade (quando filtro = 'todos')
   * Memoizado para evitar reprocessamento
   */
  const guindastesPorCapacidade = useMemo(() => {
    const grupos = {};
    capacidadesUnicas.forEach(cap => {
      grupos[cap] = guindastes.filter(g => extractCapacidade(g) === cap);
    });
    return grupos;
  }, [guindastes, capacidadesUnicas, extractCapacidade]);

  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      if (field === 'configuração') {
        const temControleRemoto = value.includes('CR') || value.includes('Controle Remoto') ? 'Sim' : 'Não';
        newData.tem_contr = temControleRemoto;
      }
      return newData;
    });
  }, []);

  const handleImageUpload = useCallback((imageUrl) => {
    setFormData(prev => ({ ...prev, imagem_url: imageUrl }));
  }, []);

  // Removido upload de gráfico de carga (PDF é anexado automaticamente na proposta)

  const handleImagensAdicionaisChange = useCallback(async (e) => {
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
  }, []);

  const removeImagemAdicional = useCallback((index) => {
    setFormData(prev => ({ ...prev, imagens_adicionais: prev.imagens_adicionais.filter((_, i) => i !== index) }));
  }, []);

  const handleEdit = useCallback(async (item) => {
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
    document.body.classList.add('modal-open');
  }, []);

  const handleDeleteClick = useCallback((id) => {
    setGuindasteToDelete(id);
    setShowDeleteModal(true);
    document.body.classList.add('modal-open');
  }, []);

  const confirmDelete = useCallback(async () => {
    if (guindasteToDelete) {
      try {
        await db.deleteGuindaste(guindasteToDelete);
        // Invalida cache e recarrega
        await loadData(page, true);
        setShowDeleteModal(false);
        setGuindasteToDelete(null);
        document.body.classList.remove('modal-open');
      } catch (error) {
        console.error('Erro ao remover guindaste:', error);
        alert('Erro ao remover guindaste. Tente novamente.');
      }
    }
  }, [guindasteToDelete, page, loadData]);

  const cancelDelete = useCallback(() => {
    setShowDeleteModal(false);
    setGuindasteToDelete(null);
    document.body.classList.remove('modal-open');
  }, []);

  const handleCloseModal = useCallback(() => {
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
    document.body.classList.remove('modal-open');
  }, []);

  const handleAddNew = useCallback(() => {
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
    document.body.classList.add('modal-open');
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    try {
      if (!formData.subgrupo || !formData.modelo || !formData.peso_kg || !formData.configuração) {
        alert('Por favor, preencha todos os campos obrigatórios: Subgrupo, Modelo, Configuração de lanças e Configuração.');
        return;
      }
      
      const configuracaoLancas = String(formData.peso_kg).trim();
      if (!configuracaoLancas) {
        alert('Por favor, insira a configuração de lanças (ex: 3h1m, 4h2m).');
        return;
      }
      
      const guindasteData = {
        subgrupo: formData.subgrupo.trim(),
        modelo: formData.modelo.trim(),
        peso_kg: configuracaoLancas,
        configuração: formData.configuração.trim(),
        tem_contr: formData.tem_contr,
        imagem_url: formData.imagem_url?.trim() || null,
        descricao: formData.descricao?.trim() || null,
        nao_incluido: formData.nao_incluido?.trim() || null,
        imagens_adicionais: formData.imagens_adicionais || [],
        finame: formData.finame?.trim() || null,
        ncm: formData.ncm?.trim() || null
      };
      
      if (editingGuindaste) {
        await db.updateGuindaste(editingGuindaste.id, guindasteData);
      } else {
        await db.createGuindaste(guindasteData);
      }
      
      // Invalida cache e recarrega
      await loadData(page, true);
      handleCloseModal();
      alert('Guindaste salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar guindaste:', error);
      alert(`Erro ao salvar guindaste: ${error.message}`);
    }
  }, [formData, editingGuindaste, page, loadData, handleCloseModal]);

  const handlePrecosClick = useCallback((guindasteId) => {
    setGuindasteIdPrecos(guindasteId);
    setShowPrecosModal(true);
  }, []);

  // Debug global: Expor dados para inspeção
  if (typeof window !== 'undefined') {
    window.debugGuindastes = () => {
      console.log('🔍 DEBUG - Estado Atual:', {
        total_guindastes: guindastes.length,
        filtro_ativo: filtroCapacidade,
        guindastes_filtrados: guindastesFiltrados.length,
        cache_stats: cacheManager.getStats(),
        guindastes: guindastes.map(g => ({
          id: g.id,
          subgrupo: g.subgrupo,
          modelo: g.modelo,
          capacidade_extraida: extractCapacidade(g),
          tem_imagem: !!g.imagem_url,
          imagem_url: g.imagem_url?.substring(0, 50) + '...'
        }))
      });
      return guindastes;
    };
    
    // Debug: Mostrar guindastes por capacidade
    window.debugPorCapacidade = (cap) => {
      const filtrados = guindastes.filter(g => extractCapacidade(g) === cap);
      console.log(`🔍 Guindastes de ${cap}t:`, filtrados.map(g => ({
        id: g.id,
        subgrupo: g.subgrupo,
        capacidade: extractCapacidade(g)
      })));
      return filtrados;
    };
    
    // Verificar integridade dos dados
    window.verificarIntegridade = async () => {
      console.clear();
      console.log('🔍 ===== VERIFICAÇÃO DE INTEGRIDADE =====\n');
      
      // 1. Total carregado
      console.log(`📊 Total carregado: ${guindastes.length} guindastes`);
      
      // 2. Buscar total real no banco
      console.log('🔄 Buscando total real no banco...');
      const { count: totalBanco } = await db.getGuindastesLite({ 
        noPagination: false, 
        pageSize: 1 
      });
      console.log(`💾 Total no banco: ${totalBanco} guindastes`);
      
      // 3. Comparar
      if (guindastes.length === totalBanco) {
        console.log('✅ ✅ ✅ PERFEITO! Todos os guindastes foram carregados!\n');
      } else {
        console.error(`❌ ❌ ❌ PROBLEMA! Faltam ${totalBanco - guindastes.length} guindastes!\n`);
        console.error('Solução: Recarregue a página com Ctrl+Shift+R\n');
      }
      
      // 4. Distribuição por capacidade
      console.log('📈 Distribuição por capacidade:');
      const distribuicao = {};
      guindastes.forEach(g => {
        const cap = extractCapacidade(g);
        if (cap) {
          distribuicao[cap] = (distribuicao[cap] || 0) + 1;
        }
      });
      console.table(distribuicao);
      
      console.log('\n🔍 ===== FIM DA VERIFICAÇÃO =====');
      
      return {
        carregado: guindastes.length,
        banco: totalBanco,
        ok: guindastes.length === totalBanco,
        distribuicao
      };
    };
  }

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

                {/* Busca Avançada */}
                <div className="search-container">
                  <div className="search-input-wrapper">
                    <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8"/>
                      <path d="m21 21-4.35-4.35"/>
                    </svg>
                    <input
                      type="text"
                      className="search-input"
                      placeholder="🔍 Buscar por nome ou modelo..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                      <button
                        className="search-clear"
                        onClick={() => setSearchTerm('')}
                        title="Limpar busca"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                {/* Chips Inteligentes com Contador */}
                <div className="filtro-container">
                  <div className="capacity-chips">
                    {getCapacidadesUnicas().map((capacidade) => {
                      const count = guindastesPorCapacidade[capacidade]?.length || 0;
                      return (
                        <button
                          key={capacidade}
                          type="button"
                          className={`chip chip-enhanced ${filtroCapacidade === capacidade ? 'active' : ''}`}
                          onClick={() => setFiltroCapacidade(capacidade)}
                          title={`${count} guindaste(s) de ${capacidade}t`}
                        >
                          <span className="chip-label">{capacidade}</span>
                          <span className="chip-badge">{count}</span>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      className={`chip chip-enhanced chip-all ${filtroCapacidade === 'todos' ? 'active' : ''}`}
                      onClick={() => setFiltroCapacidade('todos')}
                      title={`${guindastes.length} guindastes no total`}
                    >
                      <span className="chip-label">Todos</span>
                      <span className="chip-badge">{guindastes.length}</span>
                    </button>
                  </div>
                  <div className="filtro-info">
                    <span className="resultado-count">
                      {guindastesFiltrados.length} de {guindastes.length} guindaste(s)
                    </span>
                    {searchTerm && (
                      <span className="search-indicator">
                        🔎 Filtrando por "{searchTerm}"
                      </span>
                    )}
                  </div>
                </div>

                {isLoading ? (
                  <div className="guindastes-grid">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="guindaste-card skeleton-card">
                        <div className="skeleton-header">
                          <div className="skeleton-image"></div>
                          <div className="skeleton-text skeleton-title"></div>
                          <div className="skeleton-text skeleton-subtitle"></div>
                        </div>
                        <div className="skeleton-body">
                          <div className="skeleton-text"></div>
                          <div className="skeleton-text"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : guindastesFiltrados.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                    <p>
                      {searchTerm 
                        ? `Nenhum guindaste encontrado com "${searchTerm}"`
                        : 'Nenhum guindaste encontrado nesta categoria'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="guindastes-grid">
                    {guindastesFiltrados.map((guindaste) => (
                      <OptimizedGuindasteCard
                        key={guindaste.id}
                        guindaste={guindaste}
                        onEdit={handleEdit}
                        onDelete={handleDeleteClick}
                        onPrecos={handlePrecosClick}
                      />
                    ))}
                  </div>
                )}

                {/* Paginação: exibir apenas se houver mais de 10 itens no filtro atual */}
                {((filtroCapacidade === 'todos' ? total : guindastesFiltrados.length) > 10) && (
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
                            <img src={img} alt={`Preview ${index + 1}`} loading="lazy" />
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
