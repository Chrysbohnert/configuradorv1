import React from 'react';
import { extrairConfiguracoes } from '../../utils/guindasteHelper';

/**
 * Card de exibição de guindaste para seleção
 * @param {Object} props
 * @param {Object} props.guindaste - Dados do guindaste
 * @param {boolean} props.isSelected - Se está selecionado
 * @param {Function} props.onSelect - Callback ao selecionar
 */
const GuindasteCard = ({ guindaste, isSelected, onSelect }) => {
  const configuracoes = extrairConfiguracoes(guindaste.subgrupo);
  
  return (
    <div 
      className={`guindaste-card ${isSelected ? 'selected' : ''}`} 
      onClick={onSelect}
    >
      <div className="card-header">
        <div className="guindaste-image">
          <img
            src={guindaste.imagem_url || '/header-bg.jpg'}
            alt={guindaste.subgrupo}
            className="guindaste-thumbnail"
            onError={(e) => {
              e.currentTarget.src = '/header-bg.jpg';
            }}
          />
        </div>
        
        <div className="guindaste-info">
          <h3>
            {guindaste.subgrupo}
            {configuracoes.length > 0 && (
              <span style={{ 
                marginLeft: '10px', 
                display: 'inline-flex', 
                gap: '8px' 
              }}>
                {configuracoes.map((config, idx) => (
                  <span 
                    key={idx} 
                    title={config.text}
                    style={{ 
                      fontSize: '24px',
                      filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))'
                    }}
                  >
                    {config.icon}
                  </span>
                ))}
              </span>
            )}
          </h3>
          <span className="categoria">{guindaste.Grupo}</span>
        </div>
        <div className="price">Código: {guindaste.codigo_referencia}</div>
      </div>
      
      <div className="card-body">
        <div className="specs">
          <div className="spec">
            <span className="spec-label">Configuração de Lanças:</span>
            <span className="spec-value">{guindaste.peso_kg || 'N/A'}</span>
          </div>
          <div className="spec">
            <span className="spec-label">Opcionais:</span>
            <span className="spec-value">
              {configuracoes.length > 0 ? (
                <div className="configuracoes-lista">
                  {configuracoes.map((config, idx) => (
                    <div key={idx} className="config-item">
                      <span 
                        className="config-icon" 
                        style={{ fontSize: '22px', marginRight: '8px' }}
                      >
                        {config.icon}
                      </span>
                      <span>{config.text}</span>
                    </div>
                  ))}
                </div>
              ) : (
                'STANDARD - Pedido Padrão'
              )}
            </span>
          </div>
        </div>
        
        <div className="card-actions">
          <button className={`btn-select ${isSelected ? 'selected' : ''}`}>
            {isSelected ? (
              <>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
                Selecionado
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                Selecionar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuindasteCard;

