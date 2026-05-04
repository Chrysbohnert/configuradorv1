import React, { useState, useMemo, useEffect } from 'react';
import { DESCRICOES_OPCIONAIS } from '../../config/codigosGuindaste';
import { formatCurrency } from '../../utils/formatters';
import '../../styles/GuindasteConfigurador.css';

const SERIE_LABELS = { GSI: 'GUINDASTE INTERNO', GSE: 'GUINDASTE EXTERNO' };

function extractBase(subgrupo) {
  return (subgrupo || '').replace(/^(Guindaste\s+)+/i, '').split(' ').slice(0, 2).join(' ');
}

function extractOpts(subgrupo) {
  const clean = (subgrupo || '').replace(/^(Guindaste\s+)+/i, '');
  return clean.split(' ').slice(2).join(' ').trim();
}

function variantLabel(optStr) {
  if (!optStr) return 'Configuração Base — Sem Opcionais';
  if (DESCRICOES_OPCIONAIS[optStr]) return DESCRICOES_OPCIONAIS[optStr];
  if (optStr.includes('Caminhão 3/4')) {
    const rest = optStr.replace('Caminhão 3/4', '').trim();
    const parts = ['Caminhão 3/4', ...(rest ? [rest] : [])];
    return parts.map(p => DESCRICOES_OPCIONAIS[p] || p).join(' + ');
  }
  return optStr.split('/').map(p => DESCRICOES_OPCIONAIS[p.trim()] || p.trim()).join(' + ');
}

function buildGroups(guindastes) {
  const map = new Map();
  (guindastes || []).forEach(g => {
    const base = extractBase(g.subgrupo);
    if (!base) return;
    const serie = base.split(' ')[0];
    if (serie !== 'GSI' && serie !== 'GSE') return;
    const optStr = extractOpts(g.subgrupo);
    if (!map.has(base)) map.set(base, { model: base, serie, variants: [], minPrice: Infinity });
    const grp = map.get(base);
    grp.variants.push({ ...g, _optStr: optStr });
    const p = parseFloat(g.preco) || 0;
    if (p > 0 && p < grp.minPrice) grp.minPrice = p;
  });
  return [...map.values()].sort((a, b) => {
    const na = parseFloat(a.model.replace(/[^0-9.]/g, '')) || 0;
    const nb = parseFloat(b.model.replace(/[^0-9.]/g, '')) || 0;
    return na !== nb ? na - nb : a.model.localeCompare(b.model);
  });
}

