import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import UnifiedHeader from '../../components/UnifiedHeader';
import { db } from '../../config/supabase';
import { getAreas, saveAreas } from '../../api/areas';
import AreaSelector from '../../features/mapa/AreaSelector';
import { isAdminFull, isAdminConcessionarias } from '../../utils/permissions';
import '../../styles/Concessionarias.css';

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
  const [selectedAreas, setSelectedAreas] = useState([]);
  const [areaError, setAreaError] = useState('');
  const [formData, setFormData] = useState({
    nome: '',
    regiao_preco: '',
    cnpj: '',
    telefone: '',
    email: '',
    endereco: '',
    desconto_base: '',
    desconto_compra: '',
    admin_nome: '',
    admin_email: '',
    admin_senha: ''
  });

  const loadConcessionarias = async () => {
    try {
      setIsLoading(true);
      const data = await db.getConcessionarias(isAdminFull(user) || showInactive);
      setConcessionarias(data);
    } catch (e) {
      console.error('Erro ao carregar concessionárias:', e);
      alert('Erro ao carregar concessionárias.');
    } finally {
      setIsLoading(false);
    }
  };

  const canManage = isAdminFull(user) || isAdminConcessionarias(user);

  useEffect(() => {
    if (!user) return;
    if (!canManage) {
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
    setSelectedAreas([]);
    setAreaError('');
    setFormData({
      nome: '',
      regiao_preco: '',
      cnpj: '',
      telefone: '',
      email: '',
      endereco: '',
      desconto_base: '',
      desconto_compra: '',
      admin_nome: '',
      admin_email: '',
      admin_senha: ''
    });
  };

  const handleOpenCreate = () => {
    setIsEditMode(false);
    setEditingId(null);
    setSelectedAreas([]);
    setAreaError('');
    setFormData({
      nome: '',
      regiao_preco: '',
      cnpj: '',
      telefone: '',
      email: '',
      endereco: '',
      desconto_base: '',
      desconto_compra: '',
      admin_nome: '',
      admin_email: '',
      admin_senha: ''
    });
    setShowModal(true);
  };

  const handleOpenEdit = async (c) => {
    setIsEditMode(true);
    setEditingId(c.id);
    setFormData({
      nome: c.nome || '',
      regiao_preco: c.regiao_preco || '',
      cnpj: c.cnpj || '',
      telefone: c.telefone || '',
      email: c.email || '',
      endereco: c.endereco || '',
      desconto_base: c.desconto_base ?? '',
      desconto_compra: c.desconto_compra ?? '',
      admin_nome: '',
      admin_email: '',
      admin_senha: ''
    });
    setShowModal(true);
    setAreaError('');
    try {
      setSelectedAreas(await getAreas('concessionaria', c.id));
    } catch (error) {
      setSelectedAreas([]);
      setAreaError(error.message || 'Erro ao carregar área de atuação.');
    }
  };

  const handleToggleAtivo = async (c) => {
    if (!canManage) {
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

  const saveConcessionariaAreas = async (id, transfer = false) => {
    try {
      await saveAreas('concessionaria', id, selectedAreas, { transfer });
    } catch (error) {
      if (error.status === 409 && !transfer) {
        const conflicts = error.data?.conflicts || [];
        const owners = [...new Set(conflicts.map((item) => item.owner?.nome).filter(Boolean))];
        const detail = owners.length ? `\nConcessionárias afetadas: ${owners.join(', ')}` : '';
        if (window.confirm(`${error.message}${detail}\n\nDeseja transferir esses municípios?`)) {
          return saveConcessionariaAreas(id, true);
        }
      }
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!canManage) {
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
          endereco: formData.endereco?.trim() || null,
          desconto_base: formData.desconto_base !== '' ? Number(formData.desconto_base) : null,
          desconto_compra: formData.desconto_compra !== '' ? Number(formData.desconto_compra) : null
        });
        await saveConcessionariaAreas(editingId);

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
        endereco: formData.endereco?.trim() || null,
        desconto_base: formData.desconto_base !== '' ? Number(formData.desconto_base) : null,
        desconto_compra: formData.desconto_compra !== '' ? Number(formData.desconto_compra) : null
      });

      const concessionariaId = concessionariaCriada?.id;

      if (!concessionariaCriada?.id) {
        throw new Error('Falha ao criar concessionária: ID não retornado pelo banco.');
      }

      await saveConcessionariaAreas(concessionariaId);

      await db.createUser({
        nome: formData.admin_nome.trim(),
        email: formData.admin_email.trim(),
        senha: formData.admin_senha,
        tipo: 'admin_concessionaria',
        canal: 'concessionarias',
        concessionaria_id: concessionariaId
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

      {showModal ? (
        <main className="concessionarias-form-page">
          <div className="concessionarias-form-heading">
            <div>
              <h1>{isEditMode ? 'Editar Concessionária' : 'Nova Concessionária'}</h1>
              <p>Preencha os dados e selecione as áreas de atuação no mapa.</p>
            </div>
            <button className="concessionarias-primary" type="button" onClick={handleCloseModal} disabled={isLoading}>
              Voltar para lista
            </button>
          </div>

          {areaError && <div className="area-selector-error">{areaError}</div>}

          <form onSubmit={handleSubmit} className="concessionarias-form-layout">
            <div className="concessionarias-form-col">
              <div className="concessionarias-form-grid">
                <div style={{ gridColumn: '1 / -1' }}>
                  <label>Nome da Concessionária *</label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => handleInputChange('nome', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label>Região *</label>
                  <select value={formData.regiao_preco} onChange={(e) => handleInputChange('regiao_preco', e.target.value)} required>
                    <option value="">Selecione...</option>
                    {REGIOES_PRECO.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>CNPJ</label>
                  <input type="text" value={formData.cnpj} onChange={(e) => handleInputChange('cnpj', e.target.value)} />
                </div>

                <div>
                  <label>Telefone</label>
                  <input type="text" value={formData.telefone} onChange={(e) => handleInputChange('telefone', e.target.value)} />
                </div>

                <div>
                  <label>Email</label>
                  <input type="email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label>Endereço</label>
                  <input type="text" value={formData.endereco} onChange={(e) => handleInputChange('endereco', e.target.value)} />
                </div>

                {!isEditMode && (
                  <>
                    <div className="concessionarias-admin-title">
                      Admin da Concessionária
                    </div>

                    <div>
                      <label>Nome do Admin *</label>
                      <input
                        type="text"
                        value={formData.admin_nome}
                        onChange={(e) => handleInputChange('admin_nome', e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label>Email do Admin *</label>
                      <input
                        type="email"
                        value={formData.admin_email}
                        onChange={(e) => handleInputChange('admin_email', e.target.value)}
                        required
                      />
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
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

              <div className="concessionarias-form-actions">
                <button type="button" className="concessionarias-cancel" onClick={handleCloseModal}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="concessionarias-primary"
                  disabled={isLoading}
                >
                  {isLoading ? 'Salvando...' : (isEditMode ? 'Salvar alterações' : 'Criar Concessionária')}
                </button>
              </div>
            </div>

            <div className="concessionarias-map-col">
              <AreaSelector
                tipo="concessionaria"
                entidadeId={editingId}
                areas={selectedAreas}
                onChange={setSelectedAreas}
                disabled={isLoading}
              />
            </div>
          </form>
        </main>
      ) : (
        <main className="concessionarias-page">
          <div className="concessionarias-heading">
            <div>
              <h1>Concessionárias</h1>
              <p>Cadastre e gerencie as concessionárias parceiras.</p>
            </div>
            <button className="concessionarias-primary" onClick={handleOpenCreate} disabled={isLoading}>
              + Nova Concessionária
            </button>
          </div>

          <section className="concessionarias-toolbar" aria-label="Filtros de concessionárias">
            <span>Listagem <small>({concessionarias.length})</small></span>
            {!isAdminFull(user) && (
              <label>
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  disabled={isLoading}
                />
                Mostrar inativas
              </label>
            )}
          </section>

          <div className="concessionarias-table-shell">
            {isLoading ? (
              <div className="concessionarias-feedback">Carregando...</div>
            ) : concessionarias.length === 0 ? (
              <div className="concessionarias-feedback">Nenhuma concessionária cadastrada.</div>
            ) : (
              <div className="concessionarias-table-scroll">
                <table className="concessionarias-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Região</th>
                      <th>Status</th>
                      <th>Email</th>
                      <th>Telefone</th>
                      {isAdminFull(user) && <th>Admins vinculados</th>}
                      {isAdminFull(user) && <th>Vendedores vinculados</th>}
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {concessionarias.map((c) => (
                      <tr key={c.id}>
                        <td><strong>{c.nome}</strong><small>ID: {c.id}</small></td>
                        <td>{c.regiao_preco}</td>
                        <td><span className={`concessionarias-status ${c.ativo === false ? 'inactive' : 'active'}`}>{c.ativo === false ? 'Inativa' : 'Ativa'}</span></td>
                        <td>{c.email || '-'}</td>
                        <td>{c.telefone || '-'}</td>
                        {isAdminFull(user) && (
                          <td>{c.admins?.length ? c.admins.map((admin) => admin.nome).join(', ') : '-'}</td>
                        )}
                        {isAdminFull(user) && (
                          <td>{c.vendedores?.length ? c.vendedores.map((vendedor) => vendedor.nome).join(', ') : '-'}</td>
                        )}
                        <td>
                          <div className="concessionarias-actions">
                            <button type="button" onClick={() => handleOpenEdit(c)} disabled={isLoading}>Editar</button>
                            <button type="button" onClick={() => handleToggleAtivo(c)} disabled={isLoading}>
                              {c.ativo === false ? 'Ativar' : 'Inativar'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      )}
    </>
  );
};

export default Concessionarias;




