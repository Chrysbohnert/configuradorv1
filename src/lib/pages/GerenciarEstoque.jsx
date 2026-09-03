import React, { useState, useEffect } from 'react';
import UnifiedHeader from '../../components/UnifiedHeader';
import { getEstoque, updateEstoque } from '../../api/guindastes';
import '../../styles/GerenciarEstoque.css';

const GerenciarEstoque = () => {
  const [equipamentos, setEquipamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: '' });

  useEffect(() => {
    carregarEstoque();
  }, []);

  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => setToast({ visible: false, message: '', type: '' }), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  const carregarEstoque = async () => {
    try {
      setLoading(true);
      const data = await getEstoque();
      setEquipamentos(data);
    } catch (error) {
      console.error('Erro ao carregar estoque:', error);
      setToast({ visible: true, message: 'Erro ao carregar estoque', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const iniciarEdicao = (equip) => {
    setEditingId(equip.id);
    setEditValue(String(equip.quantidade_disponivel || 0));
  };

  const cancelarEdicao = () => {
    setEditingId(null);
    setEditValue('');
  };

  const salvarEdicao = async (id) => {
    const qtd = parseInt(editValue, 10);
    if (isNaN(qtd) || qtd < 0) {
      setToast({ visible: true, message: 'Quantidade deve ser um numero >= 0', type: 'error' });
      return;
    }
    try {
      setSaving(true);
      const updated = await updateEstoque(id, qtd);
      setEquipamentos(prev => prev.map(e => e.id === id ? { ...e, quantidade_disponivel: updated.quantidade_disponivel } : e));
      setEditingId(null);
      setEditValue('');
      setToast({ visible: true, message: 'Estoque atualizado com sucesso!', type: 'success' });
    } catch (error) {
      console.error('Erro ao atualizar estoque:', error);
      setToast({ visible: true, message: 'Erro ao atualizar estoque', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const equipamentosFiltrados = equipamentos.filter(e => {
    if (!busca.trim()) return true;
    const termo = busca.toLowerCase();
    return (
      (e.codigo_referencia || '').toLowerCase().includes(termo) ||
      (e.subgrupo || '').toLowerCase().includes(termo) ||
      (e.modelo || '').toLowerCase().includes(termo)
    );
  });

  return (
    <div className="estoque-page">
      <UnifiedHeader
        title="Gerenciar Estoque"
        subtitle="Controle de quantidade disponivel dos equipamentos"
        showBackButton={false}
        showSupportButton={true}
      />

      <main className="estoque-container">
        <div className="estoque-heading">
          <div className="estoque-heading-copy">
            <span className="estoque-eyebrow">Gestão de equipamentos</span>
            <h1>Estoque</h1>
            <p>Atualize a quantidade disponivel dos itens de forma rapida e centralizada.</p>
          </div>
        </div>

        <section className="estoque-toolbar" aria-label="Filtros de estoque">
          <label className="estoque-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>
            <input
              type="search"
              placeholder="Buscar por codigo, modelo ou descricao..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </label>
          <span className="estoque-total">{equipamentosFiltrados.length} equipamento(s)</span>
        </section>

        <div className="estoque-list-heading">
          <span>Itens em estoque</span>
          <small>{equipamentosFiltrados.length} {equipamentosFiltrados.length === 1 ? 'registro' : 'registros'}</small>
        </div>

        <section className="estoque-table-shell" aria-live="polite">
          {loading ? (
            <div className="estoque-feedback">
              <span className="estoque-spinner" />
              <strong>Carregando estoque...</strong>
            </div>
          ) : equipamentosFiltrados.length === 0 ? (
            <div className="estoque-feedback">
              <span className="estoque-empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
              </span>
              <strong>Nenhum equipamento encontrado</strong>
              <span>Ajuste o termo de busca e tente novamente.</span>
            </div>
          ) : (
            <div className="estoque-table-scroll">
              <table className="estoque-table">
                <thead>
                  <tr>
                    <th>Codigo</th>
                    <th>Modelo / Descricao</th>
                    <th className="col-qtd">Qtde. Disponivel</th>
                    <th className="col-acoes"><span className="sr-only">Acoes</span></th>
                  </tr>
                </thead>
                <tbody>
                  {equipamentosFiltrados.map(equip => (
                    <tr key={equip.id} className={equip.quantidade_disponivel === 0 ? 'sem-estoque' : ''}>
                      <td className="col-codigo">{equip.codigo_referencia || '-'}</td>
                      <td className="col-descricao">
                        <span className="equip-subgrupo">{equip.subgrupo}</span>
                        {equip.modelo && <span className="equip-modelo">{equip.modelo}</span>}
                      </td>
                      <td className="col-qtd">
                        {editingId === equip.id ? (
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') salvarEdicao(equip.id);
                              if (e.key === 'Escape') cancelarEdicao();
                            }}
                            className="estoque-input-edit"
                            autoFocus
                          />
                        ) : (
                          <span className={`badge-qtd ${equip.quantidade_disponivel > 0 ? 'em-estoque' : 'zerado'}`}>
                            {equip.quantidade_disponivel || 0}
                          </span>
                        )}
                      </td>
                      <td className="col-acoes">
                        {editingId === equip.id ? (
                          <div className="acoes-edit">
                            <button
                              className="btn-salvar"
                              onClick={() => salvarEdicao(equip.id)}
                              disabled={saving}
                            >
                              {saving ? '...' : 'Salvar'}
                            </button>
                            <button
                              className="btn-cancelar"
                              onClick={cancelarEdicao}
                              disabled={saving}
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            className="btn-editar"
                            onClick={() => iniciarEdicao(equip)}
                          >
                            Editar <span>›</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {toast.visible && (
        <div className={`estoque-toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default GerenciarEstoque;