export default function GuindasteConfigurador({ guindastes = [], onGuindasteSelect, isLoading = false, getPreco, getImagem }) {
  const [activeSerie, setActiveSerie] = useState('GSI');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedOptStr, setSelectedOptStr] = useState(null);
  const [precoAtual, setPrecoAtual] = useState(null);
  const [loadingPreco, setLoadingPreco] = useState(false);
  const [imagemUrl, setImagemUrl] = useState(null);

  const allGroups = useMemo(() => buildGroups(guindastes), [guindastes]);
  const currentGroups = useMemo(() => allGroups.filter(g => g.serie === activeSerie), [allGroups, activeSerie]);

  const sortedVariants = useMemo(() => {
    if (!selectedGroup) return [];
    return [...selectedGroup.variants].sort((a, b) => {
      if (!a._optStr) return -1;
      if (!b._optStr) return 1;
      return a._optStr.localeCompare(b._optStr);
    });
  }, [selectedGroup]);

  const selectedGuindaste = useMemo(
    () => sortedVariants.find(v => v._optStr === selectedOptStr) ?? null,
    [sortedVariants, selectedOptStr]
  );

  useEffect(() => {
    if (!selectedGuindaste || !getPreco) {
      setPrecoAtual(null);
      return;
    }
    let cancelled = false;
    setLoadingPreco(true);
    getPreco(selectedGuindaste.id)
      .then(preco => { if (!cancelled) { setPrecoAtual(preco || 0); setLoadingPreco(false); } })
      .catch(() => { if (!cancelled) { setPrecoAtual(0); setLoadingPreco(false); } });
    return () => { cancelled = true; };
  }, [selectedGuindaste, getPreco]);

  useEffect(() => {
    if (!selectedGroup) { setImagemUrl(null); return; }
    const rep = selectedGroup.variants.find(v => !v._optStr) || selectedGroup.variants[0];
    if (rep?.imagem_url) { setImagemUrl(rep.imagem_url); return; }
    if (!getImagem || !rep) { setImagemUrl(null); return; }
    let cancelled = false;
    getImagem(rep.id).then(url => { if (!cancelled) setImagemUrl(url || null); }).catch(() => {});
    return () => { cancelled = true; };
  }, [selectedGroup, getImagem]);

  const handleGroupSelect = (group) => {
    setSelectedGroup(group);
    setSelectedOptStr(null);
    setPrecoAtual(null);
  };

  const handleSerie = (serie) => {
    setActiveSerie(serie);
    setSelectedGroup(null);
    setSelectedOptStr(null);
    setPrecoAtual(null);
    setImagemUrl(null);
  };

  if (isLoading) {
    return <div className="gc-loading">Carregando equipamentos...</div>;
  }

  return (
    <div className="gc-layout">

      {/* ─── LEFT PANEL ─── */}
      <div className="gc-left">
        <div className="gc-tabs">
          {['GSI', 'GSE'].map(s => (
            <button key={s} type="button"
              className={`gc-tab ${activeSerie === s ? 'active' : ''}`}
              onClick={() => handleSerie(s)}>
              <span className="gc-tab-code">{s}</span>
              <span className="gc-tab-desc">{SERIE_LABELS[s]}</span>
            </button>
          ))}
        </div>

        <div className="gc-meta">{currentGroups.length} modelo(s) disponível(is) · Selecione para configurar</div>

        <div className="gc-grid">
          {currentGroups.map(grp => {
            const rep = grp.variants.find(v => !v._optStr) || grp.variants[0];
            const isActive = selectedGroup?.model === grp.model;
            return (
              <button key={grp.model} type="button"
                className={`gc-card ${isActive ? 'selected' : ''}`}
                onClick={() => handleGroupSelect(grp)}>
                {rep?.imagem_url && (
                  <img src={rep.imagem_url} alt={grp.model} className="gc-card-img"
                    onError={e => { e.currentTarget.style.display = 'none'; }} />
                )}
                <div className="gc-card-body">
                  <div className="gc-card-model">{grp.model}</div>
                  {rep?.peso_kg && <div className="gc-card-spec">Lanças: {rep.peso_kg}</div>}
                  <div className="gc-card-count">{grp.variants.length} configuração(ões)</div>
                  {grp.minPrice < Infinity && (
                    <div className="gc-card-price">A partir de {formatCurrency(grp.minPrice)}</div>
                  )}
                </div>
                {isActive && <div className="gc-card-check" aria-hidden="true">✓</div>}
              </button>
            );
          })}
          {currentGroups.length === 0 && (
            <div className="gc-empty-series">Nenhum modelo {activeSerie} disponível.</div>
          )}
        </div>

        {imagemUrl && (
          <div className="gc-panel-img-wrap" style={{ marginTop: '16px' }}>
            <img
              src={imagemUrl}
              alt={selectedGroup?.model || ''}
              className="gc-panel-img"
              onError={e => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
        )}
      </div>

      {/* ─── RIGHT PANEL ─── */}
      <div className="gc-right">
        {!selectedGroup ? (
          <div className="gc-empty">
            <div className="gc-empty-icon">⚙️</div>
            <p>Selecione um modelo ao lado para ver as configurações e opcionais disponíveis</p>
          </div>
        ) : (
          <div className="gc-panel">
            <div className="gc-panel-head">
              <span className="gc-panel-serie">{selectedGroup.serie} · {SERIE_LABELS[selectedGroup.serie]}</span>
              <h3 className="gc-panel-model">{selectedGroup.model}</h3>
              <p className="gc-panel-sub">{sortedVariants.length} variante(s) disponível(is)</p>
            </div>

            <div className="gc-section-label">Configuração de opcionais</div>

            <div className="gc-variants">
              {sortedVariants.map(v => {
                const isActive = selectedOptStr === v._optStr;
                return (
                  <button key={v.id} type="button"
                    className={`gc-variant ${isActive ? 'active' : ''}`}
                    onClick={() => setSelectedOptStr(v._optStr)}>
                    <div className="gc-variant-info">
                      <div className="gc-variant-name">{variantLabel(v._optStr)}</div>
                      <div className="gc-variant-code">Código: {v.codigo_referencia || '—'}</div>
                    </div>
                    <div className={`gc-variant-radio ${isActive ? 'checked' : ''}`} />
                  </button>
                );
              })}
            </div>

            {selectedGuindaste ? (
              <div className="gc-price-box">
                <div className="gc-price-label">Valor do equipamento</div>
                <div className="gc-price-value">
                  {loadingPreco ? 'Carregando...' : formatCurrency(precoAtual ?? 0)}
                </div>
                <div className="gc-price-code">{selectedGuindaste.codigo_referencia}</div>
              </div>
            ) : (
              <div className="gc-price-placeholder">
                O valor será exibido após selecionar a configuração acima
              </div>
            )}

            <button type="button"
              className="gc-confirm"
              disabled={!selectedGuindaste}
              onClick={() => selectedGuindaste && onGuindasteSelect(selectedGuindaste)}>
              {selectedGuindaste ? '✓ Confirmar Configuração' : 'Selecione uma configuração acima'}
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
