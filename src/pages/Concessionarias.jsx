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
    desconto_base: '',
    desconto_compra: '',
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
    setFormData({
      nome: '',
      regiao_preco: '',
      cnpj: '',
      telefone: '',
      email: '',
      endereco: '',
      desconto_base: '',
      desconto_compra: '',
      logo_url: '',
      dados_bancarios: '',
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
      desconto_base: c.desconto_base ?? '',
      desconto_compra: c.desconto_compra ?? '',
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
          endereco: formData.endereco?.trim() || null,
          desconto_base: formData.desconto_base !== '' ? Number(formData.desconto_base) : null,
          desconto_compra: formData.desconto_compra !== '' ? Number(formData.desconto_compra) : null
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
        endereco: formData.endereco?.trim() || null,
        desconto_base: formData.desconto_base !== '' ? Number(formData.desconto_base) : null,
        desconto_compra: formData.desconto_compra !== '' ? Number(formData.desconto_compra) : null
      });

      const concessionariaId = concessionariaCriada?.id;

      if (!concessionariaCriada?.id) {
        throw new Error('Falha ao criar concessionária: ID não retornado pelo banco.');
      }

      await db.createUser({
        nome: formData.admin_nome.trim(),
        email: formData.admin_email.trim(),
        senha: formData.admin_senha,
        tipo: 'admin_concessionaria',
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

  const btnBase = { border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', padding: '5px 12px' };

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

      <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '700', margin: '0 0 6px 0', color: '#111' }}>
            Concessionárias
          </h1>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
            Cadastre e gerencie as concessionárias parceiras
          </p>
        </div>

        {/* Card principal */}
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden' }}>

          {/* Barra de ações */}
          <div style={{ padding: '13px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#111' }}>
              Listagem <span style={{ color: '#9ca3af', fontWeight: 500 }}>({concessionarias.length})</span>
            </span>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: '#374151', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  disabled={isLoading}
                  style={{ cursor: 'pointer' }}
                />
                Mostrar inativas
              </label>
              <button
                onClick={handleOpenCreate}
                disabled={isLoading}
                style={{ ...btnBase, padding: '7px 16px', background: '#111827', color: '#fff', fontSize: '13px' }}
              >
                + Nova Concessionária
              </button>
            </div>
          </div>

          {/* Tabela */}
          {isLoading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>Carregando...</div>
          ) : concessionarias.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
              Nenhuma concessionária cadastrada.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: '640px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#000', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Nome</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#000', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Região</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#000', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#000', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Email</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#000', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Telefone</th>
                    <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: '11px', fontWeight: '700', color: '#000', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {concessionarias.map((c) => (
                    <tr
                      key={c.id}
                      style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.12s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '11px 16px' }}>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#111827' }}>{c.nome}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>ID: {c.id}</div>
                      </td>
                      <td style={{ padding: '11px 16px', fontSize: '13px', color: '#374151', fontWeight: '600', whiteSpace: 'nowrap' }}>
                        {c.regiao_preco}
                      </td>
                      <td style={{ padding: '11px 16px' }}>
                        <span style={{
                          padding: '3px 9px', borderRadius: '999px', fontSize: '11px', fontWeight: '700',
                          background: c.ativo === false ? '#fef2f2' : '#ecfdf5',
                          color: c.ativo === false ? '#991b1b' : '#065f46',
                          border: `1px solid ${c.ativo === false ? '#fecaca' : '#a7f3d0'}`
                        }}>
                          {c.ativo === false ? 'Inativa' : 'Ativa'}
                        </span>
                      </td>
                      <td style={{ padding: '11px 16px', fontSize: '13px', color: '#374151' }}>{c.email || '-'}</td>
                      <td style={{ padding: '11px 16px', fontSize: '13px', color: '#374151' }}>{c.telefone || '-'}</td>
                      <td style={{ padding: '11px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(c)}
                            disabled={isLoading}
                            style={{ ...btnBase, background: '#d3d3d3', color: '#000' }}
                          >Editar</button>
                          <button
                            type="button"
                            onClick={() => handleToggleAtivo(c)}
                            disabled={isLoading}
                            style={{
                              ...btnBase,
                              background: c.ativo === false ? '#d1fae5' : '#fef3c7',
                              color: c.ativo === false ? '#065f46' : '#92400e'
                            }}
                          >{c.ativo === false ? 'Ativar' : 'Inativar'}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}
          onClick={handleCloseModal}
        >
          <div
            style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', width: '100%', maxWidth: '600px', maxHeight: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
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
