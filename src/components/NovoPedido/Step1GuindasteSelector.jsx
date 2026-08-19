import React, { useState } from 'react';
import { useGuindasteConfigurador } from '../../hooks/useGuindasteConfigurador';
import LazyGuindasteImage from '../LazyGuindasteImage';
import '../../styles/GuindasteConfigurador.css';

const TABS = [
  { key: 'GSI', code: 'GSI', desc: 'GUINDASTE INTERNO', serie: 'GSI', tipo: 'todos' },
  { key: 'GSE_C', code: 'GSE C', desc: 'CANIVETE EXTERNO', serie: 'GSE', tipo: 'canivete' },
  { key: 'GSE_T', code: 'GSE T', desc: 'TRAVE EXTERNO', serie: 'GSE', tipo: 'trave' },
];

/**
 * Step 1 — Seleção compacta do modelo base de guindaste.
 * Apenas escolha do equipamento/modelo base; sem configuração de lanças/opcionais.
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
      <div className="gc-step1-grid">
        {filteredGroups.map(grp => {
          const rep = grp.variants.find(v => !v._optStr) || grp.variants[0];
          return (
            <button
              key={grp.model}
              type="button"
              className="gc-step1-card"
              onClick={() => onSelectModel && onSelectModel(grp)}
            >
              <div className="gc-step1-card-top">
                <span className="gc-step1-card-model">{grp.model}</span>
                <div className="gc-step1-card-arrow">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                  </svg>
                </div>
              </div>

              <div className="gc-step1-thumb-wrap">
                {rep?.id ? (
                  <LazyGuindasteImage
                    guindasteId={rep.id}
                    subgrupo={grp.model}
                    alt={grp.model}
                    className="gc-step1-thumb-img"
                  />
                ) : (
                  <span role="img" aria-label="guindaste" className="gc-step1-thumb-placeholder">🏗️</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {filteredGroups.length === 0 && (
        <div className="gc-step1-empty">
          Nenhum modelo disponível para os filtros selecionados.
        </div>
      )}
    </div>
  );
};

export default Step1GuindasteSelector;
