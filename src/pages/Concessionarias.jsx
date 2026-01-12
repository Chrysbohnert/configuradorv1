import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import UnifiedHeader from '../components/UnifiedHeader';
import { db } from '../config/supabase';
import '../styles/Concessionarias.css';

const Concessionarias = () => {
  const navigate = useNavigate();
  const { user } = useOutletContext();

  const REGIOES_PRECO = [
    { value: 'rs-com-ie', label: 'RS com Inscrição Estadual' },
    { value: 'rs-sem-ie', label: 'RS sem Inscrição Estadual' },
    { value: 'centro-oeste', label: 'Centro-Oeste' },
    { value: 'norte-nordeste', label: 'Norte-Nordeste' },
    { value: 'sul-sudeste', label: 'Sul-Sudeste' }
  ];

  const [isLoading, setIsLoading] = useState(false);
  const [concessionarias, setConcessionarias] = useState([]);
  const [showInactive, setShowInactive] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    regiao_preco: '',
    cnpj: '',
    telefone: '',
    email: '',
    endereco: '',
    admin_nome: '',
    admin_email: '',
    admin_senha: ''
  });

  const loadConcessionarias = async () => {
    try {
      setIsLoading(true);
      const data = await db.getConcessionarias({ includeInactive: showInactive });
      setConcessionarias(data);
    } catch (e) {
      console.error('Erro ao carregar concessionárias:', e);
      alert('Erro ao carregar concessionárias.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    if (user.tipo !== 'admin') {
      navigate('/dashboard-admin');
      return;
    }
    loadConcessionarias();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, showInactive]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setIsEditMode(false);
    setEditingId(null);
    setFormData({
      nome: '',
      regiao_preco: '',
      cnpj: '',
      telefone: '',
      email: '',
      endereco: '',
      admin_nome: '',
      admin_email: '',
      admin_senha: ''
    });
  };

  const handleOpenCreate = () => {
    setIsEditMode(false);
    setEditingId(null);
    setFormData({
      nome: '',
      regiao_preco: '',
      cnpj: '',
      telefone: '',
      email: '',
      endereco: '',
      admin_nome: '',
      admin_email: '',
      admin_senha: ''
    });
    setShowModal(true);
  };

  const handleOpenEdit = (c) => {
    setIsEditMode(true);
    setEditingId(c.id);
    setFormData({
      nome: c.nome || '',
      regiao_preco: c.regiao_preco || '',
      cnpj: c.cnpj || '',
      telefone: c.telefone || '',
      email: c.email || '',
      endereco: c.endereco || '',
      admin_nome: '',
      admin_email: '',
      admin_senha: ''
    });
    setShowModal(true);
  };

  const handleToggleAtivo = async (c) => {
    if (user?.tipo !== 'admin') {
      alert('Apenas Admin Stark pode ativar/inativar concessionárias.');
      return;
    }

    const novoAtivo = !(c?.ativo === true);
    const acao = novoAtivo ? 'ativar' : 'inativar';
    const ok = window.confirm(`Tem certeza que deseja ${acao} a concessionária "${c.nome}"?`);
    if (!ok) return;

    try {
      setIsLoading(true);
      await db.updateConcessionaria(c.id, { ativo: novoAtivo });
      await loadConcessionarias();
      alert(`Concessionária ${novoAtivo ? 'ativada' : 'inativada'} com sucesso!`);
    } catch (e) {
      console.error('Erro ao ativar/inativar concessionária:', {
        message: e?.message,
        details: e?.details,
        hint: e?.hint,
        code: e?.code
      });
      const detailsMsg = e?.details ? `\nDetalhes: ${e.details}` : '';
      const hintMsg = e?.hint ? `\nHint: ${e.hint}` : '';
      alert(`Erro ao ${acao}: ${e?.message || 'erro desconhecido'}${detailsMsg}${hintMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (user?.tipo !== 'admin') {
      alert('Apenas Admin Stark pode cadastrar concessionárias.');
      return;
    }

    const regiao_preco = (formData.regiao_preco || '').trim();
    const regiaoValida = REGIOES_PRECO.some(r => r.value === regiao_preco);
    if (!regiaoValida) {
      alert('Região inválida. Selecione uma região válida.');
      return;
    }

    try {
      setIsLoading(true);

      if (isEditMode) {
        if (!editingId) {
          throw new Error('Falha ao editar concessionária: ID não informado.');
        }

        await db.updateConcessionaria(editingId, {
          nome: formData.nome.trim(),
          regiao_preco,
          cnpj: formData.cnpj?.trim() || null,
          telefone: formData.telefone?.trim() || null,
          email: formData.email?.trim() || null,
          endereco: formData.endereco?.trim() || null
        });

        handleCloseModal();
        await loadConcessionarias();
        alert('Concessionária atualizada com sucesso!');
        return;
      }

      const concessionariaCriada = await db.createConcessionaria({
        nome: formData.nome.trim(),
        regiao_preco,
        cnpj: formData.cnpj?.trim() || null,
        telefone: formData.telefone?.trim() || null,
        email: formData.email?.trim() || null,
        endereco: formData.endereco?.trim() || null
      });

      if (!concessionariaCriada?.id) {
        throw new Error('Falha ao criar concessionária: ID não retornado pelo banco.');
      }

      await db.createUser({
        nome: formData.admin_nome.trim(),
        email: formData.admin_email.trim(),
        senha: formData.admin_senha,
        tipo: 'admin_concessionaria',
        concessionaria_id: concessionariaCriada.id
      });

      handleCloseModal();
      await loadConcessionarias();
      alert('Concessionária e admin criados com sucesso!');
    } catch (e) {
      console.error('Erro ao criar concessionária/admin:', {
        message: e?.message,
        details: e?.details,
        hint: e?.hint,
        code: e?.code
      });
      const detailsMsg = e?.details ? `\nDetalhes: ${e.details}` : '';
      const hintMsg = e?.hint ? `\nHint: ${e.hint}` : '';
      alert(`Erro ao cadastrar: ${e?.message || 'erro desconhecido'}${detailsMsg}${hintMsg}`);
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
        title="Concessionárias"
        subtitle="Cadastre e gerencie concessionárias"
      />

      <div className="concessionarias-container">
        <div className="concessionarias-card">
          <div className="concessionarias-header">
            <h2>Concessionárias</h2>
            <div className="concessionarias-header-actions">
              <label className="concessionarias-toggle">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  disabled={isLoading}
                />
                Mostrar inativas
              </label>
              <button
                className="concessionarias-add-btn"
                onClick={handleOpenCreate}
                disabled={isLoading}
              >
                Nova Concessionária
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="concessionarias-loading">Carregando...</div>
          ) : concessionarias.length === 0 ? (
            <div className="concessionarias-empty">Nenhuma concessionária cadastrada.</div>
          ) : (
            <div className="concessionarias-table">
              <div className="concessionarias-row concessionarias-row--header">
                <div>Nome</div>
                <div>Região</div>
                <div>Status</div>
                <div>Email</div>
                <div>Telefone</div>
                <div>Ações</div>
              </div>

              {concessionarias.map((c) => (
                <div key={c.id} className="concessionarias-row">
                  <div className="concessionarias-name">
                    <div className="concessionarias-name__main">{c.nome}</div>
                    <div className="concessionarias-name__sub">ID: {c.id}</div>
                  </div>
                  <div className="concessionarias-uf">{c.regiao_preco}</div>
                  <div className={`concessionarias-status ${c.ativo === false ? 'inactive' : 'active'}`}>
                    {c.ativo === false ? 'Inativa' : 'Ativa'}
                  </div>
                  <div>{c.email || '-'}</div>
                  <div>{c.telefone || '-'}</div>
                  <div className="concessionarias-actions">
                    <button
                      type="button"
                      className="concessionarias-action-btn"
                      onClick={() => handleOpenEdit(c)}
                      disabled={isLoading}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className={`concessionarias-action-btn ${c.ativo === false ? 'concessionarias-action-btn--success' : 'concessionarias-action-btn--warning'}`}
                      onClick={() => handleToggleAtivo(c)}
                      disabled={isLoading}
                    >
                      {c.ativo === false ? 'Ativar' : 'Inativar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nova Concessionária</h2>
              <button onClick={handleCloseModal} className="close-btn">×</button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Nome da Concessionária *</label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => handleInputChange('nome', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Região *</label>
                  <select
                    value={formData.regiao_preco}
                    onChange={(e) => handleInputChange('regiao_preco', e.target.value)}
                    required
                  >
                    <option value="">Selecione...</option>
                    {REGIOES_PRECO.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>CNPJ</label>
                  <input
                    type="text"
                    value={formData.cnpj}
                    onChange={(e) => handleInputChange('cnpj', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Telefone</label>
                  <input
                    type="text"
                    value={formData.telefone}
                    onChange={(e) => handleInputChange('telefone', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                  />
                </div>

                <div className="form-group form-group--full">
                  <label>Endereço</label>
                  <input
                    type="text"
                    value={formData.endereco}
                    onChange={(e) => handleInputChange('endereco', e.target.value)}
                  />
                </div>

                {!isEditMode && (
                  <>
                    <div className="form-divider">Admin da Concessionária</div>

                    <div className="form-group">
                      <label>Nome do Admin *</label>
                      <input
                        type="text"
                        value={formData.admin_nome}
                        onChange={(e) => handleInputChange('admin_nome', e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Email do Admin *</label>
                      <input
                        type="email"
                        value={formData.admin_email}
                        onChange={(e) => handleInputChange('admin_email', e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Senha do Admin *</label>
                      <input
                        type="password"
                        value={formData.admin_senha}
                        onChange={(e) => handleInputChange('admin_senha', e.target.value)}
                        required
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={handleCloseModal}>
                  Cancelar
                </button>
                <button type="submit" className="save-btn" disabled={isLoading}>
                  {isLoading ? 'Salvando...' : (isEditMode ? 'Salvar' : 'Criar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Concessionarias;
