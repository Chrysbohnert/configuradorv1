import React, { useEffect, useMemo, useState } from 'react';
import { formatCurrency } from '../utils/formatters';
import { useNavigate, useOutletContext } from 'react-router-dom';
import UnifiedHeader from '../components/UnifiedHeader';
import { db } from '../config/supabase';
import { normalizarRegiaoPorUF } from '../utils/regiaoHelper';
import '../styles/GerenciarVendedores.css';

const GerenciarVendedores = () => {
  const navigate = useNavigate();
  const { user } = useOutletContext();
  const [isLoading, setIsLoading] = useState(false);
  const [vendedores, setVendedores] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingVendedor, setEditingVendedor] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null, nome: '' });
  const [metasModal, setMetasModal] = useState({ open: false, vendedor: null });
  const [metasAno, setMetasAno] = useState(new Date().getFullYear());
  const [metasData, setMetasData] = useState(Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, meta_propostas: '', meta_valor: '' })));
  const [metasSaving, setMetasSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    cpf: '',
    regiao: '',
    regioes_operacao: [],
    tipo: 'vendedor',
    senha: 'vendedor123',
  });

  useEffect(() => {
    if (user) {
      loadVendedores();
    }
  }, [user]);

  const loadVendedores = async () => {
    try {
      setIsLoading(true);

      const isAdminConcessionaria = user?.tipo === 'admin_concessionaria';
      const concessionariaId = user?.concessionaria_id;

      const [vendedoresData, propostas] = await Promise.all([
        isAdminConcessionaria
          ? db.getUsers({ concessionaria_id: concessionariaId })
          : db.getUsers(),
        db.getPropostas(),
      ]);

      const vendedoresOnly = vendedoresData.filter((v) => {
        if (isAdminConcessionaria) return v.tipo === 'vendedor_concessionaria';
        return (
          v.tipo === 'vendedor' ||
          v.tipo === 'vendedor_concessionaria' ||
          v.tipo === 'vendedor_exterior'
        );
      });

      const vendedoresComVendas = vendedoresOnly.map((vendedor) => {
        const propostasDoVendedor = propostas.filter((p) => p.vendedor_id === vendedor.id);
        const vendas = propostasDoVendedor.length;
        const valorTotal = propostasDoVendedor.reduce((soma, p) => soma + (p.valor_total || 0), 0);

        return {
          ...vendedor,
          vendas,
          valorTotal,
        };
      });

      setVendedores(vendedoresComVendas);
    } catch {
      alert('Erro ao carregar vendedores. Verifique a conexão com o banco.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const isAdminConcessionaria = user?.tipo === 'admin_concessionaria';
      const concessionariaId = user?.concessionaria_id;

      let regiaoConcessionaria = '';
      let regioesOperacaoConcessionaria = [];

      if (isAdminConcessionaria) {
        if (!concessionariaId) {
          alert('Erro: este admin não está vinculado a nenhuma concessionária.');
          return;
        }

        const c = await db.getConcessionariaById(concessionariaId);
        const regiaoNorm = c?.regiao_preco || normalizarRegiaoPorUF(c?.uf);

        const labelPorRegiao = {
          'rs-com-ie': 'RS com Inscrição Estadual',
          'rs-sem-ie': 'RS sem Inscrição Estadual',
          'centro-oeste': 'Centro-Oeste',
          'norte-nordeste': 'Norte-Nordeste',
          'sul-sudeste': 'Sul-Sudeste',
        };

        regiaoConcessionaria = labelPorRegiao[regiaoNorm] || 'Sul-Sudeste';
        regioesOperacaoConcessionaria = [regiaoConcessionaria];
      }

      const vendedorData = {
        ...formData,
        tipo: isAdminConcessionaria ? 'vendedor_concessionaria' : formData.tipo || 'vendedor',
        concessionaria_id: isAdminConcessionaria
          ? concessionariaId
          : formData.concessionaria_id ?? null,
        regiao: isAdminConcessionaria ? regiaoConcessionaria : formData.regiao,
        regioes_operacao: isAdminConcessionaria
          ? regioesOperacaoConcessionaria
          : formData.regioes_operacao,
      };

      if (editingVendedor && !formData.senha.trim()) {
        delete vendedorData.senha;
      }

      if (editingVendedor) {
        await db.updateUser(editingVendedor.id, vendedorData);
      } else {
        await db.createUser(vendedorData);
      }

      handleCloseModal();
      loadVendedores();
    } catch (error) {
      console.error('Erro ao salvar vendedor:', error);
      alert('Erro ao salvar vendedor. Tente novamente.');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingVendedor(null);
    setShowPassword(false);
    setFormData({
      nome: '',
      email: '',
      telefone: '',
      cpf: '',
      regiao: '',
      regioes_operacao: [],
      tipo: 'vendedor',
      senha: 'vendedor123',
    });
  };

  const handleAddNew = () => {
    setEditingVendedor(null);
    setFormData({
      nome: '',
      email: '',
      telefone: '',
      cpf: '',
      regiao: '',
      regioes_operacao: [],
      tipo: 'vendedor',
      senha: 'vendedor123',
    });
    setShowPassword(false);
    setShowModal(true);
  };

  const handleEditVendedor = (vendedor) => {
    setEditingVendedor(vendedor);
    setFormData({
      nome: vendedor.nome,
      email: vendedor.email,
      telefone: vendedor.telefone,
      cpf: vendedor.cpf,
      regiao: vendedor.regiao || '',
      regioes_operacao: vendedor.regioes_operacao || [],
      tipo: vendedor.tipo,
      senha: '',
    });
    setShowPassword(false);
    setShowModal(true);
  };

  const handleDeleteVendedor = (id) => {
    const vend = vendedores.find((v) => v.id === id);
    setConfirmDelete({ open: true, id, nome: vend?.nome || '' });
  };

  const confirmDeleteVendedor = async () => {
    if (!confirmDelete.id) return;

    try {
      await db.deleteUser(confirmDelete.id);
      await loadVendedores();
      setConfirmDelete({ open: false, id: null, nome: '' });
    } catch (error) {
      console.error('Erro ao remover vendedor:', error);
      alert('Erro ao remover vendedor.');
    }
  };

  const vendedoresFiltrados = useMemo(() => {
    const termo = searchTerm.trim().toLowerCase();

    return vendedores.filter((vendedor) => {
      const matchBusca =
        !termo ||
        vendedor.nome?.toLowerCase().includes(termo) ||
        vendedor.email?.toLowerCase().includes(termo) ||
        vendedor.telefone?.toLowerCase().includes(termo) ||
        vendedor.cpf?.toLowerCase().includes(termo);

      const matchStatus =
        statusFilter === 'todos' ||
        (statusFilter === 'com-vendas' && (vendedor.vendas || 0) > 0) ||
        (statusFilter === 'sem-vendas' && (vendedor.vendas || 0) === 0);

      return matchBusca && matchStatus;
    });
  }, [vendedores, searchTerm, statusFilter]);

  const resumo = useMemo(() => {
    const total = vendedores.length;
    const comVendas = vendedores.filter((v) => (v.vendas || 0) > 0).length;
    const faturamentoTotal = vendedores.reduce((acc, v) => acc + (v.valorTotal || 0), 0);
    return {
      total,
      comVendas,
      faturamentoTotal,
    };
  }, [vendedores]);

  const handleOpenMetas = async (vendedor) => {
    const ano = metasAno;
    try {
      const existentes = await db.getMetasAnoVendedor(vendedor.id, ano);
      const base = Array.from({ length: 12 }, (_, i) => {
        const found = existentes.find((m) => m.mes === i + 1);
        return {
          mes: i + 1,
          meta_propostas: found ? String(found.meta_propostas) : '',
          meta_valor: found ? String(found.meta_valor) : '',
        };
      });
      setMetasData(base);
    } catch {
      setMetasData(Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, meta_propostas: '', meta_valor: '' })));
    }
    setMetasModal({ open: true, vendedor });
  };

  const handleMetasAnoChange = async (novoAno) => {
    setMetasAno(novoAno);
    if (!metasModal.vendedor) return;
    try {
      const existentes = await db.getMetasAnoVendedor(metasModal.vendedor.id, novoAno);
      const base = Array.from({ length: 12 }, (_, i) => {
        const found = existentes.find((m) => m.mes === i + 1);
        return {
          mes: i + 1,
          meta_propostas: found ? String(found.meta_propostas) : '',
          meta_valor: found ? String(found.meta_valor) : '',
        };
      });
      setMetasData(base);
    } catch {
      setMetasData(Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, meta_propostas: '', meta_valor: '' })));
    }
  };

  const handleMetasRowChange = (idx, field, value) => {
    setMetasData((prev) => prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));
  };

  const handleSalvarMetas = async () => {
    if (!metasModal.vendedor) return;
    setMetasSaving(true);
    try {
      await db.setMetasAnoVendedor(metasModal.vendedor.id, metasAno, metasData);
      alert('Metas salvas com sucesso!');
      setMetasModal({ open: false, vendedor: null });
    } catch (err) {
      alert(`Erro ao salvar metas: ${err.message}`);
    } finally {
      setMetasSaving(false);
    }
  };

  if (!user) return null;

  const isAdminConcessionaria = user?.tipo === 'admin_concessionaria';

  const MESES_NOMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  return (
    <>
      <UnifiedHeader
        showBackButton={false}
        showSupportButton={true}
        showUserInfo={true}
        user={user}
        title="Vendedores"
        subtitle="Gerencie a equipe de vendas"
      />

      <div className="gerenciar-vendedores-container">
        <div className="gerenciar-vendedores-content">
          <section className="vendedores-hero">
            <div className="vendedores-hero-glow vendedores-hero-glow-1" />
            <div className="vendedores-hero-glow vendedores-hero-glow-2" />

            <div className="vendedores-hero-top">
              <div className="hero-copy">
                <span className="hero-eyebrow">Gestão de equipe</span>
                <h1>Vendedores</h1>
                <p>Organize contatos, acompanhe a equipe e gerencie cadastros com uma interface mais elegante.</p>
              </div>

              <button onClick={handleAddNew} className="add-btn hero-add-btn">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                </svg>
                Novo Vendedor
              </button>
            </div>

            <div className="hero-toolbar">
              <div className="toolbar-search">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16a6.471 6.471 0 004.23-1.57l.27.28v.79L20 21.5 21.5 20l-6-6zM9.5 14A4.5 4.5 0 119.5 5a4.5 4.5 0 010 9z" />
                </svg>
                <input
                  type="text"
                  placeholder="Buscar por nome, email, telefone ou CPF"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="toolbar-filter">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="todos">Todos</option>
                  <option value="com-vendas">Com vendas</option>
                  <option value="sem-vendas">Sem vendas</option>
                </select>
              </div>
            </div>

            <div className="hero-kpis">
              <div className="hero-kpi-card">
                <span className="hero-kpi-label">Total</span>
                <strong>{resumo.total}</strong>
                <small>vendedores cadastrados</small>
              </div>

              <div className="hero-kpi-card">
                <span className="hero-kpi-label">Ativos em vendas</span>
                <strong>{resumo.comVendas}</strong>
                <small>com movimentação</small>
              </div>

              <div className="hero-kpi-card">
                <span className="hero-kpi-label">Faturamento</span>
                <strong>{formatCurrency(resumo.faturamentoTotal)}</strong>
                <small>volume total da equipe</small>
              </div>

            </div>
          </section>

          {isLoading ? (
            <div className="vendedores-loading-state">
              <div className="loading-spinner-vendedores" />
              <span>Carregando vendedores...</span>
            </div>
          ) : vendedoresFiltrados.length > 0 ? (
            <div className="vendedores-grid">
              {vendedoresFiltrados.map((vendedor) => {
                const iniciais = vendedor.nome
                  ?.split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 3)
                  .toUpperCase();

                return (
                  <div key={vendedor.id} className="vendedor-card-modern">
                    <div className="card-glow-line" />

                    <div className="card-header">
                      <div className="vendedor-avatar-modern">
                        <div className="avatar-circle">{iniciais}</div>
                        <div className={`status-indicator ${(vendedor.vendas || 0) > 0 ? 'active' : 'idle'}`} />
                      </div>

                      <div className="vendedor-info-principal">
                        <div className="vendedor-top-line">
                          <h3 className="vendedor-nome">{vendedor.nome}</h3>
                          <span className="vendedor-badge">
                            {vendedor.tipo === 'vendedor_exterior'
                              ? 'Vendedor Exterior'
                              : 'Vendedor'}
                          </span>
                        </div>

                        <p className="vendedor-email">{vendedor.email}</p>

                        <div className="vendedor-status-row">
                          <span className={`soft-status ${(vendedor.vendas || 0) > 0 ? 'success' : 'neutral'}`}>
                            {(vendedor.vendas || 0) > 0 ? 'Com movimentação' : 'Sem vendas'}
                          </span>

                          {vendedor.regiao && (
                            <span className="soft-status info">{vendedor.regiao}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="card-section contact-section">
                      <h4 className="section-title">
                        <svg className="section-icon" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                        </svg>
                        Contato
                      </h4>

                      <div className="info-grid">
                        <div className="info-item">
                          <span className="info-label">Telefone</span>
                          <span className="info-value">{vendedor.telefone || 'Não informado'}</span>
                        </div>

                        <div className="info-item">
                          <span className="info-label">CPF</span>
                          <span className="info-value">{vendedor.cpf || 'Não informado'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="card-section">
                      <h4 className="section-title">
                        <svg className="section-icon" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z" />
                        </svg>
                        Performance
                      </h4>

                      <div className="performance-grid">
                        <div className="performance-item">
                          <div className="performance-number">{vendedor.vendas || 0}</div>
                          <div className="performance-label">Vendas</div>
                        </div>

                        <div className="performance-item performance-item-highlight">
                          <div className="performance-number">
                            {formatCurrency(vendedor.valorTotal || 0)}
                          </div>
                          <div className="performance-label">Faturamento</div>
                        </div>

                      </div>
                    </div>

                    <div className="card-actions">
                      <button
                        onClick={() => handleOpenMetas(vendedor)}
                        className="action-btn-modern blob-btn metas-btn-modern"
                        title="Definir Metas"
                      >
                        <span className="btn-content">
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
                          </svg>
                          Metas
                        </span>
                        <span className="blob-btn__inner">
                          <span className="blob-btn__blobs">
                            <span className="blob-btn__blob"></span>
                            <span className="blob-btn__blob"></span>
                            <span className="blob-btn__blob"></span>
                            <span className="blob-btn__blob"></span>
                          </span>
                        </span>
                      </button>

                      <button
                        onClick={() => handleEditVendedor(vendedor)}
                        className="action-btn-modern blob-btn edit-btn-modern"
                        title="Editar Vendedor"
                      >
                        <span className="btn-content">
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                          </svg>
                          Editar
                        </span>
                        <span className="blob-btn__inner">
                          <span className="blob-btn__blobs">
                            <span className="blob-btn__blob"></span>
                            <span className="blob-btn__blob"></span>
                            <span className="blob-btn__blob"></span>
                            <span className="blob-btn__blob"></span>
                          </span>
                        </span>
                      </button>

                      <button
                        onClick={() => handleDeleteVendedor(vendedor.id)}
                        className="action-btn-modern blob-btn delete-btn-modern"
                        title="Remover Vendedor"
                      >
                        <span className="btn-content">
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                          </svg>
                          Remover
                        </span>
                        <span className="blob-btn__inner">
                          <span className="blob-btn__blobs">
                            <span className="blob-btn__blob"></span>
                            <span className="blob-btn__blob"></span>
                            <span className="blob-btn__blob"></span>
                            <span className="blob-btn__blob"></span>
                          </span>
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
              <h3>Nenhum vendedor encontrado</h3>
              <p>
                {searchTerm || statusFilter !== 'todos'
                  ? 'Tente ajustar a busca ou os filtros.'
                  : 'Comece adicionando o primeiro vendedor.'}
              </p>

              {!searchTerm && statusFilter === 'todos' && (
                <button onClick={handleAddNew} className="add-btn">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                  </svg>
                  Adicionar Primeiro Vendedor
                </button>
              )}
            </div>
          )}
        </div>

        {metasModal.open && (
          <div className="modal-overlay">
            <div className="modal-content modal-content-premium" style={{ maxWidth: 680 }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h2>🎯 Metas — {metasModal.vendedor?.nome}</h2>
                  <p className="modal-subtitle">Defina a meta de propostas e de valor de vendas para cada mês.</p>
                </div>
                <button type="button" className="close-modal-btn" onClick={() => setMetasModal({ open: false, vendedor: null })}>✕</button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 0 16px 0' }}>
                <label style={{ fontWeight: 700, fontSize: 14, color: '#475569' }}>Ano:</label>
                <button onClick={() => handleMetasAnoChange(metasAno - 1)} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontWeight: 700 }}>‹</button>
                <span style={{ fontWeight: 800, fontSize: 18, color: '#0f172a', minWidth: 50, textAlign: 'center' }}>{metasAno}</span>
                <button onClick={() => handleMetasAnoChange(metasAno + 1)} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontWeight: 700 }}>›</button>
              </div>

              <div style={{ display: 'grid', gap: 8, maxHeight: 420, overflowY: 'auto', paddingRight: 4 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr', gap: 8, padding: '6px 10px', background: '#f8fafc', borderRadius: 10, fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <span>Mês</span>
                  <span>Propostas (qtd)</span>
                  <span>Valor de Vendas (R$)</span>
                </div>
                {MESES_NOMES.map((nomeMes, idx) => {
                  const row = metasData[idx];
                  return (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr', gap: 8, alignItems: 'center', padding: '8px 10px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{nomeMes}</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={row.meta_propostas}
                        onChange={(e) => handleMetasRowChange(idx, 'meta_propostas', e.target.value)}
                        style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, fontWeight: 600, width: '100%' }}
                      />
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        placeholder="0"
                        value={row.meta_valor}
                        onChange={(e) => handleMetasRowChange(idx, 'meta_valor', e.target.value)}
                        style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, fontWeight: 600, width: '100%' }}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="modal-actions" style={{ marginTop: 20 }}>
                <button type="button" className="cancel-btn" onClick={() => setMetasModal({ open: false, vendedor: null })}>Cancelar</button>
                <button type="button" className="save-btn" onClick={handleSalvarMetas} disabled={metasSaving}>
                  {metasSaving ? 'Salvando...' : 'Salvar Metas'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showModal && (
          <div className="modal-overlay">
            <div className="modal-content modal-content-premium" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h2>{editingVendedor ? 'Editar Vendedor' : 'Novo Vendedor'}</h2>
                  <p className="modal-subtitle">
                    {editingVendedor
                      ? 'Atualize as informações do vendedor.'
                      : 'Preencha os dados para cadastrar um novo vendedor.'}
                  </p>
                </div>

                <button onClick={handleCloseModal} className="close-btn">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="modal-form">
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="nome">Nome Completo *</label>
                    <input
                      id="nome"
                      type="text"
                      value={formData.nome}
                      onChange={(e) => handleInputChange('nome', e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">Email *</label>
                    <input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="telefone">Telefone *</label>
                    <input
                      id="telefone"
                      type="tel"
                      value={formData.telefone}
                      onChange={(e) => handleInputChange('telefone', e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="cpf">CPF *</label>
                    <input
                      id="cpf"
                      type="text"
                      value={formData.cpf}
                      onChange={(e) => handleInputChange('cpf', e.target.value)}
                      required
                    />
                  </div>


                  {!isAdminConcessionaria && (
                    <div className="form-group">
                      <label htmlFor="tipo">Tipo de Usuário *</label>
                      <select
                        id="tipo"
                        value={formData.tipo || 'vendedor'}
                        onChange={(e) => handleInputChange('tipo', e.target.value)}
                        required
                      >
                        <option value="vendedor">Vendedor</option>
                        <option value="vendedor_exterior">Vendedor Exterior (USD)</option>
                      </select>
                    </div>
                  )}

                  {!isAdminConcessionaria && (
                    <div className="form-group form-group-full">
                      <label htmlFor="regiao">Região Principal * (Grupo de Região)</label>
                      <select
                        id="regiao"
                        value={formData.regiao || ''}
                        onChange={(e) => handleInputChange('regiao', e.target.value)}
                        required
                      >
                        <option value="">Selecione a região</option>
                        <option value="Norte-Nordeste">Norte-Nordeste (Estados do Norte e Nordeste)</option>
                        <option value="Centro-Oeste">Centro-Oeste (MT, MS, GO, DF)</option>
                        <option value="Sul-Sudeste">Sul-Sudeste (PR, SC, SP, RJ, MG, ES - exceto RS)</option>
                        <option value="RS com Inscrição Estadual">RS com Inscrição Estadual (🚜 Produtor Rural)</option>
                        <option value="RS sem Inscrição Estadual">RS sem Inscrição Estadual (📄 CNPJ/CPF)</option>
                        <option value="Comércio Exterior">Comércio Exterior (🌐 Exportação / USD)</option>
                      </select>
                      <small className="form-help">
                        Selecione o grupo de região principal. Ele será o padrão do vendedor.
                      </small>
                    </div>
                  )}

                  {!isAdminConcessionaria && (
                    <div className="form-group form-group-full">
                      <label>Regiões de Operação (para vendedores internos)</label>
                      <div className="regiao-cards">
                        {[
                          { id: 'norte-nordeste', label: 'Norte-Nordeste', desc: 'Estados do Norte e Nordeste' },
                          { id: 'centro-oeste', label: 'Centro-Oeste', desc: 'MT, MS, GO, DF' },
                          { id: 'sul-sudeste', label: 'Sul-Sudeste', desc: 'PR, SC, SP, RJ, MG, ES (exceto RS)' },
                          { id: 'rs-com-ie', label: 'RS com Inscrição Estadual', desc: '🚜 Produtor Rural (com IE)' },
                          { id: 'rs-sem-ie', label: 'RS sem Inscrição Estadual', desc: '📄 CNPJ/CPF (sem IE)' },
                          { id: 'comercio-exterior', label: 'Comércio Exterior', desc: '🌐 Exportação / Preços USD' },
                        ].map((regiao) => {
                          const active = formData.regioes_operacao?.includes(regiao.label);

                          return (
                            <label key={regiao.id} className={`regiao-card ${active ? 'active' : ''}`}>
                              <input
                                type="checkbox"
                                checked={active || false}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    handleInputChange('regioes_operacao', [
                                      ...(formData.regioes_operacao || []),
                                      regiao.label,
                                    ]);
                                  } else {
                                    handleInputChange(
                                      'regioes_operacao',
                                      (formData.regioes_operacao || []).filter((r) => r !== regiao.label)
                                    );
                                  }
                                }}
                              />
                              <div className="regiao-card-text">
                                <strong>{regiao.label}</strong>
                                <span>{regiao.desc}</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>

                      <small className="form-help">
                        Selecione os grupos de região que este vendedor pode atender.
                      </small>
                    </div>
                  )}

                  <div className="form-group form-group-full">
                    <label htmlFor="senha">Senha *</label>
                    <div className="password-input-container">
                      <input
                        id="senha"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.senha}
                        onChange={(e) => handleInputChange('senha', e.target.value)}
                        required={!editingVendedor}
                        placeholder={
                          editingVendedor
                            ? 'Deixe vazio para manter a senha atual'
                            : 'Senha padrão: vendedor123'
                        }
                      />
                      <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setShowPassword(!showPassword)}
                        title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      >
                        {showPassword ? '👁️' : '👁️‍🗨️'}
                      </button>
                    </div>
                    <small className="form-help">
                      {editingVendedor
                        ? 'Digite uma nova senha ou deixe em branco para manter a atual.'
                        : 'Senha padrão para primeiro acesso. O vendedor poderá alterar depois.'}
                    </small>
                  </div>
                </div>

                <div className="modal-actions">
                  <button type="button" onClick={handleCloseModal} className="cancel-btn">
                    Cancelar
                  </button>
                  <button type="submit" className="save-btn">
                    {editingVendedor ? 'Salvar Alterações' : 'Cadastrar Vendedor'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {confirmDelete.open && (
          <div className="modal-overlay">
            <div className="modal-content modal-content-premium modal-sm" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h2>Confirmar Remoção</h2>
                  <p className="modal-subtitle">Esta ação não poderá ser desfeita.</p>
                </div>
                <button
                  onClick={() => setConfirmDelete({ open: false, id: null, nome: '' })}
                  className="close-btn"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                  </svg>
                </button>
              </div>

              <div className="confirm-delete-copy">
                Tem certeza que deseja remover o vendedor <strong>{confirmDelete.nome}</strong>?
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setConfirmDelete({ open: false, id: null, nome: '' })}
                  className="cancel-btn"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={confirmDeleteVendedor}
                  className="save-btn danger-btn"
                >
                  Remover
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <svg xmlns="http://www.w3.org/2000/svg" version="1.1" style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <filter id="goo">
            <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="10" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 21 -7" result="goo" />
            <feBlend in2="goo" in="SourceGraphic" result="mix" />
          </filter>
        </defs>
      </svg>
    </>
  );
};

export default GerenciarVendedores;