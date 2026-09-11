import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import UnifiedHeader from '../../components/UnifiedHeader';
import ImageUpload from '../../components/ImageUpload';
import { getAcessorios, createAcessorio, updateAcessorio, deleteAcessorio } from '../../api/acessorios';
import { formatCurrency } from '../../utils/formatters';
import { isAdminFull } from '../../utils/permissions';
import '../../styles/GerenciarAcessorios.css';

const GerenciarAcessorios = () => {
  const navigate = useNavigate();
  const { user } = useOutletContext();
  const [isLoading, setIsLoading] = useState(false);
  const [acessorios, setAcessorios] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingAcessorio, setEditingAcessorio] = useState(null);
  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    descricao: '',
    foto_url: '',
    preco: '',
    max_parcelas: 1,
    ativo: true,
  });

  useEffect(() => {
    if (!isAdminFull(user)) {
      navigate('/dashboard-admin');
      return;
    }
    loadAcessorios();
  }, [user, navigate]);

  const loadAcessorios = async () => {
    try {
      setIsLoading(true);
      const data = await getAcessorios();
      setAcessorios(data || []);
    } catch (error) {
      console.error('Erro ao carregar acessórios:', error);
      alert('Erro ao carregar acessórios. Verifique a conexão.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      codigo: '',
      nome: '',
      descricao: '',
      foto_url: '',
      preco: '',
      max_parcelas: 1,
      ativo: true,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);

      const data = {
        codigo: formData.codigo.trim(),
        nome: formData.nome.trim(),
        descricao: formData.descricao.trim() || null,
        foto_url: formData.foto_url.trim() || null,
        preco: parseFloat(formData.preco) || 0,
        max_parcelas: parseInt(formData.max_parcelas, 10) || 1,
        ativo: formData.ativo,
      };

      if (editingAcessorio) {
        await updateAcessorio(editingAcessorio.id, data);
        alert('Acessório atualizado com sucesso!');
      } else {
        await createAcessorio(data);
        alert('Acessório criado com sucesso!');
      }

      setShowModal(false);
      setEditingAcessorio(null);
      resetForm();
      loadAcessorios();
    } catch (error) {
      console.error('Erro ao salvar acessório:', error);
      alert(`Erro ao salvar acessório: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (acessorio) => {
    setEditingAcessorio(acessorio);
    setFormData({
      codigo: acessorio.codigo || '',
      nome: acessorio.nome || '',
      descricao: acessorio.descricao || '',
      foto_url: acessorio.foto_url || '',
      preco: acessorio.preco || '',
      max_parcelas: acessorio.max_parcelas || 1,
      ativo: acessorio.ativo !== false,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este acessório?')) return;
    try {
      setIsLoading(true);
      await deleteAcessorio(id);
      alert('Acessório excluído com sucesso!');
      loadAcessorios();
    } catch (error) {
      console.error('Erro ao excluir acessório:', error);
      alert(`Erro ao excluir acessório: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <UnifiedHeader
        showBackButton={false}
        showSupportButton={true}
        showUserInfo={true}
        user={user}
        title="Gerenciar Acessórios"
        subtitle="Cadastro e gestão de acessórios comerciais"
      />

      <div className="gerenciar-acessorios-container">
        <div className="header-section">
          <div className="header-info">
            <h1>Acessórios</h1>
            <p>Cadastre e gerencie acessórios disponíveis para propostas</p>
          </div>
          <button
            type="button"
            className="acessorios-primary"
            onClick={() => { resetForm(); setEditingAcessorio(null); setShowModal(true); }}
          >
            + Novo Acessório
          </button>
        </div>

        {isLoading && (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Carregando...</p>
          </div>
        )}

        {!isLoading && acessorios.length === 0 && (
          <div className="empty-state">
            <h3>Nenhum acessório cadastrado</h3>
            <p>Clique em "+ Novo Acessório" para adicionar o primeiro.</p>
          </div>
        )}

        {!isLoading && acessorios.length > 0 && (
          <div className="acessorios-table-shell">
            <div className="acessorios-list-heading">
              <span>Acessórios cadastrados</span>
              <small>{acessorios.length} registro(s)</small>
            </div>
            <div className="acessorios-table-scroll">
              <table className="acessorios-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Nome</th>
                    <th>Descrição</th>
                    <th>Foto</th>
                    <th>Preço</th>
                    <th>Máx. Parcelas</th>
                    <th>Ativo</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {acessorios.map((acessorio) => (
                    <tr key={acessorio.id}>
                      <td><strong>{acessorio.codigo}</strong></td>
                      <td>{acessorio.nome}</td>
                      <td>{acessorio.descricao || '—'}</td>
                      <td>
                        {acessorio.foto_url ? (
                          <img src={acessorio.foto_url} alt={acessorio.nome} className="acessorio-thumb" />
                        ) : (
                          <span className="acessorio-no-image">—</span>
                        )}
                      </td>
                      <td>{formatCurrency(acessorio.preco || 0)}</td>
                      <td>{acessorio.max_parcelas}x</td>
                      <td>
                        <span className={`acessorio-status ${acessorio.ativo ? 'ativo' : 'inativo'}`}>
                          {acessorio.ativo ? 'Sim' : 'Não'}
                        </span>
                      </td>
                      <td>
                        <div className="acessorio-actions">
                          <button type="button" onClick={() => handleEdit(acessorio)}>Editar</button>
                          <button type="button" className="danger" onClick={() => handleDelete(acessorio.id)}>Excluir</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="acessorios-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="acessorios-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="acessorios-modal-header">
              <h2>{editingAcessorio ? 'Editar Acessório' : 'Novo Acessório'}</h2>
              <button className="acessorios-close-btn" type="button" onClick={() => setShowModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="acessorios-modal-form">
              <form onSubmit={handleSubmit}>
                <div className="acessorios-form-grid">
                  <div className="acessorios-form-group">
                    <label>Código *</label>
                    <input
                      type="text"
                      value={formData.codigo}
                      onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                      placeholder="Ex: ACE-001"
                      required
                    />
                  </div>
                  <div className="acessorios-form-group">
                    <label>Nome *</label>
                    <input
                      type="text"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      placeholder="Ex: Controle Remoto Adicional"
                      required
                    />
                  </div>
                  <div className="acessorios-form-group acessorios-form-group-full">
                    <label>Descrição</label>
                    <input
                      type="text"
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      placeholder="Descrição opcional do acessório"
                    />
                  </div>
                  <div className="acessorios-form-group acessorios-form-group-full">
                    <ImageUpload
                      label="Foto do Acessório"
                      currentImageUrl={formData.foto_url}
                      onImageUpload={(url) => setFormData({ ...formData, foto_url: url })}
                      accept="image/jpeg,image/png,image/webp"
                      formatsText="JPG, PNG, WEBP"
                      uploadEndpoint="/api/acessorios/upload"
                      disableUpload={false}
                    />
                  </div>
                  <div className="acessorios-form-group">
                    <label>Preço (R$) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.preco}
                      onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
                      placeholder="0,00"
                      required
                    />
                  </div>
                  <div className="acessorios-form-group">
                    <label>Máximo de Parcelas *</label>
                    <select
                      value={formData.max_parcelas}
                      onChange={(e) => setFormData({ ...formData, max_parcelas: e.target.value })}
                      required
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>{n}x</option>
                      ))}
                    </select>
                  </div>
                  <div className="acessorios-form-group">
                    <label>Ativo *</label>
                    <select
                      value={formData.ativo ? 'sim' : 'nao'}
                      onChange={(e) => setFormData({ ...formData, ativo: e.target.value === 'sim' })}
                      required
                    >
                      <option value="sim">Sim</option>
                      <option value="nao">Não</option>
                    </select>
                  </div>
                </div>
                <div className="acessorios-modal-actions">
                  <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>Cancelar</button>
                  <button type="submit" className="save-btn" disabled={isLoading}>
                    {isLoading ? 'Salvando...' : (editingAcessorio ? 'Atualizar' : 'Salvar')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GerenciarAcessorios;
