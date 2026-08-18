import React, { useState } from 'react';
import { useGuindasteConfigurador } from '../../hooks/useGuindasteConfigurador';
import LazyGuindasteImage from '../LazyGuindasteImage';

const TABS = [
  { key: 'GSI', code: 'GSI', desc: 'GUINDASTE INTERNO', serie: 'GSI', tipo: 'todos' },
  { key: 'GSE_C', code: 'GSE C', desc: 'CANIVETE EXTERNO', serie: 'GSE', tipo: 'canivete' },
  { key: 'GSE_T', code: 'GSE T', desc: 'TRAVE EXTERNO', serie: 'GSE', tipo: 'trave' },
];

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
  const [stepTab, setStepTab] = useState('GSI');

  const {
    filteredGroups,
    handleSerie,
    handleTipo,
  } = useGuindasteConfigurador({
    guindastes,
    getPreco: null,
    getImagem: null,
    precoContextKey: '',
  });

  const applyTab = (tab) => {
    const found = TABS.find(t => t.key === tab);
    if (!found) return;
    setStepTab(tab);
    handleSerie(found.serie);
    handleTipo(found.tipo);
  };

  if (isLoading) {
    return <div className="gc-loading">Carregando equipamentos...</div>;
  }

  return (
    <div className="step-content">
      <div className="step-header">
        <h2>Selecione o Guindaste Ideal</h2>
        <p>Escolha o modelo base e configure os opcionais na próxima tela</p>
      </div>

      {/* Filtro de série/subtipo */}
      <div className="gc-tabs" style={{ marginBottom: '10px' }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            type="button"
            className={`gc-tab ${stepTab === tab.key ? 'active' : ''}`}
            onClick={() => applyTab(tab.key)}
          >
            <span className="gc-tab-code">{tab.code}</span>
            <span className="gc-tab-desc">{tab.desc}</span>
          </button>
        ))}
      </div>

      <div className="gc-meta">{filteredGroups.length} modelo(s) disponível(is)</div>

      {/* Grid compacta de modelos */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
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
                flexDirection: 'column',
                alignItems: 'stretch',
                gap: '8px',
                padding: '10px',
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
              {/* Linha do título + ação */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px'
              }}>
                <span style={{
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  color: '#000000',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {grp.model}
                </span>
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
              </div>

              {/* Miniatura abaixo do título */}
              <div style={{
                width: '72px',
                height: '72px',
                borderRadius: '8px',
                overflow: 'hidden',
                background: '#f3f4f6',
                border: '1px solid #e5e7eb',
                alignSelf: 'center'
              }}>
                {rep?.id ? (
                  <LazyGuindasteImage
                    guindasteId={rep.id}
                    subgrupo={grp.model}
                    alt={grp.model}
                    className="gc-step1-thumb-img"
                  />
                ) : (
                  <span role="img" aria-label="guindaste" style={{ fontSize: '28px', display: 'block', textAlign: 'center', lineHeight: '68px' }}>🏗️</span>
                )}
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
