import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import UnifiedHeader from '../components/UnifiedHeader';
import { db } from '../config/supabase';
import '../styles/GerenciarVendedores.css';

const GerenciarVendedores = () => {
  const navigate = useNavigate();
  const { user } = useOutletContext(); // Pega o usuário do AdminLayout
  const [isLoading, setIsLoading] = useState(false);
  const [vendedores, setVendedores] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingVendedor, setEditingVendedor] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    cpf: '',
    comissao: '',
    regiao: '',
    regioes_operacao: [], // Novo: múltiplas regiões para vendedores internos
    tipo: 'vendedor',
    senha: 'vendedor123' // Senha padrão
  });
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null, nome: '' });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user) {
      loadVendedores();
    }
  }, [user]);

  const loadVendedores = async () => {
    try {
      setIsLoading(true);
      // Buscar usuários e propostas
      const [vendedoresData, propostas] = await Promise.all([
        db.getUsers(),
        db.getPropostas()
      ]);
      
      // Filtrar apenas vendedores (não admins)
      const vendedoresOnly = vendedoresData.filter(v => v.tipo === 'vendedor');
      
      // Calcular vendas e valor total para cada vendedor
      const vendedoresComVendas = vendedoresOnly.map(vendedor => {
        const propostasDoVendedor = propostas.filter(p => p.vendedor_id === vendedor.id);
        const vendas = propostasDoVendedor.length;
        const valorTotal = propostasDoVendedor.reduce((soma, p) => soma + (p.valor_total || 0), 0);
        return {
          ...vendedor,
          vendas,
          valorTotal
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
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const vendedorData = {
        ...formData,
        comissao: parseFloat(formData.comissao),
        tipo: 'vendedor'
      };

      // Se está editando e a senha está vazia, não alterar a senha atual
      if (editingVendedor && !formData.senha.trim()) {
        delete vendedorData.senha;
        console.log('🔧 [handleSubmit] Senha vazia - mantendo senha atual do vendedor');
      } else if (editingVendedor && formData.senha.trim()) {
        console.log('🔧 [handleSubmit] Nova senha fornecida - será atualizada');
      }

      if (editingVendedor) {
        // Editar vendedor existente
        await db.updateUser(editingVendedor.id, vendedorData);
      } else {
        // Adicionar novo vendedor
        await db.createUser(vendedorData);
      }
      
      // ⚡ OTIMIZADO: Fechar modal imediatamente para feedback rápido
      handleCloseModal();
      
      // Recarregar dados em segundo plano
      loadVendedores();
      
    } catch (error) {
      console.error('Erro ao salvar vendedor:', error);
      alert('Erro ao salvar vendedor. Tente novamente.');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingVendedor(null);
    setFormData({
      nome: '',
      email: '',
      telefone: '',
      cpf: '',
      comissao: '',
      regiao: '',
      regioes_operacao: [],
      tipo: 'vendedor',
      senha: 'vendedor123'
    });
  };

  const handleAddNew = () => {
    setEditingVendedor(null);
    setFormData({
      nome: '',
      email: '',
      telefone: '',
      cpf: '',
      comissao: '',
      regiao: '',
      regioes_operacao: [],
      tipo: 'vendedor',
      senha: 'vendedor123'
    });
    setShowModal(true);
  };

  // Função para editar vendedor
  const handleEditVendedor = (vendedor) => {
    console.log('🔧 [handleEditVendedor] Vendedor recebido:', vendedor);
    console.log('🔧 [handleEditVendedor] Senha original:', vendedor.senha);
    
    setEditingVendedor(vendedor);
    setFormData({
      nome: vendedor.nome,
      email: vendedor.email,
      telefone: vendedor.telefone,
      cpf: vendedor.cpf,
      comissao: vendedor.comissao.toString(),
      regiao: vendedor.regiao || '',
      regioes_operacao: vendedor.regioes_operacao || [],
      tipo: vendedor.tipo,
      senha: '' // Campo vazio - usuário pode alterar ou manter atual
    });
    
    console.log('🔧 [handleEditVendedor] FormData definido com senha vazia para edição');
    setShowModal(true);
  };

  // Função para deletar vendedor
  const handleDeleteVendedor = (id) => {
    const vend = vendedores.find(v => v.id === id);
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

  

  if (!user) {
    return null;
  }

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
        <div className="page-header">
          <div className="header-info">
            <h1>Vendedores</h1>
            <p>Gerencie a equipe de vendas</p>
          </div>
          
          <div className="header-actions">
            <button onClick={handleAddNew} className="add-btn">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
              Novo Vendedor
            </button>
          </div>
        </div>

        <div className="vendedores-grid">
          {vendedores.map((vendedor) => (
            <div key={vendedor.id} className="vendedor-card-modern">
              {/* Header do Card com Avatar e Info Principal */}
              <div className="card-header">
                <div className="vendedor-avatar-modern">
                  <div className="avatar-circle">
                    {vendedor.nome.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </div>
                  <div className="status-indicator active"></div>
                </div>
                <div className="vendedor-info-principal">
                  <h3 className="vendedor-nome">{vendedor.nome}</h3>
                  <p className="vendedor-email">{vendedor.email}</p>
                  <span className="vendedor-badge">Vendedor</span>
                </div>
              </div>

              {/* Informações de Contato */}
              <div className="card-section">
                <h4 className="section-title">
                  <svg className="section-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                  </svg>
                  Contato
                </h4>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Telefone</span>
                    <span className="info-value">{vendedor.telefone}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">CPF</span>
                    <span className="info-value">{vendedor.cpf}</span>
                  </div>
                </div>
              </div>

              {/* Performance e Comissão */}
              <div className="card-section">
                <h4 className="section-title">
                  <svg className="section-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
                  </svg>
                  Performance
                </h4>
                <div className="performance-grid">
                  <div className="performance-item">
                    <div className="performance-number">{vendedor.vendas}</div>
                    <div className="performance-label">Vendas</div>
                  </div>
                  <div className="performance-item">
                    <div className="performance-number">R$ {(vendedor.valorTotal || 0).toLocaleString('pt-BR')}</div>
                    <div className="performance-label">Faturamento</div>
                  </div>
                  <div className="performance-item">
                    <div className="performance-number">{vendedor.comissao}%</div>
                    <div className="performance-label">Comissão</div>
                  </div>
                </div>
              </div>

              {/* Ações */}
              <div className="card-actions">
                <button 
                  onClick={() => handleEditVendedor(vendedor)} 
                  className="action-btn-modern edit-btn-modern" 
                  title="Editar Vendedor"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                  </svg>
                  Editar
                </button>
                <button 
                  onClick={() => handleDeleteVendedor(vendedor.id)} 
                  className="action-btn-modern delete-btn-modern" 
                  title="Remover Vendedor"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                  </svg>
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>

        {vendedores.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
            <h3>Nenhum vendedor cadastrado</h3>
            <p>Comece adicionando o primeiro vendedor</p>
            <button onClick={handleAddNew} className="add-btn">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
              Adicionar Primeiro Vendedor
            </button>
          </div>
        )}
      </div>

      {/* Modal de Cadastro/Edição */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingVendedor ? 'Editar Vendedor' : 'Novo Vendedor'}</h2>
              <button onClick={handleCloseModal} className="close-btn">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-form">
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
              
              <div className="form-group">
                <label htmlFor="comissao">Comissão (%) *</label>
                <input
                  id="comissao"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.comissao}
                  onChange={(e) => handleInputChange('comissao', e.target.value)}
                  required
                />
              </div>
              
              <div className="form-group">
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
                </select>
                <small style={{ display: 'block', marginTop: '6px', color: '#6c757d' }}>
                  💡 Selecione o GRUPO DE REGIÃO principal. Este é o padrão usado quando nenhuma região específica for selecionada.
                </small>
              </div>

              <div className="form-group">
                <label>Regiões de Operação (para vendedores internos)</label>
                <div className="regiao-cards">
                  {[
                    { id: 'norte-nordeste', label: 'Norte-Nordeste', value: 'Norte', desc: 'Estados do Norte e Nordeste' },
                    { id: 'centro-oeste', label: 'Centro-Oeste', value: 'Centro-Oeste', desc: 'MT, MS, GO, DF' },
                    { id: 'sul-sudeste', label: 'Sul-Sudeste', value: 'Sul', desc: 'PR, SC, SP, RJ, MG, ES (exceto RS)' },
                    { id: 'rs-com-ie', label: 'RS com Inscrição Estadual', value: 'Rio Grande do Sul', desc: '🚜 Produtor Rural (com IE)' },
                    { id: 'rs-sem-ie', label: 'RS sem Inscrição Estadual', value: 'Rio Grande do Sul', desc: '📄 CNPJ/CPF (sem IE)' }
                  ].map(regiao => {
                    const active = formData.regioes_operacao?.includes(regiao.label);
                    return (
                      <label key={regiao.id} className={`regiao-card ${active ? 'active' : ''}`}>
                        <input
                          type="checkbox"
                          checked={active || false}
                          onChange={(e) => {
                            if (e.target.checked) {
                              handleInputChange('regioes_operacao', [...(formData.regioes_operacao || []), regiao.label]);
                            } else {
                              handleInputChange('regioes_operacao', (formData.regioes_operacao || []).filter(r => r !== regiao.label));
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
                  💡 Selecione os GRUPOS DE REGIÃO que este vendedor pode atender. Estes grupos correspondem aos preços cadastrados dos guindastes. Se nenhum for selecionado, ele usará apenas a região principal.
                </small>
              </div>
              
              <div className="form-group">
                <label htmlFor="senha">Senha *</label>
                <div className="password-input-container">
                  <input
                    id="senha"
                    type={showPassword ? "text" : "password"}
                    value={formData.senha}
                    onChange={(e) => handleInputChange('senha', e.target.value)}
                    required={!editingVendedor}
                    placeholder={editingVendedor ? "Deixe vazio para manter a senha atual" : "Senha padrão: vendedor123"}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>
                <small className="form-help">
                  {editingVendedor 
                    ? 'Digite uma nova senha ou deixe em branco para manter a senha atual.' 
                    : 'Senha padrão para primeiro acesso. O vendedor poderá alterar após o primeiro login.'
                  }
                </small>
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
        <div className="modal-overlay" onClick={() => setConfirmDelete({ open: false, id: null, nome: '' })}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirmar Remoção</h2>
              <button onClick={() => setConfirmDelete({ open: false, id: null, nome: '' })} className="close-btn">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
            <div style={{ padding: '0 24px 24px 24px', color: '#374151' }}>
              Tem certeza que deseja remover o vendedor <strong>{confirmDelete.nome}</strong>? Esta ação não pode ser desfeita.
            </div>
            <div className="modal-actions">
              <button type="button" onClick={() => setConfirmDelete({ open: false, id: null, nome: '' })} className="cancel-btn">Cancelar</button>
              <button type="button" onClick={confirmDeleteVendedor} className="save-btn" style={{ background: 'linear-gradient(135deg, #dc2626, #ef4444)' }}>Remover</button>
            </div>
          </div>
        </div>
      )}
        </div>
    </>
  );
};

export default GerenciarVendedores;