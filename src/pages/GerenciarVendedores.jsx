import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminNavigation from '../components/AdminNavigation';
import UnifiedHeader from '../components/UnifiedHeader';
import { db } from '../config/supabase';
import '../styles/GerenciarVendedores.css';

const GerenciarVendedores = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
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
    tipo: 'vendedor',
    senha: 'vendedor123' // Senha padrão
  });

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

    loadVendedores();
  }, [navigate]);

  const loadVendedores = async () => {
    try {
      setIsLoading(true);
      // Buscar usuários e pedidos
      const [vendedoresData, pedidos] = await Promise.all([
        db.getUsers(),
        db.getPedidos()
      ]);
      
      // Filtrar apenas vendedores (não admins)
      const vendedoresOnly = vendedoresData.filter(v => v.tipo === 'vendedor');
      
      // Calcular vendas e valor total para cada vendedor
      const vendedoresComVendas = vendedoresOnly.map(vendedor => {
        const pedidosDoVendedor = pedidos.filter(p => p.vendedor_id === vendedor.id);
        const vendas = pedidosDoVendedor.length;
        const valorTotal = pedidosDoVendedor.reduce((soma, p) => soma + (p.valor_total || 0), 0);
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

      if (editingVendedor) {
        // Editar vendedor existente
        await db.updateUser(editingVendedor.id, vendedorData);
      } else {
        // Adicionar novo vendedor
        await db.createUser(vendedorData);
      }
      
      // Recarregar dados
      await loadVendedores();
      handleCloseModal();
      
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
      tipo: 'vendedor',
      senha: 'vendedor123'
    });
    setShowModal(true);
  };

  // Função para editar vendedor
  const handleEditVendedor = (vendedor) => {
    setEditingVendedor(vendedor);
    setFormData({
      nome: vendedor.nome,
      email: vendedor.email,
      telefone: vendedor.telefone,
      cpf: vendedor.cpf,
      comissao: vendedor.comissao.toString(),
      regiao: vendedor.regiao || '',
      tipo: vendedor.tipo,
      senha: vendedor.senha || 'vendedor123'
    });
    setShowModal(true);
  };

  // Função para deletar vendedor
  const handleDeleteVendedor = async (id) => {
    if (window.confirm('Tem certeza que deseja remover este vendedor?')) {
      try {
        await db.deleteUser(id);
        await loadVendedores();
        } catch {
    alert('Erro ao remover vendedor.');
  }
    }
  };

  

  if (!user) {
    return null;
  }

  return (
    <div className="admin-layout">
      <AdminNavigation user={user} />
      
      <div className="admin-content">
        <UnifiedHeader 
          showBackButton={true}
          onBackClick={() => navigate('/dashboard-admin')}
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
            <div key={vendedor.id} className="vendedor-card alinhado">
              <div className="vendedor-card-content">
                <div className="vendedor-avatar">
                  {vendedor.nome.split(' ').map(n => n[0]).join('').toUpperCase()}
                </div>
                <div className="vendedor-info-main">
                  <h3>{vendedor.nome}</h3>
                  <p>{vendedor.email}</p>
                </div>
                <div className="vendedor-info-dados">
                  <div><span>Telefone:</span> {vendedor.telefone}</div>
                  <div><span>CPF:</span> {vendedor.cpf}</div>
                  <div><span>Comissão:</span> {vendedor.comissao}%</div>
                </div>
                <div className="vendedor-info-vendas">
                  <div><span>Vendas:</span> {vendedor.vendas}</div>
                  <div><span>Valor Total:</span> R$ {vendedor.valorTotal?.toLocaleString('pt-BR') || 0}</div>
                </div>
                <div className="vendedor-actions">
                  <button onClick={() => handleEditVendedor(vendedor)} className="action-btn edit-btn" title="Editar">
                    ✏️
                  </button>
                  <button onClick={() => handleDeleteVendedor(vendedor.id)} className="action-btn delete-btn" title="Remover">
                    🗑️
                  </button>
                </div>
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
                <label htmlFor="regiao">Região *</label>
                <select
                  id="regiao"
                  value={formData.regiao || ''}
                  onChange={(e) => handleInputChange('regiao', e.target.value)}
                  required
                >
                  <option value="">Selecione a região</option>
                  <option value="norte">Norte</option>
                  <option value="nordeste">Nordeste</option>
                  <option value="sudeste">Sudeste</option>
                  <option value="sul">Sul</option>
                  <option value="centro-oeste">Centro-Oeste</option>
                  <option value="rio grande do sul">Rio Grande do Sul</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="senha">Senha *</label>
                <input
                  id="senha"
                  type="text"
                  value={formData.senha}
                  onChange={(e) => handleInputChange('senha', e.target.value)}
                  required
                  placeholder="Senha padrão: vendedor123"
                />
                <small className="form-help">
                  Senha padrão para primeiro acesso. O vendedor poderá alterar após o primeiro login.
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
        </div>
      </div>
    </div>
  );
};

export default GerenciarVendedores; 