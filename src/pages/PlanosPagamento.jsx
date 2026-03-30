import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import UnifiedHeader from '../components/UnifiedHeader';
import { db } from '../config/supabase';
import { getPaymentPlans } from '../services/paymentPlans';
import '../styles/PlanosPagamento.css';

const AUDIENCES = [
  { value: 'cliente', label: 'Cliente' },
  { value: 'revenda', label: 'Revenda' },
  { value: 'concessionaria_compra', label: 'Compra Concessionária' }
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

  const [protoGuindastes, setProtoGuindastes] = useState([]);
  const [protoSelectedId, setProtoSelectedId] = useState('');
  const [protoInfo, setProtoInfo] = useState(null);
  const [protoSets, setProtoSets] = useState([]);
  const [protoDraftSetId, setProtoDraftSetId] = useState(null);
  const [protoPublishedSetId, setProtoPublishedSetId] = useState(null);
  const [protoItems, setProtoItems] = useState([]);
  const [protoIsEditing, setProtoIsEditing] = useState(false);
  const [protoVendedoresDisponiveis, setProtoVendedoresDisponiveis] = useState([]);
  const [protoVendedoresSelecionados, setProtoVendedoresSelecionados] = useState([]);

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
    if (!user) return;
    if (!isAdminStark) return;

    const loadProtoGuindastes = async () => {
      try {
        setIsLoading(true);
        const pageSize = 200;
        const maxPages = 10;
        const all = [];
        for (let page = 1; page <= maxPages; page++) {
          const res = await db.getGuindastesLite(page, pageSize, true);
          const chunk = res?.data || [];
          all.push(...chunk);
          if (chunk.length < pageSize) break;
        }
        const protos = (all || []).filter(g => !!g.is_prototipo);
        setProtoGuindastes(protos);
      } catch (e) {
        console.error('Erro ao carregar protótipos:', e);
        setProtoGuindastes([]);
      } finally {
        setIsLoading(false);
      }
    };

    const loadVendedores = async () => {
      try {
        const users = await db.getUsers();
        const vendedores = (users || []).filter(u => u?.tipo === 'vendedor' || u?.tipo === 'vendedor_concessionaria');
        setProtoVendedoresDisponiveis(vendedores);
      } catch (e) {
        console.error('Erro ao carregar vendedores:', e);
        setProtoVendedoresDisponiveis([]);
      }
    };

    loadProtoGuindastes();
    loadVendedores();
  }, [user, isAdminStark]);

  useEffect(() => {
    if (!isAdminStark) return;
    if (!protoIsEditing) return;
    if (!protoDraftSetId) {
      setProtoItems([]);
      return;
    }
    const load = async () => {
      try {
        setIsLoading(true);
        const data = await db.getPrototypePaymentPlanItems(protoDraftSetId);
        const targetEntry = entryFilter === '' ? null : Number(entryFilter);
        const filtered = (data || [])
          .filter(i => i.audience === audience)
          .filter(i => (i.entry_percent_required ?? null) === targetEntry);
        setProtoItems(filtered.map(toUiItem));
      } catch (e) {
        console.error('Erro ao carregar itens do protótipo:', e);
        setProtoItems([]);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [protoDraftSetId, protoIsEditing, audience, entryFilter, isAdminStark]);

  const handleSelectProto = async (id) => {
    const val = String(id || '');
    setProtoSelectedId(val);
    setProtoInfo(null);
    setProtoSets([]);
    setProtoDraftSetId(null);
    setProtoPublishedSetId(null);
    setProtoItems([]);
    setProtoIsEditing(false);
    setProtoVendedoresSelecionados([]);

    if (!val) return;

    try {
      setIsLoading(true);
      const g = await db.getGuindasteById(parseInt(val, 10));
      setProtoInfo(g || null);

      const sets = await db.getPrototypePaymentPlanSets({ guindaste_id: parseInt(val, 10) });
      setProtoSets(sets || []);
      const draft = (sets || []).find(s => s.status === 'draft');
      const published = (sets || []).find(s => s.status === 'published');
      setProtoDraftSetId(draft?.id || null);
      setProtoPublishedSetId(published?.id || null);

      try {
        const vis = await db.getGuindasteVisibilidadeByGuindasteId(parseInt(val, 10));
        const ids = (vis || []).filter(v => v.ativo).map(v => v.user_id);
        setProtoVendedoresSelecionados(ids);
      } catch (e) {
        console.warn('Falha ao carregar visibilidade do protótipo:', e);
        setProtoVendedoresSelecionados([]);
      }
    } catch (e) {
      console.error('Erro ao selecionar protótipo:', e);
      setStatusInfo({ type: 'error', message: 'Erro ao carregar dados do protótipo.' });
    } finally {
      setIsLoading(false);
    }
  };

  const protoEnsureDraft = async () => {
    if (!protoSelectedId) {
      setStatusInfo({ type: 'error', message: 'Selecione um protótipo.' });
      return;
    }
    try {
      setIsLoading(true);
      setStatusInfo({ type: '', message: '' });

      const id = await db.ensurePrototypePaymentPlanDraftSet({ guindaste_id: parseInt(protoSelectedId, 10) });
      const existingDraftItems = await db.getPrototypePaymentPlanItems(id);

      if (!existingDraftItems || existingDraftItems.length === 0) {
        let publishedCliente = [];
        let publishedRevenda = [];

        try {
          [publishedCliente, publishedRevenda] = await Promise.all([
            db.getPublishedPaymentPlans({ scope: 'stark', audience: 'cliente' }),
            db.getPublishedPaymentPlans({ scope: 'stark', audience: 'revenda' })
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
          await db.upsertPrototypePaymentPlanItem({
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

      const sets = await db.getPrototypePaymentPlanSets({ guindaste_id: parseInt(protoSelectedId, 10) });
      setProtoSets(sets || []);
      setProtoDraftSetId(id);
      setProtoIsEditing(true);
      setStatusInfo({ type: 'success', message: 'Rascunho do protótipo pronto para edição.' });
    } catch (e) {
      console.error('Erro ao criar/obter rascunho do protótipo:', e);
      setStatusInfo({ type: 'error', message: 'Erro ao criar/obter rascunho do protótipo.' });
    } finally {
      setIsLoading(false);
    }
  };

  const protoSaveRow = async (idx) => {
    const row = protoItems[idx];
    if (!protoDraftSetId) {
      setStatusInfo({ type: 'error', message: 'Crie um rascunho do protótipo para salvar.' });
      return;
    }
    const targetEntry = entryFilter === '' ? null : Number(entryFilter);
    try {
      setIsLoading(true);
      setStatusInfo({ type: '', message: '' });
      const payload = {
        ...row,
        set_id: protoDraftSetId,
        audience,
        order: row.order,
        installments: row.installments,
        discount_percent: fromUiPercent(row.discount_percent),
        surcharge_percent: fromUiPercent(row.surcharge_percent),
        entry_percent_required: targetEntry,
        entry_percent: fromUiPercent(row.entry_percent),
      };
      const saved = await db.upsertPrototypePaymentPlanItem(payload);
      setProtoItems(prev => prev.map((it, i) => (i === idx ? toUiItem(saved) : it)));
      setStatusInfo({ type: 'success', message: 'Plano do protótipo salvo.' });
    } catch (e) {
      console.error('Erro ao salvar plano do protótipo:', e);
      const msg = e?.message ? String(e.message) : 'Erro ao salvar plano do protótipo.';
      setStatusInfo({ type: 'error', message: msg });
    } finally {
      setIsLoading(false);
    }
  };

  const protoDeleteRow = async (idx) => {
    const row = protoItems[idx];

    if (!row?.id) {
      setProtoItems(prev => prev.filter((_, i) => i !== idx));
      return;
    }

    const ok = window.confirm('Tem certeza que deseja excluir este plano do protótipo?');
    if (!ok) return;

    try {
      setIsLoading(true);
      setStatusInfo({ type: '', message: '' });
      await db.deletePrototypePaymentPlanItem(row.id);
      setProtoItems(prev => prev.filter((_, i) => i !== idx));
      setStatusInfo({ type: 'success', message: 'Plano do protótipo excluído.' });
    } catch (e) {
      console.error('Erro ao excluir plano do protótipo:', e);
      setStatusInfo({ type: 'error', message: 'Erro ao excluir plano do protótipo.' });
    } finally {
      setIsLoading(false);
    }
  };

  const protoAddNewRow = () => {
    if (!protoDraftSetId) {
      setStatusInfo({ type: 'error', message: 'Crie um rascunho do protótipo para adicionar planos.' });
      return;
    }
    const targetEntry = entryFilter === '' ? null : Number(entryFilter);
    setProtoItems(prev => ([
      ...prev,
      { ...EMPTY_ITEM, set_id: protoDraftSetId, audience, entry_percent_required: targetEntry }
    ]));
  };

  const protoPublishDraft = async () => {
    if (!protoDraftSetId) {
      setStatusInfo({ type: 'error', message: 'Não há rascunho do protótipo para publicar.' });
      return;
    }

    const ok = window.confirm('Publicar este rascunho do protótipo? Isso substituirá o conjunto publicado do protótipo.');
    if (!ok) return;

    try {
      setIsLoading(true);
      setStatusInfo({ type: '', message: '' });
      await db.publishPrototypePaymentPlanSet(protoDraftSetId);
      const sets = await db.getPrototypePaymentPlanSets({ guindaste_id: parseInt(protoSelectedId, 10) });
      setProtoSets(sets || []);
      const published = (sets || []).find(s => s.status === 'published');
      setProtoPublishedSetId(published?.id || null);
      setProtoIsEditing(false);
      setStatusInfo({ type: 'success', message: 'Planos do protótipo publicados.' });
      const refreshed = await db.getGuindasteById(parseInt(protoSelectedId, 10));
      setProtoInfo(refreshed || null);
    } catch (e) {
      console.error('Erro ao publicar planos do protótipo:', e);
      setStatusInfo({ type: 'error', message: 'Erro ao publicar planos do protótipo.' });
    } finally {
      setIsLoading(false);
    }
  };

  const protoSalvarVisibilidade = async () => {
    if (!protoSelectedId) {
      setStatusInfo({ type: 'error', message: 'Selecione um protótipo.' });
      return;
    }
    try {
      setIsLoading(true);
      setStatusInfo({ type: '', message: '' });
      await db.setGuindasteVisibilidade({
        guindasteId: parseInt(protoSelectedId, 10),
        userIds: protoVendedoresSelecionados
      });
      setStatusInfo({ type: 'success', message: 'Visibilidade do protótipo salva.' });
    } catch (e) {
      console.error('Erro ao salvar visibilidade do protótipo:', e);
      setStatusInfo({ type: 'error', message: 'Erro ao salvar visibilidade do protótipo.' });
    } finally {
      setIsLoading(false);
    }
  };

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

        {isAdminStark && (
          <div className="table-wrap" style={{ marginBottom: 14 }}>
            <div style={{ padding: 14 }}>
              <div style={{ fontWeight: 800, marginBottom: 10 }}>Protótipo — Planos de Pagamento + Visibilidade</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Selecionar protótipo</div>
                  <select
                    className="inp"
                    value={protoSelectedId}
                    onChange={(e) => handleSelectProto(e.target.value)}
                    disabled={isLoading}
                  >
                    <option value="">-- Selecione --</option>
                    {(protoGuindastes || []).map(g => (
                      <option key={g.id} value={g.id}>
                        {g.codigo_referencia ? `${g.codigo_referencia} — ` : ''}{g.subgrupo} {g.modelo}{g.prototipo_label ? ` (${g.prototipo_label})` : ''}
                      </option>
                    ))}
                  </select>
                  {protoInfo?.id ? (
                    <div style={{ marginTop: 6, fontSize: 12, color: '#374151' }}>
                      Set publicado do protótipo: {protoInfo?.prototipo_payment_set_id ? 'Sim' : 'Não'}
                    </div>
                  ) : null}
                </div>

                {protoSelectedId ? (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Vendedores habilitados (CTRL para múltiplos)</div>
                    <select
                      multiple
                      className="inp"
                      style={{ width: '100%', minHeight: 120 }}
                      value={(protoVendedoresSelecionados || []).map(v => String(v))}
                      onChange={(e) => {
                        const ids = Array.from(e.target.selectedOptions || []).map(o => parseInt(o.value, 10)).filter(n => Number.isFinite(n) && n > 0);
                        setProtoVendedoresSelecionados(ids);
                      }}
                      disabled={isLoading}
                    >
                      {(protoVendedoresDisponiveis || []).map(v => (
                        <option key={v.id} value={v.id}>{v.nome} (ID {v.id})</option>
                      ))}
                    </select>
                    <div style={{ marginTop: 8 }}>
                      <button className="btn" onClick={protoSalvarVisibilidade} disabled={isLoading}>Salvar visibilidade</button>
                    </div>
                  </div>
                ) : null}

                {protoSelectedId ? (
                  <div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
                      <button className="btn primary" onClick={protoEnsureDraft} disabled={isLoading}>Editar planos do protótipo</button>
                      <button className="btn success" onClick={protoPublishDraft} disabled={isLoading || !protoDraftSetId}>Publicar planos do protótipo</button>
                      <button className="btn" onClick={() => setProtoIsEditing(false)} disabled={isLoading}>Sair</button>
                    </div>

                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>
                      Rascunho: {protoDraftSetId ? 'Sim' : 'Não'} | Publicado: {protoPublishedSetId ? 'Sim' : 'Não'} | Modo: {protoIsEditing ? 'Editando rascunho' : 'Visualizando publicado'}
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                      <button className="btn" onClick={protoAddNewRow} disabled={isLoading || !protoDraftSetId || !protoIsEditing}>Adicionar Plano</button>
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
                          {protoItems.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="empty">{protoIsEditing ? 'Nenhum plano no rascunho do protótipo para esta audiência/entrada.' : 'Edite para visualizar os planos do protótipo.'}</td>
                            </tr>
                          ) : protoItems.map((it, idx) => (
                            <tr key={it.id || `proto-new-${idx}`}>
                              <td>
                                <input
                                  type="checkbox"
                                  checked={!!it.active}
                                  onChange={(e) => setProtoItems(prev => prev.map((p, i) => (i === idx ? { ...p, active: e.target.checked } : p)))}
                                  disabled={isLoading || !protoIsEditing}
                                />
                              </td>
                              <td>
                                <input
                                  className="inp sm"
                                  value={it.order ?? ''}
                                  onChange={(e) => setProtoItems(prev => prev.map((p, i) => (i === idx ? { ...p, order: e.target.value } : p)))}
                                  disabled={isLoading || !protoIsEditing}
                                />
                              </td>
                              <td>
                                <input
                                  className="inp"
                                  value={it.description ?? ''}
                                  onChange={(e) => setProtoItems(prev => prev.map((p, i) => (i === idx ? { ...p, description: e.target.value } : p)))}
                                  disabled={isLoading || !protoIsEditing}
                                />
                              </td>
                              <td>
                                <input
                                  className="inp sm"
                                  value={it.installments ?? ''}
                                  onChange={(e) => setProtoItems(prev => prev.map((p, i) => (i === idx ? { ...p, installments: e.target.value } : p)))}
                                  disabled={isLoading || !protoIsEditing}
                                />
                              </td>
                              <td>
                                <input
                                  className="inp sm"
                                  value={it.discount_percent ?? ''}
                                  onChange={(e) => setProtoItems(prev => prev.map((p, i) => (i === idx ? { ...p, discount_percent: e.target.value } : p)))}
                                  disabled={isLoading || !protoIsEditing}
                                />
                              </td>
                              <td>
                                <input
                                  className="inp sm"
                                  value={it.surcharge_percent ?? ''}
                                  onChange={(e) => setProtoItems(prev => prev.map((p, i) => (i === idx ? { ...p, surcharge_percent: e.target.value } : p)))}
                                  disabled={isLoading || !protoIsEditing}
                                />
                              </td>
                              <td>
                                <input
                                  className="inp sm"
                                  value={it.entry_percent ?? ''}
                                  onChange={(e) => setProtoItems(prev => prev.map((p, i) => (i === idx ? { ...p, entry_percent: e.target.value } : p)))}
                                  disabled={isLoading || !protoIsEditing}
                                />
                              </td>
                              <td className="row-actions">
                                <button className="btn small" onClick={() => protoSaveRow(idx)} disabled={isLoading || !protoIsEditing}>Salvar</button>
                                <button className="btn small danger" onClick={() => protoDeleteRow(idx)} disabled={isLoading || !protoIsEditing}>Excluir</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

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
