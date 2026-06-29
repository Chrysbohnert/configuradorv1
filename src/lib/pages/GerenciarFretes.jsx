import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import UnifiedHeader from '../../components/UnifiedHeader';
import BlobButton from '../../components/BlobButton';
import { getTodosFretesAdmin, createFrete, updateFrete, deleteFrete } from '../../api/fretes';
import { formatCurrency } from '../../utils/formatters';
import '../../styles/GerenciarFretes.css';

const GerenciarFretes = () => {
  const navigate = useNavigate();
  const { user } = useOutletContext();
  const [isLoading, setIsLoading] = useState(false);
  const [fretes, setFretes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingFrete, setEditingFrete] = useState(null);
  const [formData, setFormData] = useState({
    oficina: '',
    cidade: '',
    uf: '',
    valor_prioridade: '',
    valor_reaproveitamento: '',
  });

  const UFS = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
    'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];

  useEffect(() => {
    if (user?.tipo !== 'admin') {
      navigate('/dashboard-admin');
      return;
    }
    loadFretes();
  }, [user, navigate]);

  const loadFretes = async () => {
    try {
      setIsLoading(true);
      const data = await getTodosFretesAdmin();
      setFretes(data || []);
    } catch (error) {
      console.error('Erro ao carregar fretes:', error);
      alert('Erro ao carregar fretes. Verifique a conexão.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);

      const freteData = {
        oficina: formData.oficina.trim(),
        cidade: formData.cidade.trim(),
        uf: formData.uf.toUpperCase().trim(),
        valor_prioridade: parseFloat(formData.valor_prioridade) || 0,
        valor_reaproveitamento: parseFloat(formData.valor_reaproveitamento) || 0,
      };

      if (editingFrete) {
        await updateFrete(editingFrete.id, freteData);
        alert('Frete atualizado com sucesso!');
      } else {
        await createFrete(freteData);
        alert('Frete criado com sucesso!');
      }

      setShowModal(false);
      setEditingFrete(null);
      resetForm();
      loadFretes();
    } catch (error) {
      console.error('Erro ao salvar frete:', error);
      alert('Erro ao salvar frete. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (frete) => {
    setEditingFrete(frete);
    setFormData({
      oficina: frete.oficina || '',
      cidade: frete.cidade || '',
      uf: frete.uf || '',
      valor_prioridade: frete.valor_prioridade || '',
      valor_reaproveitamento: frete.valor_reaproveitamento || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este frete?')) {
      return;
    }

    try {
      setIsLoading(true);
      await deleteFrete(id);
      alert('Frete excluído com sucesso!');
      loadFretes();
    } catch (error) {
      console.error('Erro ao excluir frete:', error);
      alert('Erro ao excluir frete. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      oficina: '',
      cidade: '',
      uf: '',
      valor_prioridade: '',
      valor_reaproveitamento: '',
    });
  };

  if (!user) return null;

  return (
    <>
      <UnifiedHeader
        showBackButton={false}
        showSupportButton={true}
        showUserInfo={true}
        user={user}
        title="Gerenciar Fretes e Pontos de Instalação"
        subtitle="Cadastro e gestão de fretes CIF"
      />

      <div className="gerenciar-fretes-container">
        <div className="header-section">
          <div className="header-info">
            <h1>Fretes e Pontos de Instalação</h1>
            <p>Gerencie os valores de frete CIF por cidade/UF</p>
          </div>
          <BlobButton
            onClick={() => { resetForm(); setEditingFrete(null); setShowModal(true); }}
            style={{ '--blob-color': '#ffffff', color: '#ffffff' }}
          >
            + Novo Frete
          </BlobButton>
        </div>

        {isLoading && (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Carregando...</p>
          </div>
        )}

        {!isLoading && fretes.length === 0 && (
          <div className="empty-state">
            <h3>Nenhum frete cadastrado</h3>
            <p>Clique em "+ Novo Frete" para adicionar o primeiro.</p>
          </div>
        )}

        {!isLoading && fretes.length > 0 && (
          <div className="fretes-grid">
            {fretes.map((frete) => (
              <div key={frete.id} className="frete-card">
                <div className="frete-header">
                  <div className="frete-location">
                    <span className="cidade">{frete.cidade}</span>
                    <span className="uf">{frete.uf}</span>
                  </div>
                  <span className="oficina">{frete.oficina || 'OFICINA'}</span>
                </div>
                <div className="frete-values">
                  <div className="value-item">
                    <span className="label">Prioridade</span>
                    <span className="value">{formatCurrency(frete.valor_prioridade || 0)}</span>
                  </div>
                  <div className="value-item">
                    <span className="label">Reaproveitamento</span>
                    <span className="value">{formatCurrency(frete.valor_reaproveitamento || 0)}</span>
                  </div>
                </div>
                <div className="frete-actions">
                  <BlobButton onClick={() => handleEdit(frete)}>Editar</BlobButton>
                  <BlobButton onClick={() => handleDelete(frete.id)}>Excluir</BlobButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingFrete ? 'Editar Frete' : 'Novo Frete'}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-form">
              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Oficina / Ponto de Instalação *</label>
                    <input
                      type="text"
                      value={formData.oficina}
                      onChange={(e) => setFormData({ ...formData, oficina: e.target.value })}
                      placeholder="Ex: Oficina Stark Porto Alegre"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Cidade *</label>
                    <input
                      type="text"
                      value={formData.cidade}
                      onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                      placeholder="Ex: Porto Alegre"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>UF *</label>
                    <select
                      value={formData.uf}
                      onChange={(e) => setFormData({ ...formData, uf: e.target.value })}
                      required
                    >
                      <option value="">Selecione...</option>
                      {UFS.map(uf => (
                        <option key={uf} value={uf}>{uf}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Valor Prioridade (CIF) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.valor_prioridade}
                      onChange={(e) => setFormData({ ...formData, valor_prioridade: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Valor Reaproveitamento (CIF) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.valor_reaproveitamento}
                      onChange={(e) => setFormData({ ...formData, valor_reaproveitamento: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
                <div className="modal-actions">
                  <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>Cancelar</button>
                  <button type="submit" className="save-btn" disabled={isLoading}>
                    {isLoading ? 'Salvando...' : (editingFrete ? 'Atualizar' : 'Salvar')}
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

export default GerenciarFretes;
