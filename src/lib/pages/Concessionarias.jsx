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

      {/* Modal */}
      {showModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}
          onClick={handleCloseModal}
        >
          <div
            style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', width: '100%', maxWidth: '1000px', maxHeight: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '15px', fontWeight: '700', color: '#111' }}>
                {isEditMode ? 'Editar Concessionária' : 'Nova Concessionária'}
              </span>
              <button
                onClick={handleCloseModal}
                style={{ border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer', color: '#6b7280', lineHeight: 1 }}
              >×</button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '5px', color: '#374151' }}>Nome da Concessionária *</label>
                    <input type="text" value={formData.nome} onChange={(e) => handleInputChange('nome', e.target.value)} required style={{ width: '100%', padding: '7px 10px', border: '1px solid #e5e5e5', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '5px', color: '#374151' }}>Região *</label>
                    <select value={formData.regiao_preco} onChange={(e) => handleInputChange('regiao_preco', e.target.value)} required style={{ width: '100%', padding: '7px 10px', border: '1px solid #e5e5e5', borderRadius: '6px', fontSize: '13px', background: '#fff' }}>
                      <option value="">Selecione...</option>
                      {REGIOES_PRECO.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '5px', color: '#374151' }}>CNPJ</label>
                    <input type="text" value={formData.cnpj} onChange={(e) => handleInputChange('cnpj', e.target.value)} style={{ width: '100%', padding: '7px 10px', border: '1px solid #e5e5e5', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '5px', color: '#374151' }}>Telefone</label>
                    <input type="text" value={formData.telefone} onChange={(e) => handleInputChange('telefone', e.target.value)} style={{ width: '100%', padding: '7px 10px', border: '1px solid #e5e5e5', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '5px', color: '#374151' }}>Email</label>
                    <input type="email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} style={{ width: '100%', padding: '7px 10px', border: '1px solid #e5e5e5', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '5px', color: '#374151' }}>Endereço</label>
                    <input type="text" value={formData.endereco} onChange={(e) => handleInputChange('endereco', e.target.value)} style={{ width: '100%', padding: '7px 10px', border: '1px solid #e5e5e5', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
                  </div>

                  {!isEditMode && (
                    <>
                      <div style={{ gridColumn: '1 / -1', marginTop: '6px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', fontSize: '12px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Admin da Concessionária
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '5px', color: '#374151' }}>Nome do Admin *</label>
                        <input type="text" value={formData.admin_nome} onChange={(e) => handleInputChange('admin_nome', e.target.value)} required style={{ width: '100%', padding: '7px 10px', border: '1px solid #e5e5e5', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '5px', color: '#374151' }}>Email do Admin *</label>
                        <input type="email" value={formData.admin_email} onChange={(e) => handleInputChange('admin_email', e.target.value)} required style={{ width: '100%', padding: '7px 10px', border: '1px solid #e5e5e5', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
                      </div>

                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '5px', color: '#374151' }}>Senha do Admin *</label>
                        <input type="password" value={formData.admin_senha} onChange={(e) => handleInputChange('admin_senha', e.target.value)} required style={{ width: '100%', padding: '7px 10px', border: '1px solid #e5e5e5', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
                      </div>
                    </>
                  )}
                  <div style={{ gridColumn: '1 / -1', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#374151', marginBottom: '8px' }}>Área de atuação</div>
                    {areaError && <div className="area-selector-error">{areaError}</div>}
                    <AreaSelector
                      tipo="concessionaria"
                      entidadeId={editingId}
                      areas={selectedAreas}
                      onChange={setSelectedAreas}
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  style={{ padding: '7px 20px', background: 'white', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                >Cancelar</button>
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{ padding: '7px 20px', background: '#111827', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.7 : 1 }}
                >{isLoading ? 'Salvando...' : (isEditMode ? 'Salvar' : 'Criar')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Concessionarias;




