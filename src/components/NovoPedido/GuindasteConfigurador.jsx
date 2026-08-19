import React from 'react';
import { formatCurrency } from '../../utils/formatters';
import LazyGuindasteImage from '../LazyGuindasteImage';
import { useGuindasteConfigurador } from '../../hooks/useGuindasteConfigurador';
import { getOpcionalImagesFromVariant } from '../../config/opcionalImages';
import '../../styles/GuindasteConfigurador.css';

export default function GuindasteConfigurador({
  guindastes = [],
  onGuindasteSelect,
  isLoading = false,
  getPreco,
  getImagem,
  precoContextKey = '',
}) {
  const {
    SERIE_LABELS,
    filteredGroups,
    selectedGroup,
    sortedVariants,
    activeSerie,
    selectedGuindaste,
    precoExibido,
    loadingPreco,
    previewImageUrl,
    loadingPreview,
    handleSerie,
    handleGroupSelect,
    handleVariantSelect,
    handleConfirmar,
    variantLabel,
  } = useGuindasteConfigurador({
    guindastes,
    getPreco,
    getImagem,
    precoContextKey,
    onConfirm: onGuindasteSelect,
  });

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

        <div className="gc-meta">{filteredGroups.length} modelo(s) disponível(is) · Selecione para configurar</div>

        <div className="gc-grid">
          {filteredGroups.map(grp => {
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
          {filteredGroups.length === 0 && (
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
                const opcionalImages = isActive ? getOpcionalImagesFromVariant(v._optStr) : [];
                return (
                  <button key={v.id} type="button"
                    className={`gc-variant ${isActive ? 'active' : ''}`}
                    onClick={() => handleVariantSelect(v)}>
                    <div className="gc-variant-info">
                      <div className="gc-variant-name">{variantLabel(v._optStr)}</div>
                      <div className="gc-variant-code">Código: {v.codigo_referencia || '—'}</div>
                    </div>
                    {opcionalImages.length > 0 && (
                      <div className="gc-variant-images" aria-hidden="true">
                        {opcionalImages.map((src, idx) => (
                          <img key={idx} src={src} alt="" className="gc-variant-img" />
                        ))}
                      </div>
                    )}
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
