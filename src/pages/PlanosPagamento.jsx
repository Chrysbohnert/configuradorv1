import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import UnifiedHeader from '../components/UnifiedHeader';
import { db } from '../config/supabase';
import { getPaymentPlans } from '../services/paymentPlans';
import '../styles/PlanosPagamento.css';

const AUDIENCES = [
  { value: 'cliente', label: 'Cliente' },
  { value: 'revenda', label: 'Revenda' }
];

const ENTRY_FILTERS = [
  { value: '0.3', label: 'Entrada 30%' },
  { value: '0.5', label: 'Entrada 50%' },
  { value: '', label: 'Financiamento' }
];

const EMPTY_ITEM = {
  id: null,
  audience: 'cliente',
  order: '',
  description: '',
  installments: 1,
  active: true,
  discount_percent: '',
  surcharge_percent: '',
  entry_percent_required: '',
  entry_percent: '',
};

export default function PlanosPagamento() {
  const navigate = useNavigate();
  const { user } = useOutletContext();

  const isAdminStark = user?.tipo === 'admin';
  const isAdminConcessionaria = user?.tipo === 'admin_concessionaria';

  const scope = isAdminConcessionaria ? 'concessionaria' : 'stark';
  const concessionariaId = user?.concessionaria_id || null;

  const [isLoading, setIsLoading] = useState(false);
  const [statusInfo, setStatusInfo] = useState({ type: '', message: '' });

  const [sets, setSets] = useState([]);
  const [draftSetId, setDraftSetId] = useState(null);
  const [publishedSetId, setPublishedSetId] = useState(null);

  const [audience, setAudience] = useState('cliente');
  const [entryFilter, setEntryFilter] = useState('0.3');
  const [items, setItems] = useState([]);
  const [isEditing, setIsEditing] = useState(false);

  const toUiPercent = (v) => {
    if (v === null || v === undefined || v === '') return '';
    const n = Number(v);
    if (Number.isNaN(n)) return '';
    return String(n * 100);
  };

  const fromUiPercent = (v) => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(String(v).replace(',', '.'));
    if (Number.isNaN(n)) return null;
    return n / 100;
  };

  const toUiItem = (it) => ({
    ...it,
    discount_percent: toUiPercent(it.discount_percent),
    surcharge_percent: toUiPercent(it.surcharge_percent),
    entry_percent: toUiPercent(it.entry_percent),
  });

  useEffect(() => {
    if (!user) return;
    if (!isAdminStark && !isAdminConcessionaria) {
      navigate('/dashboard-admin');
      return;
    }
    loadSets();
  }, [user]);

  useEffect(() => {
    if (!isEditing) return;
    if (!draftSetId) {
      setItems([]);
      return;
    }
    loadItems(draftSetId);
  }, [draftSetId, audience, entryFilter, isEditing]);

  useEffect(() => {
    if (!user) return;
    if (isEditing) return;
    loadPublishedItems();
  }, [user, isEditing, audience, entryFilter, isAdminConcessionaria, concessionariaId]);

  const loadSets = async () => {
    try {
      setIsLoading(true);
      setStatusInfo({ type: '', message: '' });

      const data = await db.getPaymentPlanSets({
        scope,
        concessionaria_id: scope === 'concessionaria' ? concessionariaId : null
      });

      setSets(data || []);
      const draft = (data || []).find(s => s.status === 'draft');
      const published = (data || []).find(s => s.status === 'published');
      setDraftSetId(draft?.id || null);
      setPublishedSetId(published?.id || null);

      if (!draft?.id) {
        setItems([]);
      }
    } catch (e) {
      console.error('Erro ao carregar conjuntos de planos:', e);
      setStatusInfo({ type: 'error', message: 'Erro ao carregar conjuntos de planos.' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadPublishedItems = async () => {
    try {
      setIsLoading(true);
      setStatusInfo({ type: '', message: '' });

      const targetEntry = entryFilter === '' ? null : Number(entryFilter);

      let source = [];
      let publishedActive = [];
      try {
        const published = await db.getPublishedPaymentPlans({
          scope,
          concessionaria_id: scope === 'concessionaria' ? concessionariaId : null,
          audience
        });
        publishedActive = (published || []).filter(p => !!p.active);
        source = publishedActive.length > 0 ? publishedActive : getPaymentPlans(audience);
      } catch {
        source = getPaymentPlans(audience);
      }

      const filtered = (source || [])
        .filter(p => !!p.active)
        .filter(p => (p.entry_percent_required ?? null) === targetEntry)
        .map(toUiItem);

      if (filtered.length === 0 && publishedActive.length > 0) {
        const filteredFallback = (getPaymentPlans(audience) || [])
          .filter(p => !!p.active)
          .filter(p => (p.entry_percent_required ?? null) === targetEntry)
          .map(toUiItem);
        setItems(filteredFallback);
      } else {
        setItems(filtered);
      }
    } catch (e) {
      console.error('Erro ao carregar planos publicados:', e);
      setStatusInfo({ type: 'error', message: 'Erro ao carregar planos publicados.' });
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadItems = async (setId) => {
    try {
      setIsLoading(true);
      setStatusInfo({ type: '', message: '' });

      const data = await db.getPaymentPlanItems(setId);
      const targetEntry = entryFilter === '' ? null : Number(entryFilter);
      const filtered = (data || [])
        .filter(i => i.audience === audience)
        .filter(i => (i.entry_percent_required ?? null) === targetEntry);
      setItems(filtered.map(toUiItem));
    } catch (e) {
      console.error('Erro ao carregar itens do conjunto:', e);
      setStatusInfo({ type: 'error', message: 'Erro ao carregar planos do rascunho.' });
    } finally {
      setIsLoading(false);
    }
  };

  const ensureDraft = async () => {
    try {
      setIsLoading(true);
      setStatusInfo({ type: '', message: '' });

      const id = await db.ensurePaymentPlanDraftSet({
        scope,
        concessionaria_id: scope === 'concessionaria' ? concessionariaId : null
      });

      const existingDraftItems = await db.getPaymentPlanItems(id);

      if (!existingDraftItems || existingDraftItems.length === 0) {
        let publishedCliente = [];
        let publishedRevenda = [];

        try {
          [publishedCliente, publishedRevenda] = await Promise.all([
            db.getPublishedPaymentPlans({
              scope,
              concessionaria_id: scope === 'concessionaria' ? concessionariaId : null,
              audience: 'cliente'
            }),
            db.getPublishedPaymentPlans({
              scope,
              concessionaria_id: scope === 'concessionaria' ? concessionariaId : null,
              audience: 'revenda'
            })
          ]);
        } catch {
          publishedCliente = [];
          publishedRevenda = [];
        }

        const fallbackCliente = getPaymentPlans('cliente');
        const fallbackRevenda = getPaymentPlans('revenda');

        const toCopy = (
          [...(publishedCliente || []), ...(publishedRevenda || [])].filter(p => p.active).length > 0
            ? [...(publishedCliente || []), ...(publishedRevenda || [])]
            : [...(fallbackCliente || []), ...(fallbackRevenda || [])]
        ).filter(p => p.active);

        for (const p of toCopy) {
          await db.upsertPaymentPlanItem({
            set_id: id,
            audience: p.audience,
            order: p.order,
            description: p.description,
            installments: p.installments,
            active: p.active,
            nature: p.nature,
            discount_percent: p.discount_percent,
            surcharge_percent: p.surcharge_percent,
            min_order_value: p.min_order_value,
            entry_percent_required: p.entry_percent_required,
            entry_percent: p.entry_percent,
            entry_min: p.entry_min,
            juros_mensal: p.juros_mensal,
          });
        }
      }

      await loadSets();
      setDraftSetId(id);
      setIsEditing(true);
      setStatusInfo({ type: 'success', message: 'Rascunho pronto para edição.' });
    } catch (e) {
      console.error('Erro ao criar/obter rascunho:', e);
      setStatusInfo({ type: 'error', message: 'Erro ao criar/obter rascunho.' });
    } finally {
      setIsLoading(false);
    }
  };

  const updateItemField = (idx, field, value) => {
    setItems(prev => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  };

  const addNewRow = () => {
    if (!draftSetId) {
      setStatusInfo({ type: 'error', message: 'Crie um rascunho para adicionar planos.' });
      return;
    }

    const targetEntry = entryFilter === '' ? null : Number(entryFilter);

    setItems(prev => ([
      ...prev,
      { ...EMPTY_ITEM, set_id: draftSetId, audience, entry_percent_required: targetEntry }
    ]));
  };

  const saveRow = async (idx) => {
    const row = items[idx];
    if (!draftSetId) {
      setStatusInfo({ type: 'error', message: 'Crie um rascunho para salvar.' });
      return;
    }

    const targetEntry = entryFilter === '' ? null : Number(entryFilter);

    try {
      setIsLoading(true);
      setStatusInfo({ type: '', message: '' });

      const payload = {
        ...row,
        set_id: draftSetId,
        audience,
        order: row.order,
        installments: row.installments,
        discount_percent: fromUiPercent(row.discount_percent),
        surcharge_percent: fromUiPercent(row.surcharge_percent),
        entry_percent_required: targetEntry,
        entry_percent: fromUiPercent(row.entry_percent),
      };

      const saved = await db.upsertPaymentPlanItem(payload);

      setItems(prev => prev.map((it, i) => (i === idx ? toUiItem(saved) : it)));
      setStatusInfo({ type: 'success', message: 'Plano salvo.' });
    } catch (e) {
      console.error('Erro ao salvar plano:', e);
      const msg = e?.message ? String(e.message) : 'Erro ao salvar plano.';
      setStatusInfo({ type: 'error', message: msg });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteRow = async (idx) => {
    const row = items[idx];

    if (!row?.id) {
      setItems(prev => prev.filter((_, i) => i !== idx));
      return;
    }

    const ok = window.confirm('Tem certeza que deseja excluir este plano?');
    if (!ok) return;

    try {
      setIsLoading(true);
      setStatusInfo({ type: '', message: '' });
      await db.deletePaymentPlanItem(row.id);
      setItems(prev => prev.filter((_, i) => i !== idx));
      setStatusInfo({ type: 'success', message: 'Plano excluído.' });
    } catch (e) {
      console.error('Erro ao excluir plano:', e);
      setStatusInfo({ type: 'error', message: 'Erro ao excluir plano.' });
    } finally {
      setIsLoading(false);
    }
  };

  const publishDraft = async () => {
    if (!draftSetId) {
      setStatusInfo({ type: 'error', message: 'Não há rascunho para publicar.' });
      return;
    }

    const ok = window.confirm('Publicar este rascunho? Isso substituirá o conjunto publicado atual.');
    if (!ok) return;

    try {
      setIsLoading(true);
      setStatusInfo({ type: '', message: '' });
      await db.publishPaymentPlanSet(draftSetId);
      await loadSets();
      setIsEditing(false);
      setStatusInfo({ type: 'success', message: 'Planos publicados.' });
    } catch (e) {
      console.error('Erro ao publicar:', e);
      setStatusInfo({ type: 'error', message: 'Erro ao publicar planos.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="planos-pagamento-page">
      <UnifiedHeader />

      <div className="planos-container">
        <div className="planos-header">
          <div>
            <h1>Planos de Pagamento</h1>
            <p className="sub">
              {scope === 'stark' ? 'Escopo: Stark' : `Escopo: Concessionária (${concessionariaId || '-'})`}
            </p>
          </div>

          <div className="planos-actions">
            <button className="btn" onClick={loadSets} disabled={isLoading}>Recarregar</button>
            <button className="btn primary" onClick={ensureDraft} disabled={isLoading}>Editar</button>
            <button className="btn success" onClick={publishDraft} disabled={isLoading || !draftSetId}>Publicar</button>
          </div>
        </div>

        {statusInfo?.message ? (
          <div className={`status ${statusInfo.type || ''}`}>{statusInfo.message}</div>
        ) : null}

        <div className="planos-meta">
          <div className="meta-item"><span className="k">Publicado:</span><span className="v">{publishedSetId ? 'Sim' : 'Não'}</span></div>
          <div className="meta-item"><span className="k">Rascunho:</span><span className="v">{draftSetId ? 'Sim' : 'Não'}</span></div>
          <div className="meta-item"><span className="k">Modo:</span><span className="v">{isEditing ? 'Editando rascunho' : 'Visualizando publicado'}</span></div>
        </div>

        <div className="audience-tabs">
          {AUDIENCES.map(a => (
            <button
              key={a.value}
              className={`tab ${audience === a.value ? 'active' : ''}`}
              onClick={() => setAudience(a.value)}
              disabled={isLoading}
            >
              {a.label}
            </button>
          ))}
        </div>

        <div className="audience-tabs">
          {ENTRY_FILTERS.map(f => (
            <button
              key={f.label}
              className={`tab ${entryFilter === f.value ? 'active' : ''}`}
              onClick={() => setEntryFilter(f.value)}
              disabled={isLoading}
            >
              {f.label}
            </button>
          ))}

          <button className="btn" onClick={addNewRow} disabled={isLoading || !draftSetId || !isEditing}>Adicionar Plano</button>
        </div>

        <div className="table-wrap">
          <table className="planos-table">
            <thead>
              <tr>
                <th>Ativo</th>
                <th>Ordem</th>
                <th>Descrição</th>
                <th>Parcelas</th>
                <th>Desc. (%)</th>
                <th>Acr. (%)</th>
                <th>Entrada (%)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty">{isEditing ? 'Nenhum plano no rascunho para esta audiência/entrada.' : 'Nenhum plano publicado para esta audiência/entrada.'}</td>
                </tr>
              ) : items.map((it, idx) => (
                <tr key={it.id || `new-${idx}`}>
                  <td>
                    <input
                      type="checkbox"
                      checked={!!it.active}
                      onChange={(e) => updateItemField(idx, 'active', e.target.checked)}
                      disabled={isLoading || !isEditing}
                    />
                  </td>
                  <td>
                    <input
                      className="inp sm"
                      value={it.order ?? ''}
                      onChange={(e) => updateItemField(idx, 'order', e.target.value)}
                      disabled={isLoading || !isEditing}
                    />
                  </td>
                  <td>
                    <input
                      className="inp"
                      value={it.description ?? ''}
                      onChange={(e) => updateItemField(idx, 'description', e.target.value)}
                      disabled={isLoading || !isEditing}
                    />
                  </td>
                  <td>
                    <input
                      className="inp sm"
                      value={it.installments ?? ''}
                      onChange={(e) => updateItemField(idx, 'installments', e.target.value)}
                      disabled={isLoading || !isEditing}
                    />
                  </td>
                  <td>
                    <input
                      className="inp sm"
                      value={it.discount_percent ?? ''}
                      onChange={(e) => updateItemField(idx, 'discount_percent', e.target.value)}
                      disabled={isLoading || !isEditing}
                      placeholder="3"
                    />
                  </td>
                  <td>
                    <input
                      className="inp sm"
                      value={it.surcharge_percent ?? ''}
                      onChange={(e) => updateItemField(idx, 'surcharge_percent', e.target.value)}
                      disabled={isLoading || !isEditing}
                      placeholder="1"
                    />
                  </td>
                  <td>
                    <input
                      className="inp sm"
                      value={it.entry_percent ?? ''}
                      onChange={(e) => updateItemField(idx, 'entry_percent', e.target.value)}
                      disabled={isLoading || !isEditing}
                      placeholder="30"
                    />
                  </td>
                  <td className="row-actions">
                    <button className="btn small" onClick={() => saveRow(idx)} disabled={isLoading || !isEditing}>Salvar</button>
                    <button className="btn small danger" onClick={() => deleteRow(idx)} disabled={isLoading || !isEditing}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
