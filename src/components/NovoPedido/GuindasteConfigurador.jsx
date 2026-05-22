import React, { useState, useMemo, useEffect, useRef } from 'react';
import { DESCRICOES_OPCIONAIS } from '../../config/codigosGuindaste';
import { formatCurrency } from '../../utils/formatters';
import { normalizarRegiao } from '../../utils/regiaoHelper';
import LazyGuindasteImage from '../LazyGuindasteImage';
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

function isValidImageUrl(url) {
  return typeof url === 'string' && url.trim() !== '' &&
    url !== 'null' && url !== 'undefined' && url.length > 10;
}

function parsePreco(preco) {
  if (preco == null || preco === '') return null;
  const valor = typeof preco === 'number' ? preco : parseFloat(preco);
  return Number.isFinite(valor) ? valor : null;
}

function buildGroups(guindastes) {
  const map = new Map();
  (guindastes || []).forEach(g => {
    const base = extractBase(g.subgrupo);
    if (!base) return;
    const serie = base.split(' ')[0];
    if (serie !== 'GSI' && serie !== 'GSE') return;
    const optStr = extractOpts(g.subgrupo);
    if (!map.has(base)) map.set(base, { model: base, serie, variants: [] });
    const grp = map.get(base);
    grp.variants.push({ ...g, _optStr: optStr });
  });
  return [...map.values()].sort((a, b) => {
    const na = parseFloat(a.model.replace(/[^0-9.]/g, '')) || 0;
    const nb = parseFloat(b.model.replace(/[^0-9.]/g, '')) || 0;
    return na !== nb ? na - nb : a.model.localeCompare(b.model);
  });
}

