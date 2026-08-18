import React from 'react';
import { useGuindasteConfigurador, TIPO_LABELS, getTipoModelo } from '../../hooks/useGuindasteConfigurador';
import LazyGuindasteImage from '../LazyGuindasteImage';

const SERIE_LABELS = { GSI: 'Interno', GSE: 'Externo' };

/**
 * Step 1 — Seleção compacta do modelo base de guindaste.
 * Apenas escolha do equipamento/modelo base; sem configuração de lanças/opcionais.
 * @param {Object} props
 * @param {Array} props.guindastes - Lista completa de guindastes
 * @param {boolean} props.isLoading - Indicador de carregamento
 * @param {Function} props.onSelectModel - Callback ao selecionar um modelo base
 */
const Step1GuindasteSelector = ({
  guindastes = [],
  isLoading = false,
  onSelectModel
}) => {
  const {
    SERIE_LABELS: hookSerieLabels,
    filteredGroups,
    activeSerie,
    activeTipo,
    handleSerie,
    handleTipo,
  } = useGuindasteConfigurador({
    guindastes,
    getPreco: null,
    getImagem: null,
    precoContextKey: '',
  });

  if (isLoading) {
    return <div className="gc-loading">Carregando equipamentos...</div>;
  }

  return (
    <div className="step-content">
      <div className="step-header">
        <h2>Selecione o Guindaste Ideal</h2>
        <p>Escolha o modelo base e configure os opcionais na próxima tela</p>
      </div>

      {/* Filtro de série */}
      <div className="gc-tabs" style={{ marginBottom: '10px' }}>
        {['GSI', 'GSE'].map(s => (
          <button
            key={s}
            type="button"
            className={`gc-tab ${activeSerie === s ? 'active' : ''}`}
            onClick={() => handleSerie(s)}
          >
            <span className="gc-tab-code">{s}</span>
            <span className="gc-tab-desc">{hookSerieLabels[s]}</span>
          </button>
        ))}
      </div>

      {/* Filtro de tipo */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
        marginBottom: '12px'
      }}>
        {Object.entries(TIPO_LABELS).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => handleTipo(key)}
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              border: activeTipo === key ? '2px solid #000000' : '1.5px solid #e5e7eb',
              background: activeTipo === key ? '#000000' : '#ffffff',
              color: activeTipo === key ? '#ffffff' : '#000000',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="gc-meta">{filteredGroups.length} modelo(s) disponível(is)</div>

      {/* Grid compacta de modelos */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
        gap: '10px',
        marginTop: '12px'
      }}>
        {filteredGroups.map(grp => {
          const rep = grp.variants.find(v => !v._optStr) || grp.variants[0];
          return (
            <button
              key={grp.model}
              type="button"
              onClick={() => onSelectModel && onSelectModel(grp)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 10px',
                background: '#ffffff',
                border: '1.5px solid #e5e7eb',
                borderRadius: '10px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.12s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#000000';
                e.currentTarget.style.boxShadow = '0 3px 10px rgba(0,0,0,0.08)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'none';
              }}
            >
              {/* Miniatura integrada pequena */}
              <div style={{
                width: '56px',
                height: '56px',
                flexShrink: 0,
                borderRadius: '8px',
                overflow: 'hidden',
                background: '#f3f4f6',
                border: '1px solid #e5e7eb'
              }}>
                {rep?.id ? (
                  <LazyGuindasteImage
                    guindasteId={rep.id}
                    subgrupo={grp.model}
                    alt={grp.model}
                    className="gc-step1-thumb-img"
                  />
                ) : (
                  <span role="img" aria-label="guindaste" style={{ fontSize: '22px', display: 'block', textAlign: 'center', lineHeight: '48px' }}>🏗️</span>
                )}
              </div>

              {/* Informações compactas */}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  color: '#000000',
                  marginBottom: '1px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {grp.model}
                </div>
                <div style={{
                  fontSize: '0.6875rem',
                  color: '#6b7280',
                  marginBottom: '2px'
                }}>
                  {SERIE_LABELS[grp.serie] || grp.serie}
                  {' · '}
                  <span style={{
                    display: 'inline-block',
                    padding: '1px 4px',
                    borderRadius: '3px',
                    background: '#f3f4f6',
                    color: '#000000',
                    fontWeight: 600,
                    fontSize: '0.625rem',
                    textTransform: 'uppercase'
                  }}>
                    {TIPO_LABELS[getTipoModelo(grp.model)]}
                  </span>
                </div>
                <div style={{
                  fontSize: '0.6875rem',
                  color: '#000000',
                  fontWeight: 500
                }}>
                  {grp.variants.length} config.
                </div>
              </div>

              {/* Indicador de ação */}
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: '#000000',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '14px', height: '14px' }}>
                  <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                </svg>
              </div>
            </button>
          );
        })}
      </div>

      {filteredGroups.length === 0 && (
        <div style={{
          padding: '24px',
          textAlign: 'center',
          color: '#6b7280',
          fontSize: '0.875rem'
        }}>
          Nenhum modelo disponível para os filtros selecionados.
        </div>
      )}
    </div>
  );
};

export default Step1GuindasteSelector;