export default function GuindasteConfigurador({
  guindastes = [],
  onGuindasteSelect,
  isLoading = false,
  getPreco,
  getImagem,
  precoContextKey = '',
}) {
  const [activeSerie, setActiveSerie] = useState('GSI');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedGuindaste, setSelectedGuindaste] = useState(null);
  const [precoExibido, setPrecoExibido] = useState(null);
  const [loadingPreco, setLoadingPreco] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const getPrecoRef = useRef(getPreco);
  const getImagemRef = useRef(getImagem);
  const precoContextKeyRef = useRef(precoContextKey);
  getPrecoRef.current = getPreco;
  getImagemRef.current = getImagem;
  precoContextKeyRef.current = precoContextKey;

  const allGroups = useMemo(() => buildGroups(guindastes), [guindastes]);
  const currentGroups = useMemo(
    () => allGroups.filter(g => g.serie === activeSerie),
    [allGroups, activeSerie]
  );

  const sortedVariants = useMemo(() => {
    if (!selectedGroup) return [];
    return [...selectedGroup.variants].sort((a, b) => {
      if (!a._optStr) return -1;
      if (!b._optStr) return 1;
      return a._optStr.localeCompare(b._optStr);
    });
  }, [selectedGroup]);

  const activeVariantIdRef = useRef(null);
  activeVariantIdRef.current = selectedGuindaste?.id ?? null;

  useEffect(() => {
    if (!selectedGroup?.model) return;
    const refreshed = allGroups.find(
      g => g.model === selectedGroup.model && g.serie === selectedGroup.serie
    );
    if (refreshed && refreshed !== selectedGroup) {
      setSelectedGroup(refreshed);
    }
  }, [allGroups, selectedGroup]);

  useEffect(() => {
    const variantId = selectedGuindaste?.id;
    if (variantId == null || variantId === '') {
      setPrecoExibido(null);
      setLoadingPreco(false);
      return;
    }

    const variant =
      sortedVariants.find((v) => String(v.id) === String(variantId)) || selectedGuindaste;
    if (!variant?.id) return;

    const fetchPreco = getPrecoRef.current;
    if (!fetchPreco) return;

    const guindasteId = variant.id;
    const regiaoLabel = (precoContextKeyRef.current || '').trim();
    if (!regiaoLabel) {
      setPrecoExibido(null);
      setLoadingPreco(false);
      return;
    }

    const regiaoNorm = normalizarRegiao(regiaoLabel);
    let cancelled = false;

    const carregarPreco = async () => {
      setLoadingPreco(true);
      setPrecoExibido(null);

      try {
        const preco = await fetchPreco(guindasteId, regiaoLabel);
        if (cancelled || String(activeVariantIdRef.current) !== String(guindasteId)) return;

        const valor = parsePreco(preco);

        if (valor == null || valor <= 0) {
          console.warn('[GuindasteConfigurador] Preço zerado ou indisponível', {
            guindasteId,
            codigo: variant.codigo_referencia,
            subgrupo: variant.subgrupo,
            regiao: regiaoLabel || '(não informada)',
            regiaoNormalizada: regiaoNorm,
            retorno: preco,
          });
          setPrecoExibido(0);
          setSelectedGuindaste((prev) =>
            prev && String(prev.id) === String(guindasteId)
              ? { ...prev, ...variant, preco: 0 }
              : prev
          );
        } else {
          setPrecoExibido(valor);
          setSelectedGuindaste((prev) =>
            prev && String(prev.id) === String(guindasteId)
              ? { ...prev, ...variant, preco: valor }
              : prev
          );
        }
      } catch (err) {
        if (cancelled || String(activeVariantIdRef.current) !== String(guindasteId)) return;
        console.warn('[GuindasteConfigurador] Erro ao buscar preço', {
          guindasteId,
          codigo: variant.codigo_referencia,
          regiao: regiaoLabel || '(não informada)',
          regiaoNormalizada: regiaoNorm,
          erro: err?.message || err,
        });
        setPrecoExibido(null);
      } finally {
        if (!cancelled && String(activeVariantIdRef.current) === String(guindasteId)) {
          setLoadingPreco(false);
        }
      }
    };

    carregarPreco();
    return () => { cancelled = true; };
  }, [selectedGuindaste?.id, precoContextKey, sortedVariants]);

  useEffect(() => {
    const variant = selectedGuindaste;
    if (!variant?.id) {
      setPreviewImageUrl(null);
      setLoadingPreview(false);
      return;
    }

    const variantId = variant.id;

    if (isValidImageUrl(variant.imagem_url)) {
      setPreviewImageUrl(variant.imagem_url);
      setLoadingPreview(false);
      return;
    }

    const fetchImagem = getImagemRef.current;
    if (!fetchImagem) {
      setPreviewImageUrl(null);
      setLoadingPreview(false);
      return;
    }

    let cancelled = false;
    setLoadingPreview(true);
    setPreviewImageUrl(null);

    fetchImagem(variantId)
      .then(url => {
        if (cancelled || String(activeVariantIdRef.current) !== String(variantId)) return;
        setPreviewImageUrl(isValidImageUrl(url) ? url : null);
        setLoadingPreview(false);
      })
      .catch(() => {
        if (cancelled || String(activeVariantIdRef.current) !== String(variantId)) return;
        setPreviewImageUrl(null);
        setLoadingPreview(false);
      });

    return () => { cancelled = true; };
  }, [selectedGuindaste?.id]);

  const resetSelecaoVariante = () => {
    setSelectedGuindaste(null);
    setPrecoExibido(null);
    setLoadingPreco(false);
    setPreviewImageUrl(null);
    setLoadingPreview(false);
  };

  const handleGroupSelect = (group) => {
    setSelectedGroup(group);
    resetSelecaoVariante();
  };

  const handleSerie = (serie) => {
    setActiveSerie(serie);
    setSelectedGroup(null);
    resetSelecaoVariante();
  };

  const handleVariantSelect = (variant) => {
    if (!variant?.id) return;
    setSelectedGuindaste({ ...variant, preco: undefined });
    setPrecoExibido(null);
    setLoadingPreco(true);
    setPreviewImageUrl(null);
    setLoadingPreview(true);
  };

  const handleConfirmar = () => {
    if (!selectedGuindaste?.id || loadingPreco) return;
    const precoFinal = precoExibido ?? selectedGuindaste.preco;
    if (precoFinal == null || precoFinal <= 0) return;
    onGuindasteSelect({
      ...selectedGuindaste,
      preco: precoFinal,
    });
  };

  if (isLoading) {
    return <div className="gc-loading">Carregando equipamentos...</div>;
  }

  return (
    <div className="gc-layout">

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
                <div className="gc-card-body">
                  <div className="gc-card-model">{grp.model}</div>
                  {rep?.peso_kg && <div className="gc-card-spec">Lanças: {rep.peso_kg}</div>}
                  <div className="gc-card-count">{grp.variants.length} configuração(ões)</div>
                </div>
                {isActive && <div className="gc-card-check" aria-hidden="true">✓</div>}
              </button>
            );
          })}
          {currentGroups.length === 0 && (
            <div className="gc-empty-series">Nenhum modelo {activeSerie} disponível.</div>
          )}
        </div>

        {selectedGuindaste && (
          <div className="gc-panel-img-wrap">
            {loadingPreview && !previewImageUrl && (
              <div className="gc-panel-img-loading">Carregando imagem...</div>
            )}
            {previewImageUrl ? (
              <img
                src={previewImageUrl}
                alt={selectedGroup?.model || selectedGuindaste.subgrupo}
                className="gc-panel-img"
                onError={e => { e.currentTarget.style.display = 'none'; }}
              />
            ) : !loadingPreview && (
              <LazyGuindasteImage
                key={String(selectedGuindaste.id)}
                guindasteId={selectedGuindaste.id}
                subgrupo={selectedGuindaste.subgrupo}
                alt={selectedGroup?.model || selectedGuindaste.subgrupo}
                className="gc-panel-img"
              />
            )}
          </div>
        )}
      </div>

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
                const isActive = selectedGuindaste && String(selectedGuindaste.id) === String(v.id);
                return (
                  <button key={v.id} type="button"
                    className={`gc-variant ${isActive ? 'active' : ''}`}
                    onClick={() => handleVariantSelect(v)}>
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
                  {loadingPreco
                    ? 'Carregando preço...'
                    : precoExibido != null && precoExibido > 0
                      ? formatCurrency(precoExibido)
                      : precoExibido === 0
                        ? 'Preço indisponível para esta região'
                        : '—'}
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
              disabled={!selectedGuindaste || loadingPreco || !(precoExibido > 0)}
              onClick={handleConfirmar}>
              {selectedGuindaste ? '✓ Confirmar Configuração' : 'Selecione uma configuração acima'}
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
